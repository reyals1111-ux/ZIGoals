import {ACTION_FENCE} from '../context/specialists';
import {ACTION_KINDS, COMPOSITE_KINDS, GOAL_CATEGORIES, KIND_ALIASES, MAX_PROPOSALS, actionSchema, compositeSchema, expandComposite, type Action} from './schema';
const KIND_SET: Record<string, true> = Object.fromEntries([...ACTION_KINDS, ...COMPOSITE_KINDS].map(k => [k, true]));
const GOAL_CATEGORY_SET = new Set<string>(GOAL_CATEGORIES);
/** A habit's measurement as a bare word, mapped to the schema's words or a unit of its own. */
const MEASUREMENT_WORDS: Record<string, 'done' | 'count' | 'minutes' | 'hours'> = {times: 'count', time: 'count', count: 'count', counts: 'count', reps: 'count', repetitions: 'count', done: 'done', boolean: 'done', 'yes/no': 'done', check: 'done', checkbox: 'done', min: 'minutes', mins: 'minutes', minute: 'minutes', minutes: 'minutes', duration: 'minutes', h: 'hours', hr: 'hours', hrs: 'hours', hour: 'hours', hours: 'hours'};

/**
 * Reads the proposals out of a finished reply (ADR-012, Part 5). Runs only after the stream ends: a half-received block
 * is never shown as a card. Tolerant of fence variants (``` or ~~~, zigoals-action, zigoals_action, zigoals action,
 * an extra "json" word), of one object or an array per block, and of alias kinds. Everything else is text. Blocks are
 * removed from the displayed text; invalid or unknown proposals are reported in plain words, never shown as cards;
 * duplicates are dropped; at most ten proposals survive. Whatever the person's records said inside the reply is still
 * just text: this parser is the only way a reply reaches the action layer, and it only knows the whitelist.
 * Session V Part 7: "plan-goal" and "build-habit" are checked as a whole, then become their separate cards (a goal draft
 * and its supporting habits; a habit and its reminder), each validated like any other proposal.
 */
export type Rejected = {raw: string; reason: string};
/**
 * Session X-Local Part 5c: the repairs a block may need before it is JSON (models send almost-JSON): a stray "json"
 * word or backticks around the object, comments, a trailing comma, single-quoted strings and keys, unquoted keys,
 * Python's True/False/None, a bare value. Each repair is a plain rewrite outside strings; the result still has to
 * satisfy the whitelist schema, so a repair can never widen what a card may do. Returns null when nothing parses.
 */
