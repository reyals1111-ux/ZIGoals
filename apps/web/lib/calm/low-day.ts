import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #416, Moodfit's plan for a hard day): "On a low day" — the person's own
 * page, written on a good day for a harder one: small things that help, people they could message, and things that can
 * wait for another day, with a line of their own. Only their own words: ZIGoals suggests nothing, reads nothing into it,
 * gives no clinical guidance and never sends it to ZIGi's AI. The help lines the app already shows (lib/calm/help-line.ts,
 * the same numbers as ZIGi's distress reply) sit under it. Its own device record `zigoals:low-day:v1` (TIER 3 stored
 * format: a new key, loose and versioned; in Export everything, Restore and the erase; never synced). Pure.
 */
export const LOW_DAY_KEY = 'zigoals:low-day:v1';
export const LOW_DAY_PARTS = ['helps', 'people', 'later'] as const;
export type LowDayPart = typeof LOW_DAY_PARTS[number];
export const LOW_DAY_MAX: Record<LowDayPart, number> = {helps: 12, people: 8, later: 12};
export const LOW_DAY_LINE_MAX = 120, LOW_DAY_NOTE_MAX = 600;
const line = z.string().trim().min(1).max(LOW_DAY_LINE_MAX);
const lines = (max: number) => z.preprocess(v => Array.isArray(v) ? v.filter(x => line.safeParse(x).success).slice(0, max) : undefined, z.array(line).max(max).optional()).optional().catch(undefined);
export const lowDaySchema = z.looseObject({
  version: z.literal(1),
  helps: lines(LOW_DAY_MAX.helps),
  people: lines(LOW_DAY_MAX.people),
  later: lines(LOW_DAY_MAX.later),
  note: z.string().trim().min(1).max(LOW_DAY_NOTE_MAX).optional().catch(undefined),
  updatedAt: z.iso.datetime().optional().catch(undefined),
});
export type LowDay = z.infer<typeof lowDaySchema>;
export const emptyLowDay = (): LowDay => ({version: 1});
export const LOW_DAY: DeviceRecordSpec<LowDay> = {key: LOW_DAY_KEY, schema: lowDaySchema, empty: emptyLowDay};
export const LOW_DAY_WORDS: Record<LowDayPart, {title: string; hint: string; add: string; nl: string}> = {
  helps: {title: 'Small things that help me', hint: 'A shower, a short walk, a song, tea by the window…', add: 'Add something that helps', nl: 'Kleine dingen die mij helpen'},
  people: {title: 'People I could message', hint: 'A name, and what you might say: “Can we talk for ten minutes?”', add: 'Add a person', nl: 'Mensen die ik een bericht kan sturen'},
  later: {title: 'Things that can wait for another day', hint: 'The inbox, the laundry, the plan for next week…', add: 'Add something that can wait', nl: 'Dingen die kunnen wachten'},
};
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const stamp = (r: LowDay, at: Date): LowDay => ({...r, updatedAt: at.toISOString()});
const set = (r: LowDay, part: LowDayPart, list: string[]): LowDay => { const next = {...r} as Record<string, unknown>; if (list.length) next[part] = list; else delete next[part]; return next as LowDay; };
/** Adds a line to a part; throws a sentence on an empty or long line, a repeat or a full part. */
export function addLowDayLine(r: LowDay, part: LowDayPart, text: string, at: Date): LowDay {
  const t = clean(text), list = r[part] ?? [];
  if (!t) throw Error('Type a line first.');
  if (t.length > LOW_DAY_LINE_MAX) throw Error(`Keep a line to ${LOW_DAY_LINE_MAX} characters.`);
  if (list.some(x => x.toLowerCase() === t.toLowerCase())) throw Error(`“${t}” is on your page already.`);
  if (list.length >= LOW_DAY_MAX[part]) throw Error(`Up to ${LOW_DAY_MAX[part]} lines fit here. Remove one first.`);
  return stamp(set(r, part, [...list, t]), at);
}
export const removeLowDayLine = (r: LowDay, part: LowDayPart, text: string, at: Date): LowDay => stamp(set(r, part, (r[part] ?? []).filter(x => x !== text)), at);
export function restoreLowDayLine(r: LowDay, part: LowDayPart, text: string, index: number, at: Date): LowDay {
  const list = (r[part] ?? []).filter(x => x !== text); list.splice(Math.max(0, Math.min(index, list.length)), 0, text);
  return stamp(set(r, part, list.slice(0, LOW_DAY_MAX[part])), at);
}
/** The line of the person's own (empty text removes it). */
export function setLowDayNote(r: LowDay, text: string, at: Date): LowDay {
  const t = text.trim();
  if (t.length > LOW_DAY_NOTE_MAX) throw Error(`Keep it to ${LOW_DAY_NOTE_MAX} characters.`);
  const next = {...r} as Record<string, unknown>; if (t) next.note = t; else delete next.note;
  return stamp(next as LowDay, at);
}
export const lowDayLines = (r: LowDay) => LOW_DAY_PARTS.reduce((t, p) => t + (r[p]?.length ?? 0), 0) + (r.note ? 1 : 0);
