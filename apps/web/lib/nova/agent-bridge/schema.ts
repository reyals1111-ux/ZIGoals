import {DESCRIPTION_MAX, plainLine} from './plain';

/**
 * Session AM-2 (step 4c, items 2 and 3): the tools a server lists, as NOVA keeps them for the visit, and the check of a
 * call's arguments against the listed tool's own input schema. Pure.
 *
 * A listed tool is untrusted data: its name must be a plain tool name, its description is one plain, cut line shown as
 * "described by the server", and its input schema is read into a small, bounded subset of JSON Schema (object, string,
 * number, integer, boolean, array, enum, required, the simple limits). A schema NOVA cannot read in that subset is kept
 * as "structured": such a tool can still be run by hand with raw JSON, and its arguments are still bounded.
 *
 * Arguments are closed: a field the schema does not list is refused (unless the schema itself allows extra fields), a
 * missing required field is refused, a value of the wrong type or outside an enum is refused, and whatever the schema
 * says the whole call is bounded in size, depth and count. Nothing is coerced.
 */
export const TOOLS_MAX = 100, TOOL_NAME_MAX = 64, SCHEMA_CHARS_MAX = 8000, SCHEMA_DEPTH_MAX = 5, PROPERTIES_MAX = 40;
/** A listed choice is one plain line of at most this many characters (longer, or not plain: the schema is unread). */
export const ENUM_CHARS_MAX = 80;
export const ARGS_CHARS_MAX = 4000, ARGS_DEPTH_MAX = 4, ARGS_STRING_MAX = 2000, ARGS_ITEMS_MAX = 50, ARGS_KEYS_MAX = 40;
const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const KEY = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);
export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
export type Field = {
  type: FieldType; /** The server's own words for the field (untrusted, one plain line). */ description?: string;
  enum?: readonly (string | number)[]; minimum?: number; maximum?: number; minLength?: number; maxLength?: number;
  /** An array's items, an object's fields. */ items?: Field; properties?: Record<string, Field>; required?: readonly string[]; additional?: boolean;
};
export type ToolSchema = {properties: Record<string, Field>; required: readonly string[]; /** The schema allows fields it does not list. */ additional: boolean;
  /** Every field is a plain value (text, a number, yes/no, a choice, a list of plain values): the card can show a form. */ simple: boolean;
  /** NOVA could not read the server's schema in its subset: arguments are bounded but not checked field by field. */ unread: boolean};
export type ListedTool = {name: string; /** Untrusted: plain text, one line, cut. '' when the server gave none. */ description: string; schema: ToolSchema};

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const UNREAD: ToolSchema = {properties: {}, required: [], additional: true, simple: false, unread: true};
const num = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const count = (value: unknown): number | undefined => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1_000_000 ? value : undefined;

