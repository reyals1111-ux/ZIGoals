import {VERBS} from './intent';

/**
 * Session AV lane 2 (tasks, LEDGER #1, #4; Todoist's Ramble and its "split into tasks" suggestion), word rules only, no
 * model. Speech has no commas, so one spoken line naming several to-dos is split at the words people say between them
 * ("and then", "also", "after that", "en dan", "daarna", "ook nog"), and at "and"/"en" when a to-do verb follows ("buy
 * milk and call mum"). "Remove that", "scratch that", "never mind", "haal dat weg", "laat dat maar" and "schrap dat" take
 * the to-do said just before them away. A typed line that is long and joined the same way is OFFERED as several tasks,
 * never split by itself. Pure.
 */
const JOINERS = /\s*(?:,\s*)?\b(?:and then|and also|and after that|after that|and next|then also|also|plus|en dan|en ook|en daarna|daarna|ook nog|verder nog|en verder)\b\s*,?\s*/giu;
const REMOVE = /\s*(?:,\s*)?\b(?:remove that|scratch that|delete that|forget that|never mind|cancel that|haal dat (?:weg|eruit)|laat dat maar|schrap dat|vergeet dat|streep dat door)\b[.!]?\s*/giu;
const MARK = '\u0000', DROP = '\u0001';
/** Splits at "and"/"en" only where a to-do verb follows. */
function splitAtVerbAnd(part: string): string[] {
  const out: string[] = [];
  let rest = part;
  for (let guard = 0; guard < 20; guard++) {
    const m = /\s+(?:and|en|&)\s+(\p{L}+)/iu.exec(rest);
    if (!m || !VERBS.has(m[1]!.toLowerCase())) {
      // A later "and <verb>" after a non-verb "and" ("bread and butter and call mum").
      const later = m ? /\s+(?:and|en|&)\s+(\p{L}+)/iu.exec(rest.slice(m.index + m[0].length)) : null;
      if (m && later && VERBS.has(later[1]!.toLowerCase())) { const at = m.index + m[0].length + later.index; out.push(rest.slice(0, at)); rest = rest.slice(at + later[0].length - later[1]!.length); continue; }
      break;
    }
    out.push(rest.slice(0, m.index)); rest = rest.slice(m.index + m[0].length - m[1]!.length);
  }
  out.push(rest);
  return out;
}
const clean = (s: string) => s.replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, '').replace(/\s+/g, ' ').trim();
/** The to-dos of one spoken (or typed) line, with what "remove that" took away; null when it names only one thing. */
export function spokenTasks(text: string): {items: string[]; removed: string[]} | null {
  const marked = text.replace(REMOVE, ` ${DROP} `).replace(JOINERS, ` ${MARK} `);
  const items: string[] = [], removed: string[] = [];
  for (const chunk of marked.split(MARK)) {
    const pieces = chunk.split(DROP);
    pieces.forEach((piece, i) => {
      for (const p of splitAtVerbAnd(piece).map(clean).filter(Boolean)) items.push(p);
      if (i < pieces.length - 1 && items.length) removed.push(items.pop()!);
    });
  }
  const kept = items.filter(i => /\p{L}/u.test(i)).slice(0, 20);
  if (kept.length < 2 && !removed.length) return null;
  return {items: kept, removed};
}
/** A long typed line joined like speech ("Call the bank about the card and then book the dentist for Friday"), offered as several tasks. */
export function splitSuggestion(text: string): string[] | null {
  const line = text.trim();
  if (line.length < 40 || line.split(/\s+/).length < 7 || /[\r\n]/.test(line)) return null;
  const read = spokenTasks(line);
  return read && !read.removed.length && read.items.length >= 2 && read.items.every(i => i.split(/\s+/).length >= 2) ? read.items : null;
}