/** The most a proposal block is ever read for repair; a longer one is no card (SECURITY_REVIEW_Y F5: the repair is linear and bounded). */
export const REPAIR_MAX_CHARS = 32_000;
const WS = /\s*/y, WORD_AT = /[A-Za-z_][A-Za-z0-9_-]*/y, COLON_AT = /\s*:/y;
export function repairJson(body: string): unknown {
  if (body.length > REPAIR_MAX_CHARS) return null;
  const text = body.trim().replace(/^```[a-z-]*\s*/i, '').replace(/```\s*$/, '').replace(/^json\s*/i, '').trim();
  if (!text) return null;
  const attempt = (t: string): unknown => { try { return JSON.parse(t); } catch { return undefined; } };
  const direct = attempt(text); if (direct !== undefined) return direct;
  // One walk, outside strings: comments go, quotes become double, bare keys and Python literals are rewritten, a
  // trailing comma before } or ] goes. Inside a string nothing changes (a single-quoted string's inner " is escaped).
  let out = '', inString: '"' | "'" | null = null;
  // The last non-blank character written so far, read backwards (F5: never a copy of the whole output per call).
  const lastSignificant = () => { for (let k = out.length - 1; k >= 0; k--) { const c = out[k]!; if (c !== ' ' && c !== '\n' && c !== '\t' && c !== '\r') return c; } return ''; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (ch === '\\') { out += ch + (text[i + 1] ?? ''); i++; continue; }
      if (ch === inString) { inString = null; out += '"'; continue; }
      out += ch === '"' ? '\\"' : ch; continue;
    }
    if (ch === '"' || ch === "'") { inString = ch; out += '"'; continue; }
    if (ch === '/' && text[i + 1] === '/') { const end = text.indexOf('\n', i); i = end < 0 ? text.length : end; continue; }
    if (ch === '/' && text[i + 1] === '*') { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 1; continue; }
    if (ch === ',') {
      // A trailing comma: nothing but whitespace and comments up to the closing brace or bracket.
      let j = i + 1;
      for (;;) { WS.lastIndex = j; const ws = WS.exec(text); if (ws && ws[0].length) { j += ws[0].length; continue; } if (text.startsWith('//', j)) { const e = text.indexOf('\n', j); j = e < 0 ? text.length : e; continue; } if (text.startsWith('/*', j)) { const e = text.indexOf('*/', j + 2); j = e < 0 ? text.length : e + 2; continue; } break; }
      if (text[j] === '}' || text[j] === ']') continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      WORD_AT.lastIndex = i; const word = WORD_AT.exec(text)![0]; COLON_AT.lastIndex = i + word.length; const keyed = COLON_AT.test(text);
      i += word.length - 1;
      if (keyed && (lastSignificant() === '{' || lastSignificant() === ',' || out.trim() === '')) { out += `"${word}"`; continue; }
      // Phase 2 (seen on phi4-mini): a bare `unknown`, `none` or `nil` where a value should be is simply unknown.
      out += word === 'True' ? 'true' : word === 'False' ? 'false' : word === 'None' || word === 'undefined' || word === 'NaN' || /^(?:unknown|none|nil|null)$/i.test(word) ? 'null' : word; continue;
    }
    out += ch;
  }
  const fixed = attempt(out); if (fixed !== undefined) return fixed;
  // Phase 2 (seen on phi4-mini): objects listed one after another with no comma between them. Outside strings only.
  let joined = '', inner = false;
  for (let i = 0; i < out.length; i++) { const ch = out[i]!; if (inner) { joined += ch; if (ch === '\\') { joined += out[i + 1] ?? ''; i++; } else if (ch === '"') inner = false; continue; } if (ch === '"') { inner = true; joined += ch; continue; } if (ch === '{' && /[}\]]\s*$/.test(joined)) joined = `${joined.replace(/\s+$/, '')},{`; else joined += ch; }
  const commas = attempt(joined); if (commas !== undefined) return commas;
  // Objects listed without the outer brackets, or an object missing its closing brace.
  const wrapped = attempt(`[${joined}]`); if (wrapped !== undefined) return wrapped;
  const closed = attempt(`${out}}`); if (closed !== undefined) return closed;
  return null;
}
/** Fields the schema counts as numbers; a model that quotes them ("300") still means the number. */
const NUMERIC_KEYS = new Set(['millilitres', 'glasses', 'value', 'steps', 'minutes', 'hours', 'quantity', 'target', 'targetHours', 'servings', 'count', 'weekday', 'quality', 'mood', 'days', 'serving_g', 'serving_ml', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'balance']);
const NUMBER = /^-?\d+(?:[.,]\d+)?$/;
function coerceNumbers(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(coerceNumbers);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  // Session Z-Local Part 6 (L28): a check-in that repeats its minutes as the value ("minutes":28,"value":28, seen on Haiku and Sonnet) said one
  // amount twice: the duplicate goes before validation. Two different amounts stay refused (the golden case x-reply-two-amounts).
  const o = value as Record<string, unknown>;
  if (o.kind === 'check-in' && typeof o.minutes === 'number' && o.value === o.minutes && o.quantity === undefined) delete o.value;
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    // A numeric field sent as null (Python's None) is simply absent; the schema's own defaults and refusals then apply.
    // Session Z-Local Part 6 (ADR-020 L37): where the schema makes null a meaning (set-target's value clears the target; set-bells' intervalMin
    // stops the bell), the null stays; Opus wrote `"value": null` to clear a calorie target and the block was refused as "received undefined".
    if (v === null && NUMERIC_KEYS.has(key) && !((o.kind === 'set-target' && key === 'value') || (o.kind === 'set-bells' && key === 'intervalMin'))) continue;
    out[key] = typeof v === 'string' && NUMERIC_KEYS.has(key) && NUMBER.test(v.trim()) ? Number(v.trim().replace(',', '.')) : typeof v === 'object' ? coerceNumbers(v) : v;
  }
  return out;
}
/** `revise` (Session X-Local Part 5a): a block carried "revise": true, so the previous reply's still-pending cards are replaced by this reply's. */
export type ParsedReply = {text: string; proposals: Action[]; rejected: Rejected[]; revise?: boolean};
export const FENCE = /(```+|~~~+)[^\S\n]*(?:json[^\S\n]+)?zigoals[-_ ]?action[^\n]*\n([\s\S]*?)\n[^\S\n]*\1[^\S\n]*(?=\n|$)/gi;
const firstIssue = (error: {issues: {path: PropertyKey[]; message: string}[]}) => { const issue = error.issues[0]; return issue ? `${issue.path.length ? `${issue.path.map(String).join('.')}: ` : ''}${issue.message}` : 'invalid'; };
function normalise(value: unknown, flags: {revise: boolean}): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = {...(value as Record<string, unknown>)};
  // Session X-Local Part 5a: "revise": true marks a correction of the previous reply; it is never a field of a card.
  if ('revise' in record) { if (record.revise === true) flags.revise = true; delete record.revise; }
  // Session X-Local Part 6d (seen on phi4-mini): "type" for "kind", "date" for "day", a habit's measurement and schedule
  // as bare words, "night" for the evening, an unknown goal category. Each is a rewrite of a shape, never a new ability.
  if (record.kind === undefined && typeof record.type === 'string' && (KIND_ALIASES[record.type.trim().toLowerCase()] ?? record.type.trim().toLowerCase()) in KIND_SET) { record.kind = record.type; delete record.type; }
  if (typeof record.kind === 'string') { const kind = record.kind.trim().toLowerCase().replace(/\s+/g, '-'); record.kind = KIND_ALIASES[kind] ?? kind; }
  if (record.day === undefined && typeof record.date === 'string') { record.day = record.date; delete record.date; }
  if (record.kind === 'create-habit' || record.kind === 'build-habit' || record.kind === 'edit-habit') {
    if (typeof record.measurement === 'string') { const m = record.measurement.trim().toLowerCase(); record.measurement = MEASUREMENT_WORDS[m] ?? (['done', 'count', 'minutes', 'hours'].includes(m) ? m : {unit: record.measurement.trim()}); }
    if (typeof record.schedule === 'string') {
      const sch = record.schedule.trim().toLowerCase(), times = /^(\d{1,2}|once|twice|three times|four times|five times|six times)(?: times?)?(?: a| per| each)? ?week$/.exec(sch), every = /^every (\d{1,3}) days?$/.exec(sch);
      const COUNT: Record<string, number> = {once: 1, twice: 2, 'three times': 3, 'four times': 4, 'five times': 5, 'six times': 6};
      record.schedule = sch === 'daily' || sch === 'every day' || sch === 'everyday' ? 'daily' : sch === 'weekly' || sch === 'once a week' ? {timesPerWeek: 1} : sch === 'weekdays' || sch === 'workdays' ? {weekdays: [1, 2, 3, 4, 5]} : sch === 'weekends' ? {weekdays: [0, 6]} : sch === 'every other day' || sch === 'alternate days' ? {everyDays: 2}
        : times ? {timesPerWeek: COUNT[times[1]!] ?? Number(times[1])} : every ? {everyDays: Number(every[1])} : record.schedule;
    }
    // ISO weekday numbers (Monday 1 … Sunday 7) become the schema's (Sunday 0 … Saturday 6) when a 7 is present.
    if (record.schedule && typeof record.schedule === 'object' && Array.isArray((record.schedule as {weekdays?: unknown}).weekdays)) { const days = (record.schedule as {weekdays: unknown[]}).weekdays; if (days.includes(7) && !days.includes(0)) (record.schedule as {weekdays: unknown[]}).weekdays = days.map(d => d === 7 ? 0 : d); }
    if (typeof record.timeOfDay === 'string') { const t = record.timeOfDay.trim().toLowerCase(); record.timeOfDay = t === 'night' || t === 'evenings' ? 'evening' : t === 'mornings' || t === 'am' ? 'morning' : t === 'afternoons' || t === 'noon' ? 'afternoon' : t === 'any' || t === 'anytime' || t === 'any time' ? 'anytime' : record.timeOfDay; }
    if (record.kind === 'create-habit' && record.reminder !== undefined) record.kind = 'build-habit';
  }
  if ((record.kind === 'create-goal' || record.kind === 'plan-goal' || record.kind === 'edit-goal') && typeof record.category === 'string' && !GOAL_CATEGORY_SET.has(record.category.trim())) { const match = [...GOAL_CATEGORY_SET].find(c => c.toLowerCase() === (record.category as string).trim().toLowerCase()); if (match) record.category = match; else delete record.category; }
  if (record.kind === 'create-goal' && Array.isArray(record.habits)) record.kind = 'plan-goal';
  // A reminder "for" a named thing: a habit named means for:"habit", a goal named means for:"goal" (seen on qwen3.6).
  if (record.kind === 'create-reminder' && typeof record.for === 'string' && !['habit', 'water', 'goal', 'wealth', 'pack'].includes(record.for.trim().toLowerCase())) { const f = record.for.trim().toLowerCase(); record.for = typeof record.habit === 'string' ? 'habit' : typeof record.goal === 'string' ? 'goal' : /water|drink|hydrat/.test(f) ? 'water' : /wealth|money|finance/.test(f) ? 'wealth' : /pack|context/.test(f) ? 'pack' : record.for; }
  // Phase 2: a recipe ingredient's amount in millilitres (ml, milliliters), or a quantity with a unit; an estimate given
  // per 100 ml, or simply as "estimate", is the per-100 g one (liquids are counted 1 ml = 1 g).
  if (record.kind === 'create-recipe' && Array.isArray(record.ingredients)) {
    record.ingredients = record.ingredients.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      const ing = {...(item as Record<string, unknown>)};
      for (const key of ['ml', 'milliliters', 'milliliter', 'mL', 'millilitre']) if (ing[key] !== undefined) { if (ing.millilitres === undefined) ing.millilitres = ing[key]; delete ing[key]; }
      for (const key of ['estimate_per_100ml', 'estimate']) if (ing[key] !== undefined) { if (ing.estimate_per_100g === undefined) ing.estimate_per_100g = ing[key]; delete ing[key]; }
      if (ing.unit !== undefined && typeof ing.unit === 'string') { const u = ing.unit.trim().toLowerCase(); if ((u === 'g' || u === 'gram' || u === 'grams' || u === 'gr') && typeof ing.quantity === 'number' && ing.grams === undefined) { ing.grams = ing.quantity; delete ing.quantity; delete ing.unit; } else if ((u === 'ml' || u === 'milliliters' || u === 'millilitres') && typeof ing.quantity === 'number' && ing.millilitres === undefined) { ing.millilitres = ing.quantity; delete ing.quantity; delete ing.unit; } }
      return ing;
    });
  }
  // Session X-Local Part 5c: a day written as "Today", "2026/10/08" or "2026-10-8" means the same day.
  if (typeof record.day === 'string') { const day = record.day.trim().toLowerCase().replace(/\//g, '-').replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (_, y: string, m: string, d: string) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`); record.day = day; }
  if (record.kind === 'log-measurement' && record.kind_of === undefined && typeof record.measurement === 'string') { record.kind_of = record.measurement; delete record.measurement; }
  if (record.kind === 'check-in' && typeof record.partial === 'number') { record.value = record.partial; delete record.partial; }
  if (record.day === undefined || record.day === null) delete record.day;
  return record;
}
/** An opening proposal fence with no closing fence: the stream was cut, or the model forgot to close it. */
const OPEN_FENCE = /(```+|~~~+)[^\S\n]*(?:json[^\S\n]+)?zigoals[-_ ]?action[^\n]*\n/gi;
/** The calm note the cards area shows for anything that could not become an entry. */
export const NOT_AN_ENTRY = 'I couldn\u2019t turn that into an entry.';
/** Phase 2 round 4: the person's own words for today and yesterday, as a model may copy them into "day". */
const DAY_ALIASES: Record<string, string> = {today: 'today', vandaag: 'today', "aujourd'hui": 'today', yesterday: 'yesterday', gisteren: 'yesterday', hier: 'yesterday'};
function withDayAlias(part: unknown): unknown {
  if (!part || typeof part !== 'object' || Array.isArray(part)) return part;
  const day = (part as {day?: unknown}).day;
  if (typeof day !== 'string') return part;
  const alias = DAY_ALIASES[day.trim().toLowerCase()];
  return alias && alias !== day ? {...(part as object), day: alias} : part;
}
export function parseReply(reply: string): ParsedReply {
  const proposals: Action[] = [], rejected: Rejected[] = [], seen = new Set<string>(), flags = {revise: false};
  // New habits a reply names itself (new1, new2) keep their numbers; an expanded "build-habit" takes the next free one.
  let source = reply, refs = Math.max(0, ...[...reply.matchAll(/\bnew(\d{1,2})\b/gi)].map(m => Number(m[1])));
  const nextRef = () => `new${++refs}`;
  // A block that never closes (a cut stream, a forgotten fence) is removed from the text and reported, never shown half-raw.
  // An opening fence that sits inside a closed block (a fence inside a JSON string) is not an open block.
  const closed = [...source.matchAll(FENCE)].map(m => [m.index, m.index + m[0].length] as const);
  const opens = [...source.matchAll(OPEN_FENCE)].filter(m => !closed.some(([a, b]) => m.index >= a && m.index < b));
  if (opens.length) {
    const dangling = opens[opens.length - 1]!;
    const cut = source.slice(dangling.index + dangling[0].length).trim();
    rejected.push({raw: cut.slice(0, 200), reason: 'The proposal was cut off before it finished.'});
    source = source.slice(0, dangling.index);
  }
  const text = source.replace(FENCE, (block, _fence: string, body: string) => {
    // Strict JSON first; almost-JSON is repaired (Session X-Local Part 5c) and then held to the same whitelist.
    const parsed: unknown = repairJson(body);
    if (parsed === null) { rejected.push({raw: body.trim().slice(0, 200), reason: 'The proposal was not valid JSON.'}); return ''; }
    const unwrapped = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !('kind' in (parsed as object)) && Object.keys(parsed as object).length === 1 ? Object.values(parsed as object)[0] : parsed;
    const items = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
    for (const item of items) {
      if (!item || typeof item !== 'object') { rejected.push({raw: JSON.stringify(item ?? null).slice(0, 200), reason: 'The proposal was not an object.'}); continue; }
      const normalised = normalise(coerceNumbers(item), flags) as Record<string, unknown>;
      let parts: unknown[] = [normalised];
      if ((COMPOSITE_KINDS as readonly unknown[]).includes(normalised.kind)) {
        const composite = compositeSchema.safeParse(normalised);
        if (!composite.success) { rejected.push({raw: JSON.stringify(item).slice(0, 200), reason: firstIssue(composite.error)}); continue; }
        parts = expandComposite(composite.data, nextRef);
      }
      for (const part of parts) {
        const result = actionSchema.safeParse(withDayAlias(part));
        if (!result.success) { rejected.push({raw: JSON.stringify(part).slice(0, 200), reason: firstIssue(result.error)}); continue; }
        const key = JSON.stringify(result.data);
        if (seen.has(key)) continue;
        if (proposals.length >= MAX_PROPOSALS) { rejected.push({raw: key.slice(0, 200), reason: `Only the first ${MAX_PROPOSALS} proposals of a reply are shown.`}); continue; }
        seen.add(key); proposals.push(result.data);
      }
    }
    void block; return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return {text, proposals, rejected, ...(flags.revise ? {revise: true} : {})};
}
/** Whether a reply still has an open proposal fence (streaming): nothing is parsed before it closes. */
export function hasOpenFence(partial: string): boolean { const opens = partial.match(new RegExp(`(\`\`\`+|~~~+)[^\\S\\n]*(?:json[^\\S\\n]+)?${ACTION_FENCE.replace('-', '[-_ ]?')}`, 'gi'))?.length ?? 0; return opens > (partial.match(FENCE)?.length ?? 0); }