function fieldOf(raw: unknown, depth: number): Field | null {
  if (!isObject(raw) || depth > SCHEMA_DEPTH_MAX) return null;
  // A nullable type written as a pair (["string", "null"]) reads as its one real type.
  const types = Array.isArray(raw.type) ? raw.type.filter(t => t !== 'null') : [raw.type];
  let type = types.length === 1 && typeof types[0] === 'string' ? types[0] : undefined;
  const values = Array.isArray(raw.enum) ? raw.enum.filter((v): v is string | number => (typeof v === 'string' && v.length <= 200) || (typeof v === 'number' && Number.isFinite(v))).slice(0, 50) : undefined;
  if (type === undefined && values?.length && values.length === (raw.enum as unknown[]).length) type = values.every(v => typeof v === 'string') ? 'string' : values.every(v => typeof v === 'number') ? 'number' : undefined;
  if (type !== 'string' && type !== 'number' && type !== 'integer' && type !== 'boolean' && type !== 'array' && type !== 'object') return null;
  const field: Field = {type};
  const description = plainLine(typeof raw.description === 'string' ? raw.description : '', DESCRIPTION_MAX);
  if (description) field.description = description;
  if (values?.length && (type === 'string' || type === 'number' || type === 'integer')) {
    if (values.length !== (raw.enum as unknown[]).length || !values.every(v => typeof v === (type === 'string' ? 'string' : 'number'))) return null;
    // Security review, finding 3: a choice is a server's string that reaches a model ("one of: …") and the screen. It must
    // be one plain, short line as it stands; a value that cleaning would change (a line break, an invisible or direction
    // mark, more than ENUM_CHARS_MAX characters) could not be sent back faithfully, so the schema is not read at all.
    if (!values.every(v => typeof v !== 'string' || (v !== '' && plainLine(v, ENUM_CHARS_MAX) === v))) return null;
    field.enum = values;
  } else if (Array.isArray(raw.enum)) return null;
  if (type === 'number' || type === 'integer') { const lo = num(raw.minimum), hi = num(raw.maximum); if (lo !== undefined) field.minimum = lo; if (hi !== undefined) field.maximum = hi; }
  if (type === 'string') { const lo = count(raw.minLength), hi = count(raw.maxLength); if (lo !== undefined) field.minLength = lo; if (hi !== undefined) field.maxLength = hi; }
  if (type === 'array') {
    if (raw.items === undefined) return null;
    const items = fieldOf(raw.items, depth + 1); if (!items) return null;
    field.items = items;
  }
  if (type === 'object') {
    const inner = objectOf(raw, depth + 1); if (!inner) return null;
    field.properties = inner.properties; field.required = inner.required; field.additional = inner.additional;
  }
  return field;
}
function objectOf(raw: Record<string, unknown>, depth: number): {properties: Record<string, Field>; required: string[]; additional: boolean} | null {
  if (depth > SCHEMA_DEPTH_MAX) return null;
  const props = raw.properties === undefined ? {} : raw.properties;
  if (!isObject(props)) return null;
  const names = Object.keys(props);
  if (names.length > PROPERTIES_MAX) return null;
  const properties: Record<string, Field> = Object.create(null) as Record<string, Field>;
  for (const name of names) {
    if (!KEY.test(name) || FORBIDDEN_KEYS.has(name)) return null;
    const field = fieldOf(props[name], depth); if (!field) return null;
    properties[name] = field;
  }
  const required = raw.required === undefined ? [] : raw.required;
  if (!Array.isArray(required) || !required.every((r): r is string => typeof r === 'string' && Object.hasOwn(properties, r))) return null;
  // Extra fields only when the schema says so in so many words; a schema for them (an object) is beyond the subset.
  const extra = raw.additionalProperties;
  if (extra !== undefined && typeof extra !== 'boolean') return null;
  return {properties: {...properties}, required: [...new Set(required)], additional: extra === true};
}
const isPlain = (field: Field): boolean => field.type === 'string' || field.type === 'number' || field.type === 'integer' || field.type === 'boolean';
/** The server's `inputSchema` in NOVA's subset; `unread` when it does not fit (too large, too deep, a keyword NOVA does not read). */
export function readSchema(raw: unknown): ToolSchema {
  if (raw === undefined || raw === null) return {properties: {}, required: [], additional: false, simple: true, unread: false};
  if (!isObject(raw)) return UNREAD;
  let size = 0; try { size = JSON.stringify(raw).length; } catch { return UNREAD; }
  if (size > SCHEMA_CHARS_MAX) return UNREAD;
  if (raw.type !== undefined && raw.type !== 'object') return UNREAD;
  // Keywords that change what is allowed in ways the subset cannot follow: the tool stays usable by hand, unchecked field by field.
  for (const word of ['$ref', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'patternProperties', 'dependentRequired', 'dependentSchemas']) if (word in raw) return UNREAD;
  const inner = objectOf(raw, 1);
  if (!inner) return UNREAD;
  const simple = Object.values(inner.properties).every(f => isPlain(f) || (f.type === 'array' && !!f.items && isPlain(f.items)));
  return {...inner, simple, unread: false};
}
/** One listed tool as NOVA keeps it, or null when its name is not a plain tool name. */
export function readTool(raw: unknown): ListedTool | null {
  if (!isObject(raw) || typeof raw.name !== 'string' || !NAME.test(raw.name)) return null;
  return {name: raw.name, description: plainLine(typeof raw.description === 'string' ? raw.description : '', DESCRIPTION_MAX), schema: readSchema(raw.inputSchema)};
}
/** A `tools/list` page: every tool NOVA can keep (a name seen twice counts once), and how many it left out. */
export function readTools(raw: unknown, already: readonly ListedTool[] = []): {tools: ListedTool[]; skipped: number} {
  const list = Array.isArray(raw) ? raw : [], seen = new Set(already.map(t => t.name)), tools: ListedTool[] = [];
  let skipped = 0;
  for (const item of list) {
    const tool = readTool(item);
    if (!tool || seen.has(tool.name) || already.length + tools.length >= TOOLS_MAX) { skipped++; continue; }
    seen.add(tool.name); tools.push(tool);
  }
  return {tools, skipped};
}

