import {describe, expect, it} from 'vitest';
import {argFields, ARGS_CHARS_MAX, ARGS_ITEMS_MAX, ARGS_STRING_MAX, checkArgs, fieldWords, fromText, parseArgs, readSchema, readTool, readTools, schemaLines, schemaSummary, TOOLS_MAX} from './schema';
import {DESCRIPTION_MAX} from './untrusted';

/** Session AM-2 (step 4c, items 2 and 3): the listed tools as untrusted data, and a call's arguments against the tool's own schema. */
const SEARCH = {type: 'object', properties: {query: {type: 'string', description: 'What to look for', minLength: 1, maxLength: 200}, limit: {type: 'integer', minimum: 1, maximum: 50}, safe: {type: 'boolean'}, lang: {type: 'string', enum: ['en', 'nl']}, tags: {type: 'array', items: {type: 'string'}}}, required: ['query'], additionalProperties: false};

describe('a listed tool is untrusted data', () => {
  it('keeps a plain name, one plain cut line of description, and the schema in NOVA’s subset', () => {
    const tool = readTool({name: 'web.search', description: `Search‮ the <b>web</b>\n\n[click](https://evil.example) ${'x'.repeat(600)}`, inputSchema: SEARCH})!;
    expect(tool.name).toBe('web.search');
    expect(tool.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(tool.description).not.toMatch(/[\n‮]/);
    expect(tool.description.startsWith('Search the <b>web</b> [click](https://evil.example)')).toBe(true); // kept as the text it is: never markup, never a link
    expect(tool.schema).toMatchObject({required: ['query'], additional: false, simple: true, unread: false});
    expect(Object.keys(tool.schema.properties)).toEqual(['query', 'limit', 'safe', 'lang', 'tags']);
  });
  it('a name that is not a plain tool name is not kept', () => {
    for (const name of ['', ' ', 'two words', 'a/b', '../x', '<script>', 'x'.repeat(65), '-lead', 'naïve', 'a\nb', '__proto__', 7, null]) expect(readTool({name}), String(name)).toBeNull();
    for (const raw of [null, 'search', [], {}]) expect(readTool(raw)).toBeNull();
    expect(readTool({name: 'ok_tool-1.v2'})).toMatchObject({name: 'ok_tool-1.v2', description: '', schema: {properties: {}, simple: true, unread: false}});
  });
  it('a list keeps each name once, at most a hundred, and counts what it left out', () => {
    expect(readTools([{name: 'a'}, {name: 'a'}, {name: 'b c'}, {name: 'b'}, 'x'])).toMatchObject({tools: [{name: 'a'}, {name: 'b'}], skipped: 3});
    const many = readTools(Array.from({length: TOOLS_MAX + 20}, (_, i) => ({name: `t${i}`})));
    expect(many.tools).toHaveLength(TOOLS_MAX); expect(many.skipped).toBe(20);
    expect(readTools(undefined)).toEqual({tools: [], skipped: 0}); expect(readTools({name: 'a'})).toEqual({tools: [], skipped: 0});
    expect(readTools([{name: 'a'}], [{name: 'a', description: '', schema: readSchema(undefined)}])).toMatchObject({tools: [], skipped: 1}); // already listed on an earlier page
  });
  it('a schema beyond the subset is kept as "structured": bounded, usable by hand, not put in plain words', () => {
    const UNREAD: unknown[] = [
      'text', [], {type: 'array'}, {type: 'object', properties: 'x'},
      {type: 'object', properties: {a: {$ref: '#/x'}}}, {type: 'object', $ref: '#/defs/x'}, {type: 'object', oneOf: [{}]}, {type: 'object', allOf: [{}]}, {type: 'object', patternProperties: {}},
      {type: 'object', properties: {a: {type: 'null'}}}, {type: 'object', properties: {a: {type: ['string', 'number']}}}, {type: 'object', properties: {a: {}}},
      {type: 'object', properties: {a: {type: 'array'}}}, // a list of nothing in particular
      {type: 'object', properties: {a: {type: 'string', enum: ['x', 3]}}}, {type: 'object', properties: {a: {type: 'boolean', enum: [true]}}},
      {type: 'object', properties: {'bad key': {type: 'string'}}}, {type: 'object', properties: {['__proto__']: {type: 'string'}}}, {type: 'object', properties: {constructor: {type: 'string'}}},
      {type: 'object', properties: {a: {type: 'string'}}, required: ['b']}, {type: 'object', properties: {a: {type: 'string'}}, required: 'a'},
      {type: 'object', additionalProperties: {type: 'string'}},
      {type: 'object', properties: Object.fromEntries(Array.from({length: 41}, (_, i) => [`f${i}`, {type: 'string'}]))},
      {type: 'object', properties: {a: {type: 'string', description: 'x'.repeat(9000)}}}, // larger than the schema limit
      {type: 'object', properties: {a: {type: 'object', properties: {b: {type: 'object', properties: {c: {type: 'object', properties: {d: {type: 'object', properties: {e: {type: 'object', properties: {f: {type: 'string'}}}}}}}}}}}}},
    ];
    for (const raw of UNREAD) expect(readSchema(raw), JSON.stringify(raw).slice(0, 80)).toEqual({properties: {}, required: [], additional: true, simple: false, unread: true});
    expect(schemaLines(readSchema({type: 'array'}))).toBeNull();
    expect(schemaSummary(readSchema({type: 'array'}))).toMatch(/raw JSON/);
  });
  it('reads a nullable type and a typeless enum, and nested groups are not "simple"', () => {
    expect(readSchema({type: 'object', properties: {a: {type: ['string', 'null']}, b: {enum: ['x', 'y']}, c: {enum: [1, 2]}}}).properties).toEqual({a: {type: 'string'}, b: {type: 'string', enum: ['x', 'y']}, c: {type: 'number', enum: [1, 2]}});
    const nested = readSchema({type: 'object', properties: {to: {type: 'object', properties: {name: {type: 'string'}}, required: ['name']}}});
    expect(nested).toMatchObject({simple: false, unread: false, properties: {to: {type: 'object', required: ['name'], additional: false}}});
    expect(readSchema({properties: {a: {type: 'string'}}})).toMatchObject({unread: false, simple: true}); // "type: object" left out
    expect(readSchema({type: 'object', additionalProperties: true})).toMatchObject({additional: true, unread: false});
  });
});

describe('arguments are closed, checked and bounded', () => {
  const schema = readSchema(SEARCH);
  it('accepts what fits, as a plain copy', () => {
    const args = {query: 'hiking boots', limit: 5, safe: true, lang: 'nl', tags: ['a', 'b']};
    const checked = checkArgs(schema, args);
    expect(checked).toEqual({ok: true, value: args}); if (checked.ok) expect(checked.value).not.toBe(args);
    expect(checkArgs(schema, {query: 'x'})).toEqual({ok: true, value: {query: 'x'}});
    expect(checkArgs(readSchema(undefined), {})).toEqual({ok: true, value: {}});
  });
  const REFUSED: readonly [args: unknown, words: RegExp][] = [
    [{}, /“query” is needed/],
    [{query: 'x', extra: 1}, /“extra” is not a field of this tool/],
    [{query: 7}, /“query” must be text/],
    [{query: ''}, /at least 1 characters/],
    [{query: 'x'.repeat(201)}, /at most 200 characters/],
    [{query: 'x', limit: '5'}, /“limit” must be a number/], // nothing is coerced
    [{query: 'x', limit: 2.5}, /a whole number/],
    [{query: 'x', limit: 0}, /at least 1/],
    [{query: 'x', limit: 51}, /at most 50/],
    [{query: 'x', safe: 'yes'}, /yes or no/],
    [{query: 'x', lang: 'fr'}, /one of: en, nl/],
    [{query: 'x', tags: 'a'}, /“tags” must be a list/],
    [{query: 'x', tags: ['a', 3]}, /Item 2 of “tags” must be text/],
    [{query: null}, /“query” must be text/],
    ['{"query":"x"}', /JSON object/], [['x'], /JSON object/], [null, /JSON object/], [7, /JSON object/],
  ];
  it.each(REFUSED)('%j is refused', (args, words) => {
    const checked = checkArgs(schema, args);
    expect(checked.ok).toBe(false); if (!checked.ok) expect(checked.problems.join(' ')).toMatch(words);
  });
  it('is bounded whatever the schema says: size, depth, counts, field names', () => {
    const open = readSchema({type: 'object', additionalProperties: true}), unread = readSchema({type: 'array'});
    for (const s of [open, unread]) {
      expect(checkArgs(s, {a: 'x'.repeat(ARGS_CHARS_MAX)}).ok).toBe(false);
      expect(checkArgs(s, {a: 'x'.repeat(ARGS_STRING_MAX + 1)}).ok).toBe(false);
      expect(checkArgs(s, {a: Array.from({length: ARGS_ITEMS_MAX + 1}, () => 1)}).ok).toBe(false);
      expect(checkArgs(s, {a: {b: {c: {d: {e: 1}}}}}).ok).toBe(false);
      expect(checkArgs(s, Object.fromEntries(Array.from({length: 41}, (_, i) => [`k${i}`, 1]))).ok).toBe(false);
      expect(checkArgs(s, {'bad key': 1}).ok).toBe(false);
      expect(checkArgs(s, JSON.parse('{"__proto__": {"polluted": true}}')).ok).toBe(false);
      expect(checkArgs(s, {constructor: 1}).ok).toBe(false);
      expect(checkArgs(s, {a: {b: [1, 'two', true, null]}})).toEqual({ok: true, value: {a: {b: [1, 'two', true, null]}}});
    }
    expect(({} as {polluted?: boolean}).polluted).toBeUndefined();
    // What JSON cannot carry never arrives: a function and undefined vanish, NaN becomes nothing a tool reads as a number.
    expect(checkArgs(open, {f: () => 1, u: undefined, n: 1})).toEqual({ok: true, value: {n: 1}});
    const circular: Record<string, unknown> = {}; circular.self = circular;
    expect(checkArgs(open, circular)).toEqual({ok: false, problems: ['The arguments could not be read.']});
    expect(checkArgs(open, {get secret() { throw Error('boom'); }})).toEqual({ok: false, problems: ['The arguments could not be read.']});
  });
  it('raw JSON reads as an object or says why not', () => {
    expect(parseArgs('{"query":"x"}')).toEqual({ok: true, value: {query: 'x'}});
    expect(parseArgs('')).toEqual({ok: true, value: {}}); expect(parseArgs('  ')).toEqual({ok: true, value: {}});
    for (const text of ['[1]', '"x"', '7', 'null', '{query: x}', '{"a":1}}', 'x'.repeat(ARGS_CHARS_MAX + 1)]) expect(parseArgs(text).ok, text.slice(0, 20)).toBe(false);
  });
});

describe('plain words', () => {
  const schema = readSchema(SEARCH);
  it('a simple schema reads as one line per field, the needed ones first', () => {
    expect(schemaLines(schema)).toEqual([
      {name: 'query', words: 'text', required: true, description: 'What to look for'},
      {name: 'limit', words: 'a whole number from 1 to 50', required: false, description: ''},
      {name: 'safe', words: 'yes or no', required: false, description: ''},
      {name: 'lang', words: 'one of: en, nl', required: false, description: ''},
      {name: 'tags', words: 'a list of text', required: false, description: ''},
    ]);
    expect(schemaSummary(schema)).toBe('Takes query (text); limit (a whole number from 1 to 50, optional); safe (yes or no, optional); lang (one of: en, nl, optional); tags (a list of text, optional).');
    expect(schemaSummary(readSchema(undefined))).toBe('Takes no input.');
    expect(fieldWords({type: 'number', minimum: 0})).toBe('a number, at least 0'); expect(fieldWords({type: 'integer', maximum: 9})).toBe('a whole number, at most 9');
  });
  it('a call’s arguments read as fields, in the schema’s order', () => {
    expect(argFields(schema, {tags: ['a', 'b'], safe: false, query: 'boots', limit: 5})).toEqual([{name: 'query', value: 'boots'}, {name: 'limit', value: '5'}, {name: 'safe', value: 'no'}, {name: 'tags', value: 'a, b'}]);
    expect(argFields(readSchema({type: 'array'}), {to: {name: 'A'}, n: null})).toEqual([{name: 'to', value: '{"name":"A"}'}, {name: 'n', value: 'nothing'}]);
  });
  it('a form’s text becomes the field’s own type, or a plain sentence', () => {
    expect(fromText({type: 'string'}, ' keep spaces ', 'q')).toBe(' keep spaces '); expect(fromText({type: 'string'}, '', 'q')).toBeUndefined();
    expect(fromText({type: 'integer'}, ' 5 ', 'n')).toBe(5); expect(fromText({type: 'number'}, '-2.5', 'n')).toBe(-2.5); expect(fromText({type: 'number'}, '', 'n')).toBeUndefined();
    expect(() => fromText({type: 'number'}, '5 apples', 'n')).toThrow('“n” must be a number.'); expect(() => fromText({type: 'number'}, '0x10', 'n')).toThrow();
    expect(fromText({type: 'boolean'}, 'yes', 'b')).toBe(true); expect(fromText({type: 'boolean'}, 'No', 'b')).toBe(false); expect(() => fromText({type: 'boolean'}, 'maybe', 'b')).toThrow('“b” must be yes or no.');
    expect(fromText({type: 'array', items: {type: 'string'}}, 'a, b\nc', 't')).toEqual(['a', 'b', 'c']); expect(fromText({type: 'array', items: {type: 'integer'}}, '1,2', 't')).toEqual([1, 2]);
    expect(fromText({type: 'object'}, '{"a":1}', 'o')).toEqual({a: 1}); expect(() => fromText({type: 'object'}, '{a:1}', 'o')).toThrow('“o” must be valid JSON.');
  });
});
