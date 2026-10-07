import {ACTION_FENCE} from '../context/specialists';
import {COMPOSITE_KINDS, KIND_ALIASES, MAX_PROPOSALS, actionSchema, compositeSchema, expandComposite, type Action} from './schema';

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
/** `revise` (Session X-Local Part 5a): a block carried "revise": true, so the previous reply's still-pending cards are replaced by this reply's. */
export type ParsedReply = {text: string; proposals: Action[]; rejected: Rejected[]; revise?: boolean};
const FENCE = /(```+|~~~+)[^\S\n]*(?:json[^\S\n]+)?zigoals[-_ ]?action[^\n]*\n([\s\S]*?)\n[^\S\n]*\1[^\S\n]*(?=\n|$)/gi;
const firstIssue = (error: {issues: {path: PropertyKey[]; message: string}[]}) => { const issue = error.issues[0]; return issue ? `${issue.path.length ? `${issue.path.map(String).join('.')}: ` : ''}${issue.message}` : 'invalid'; };
function normalise(value: unknown, flags: {revise: boolean}): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = {...(value as Record<string, unknown>)};
  // Session X-Local Part 5a: "revise": true marks a correction of the previous reply; it is never a field of a card.
  if ('revise' in record) { if (record.revise === true) flags.revise = true; delete record.revise; }
  if (typeof record.kind === 'string') { const kind = record.kind.trim().toLowerCase(); record.kind = KIND_ALIASES[kind] ?? kind; }
  if (record.kind === 'log-measurement' && record.kind_of === undefined && typeof record.measurement === 'string') { record.kind_of = record.measurement; delete record.measurement; }
  if (record.kind === 'check-in' && typeof record.partial === 'number') { record.value = record.partial; delete record.partial; }
  if (record.day === undefined || record.day === null) delete record.day;
  return record;
}
/** An opening proposal fence with no closing fence: the stream was cut, or the model forgot to close it. */
const OPEN_FENCE = /(```+|~~~+)[^\S\n]*(?:json[^\S\n]+)?zigoals[-_ ]?action[^\n]*\n/gi;
/** The calm note the cards area shows for anything that could not become an entry. */
export const NOT_AN_ENTRY = 'I couldn\u2019t turn that into an entry.';
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
    let parsed: unknown;
    try { parsed = JSON.parse(body.trim()); } catch { rejected.push({raw: body.trim().slice(0, 200), reason: 'The proposal was not valid JSON.'}); return ''; }
    const unwrapped = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !('kind' in (parsed as object)) && Object.keys(parsed as object).length === 1 ? Object.values(parsed as object)[0] : parsed;
    const items = Array.isArray(unwrapped) ? unwrapped : [unwrapped];
    for (const item of items) {
      if (!item || typeof item !== 'object') { rejected.push({raw: JSON.stringify(item ?? null).slice(0, 200), reason: 'The proposal was not an object.'}); continue; }
      const normalised = normalise(item, flags) as Record<string, unknown>;
      let parts: unknown[] = [normalised];
      if ((COMPOSITE_KINDS as readonly unknown[]).includes(normalised.kind)) {
        const composite = compositeSchema.safeParse(normalised);
        if (!composite.success) { rejected.push({raw: JSON.stringify(item).slice(0, 200), reason: firstIssue(composite.error)}); continue; }
        parts = expandComposite(composite.data, nextRef);
      }
      for (const part of parts) {
        const result = actionSchema.safeParse(part);
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