// ── Arguments ───────────────────────────────────────────────────────────────────────────────────────────────────────
export type ArgsCheck = {ok: true; value: Record<string, unknown>} | {ok: false; problems: string[]};
type Bounds = {problems: string[]};
function bounded(value: unknown, depth: number, path: string, b: Bounds): void {
  if (b.problems.length > 5) return;
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) b.problems.push(`${path} is not a number a tool can read.`); return; }
  if (typeof value === 'string') { if (value.length > ARGS_STRING_MAX) b.problems.push(`${path} is longer than ${ARGS_STRING_MAX} characters.`); return; }
  if (typeof value !== 'object') { b.problems.push(`${path} is not a value a tool can read.`); return; }
  if (depth >= ARGS_DEPTH_MAX) { b.problems.push(`${path} is nested too deep.`); return; }
  if (Array.isArray(value)) {
    if (value.length > ARGS_ITEMS_MAX) { b.problems.push(`${path} lists more than ${ARGS_ITEMS_MAX} items.`); return; }
    value.forEach((item, i) => bounded(item, depth + 1, `${path}[${i + 1}]`, b));
    return;
  }
  const keys = Object.keys(value);
  if (keys.length > ARGS_KEYS_MAX) { b.problems.push(`${path} holds more than ${ARGS_KEYS_MAX} fields.`); return; }
  for (const key of keys) {
    if (!KEY.test(key) || FORBIDDEN_KEYS.has(key)) { b.problems.push(`${path} holds a field name that cannot be used.`); return; }
    bounded((value as Record<string, unknown>)[key], depth + 1, path === 'The call' ? `“${key}”` : `${path}.${key}`, b);
  }
}
function fits(value: unknown, field: Field, path: string, problems: string[]): void {
  if (problems.length > 5) return;
  const wrong = (what: string) => { problems.push(`${path} must be ${what}.`); };
  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') return wrong('text');
      if (field.enum && !field.enum.includes(value)) return wrong(`one of: ${field.enum.slice(0, 12).join(', ')}`);
      if (field.minLength !== undefined && value.length < field.minLength) return wrong(`at least ${field.minLength} characters`);
      if (field.maxLength !== undefined && value.length > field.maxLength) return wrong(`at most ${field.maxLength} characters`);
      return;
    case 'number': case 'integer':
      if (typeof value !== 'number' || !Number.isFinite(value)) return wrong('a number');
      if (field.type === 'integer' && !Number.isInteger(value)) return wrong('a whole number');
      if (field.enum && !field.enum.includes(value)) return wrong(`one of: ${field.enum.slice(0, 12).join(', ')}`);
      if (field.minimum !== undefined && value < field.minimum) return wrong(`at least ${field.minimum}`);
      if (field.maximum !== undefined && value > field.maximum) return wrong(`at most ${field.maximum}`);
      return;
    case 'boolean':
      if (typeof value !== 'boolean') return wrong('yes or no (true or false)');
      return;
    case 'array':
      if (!Array.isArray(value)) return wrong('a list');
      value.forEach((item, i) => fits(item, field.items!, `Item ${i + 1} of ${path}`, problems));
      return;
    case 'object':
      if (!isObject(value)) return wrong('a group of fields');
      objectFits(value, {properties: field.properties ?? {}, required: field.required ?? [], additional: field.additional === true}, path, problems);
  }
}
function objectFits(value: Record<string, unknown>, shape: {properties: Record<string, Field>; required: readonly string[]; additional: boolean}, path: string, problems: string[]): void {
  const at = (key: string) => path ? `“${key}” in ${path}` : `“${key}”`;
  for (const key of shape.required) if (!Object.hasOwn(value, key) || value[key] === undefined) problems.push(`${at(key)} is needed.`);
  for (const key of Object.keys(value)) {
    const field = Object.hasOwn(shape.properties, key) ? shape.properties[key] : undefined;
    if (!field) { if (!shape.additional) problems.push(`${at(key)} is not a field of this tool.`); continue; }
    fits(value[key], field, at(key), problems);
  }
}
/**
 * A call's arguments against the listed tool: an object, bounded whatever the schema says, then checked field by field.
 * The value that comes back is a deep copy made through JSON (no prototype, no getter, nothing but data).
 */
