import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {EARN_ACADEMY_KEY, EARN_PATH_KEY, EARN_PREFS_KEY} from '../af-earn-keys';

/**
 * Session AF (L1, ADR-028 H10; `TIER 3 (storage)`): the Earn device records' formats (lib/af-earn-keys.ts names the keys).
 * Each is a loose object at `version: 1`: a field or an id this build does not know is kept on every write and ignored on
 * screen, so a later build's additions survive this one. A record that does not parse reads as empty and is never
 * rewritten by a read (lib/device-record.ts). Nothing here is synced.
 *
 *   zigoals:earn-path:v1     {version: 1, steps?: {[stepId]: {done?, at?}}, todayCard?: 'auto' | 'dismissed', visited?: string[]}
 *   zigoals:earn-academy:v1  {version: 1, lessons?: {[lessonId]: {read?, score?, passedAt?, attempts?}}}
 *   zigoals:earn-prefs:v1    {version: 1, pageShown?, dockShown?, dockFolded?, dockOrder?: string[]}
 */
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/);
const stamp = z.iso.datetime({offset: true});
const bounded = <T extends z.ZodType>(value: T, max: number) => z.record(id, value).refine(r => Object.keys(r).length <= max, `At most ${max} entries.`);
export const MAX_STEPS = 24, MAX_VISITED = 24, MAX_LESSONS = 32, MAX_DOCK = 12;

export const earnPathSchema = z.looseObject({
  version: z.literal(1),
  steps: bounded(z.looseObject({done: z.boolean().optional(), at: stamp.optional()}), MAX_STEPS).optional(),
  todayCard: z.enum(['auto', 'dismissed']).optional(),
  visited: z.array(id).max(MAX_VISITED).optional(),
});
export type EarnPath = z.infer<typeof earnPathSchema>;
export const EARN_PATH: DeviceRecordSpec<EarnPath> = {key: EARN_PATH_KEY, schema: earnPathSchema, empty: () => ({version: 1 as const})};

// A score is any number in the record; only a whole 0–3 counts (a later build's wider scale is kept, not shown).
export const earnAcademySchema = z.looseObject({
  version: z.literal(1),
  lessons: bounded(z.looseObject({read: z.boolean().optional(), score: z.number().finite().optional(), passedAt: stamp.optional(), attempts: z.number().int().nonnegative().max(10_000).optional()}), MAX_LESSONS).optional(),
});
export type EarnAcademy = z.infer<typeof earnAcademySchema>;
export const EARN_ACADEMY: DeviceRecordSpec<EarnAcademy> = {key: EARN_ACADEMY_KEY, schema: earnAcademySchema, empty: () => ({version: 1 as const})};

export const earnPrefsSchema = z.looseObject({
  version: z.literal(1),
  pageShown: z.boolean().optional(),
  dockShown: z.boolean().optional(),
  dockFolded: z.boolean().optional(),
  dockOrder: z.array(id).max(MAX_DOCK).optional(),
});
export type EarnPrefs = z.infer<typeof earnPrefsSchema>;
export const EARN_PREFS: DeviceRecordSpec<EarnPrefs> = {key: EARN_PREFS_KEY, schema: earnPrefsSchema, empty: () => ({version: 1 as const})};

// ---- Start here ----
/** The ticks for the steps this build knows, in its order; unknown ids stay in the record and are left out here. */
export function stepsOf(record: EarnPath, known: readonly string[]): {id: string; done: boolean; at?: string}[] {
  return known.map(stepId => { const s = record.steps?.[stepId]; return {id: stepId, done: s?.done === true, ...(s?.at ? {at: s.at} : {})}; });
}
export function markStep(record: EarnPath, stepId: string, done: boolean, at = new Date().toISOString()): EarnPath {
  id.parse(stepId);
  const steps = {...record.steps, [stepId]: {...record.steps?.[stepId], done, at}};
  if (Object.keys(steps).length > MAX_STEPS) throw new Error('Too many Start-here steps on this device.');
  return {...record, steps};
}
export const dismissTodayCard = (record: EarnPath): EarnPath => ({...record, todayCard: 'dismissed'});
/** Session AF chunk 2: the Today card's choice as a change (dismissed from Today; `auto` brings it back). */
export const setTodayCard = (value: 'auto' | 'dismissed') => (record: EarnPath): EarnPath => ({...record, todayCard: value});
/** Remembers a section the person opened (most recent last), at most 24. */
export function markVisited(record: EarnPath, section: string): EarnPath {
  id.parse(section);
  return {...record, visited: [...(record.visited ?? []).filter(v => v !== section), section].slice(-MAX_VISITED)};
}

// ---- Academy ----
/** The lesson's score when it is a whole 0–3, else nothing (not an error). */
export function lessonScore(record: EarnAcademy, lessonId: string): 0 | 1 | 2 | 3 | undefined {
  const s = record.lessons?.[lessonId]?.score;
  return s === 0 || s === 1 || s === 2 || s === 3 ? s : undefined;
}
export function recordLesson(record: EarnAcademy, lessonId: string, change: {read?: true; score?: 0 | 1 | 2 | 3}, at = new Date().toISOString()): EarnAcademy {
  id.parse(lessonId);
  const before = record.lessons?.[lessonId] ?? {};
  const next = {...before, ...(change.read ? {read: true} : {}),
    ...(change.score !== undefined ? {score: change.score, attempts: (before.attempts ?? 0) + 1, ...(change.score === 3 && !before.passedAt ? {passedAt: at} : {})} : {})};
  const lessons = {...record.lessons, [lessonId]: next};
  if (Object.keys(lessons).length > MAX_LESSONS) throw new Error('Too many lessons on this device.');
  return {...record, lessons};
}

// ---- Display choices ----
/** Missing fields are the defaults: the page shown, the dock hidden, not folded. Session AG Polish 3 (ADR-032 L18, owner Part 7;
 *  `TIER 3 (stored preference default)`): the Earn dock is off unless the person turns it on in Settings — new people, the
 *  Showcase and anyone who never chose; a choice already stored (`dockShown: true` or `false`) is kept as it is. */
export function earnPrefsOf(record: EarnPrefs): {pageShown: boolean; dockShown: boolean; dockFolded: boolean; dockOrder: string[]} {
  return {pageShown: record.pageShown !== false, dockShown: record.dockShown === true, dockFolded: record.dockFolded === true, dockOrder: record.dockOrder ?? []};
}
export function setEarnPref(record: EarnPrefs, change: Partial<Pick<EarnPrefs, 'pageShown' | 'dockShown' | 'dockFolded' | 'dockOrder'>>): EarnPrefs {
  return earnPrefsSchema.parse({...record, ...change});
}
