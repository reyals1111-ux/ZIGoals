import type {Energy} from '../energy/schema';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #412, Moodfit's own strategies): "What lifts me" — the person's own short
 * lines (a walk round the block, a call to my sister, that one song), up to 12, kept as the optional `lifts` of the loose
 * daily energy record (`zigoals:energy:v1`, TIER 3 stored format, additive). They are offered first, beside the built-in
 * choices, when a check-in's word is unpleasant, and one tap makes one a task for today. The person's own words only:
 * nothing is suggested, scored or read into them, and they are never put in a notification. Pure.
 */
export const MAX_LIFTS = 12, LIFT_MAX_CHARS = 80;
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
/** The lines this build can read, in the person's order (an unreadable or repeated line is left out, and kept no longer). */
export function liftsOf(energy: Pick<Energy, 'lifts'> | null | undefined): string[] {
  const out: string[] = [];
  for (const raw of energy?.lifts ?? []) {
    if (typeof raw !== 'string') continue;
    const line = clean(raw);
    if (line && line.length <= LIFT_MAX_CHARS && !out.some(x => x.toLowerCase() === line.toLowerCase())) out.push(line);
    if (out.length === MAX_LIFTS) break;
  }
  return out;
}
const withLifts = (energy: Energy, lines: string[]): Energy => {
  const next = {...energy} as Energy & {lifts?: unknown[]};
  if (lines.length) next.lifts = lines; else delete next.lifts;
  return next;
};
/** Adds a line at the end; throws a sentence on an empty line, a repeat, a line too long or a full list. */
export function addLift(energy: Energy, text: string): Energy {
  const line = clean(text), list = liftsOf(energy);
  if (!line) throw Error('Type something that lifts you first.');
  if (line.length > LIFT_MAX_CHARS) throw Error(`Keep it to ${LIFT_MAX_CHARS} characters.`);
  if (list.some(x => x.toLowerCase() === line.toLowerCase())) throw Error(`“${line}” is in your list already.`);
  if (list.length >= MAX_LIFTS) throw Error(`Up to ${MAX_LIFTS} fit. Remove one first.`);
  return withLifts(energy, [...list, line]);
}
export const removeLift = (energy: Energy, text: string): Energy => withLifts(energy, liftsOf(energy).filter(x => x !== text));
/** Moves a line one place up (-1) or down (1); at an end nothing changes. */
export function moveLift(energy: Energy, text: string, by: -1 | 1): Energy {
  const list = liftsOf(energy), i = list.indexOf(text), j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return energy;
  [list[i], list[j]] = [list[j]!, list[i]!];
  return withLifts(energy, list);
}
/** Puts a removed line back where it was (Undo). */
export function restoreLift(energy: Energy, text: string, at: number): Energy {
  const list = liftsOf(energy).filter(x => x.toLowerCase() !== clean(text).toLowerCase());
  list.splice(Math.max(0, Math.min(at, list.length)), 0, clean(text));
  return withLifts(energy, list.slice(0, MAX_LIFTS));
}