export function checkArgs(schema: ToolSchema, raw: unknown): ArgsCheck {
  if (!isObject(raw)) return {ok: false, problems: ['The arguments must be a group of named fields (a JSON object).']};
  let text: string;
  try { text = JSON.stringify(raw); } catch { return {ok: false, problems: ['The arguments could not be read.']}; }
  if (typeof text !== 'string') return {ok: false, problems: ['The arguments could not be read.']};
  if (text.length > ARGS_CHARS_MAX) return {ok: false, problems: [`The arguments are longer than ${ARGS_CHARS_MAX} characters.`]};
  const value = JSON.parse(text) as Record<string, unknown>;
  const b: Bounds = {problems: []};
  bounded(value, 0, 'The call', b);
  if (b.problems.length) return {ok: false, problems: b.problems.slice(0, 5)};
  if (schema.unread) return {ok: true, value};
  const problems: string[] = [];
  objectFits(value, schema, '', problems);
  return problems.length ? {ok: false, problems: problems.slice(0, 5)} : {ok: true, value};
}
/**
 * Security review, finding 1: the field names of a call that the tool's schema does not list, at every nesting level
 * ("a.b" for a nested one). A model may send only fields the schema names: a tool that allows extra fields, or whose
 * schema NOVA could not read, would otherwise let a model write anything it likes into a NAME ("salary_5400_eur": true).
 * An unread schema names nothing, so a model can call such a tool only with no arguments; the person can still fill it
 * in by hand.
 */
export function unlistedKeys(schema: ToolSchema, args: unknown): string[] {
  const out: string[] = [];
  const walk = (value: unknown, field: Field | {type: 'object'; properties: Record<string, Field>} | undefined, path: string): void => {
    if (out.length > 20) return;
    if (Array.isArray(value)) { value.forEach(item => walk(item, field && 'items' in field ? field.items : undefined, path)); return; }
    if (!isObject(value)) return;
    const listed = field && field.type === 'object' ? field.properties ?? {} : {};
    for (const key of Object.keys(value)) {
      const at = path ? `${path}.${key}` : key;
      if (!Object.hasOwn(listed, key)) { out.push(at); continue; }
      walk(value[key], listed[key], at);
    }
  };
  walk(args, schema.unread ? {type: 'object', properties: {}} : {type: 'object', properties: schema.properties}, '');
  return out;
}
/** Raw JSON as the person (or a model) wrote it, as arguments: an object within the size limit, or the reason it is not. */
export function parseArgs(text: string): {ok: true; value: Record<string, unknown>} | {ok: false; problem: string} {
  const typed = text.trim();
  if (!typed) return {ok: true, value: {}};
  if (typed.length > ARGS_CHARS_MAX) return {ok: false, problem: `The arguments are longer than ${ARGS_CHARS_MAX} characters.`};
  let value: unknown;
  try { value = JSON.parse(typed); } catch { return {ok: false, problem: 'The arguments are not valid JSON.'}; }
  return isObject(value) ? {ok: true, value} : {ok: false, problem: 'The arguments must be a JSON object: {"field": "value"}.'};
}

