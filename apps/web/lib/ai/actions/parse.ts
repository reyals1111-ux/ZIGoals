import {ACTION_FENCE} from '../context/specialists';
import {KIND_ALIASES, MAX_PROPOSALS, actionSchema, type Action} from './schema';

/**
 * Reads the proposals out of a finished reply (ADR-012, Part 5). Runs only after the stream ends: a half-received block
 * is never shown as a card. Tolerant of fence variants (``` or ~~~, zigoals-action, zigoals_action, zigoals action,
 * an extra "json" word), of one object or an array per block, and of alias kinds. Everything else is text. Blocks are
 * removed from the displayed text; invalid or unknown proposals are reported in plain words, never shown as cards;
 * duplicates are dropped; at most ten proposals survive. Whatever the person's records said inside the reply is still
 * just text: this parser is the only way a reply reaches the action layer, and it only knows the whitelist.
 */
export type Rejected = {raw: string; reason: string};
export type ParsedReply = {text: string; proposals: Action[]; rejected: Rejected[]};
const FENCE = /(```+|~~~+)[^\S\n]*(?:json[^\S\n]+)?zigoals[-_ ]?action[^\n]*\n([\s\S]*?)\n[^\S\n]*\1[^\S\n]*(?=\n|$)/gi;
const firstIssue = (error: {issues: {path: PropertyKey[]; message: string}[]}) => { const issue = error.issues[0]; return issue ? `${issue.path.length ? `${issue.path.map(String).join('.')}: ` : ''}${issue.message}` : 'invalid'; };
function normalise(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = {...(value as Record<string, unknown>)};
  if (typeof record.kind === 'string') { const kind = record.kind.trim().toLowerCase(); record.kind = KIND_ALIASES[kind] ?? kind; }
  if (record.kind === 'log-measurement' && record.kind_of === undefined && typeof record.measurement === 'string') { record.kind_of = record.measurement; delete record.measurement; }
  if (record.kind === 'check-in' && typeof record.partial === 'number') { record.value = record.partial; delete record.partial; }
  if (record.day === undefined || record.day === null) delete record.day;
  return record;
}
export function parseReply(reply: string): ParsedReply {
  const proposals: Action[] = [], rejected: Rejected[] = [], seen = new Set<string>();
  const text = reply.replace(FENCE, (block, _fence: string, body: string) => {
    let parsed: unknown;
    try { parsed = JSON.parse(body.trim()); } catch { rejected.push({raw: body.trim().slice(0, 200), reason: 'The proposal was not valid JSON.'}); return ''; }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      const result = actionSchema.safeParse(normalise(item));
      if (!result.success) { rejected.push({raw: JSON.stringify(item).slice(0, 200), reason: firstIssue(result.error)}); continue; }
      const key = JSON.stringify(result.data);
      if (seen.has(key)) continue;
      if (proposals.length >= MAX_PROPOSALS) { rejected.push({raw: key.slice(0, 200), reason: `Only the first ${MAX_PROPOSALS} proposals of a reply are shown.`}); continue; }
      seen.add(key); proposals.push(result.data);
    }
    void block; return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return {text, proposals, rejected};
}
/** Whether a reply still has an open proposal fence (streaming): nothing is parsed before it closes. */
export function hasOpenFence(partial: string): boolean { const opens = partial.match(new RegExp(`(\`\`\`+|~~~+)[^\\S\\n]*(?:json[^\\S\\n]+)?${ACTION_FENCE.replace('-', '[-_ ]?')}`, 'gi'))?.length ?? 0; return opens > (partial.match(FENCE)?.length ?? 0); }
