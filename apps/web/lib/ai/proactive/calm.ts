import {FORBIDDEN_INSIGHT_WORDS} from '../../insights/engine';

/**
 * The tone every proactive line of ZIGi keeps (Session V Part 9; ADR-011's rules, the same lists as T's chip test and
 * the Guide): no shame, no praise inflation, no urgency, no exclamation mark or emoji. Insight sentences also keep the
 * insight engine's words out: they observe a pairing in counts and claim nothing. Used by the tests, never to rewrite.
 */
export const SHAME = /\b(failed|missed|only|should|must|behind|lazy|lost|broke)\b/i;
export const INFLATION = /\b(amazing|crushing|incredible|perfect|great job|well done)\b/i;
export const URGENCY = /\b(now|hurry|last chance|asap|immediately)\b|before it is too late/i;
export const LOUD = /!|\p{Extended_Pictographic}/u;
export const INSIGHT_WORDS = new RegExp(`\\b(${FORBIDDEN_INSIGHT_WORDS.join('|')})\\b`, 'i');
/** The first rule a line breaks, or null when it is calm. */
export function toneProblem(line: string, insight = false): string | null {
  if (LOUD.test(line)) return 'exclamation mark or emoji';
  if (SHAME.test(line)) return 'shame';
  if (INFLATION.test(line)) return 'praise inflation';
  if (URGENCY.test(line)) return 'urgency';
  if (insight && INSIGHT_WORDS.test(line)) return 'a causal or judging word';
  return null;
}
/** A record's name shortened for a chip or a brief line ("Meditate", "Japan adventure"). */
export function shortName(name: string, max = 28): string {
  const clean = name.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
/** "Read", "Read and Walk", "Read, Walk and 2 more". */
export function listNames(names: readonly string[], shown = 3): string {
  const head = names.slice(0, shown), rest = names.length - head.length;
  if (rest > 0) return `${head.join(', ')} and ${rest} more`;
  return head.length <= 1 ? head.join('') : `${head.slice(0, -1).join(', ')} and ${head.at(-1)}`;
}