// ── Plain words ─────────────────────────────────────────────────────────────────────────────────────────────────────
const TYPE_WORDS: Readonly<Record<FieldType, string>> = {string: 'text', number: 'a number', integer: 'a whole number', boolean: 'yes or no', array: 'a list', object: 'a group of fields'};
/** "text", "one of: a, b", "a whole number from 1 to 50", "a list of text". */
export function fieldWords(field: Field): string {
  if (field.enum?.length) return `one of: ${field.enum.slice(0, 8).join(', ')}${field.enum.length > 8 ? ', …' : ''}`;
  if (field.type === 'array') return `a list of ${field.items ? fieldWords(field.items).replace(/^an? /, '') : 'values'}`;
  if ((field.type === 'number' || field.type === 'integer') && (field.minimum !== undefined || field.maximum !== undefined)) {
    const base = TYPE_WORDS[field.type];
    return field.minimum !== undefined && field.maximum !== undefined ? `${base} from ${field.minimum} to ${field.maximum}` : field.minimum !== undefined ? `${base}, at least ${field.minimum}` : `${base}, at most ${field.maximum}`;
  }
  return TYPE_WORDS[field.type];
}
export type SchemaLine = {name: string; words: string; required: boolean; /** Untrusted, from the server. */ description: string};
/** A tool's input in plain words, one line per field (required first); `null` when the schema is beyond plain words. */
export function schemaLines(schema: ToolSchema): SchemaLine[] | null {
  if (schema.unread) return null;
  const names = Object.keys(schema.properties), required = new Set(schema.required);
  return [...names.filter(n => required.has(n)), ...names.filter(n => !required.has(n))].map(name => ({name, words: fieldWords(schema.properties[name]!), required: required.has(name), description: schema.properties[name]!.description ?? ''}));
}
export function schemaSummary(schema: ToolSchema): string {
  if (schema.unread) return 'Takes structured input that NOVA cannot put in plain words; you can still run it by hand with raw JSON.';
  const lines = schemaLines(schema) ?? [];
  if (!lines.length) return 'Takes no input.';
  return `Takes ${lines.map(l => `${l.name} (${l.words}${l.required ? '' : ', optional'})`).join('; ')}.`;
}
/** A call's arguments as readable fields for the confirm card: the name, the value in plain text (long values cut), in the schema's order. */
export function argFields(schema: ToolSchema, args: Record<string, unknown>): {name: string; value: string}[] {
  const order = [...Object.keys(schema.properties).filter(k => Object.hasOwn(args, k)), ...Object.keys(args).filter(k => !Object.hasOwn(schema.properties, k))];
  const show = (value: unknown): string => typeof value === 'string' ? value : typeof value === 'boolean' ? (value ? 'yes' : 'no') : value === null ? 'nothing' : typeof value === 'number' ? String(value)
    : Array.isArray(value) && value.every(v => typeof v === 'string' || typeof v === 'number') ? value.join(', ') : JSON.stringify(value);
  return order.map(name => ({name, value: show(args[name])}));
}
/** A form value (always text from an input) as the field's own type; `undefined` for an empty optional field. Throws a plain sentence when it does not read. */
export function fromText(field: Field, text: string, name: string): unknown {
  const typed = text.trim();
  if (field.type === 'string') return text === '' ? undefined : text;
  if (!typed) return undefined;
  if (field.type === 'boolean') { if (/^(true|yes|on|1)$/i.test(typed)) return true; if (/^(false|no|off|0)$/i.test(typed)) return false; throw Error(`“${name}” must be yes or no.`); }
  if (field.type === 'number' || field.type === 'integer') { const n = Number(typed); if (!Number.isFinite(n) || !/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(typed)) throw Error(`“${name}” must be a number.`); return n; }
  if (field.type === 'array' && field.items && isPlain(field.items)) return typed.split(/\s*,\s*|\n+/).filter(Boolean).map(part => fromText(field.items!, part, name));
  try { return JSON.parse(typed) as unknown; } catch { throw Error(`“${name}” must be valid JSON.`); }
}
