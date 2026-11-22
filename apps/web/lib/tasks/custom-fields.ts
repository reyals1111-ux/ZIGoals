import {formatDate, formatNumber} from '../visual-format';
import {FIELD_KINDS, FIELD_NAME_MAX, FIELD_TEXT_MAX, MAX_FIELDS, MAX_FIELD_OPTIONS, tasksSchema, type Task, type Tasks} from './schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #229; Any.do's custom fields): fields a project adds to its tasks — text, a number, a
 * date, a choice from a list, a tick — up to five, set in a task's editor, shown and sorted as Table columns. Stored as the
 * project's additive `fields` (the definitions) and the task's additive `fields` (its values by field id), TIER 3 (stored
 * format), schemas in schema.ts. Pure.
 */
export {FIELD_KINDS, MAX_FIELDS};
export type FieldKind = (typeof FIELD_KINDS)[number];
export type FieldDef = {id: string; name: string; kind: FieldKind; options?: string[]};
export type FieldValue = string | number | true;
export const FIELD_KIND_WORDS: Record<FieldKind, string> = {text: 'Text', number: 'Number', date: 'Date', choice: 'A choice from a list', tick: 'A tick'};
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A project's fields as stored. */
export const projectFields = (record: Tasks, projectId?: string): FieldDef[] => { const p = projectId ? record.projects?.find(x => x.id === projectId) : undefined; return Array.isArray((p as {fields?: unknown} | undefined)?.fields) ? (p as {fields: FieldDef[]}).fields : []; };
/** Adds or changes (same id) a field, or removes one (`remove`, its values leave the project's tasks too). */
export function setProjectField(record: Tasks, projectId: string, field: FieldDef | {id: string; remove: true}, at = new Date()): Tasks {
  const project = record.projects?.find(p => p.id === projectId);
  if (!project) throw new Error('That project is no longer on this device.');
  const list = projectFields(record, projectId).filter(f => f.id !== field.id);
  let tasks = record.tasks;
  if ('remove' in field) tasks = tasks.map(t => t.projectId === projectId && t.fields?.[field.id] !== undefined ? withoutValue(t, field.id, at) : t);
  else {
    const name = field.name.trim();
    if (!name) throw new Error('Give the field a name.');
    if (name.length > FIELD_NAME_MAX) throw new Error(`A field name is at most ${FIELD_NAME_MAX} characters.`);
    if (!(FIELD_KINDS as readonly string[]).includes(field.kind)) throw new Error('Choose what the field holds.');
    if (list.some(f => f.name.toLowerCase() === name.toLowerCase())) throw new Error(`This project already has a field “${name}”.`);
    const options = field.kind === 'choice' ? [...new Set((field.options ?? []).map(o => o.trim()).filter(Boolean))] : undefined;
    if (field.kind === 'choice' && !options!.length) throw new Error('Write the choices, separated by commas.');
    if (options && options.length > MAX_FIELD_OPTIONS) throw new Error(`A choice field keeps ${MAX_FIELD_OPTIONS} choices.`);
    if (options?.some(o => o.length > FIELD_NAME_MAX)) throw new Error(`Each choice is at most ${FIELD_NAME_MAX} characters.`);
    const at_ = projectFields(record, projectId).findIndex(f => f.id === field.id);
    if (at_ < 0 && list.length >= MAX_FIELDS) throw new Error(`A project keeps ${MAX_FIELDS} fields. Remove one first.`);
    const clean: FieldDef = {id: field.id, name, kind: field.kind, ...(options ? {options} : {})};
    if (at_ < 0) list.push(clean); else list.splice(at_, 0, clean);
  }
  return tasksSchema.parse({...record, tasks, projects: (record.projects ?? []).map(p => { if (p.id !== projectId) return p; const out: Record<string, unknown> = {...p}; if (list.length) out.fields = list; else delete out.fields; return out; })});
}
function withoutValue(t: Task, fieldId: string, at: Date): Task {
  const rest = {...(t.fields ?? {})}; delete rest[fieldId];
  const out: Record<string, unknown> = {...t, updatedAt: at.toISOString()};
  if (Object.keys(rest).length) out.fields = rest; else delete out.fields;
  return out as Task;
}
/**
 * A value as typed in the editor, read for its field: '' (or an unticked box) is no value; anything else that does not fit
 * the field is an error in plain words.
 */
export function readFieldValue(def: FieldDef, raw: string | boolean): {value: FieldValue | null} | {error: string} {
  if (def.kind === 'tick') return {value: raw === true || raw === 'true' ? true : null};
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return {value: null};
  switch (def.kind) {
    case 'text': return text.length <= FIELD_TEXT_MAX ? {value: text} : {error: `“${def.name}” holds at most ${FIELD_TEXT_MAX} characters.`};
    case 'number': { const n = Number(text.replace(',', '.')); return /^-?\d+(?:[.,]\d+)?$/.test(text) && Number.isFinite(n) ? {value: n} : {error: `“${def.name}” is a number, for example 12 or 4.5.`}; }
    case 'date': return DAY.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00Z`)) ? {value: text} : {error: `“${def.name}” is a day.`};
    case 'choice': return def.options?.includes(text) ? {value: text} : {error: `Choose one of the choices for “${def.name}”.`};
  }
}
/** The values to keep for a task: only the given project's fields, each read for its field. Throws the first error. */
export function cleanFieldValues(defs: readonly FieldDef[], raw: Readonly<Record<string, string | boolean>>): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const def of defs) {
    if (raw[def.id] === undefined) continue;
    const read = readFieldValue(def, raw[def.id]!);
    if ('error' in read) throw new Error(read.error);
    if (read.value !== null) out[def.id] = read.value;
  }
  return out;
}
/** A value in words, for the Table ("—" when the task has none). */
export function fieldText(def: FieldDef, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (def.kind === 'tick') return value === true ? 'Yes' : '—';
  if (def.kind === 'number' && typeof value === 'number') return formatNumber(value, {maximumFractionDigits: 2});
  if (def.kind === 'date' && typeof value === 'string' && DAY.test(value)) return formatDate(value, {weekday: false});
  return String(value);
}
/** Sorts tasks by a field: empty values last either way, numbers by size, choices in the field's own order. */
export function sortByField(tasks: readonly Task[], def: FieldDef, dir: 'asc' | 'desc'): Task[] {
  const key = (t: Task): string | number | null => {
    const v = t.fields?.[def.id];
    if (v === undefined) return null;
    if (def.kind === 'number') return typeof v === 'number' ? v : null;
    if (def.kind === 'choice') { const i = def.options?.indexOf(String(v)) ?? -1; return i < 0 ? null : i; }
    if (def.kind === 'tick') return v === true ? 0 : null;
    return String(v).toLowerCase();
  };
  const filled = tasks.filter(t => key(t) !== null), empty = tasks.filter(t => key(t) === null);
  const sorted = [...filled].sort((a, b) => { const x = key(a)!, y = key(b)!; return x < y ? -1 : x > y ? 1 : a.title.localeCompare(b.title); });
  return [...(dir === 'desc' ? sorted.reverse() : sorted), ...empty];
}
