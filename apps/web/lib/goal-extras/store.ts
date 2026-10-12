import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Goal extras (Session AA-Cloud Part 2, `[TIER 3] (storage)`): what Goals best-in-class adds to a goal, kept on this
 * device only, beside the synced goal record and never inside it (ADR-021 A3: the finance goal schema is strict and
 * #32–#37 would refuse a new field). Keyed by the goal's key as Goals shows it (`private:<id>`, `legacy:<id>`,
 * `health:<id>`, `average:<id>`), loose (unknown fields are kept and ignored) and versioned.
 *
 * - `area` (G2): one of the built-in life areas or a custom area's id.
 * - `why`, `obstacle`, `ifThen` (G4): why it matters, what could get in the way, the if-then plan.
 * - `parentKey` (G5): the goal this one is a sub-goal of (year → quarter → month); cycles are refused.
 * - `vision` (G3): a gradient, an emoji, or a photo kept in this device's IndexedDB (`lib/vision/store.ts`).
 * - `story` (G7): a few words for the Hall of achievements.
 * - `template` (G6): the library template the goal started from.
 * Custom areas live in the same record (`areas`). Every mutator below is pure: it returns the next record and never
 * touches storage, so ZIGi card kinds can call them later (docs/handoff/AA_CLOUD_TO_LOCAL.md).
 */
export const GOAL_EXTRAS_KEY = 'zigoals:goal-extras:v1';
export const MAX_GOAL_EXTRAS = 500, MAX_CUSTOM_AREAS = 12, TEXT_MAX = 1000;

export const BUILT_IN_AREAS = [
  {id: 'health', label: 'Health', color: '#5ee0c8'},
  {id: 'mind', label: 'Habits & Mind', color: '#8fa6ff'},
  {id: 'wealth', label: 'Wealth', color: '#f2c46b'},
  {id: 'relationships', label: 'Relationships', color: '#f08bd6'},
  {id: 'career', label: 'Career', color: '#6fd3f6'},
  {id: 'learning', label: 'Learning', color: '#c790f6'},
  {id: 'fun', label: 'Fun', color: '#ff9f8a'},
] as const;
export type BuiltInArea = (typeof BUILT_IN_AREAS)[number]['id'];

const key = z.string().regex(/^(private|legacy|health|average):[A-Za-z0-9_-]{1,80}$/);
const text = z.string().max(TEXT_MAX);
export const GRADIENTS = ['aurora', 'sunrise', 'ocean', 'nebula', 'forest', 'ember', 'dusk', 'glacier'] as const;
const visionSchema = z.discriminatedUnion('kind', [
  z.looseObject({kind: z.literal('gradient'), gradient: z.enum(GRADIENTS), emoji: z.string().max(16).optional()}),
  z.looseObject({kind: z.literal('emoji'), emoji: z.string().min(1).max(16), gradient: z.enum(GRADIENTS).optional()}),
  z.looseObject({kind: z.literal('photo'), imageId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/), alt: z.string().max(200).optional()}),
]);
export const goalExtraSchema = z.looseObject({
  area: z.string().regex(/^[a-z0-9-]{1,40}$/).optional(),
  why: text.optional(), obstacle: text.optional(), ifThen: text.optional(),
  parentKey: key.optional(),
  vision: visionSchema.optional(),
  story: z.string().max(2000).optional(),
  template: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
  updatedAt: z.iso.datetime().optional(),
});
export const customAreaSchema = z.looseObject({id: z.string().regex(/^custom-[a-z0-9-]{1,30}$/), label: z.string().trim().min(1).max(30), color: z.string().regex(/^#[0-9a-f]{6}$/i)});
export const goalExtrasSchema = z.looseObject({
  version: z.literal(1),
  goals: z.record(key, goalExtraSchema).refine(g => Object.keys(g).length <= MAX_GOAL_EXTRAS, `Up to ${MAX_GOAL_EXTRAS} goals.`),
  areas: z.array(customAreaSchema).max(MAX_CUSTOM_AREAS),
  /** G2 through the handoff: a habit's life area (Habits are Session AA-Local's; it calls `setHabitArea`). */
  habitAreas: z.record(z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), z.string().regex(/^[a-z0-9-]{1,40}$/)).optional(),
  /** Extras of goals this device no longer shows, kept 90 days (`reconcileGoalExtras`). */
  dormant: z.record(key, goalExtraSchema.extend({dormantSince: z.iso.date()})).optional(),
});
export type GoalExtra = z.infer<typeof goalExtraSchema>;
export type GoalExtras = z.infer<typeof goalExtrasSchema>;
export type CustomArea = z.infer<typeof customAreaSchema>;
export type Vision = NonNullable<GoalExtra['vision']>;
type Dormant = Record<string, GoalExtra & {dormantSince: string}>;
export const emptyGoalExtras = (): GoalExtras => ({version: 1, goals: {}, areas: []});
export const GOAL_EXTRAS: DeviceRecordSpec<GoalExtras> = {key: GOAL_EXTRAS_KEY, schema: goalExtrasSchema, empty: emptyGoalExtras};

/** G2: a habit's life area, or none (null). Habits default to "Habits & Mind" in the balance wheel when they have none. */
export function setHabitArea(extras: GoalExtras, habitId: string, area: string | null): GoalExtras {
  if (area !== null && !areasOf(extras).some(a => a.id === area)) throw Error('Choose one of your life areas.');
  const habitAreas = {...(extras.habitAreas ?? {})};
  if (area === null) delete habitAreas[habitId]; else habitAreas[habitId] = area;
  return goalExtrasSchema.parse({...extras, habitAreas});
}
/** Every area a person can pick: the seven built in, then their own. */
export function areasOf(extras: GoalExtras): {id: string; label: string; color: string; custom: boolean}[] {
  return [...BUILT_IN_AREAS.map(a => ({...a, custom: false})), ...extras.areas.map(a => ({...a, custom: true}))];
}
export const areaLabel = (extras: GoalExtras, id: string | undefined) => id ? areasOf(extras).find(a => a.id === id)?.label : undefined;

const clean = (extra: GoalExtra): GoalExtra | null => {
  const out: GoalExtra = {...extra};
  for (const k of ['why', 'obstacle', 'ifThen', 'story'] as const) if (typeof out[k] === 'string' && !out[k]!.trim()) delete out[k];
  const {updatedAt: _u, ...rest} = out; void _u;
  return Object.values(rest).some(v => v !== undefined) ? out : null;
};
function put(extras: GoalExtras, goalKey: string, next: GoalExtra | null, at: string): GoalExtras {
  key.parse(goalKey);
  const goals = {...extras.goals};
  const kept = next && clean(next);
  if (kept) goals[goalKey] = {...kept, updatedAt: at}; else delete goals[goalKey];
  return goalExtrasSchema.parse({...extras, goals});
}

/** G2: sets or clears a goal's life area (an unknown area is refused). */
export function setGoalArea(extras: GoalExtras, goalKey: string, area: string | null, at: string): GoalExtras {
  if (area !== null && !areasOf(extras).some(a => a.id === area)) throw Error('Choose one of your life areas.');
  const current = extras.goals[goalKey] ?? {};
  return put(extras, goalKey, {...current, area: area ?? undefined}, at);
}
/** G4: why it matters, what could get in the way, the if-then plan (empty text clears a field). */
export function setGoalReasons(extras: GoalExtras, goalKey: string, reasons: {why?: string; obstacle?: string; ifThen?: string}, at: string): GoalExtras {
  const current = extras.goals[goalKey] ?? {};
  return put(extras, goalKey, {...current, ...reasons}, at);
}
/** G3: a gradient, an emoji or a photo reference (the image itself is in `lib/vision/store.ts`); null clears it. */
export function setGoalVision(extras: GoalExtras, goalKey: string, vision: Vision | null, at: string): GoalExtras {
  const current = extras.goals[goalKey] ?? {};
  return put(extras, goalKey, {...current, vision: vision ?? undefined}, at);
}
/** G7: the few words a finished goal keeps on the Hall of achievements. */
export function setGoalStory(extras: GoalExtras, goalKey: string, story: string, at: string): GoalExtras {
  const current = extras.goals[goalKey] ?? {};
  return put(extras, goalKey, {...current, story}, at);
}
/** G6: the template a goal started from. */
export function setGoalTemplate(extras: GoalExtras, goalKey: string, template: string | null, at: string): GoalExtras {
  const current = extras.goals[goalKey] ?? {};
  return put(extras, goalKey, {...current, template: template ?? undefined}, at);
}
/** The chain of parents above a goal, nearest first (stops at a cycle or after 12 steps). */
export function ancestorsOf(extras: GoalExtras, goalKey: string): string[] {
  const out: string[] = [];
  for (let at = extras.goals[goalKey]?.parentKey; at && !out.includes(at) && at !== goalKey && out.length < 12; at = extras.goals[at]?.parentKey) out.push(at);
  return out;
}
/** G5: makes a goal a sub-goal of another, or a top goal again (null). A goal can never sit under itself or its own sub-goals; at most three levels. */
export function setGoalParent(extras: GoalExtras, goalKey: string, parentKey: string | null, at: string): GoalExtras {
  if (parentKey !== null) {
    key.parse(parentKey);
    if (parentKey === goalKey) throw Error('A goal cannot be its own sub-goal.');
    if (ancestorsOf(extras, parentKey).includes(goalKey)) throw Error('That goal is already under this one.');
    if (ancestorsOf(extras, parentKey).length >= 2 || depthBelow(extras, goalKey) + ancestorsOf(extras, parentKey).length + 2 > 3) throw Error('Goals go three levels deep at most (for example year, quarter, month).');
  }
  const current = extras.goals[goalKey] ?? {};
  return put(extras, goalKey, {...current, parentKey: parentKey ?? undefined}, at);
}
/** The goals directly under one goal. */
export const childrenOf = (extras: GoalExtras, goalKey: string) => Object.entries(extras.goals).filter(([, e]) => e.parentKey === goalKey).map(([k]) => k);
function depthBelow(extras: GoalExtras, goalKey: string, seen = new Set<string>()): number {
  if (seen.has(goalKey)) return 0;
  seen.add(goalKey);
  const kids = childrenOf(extras, goalKey);
  return kids.length ? 1 + Math.max(...kids.map(k => depthBelow(extras, k, seen))) : 0;
}
/** G2: adds a custom life area; returns the record and the new area's id. */
export function addCustomArea(extras: GoalExtras, label: string, color: string): {extras: GoalExtras; id: string} {
  const name = label.trim();
  if (!name) throw Error('Name the area.');
  if (areasOf(extras).some(a => a.label.toLocaleLowerCase() === name.toLocaleLowerCase())) throw Error('You already have an area with this name.');
  const slug = name.toLocaleLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'area';
  let id = `custom-${slug}`;
  for (let n = 2; extras.areas.some(a => a.id === id); n++) id = `custom-${slug}-${n}`;
  return {extras: goalExtrasSchema.parse({...extras, areas: [...extras.areas, {id, label: name, color}]}), id};
}
/** Removes a custom area; its goals keep no area (nothing else changes). */
export function removeCustomArea(extras: GoalExtras, id: string): GoalExtras {
  const goals = Object.fromEntries(Object.entries(extras.goals).map(([k, e]) => { if (e.area !== id) return [k, e]; const rest = {...e}; delete rest.area; return [k, rest]; }));
  return goalExtrasSchema.parse({...extras, goals, areas: extras.areas.filter(a => a.id !== id)});
}
/** How long the extras of a goal this device no longer shows are kept, so a restored goal finds them again. */
export const DORMANT_DAYS = 90;
/**
 * Consistency (owner plan edit 3): extras follow their goal. Called with the goal keys this device can see now (only
 * when every goal store read cleanly). A goal that is gone (deleted, or replaced by sync) has its extras moved aside
 * ("dormant", with the day), so nothing orphaned shows; if the goal comes back (a restored backup, a sync that brings
 * it again) its extras, photo and sub-goal links return. After 90 days a dormant goal's extras are dropped and its
 * photo ids are returned for the image store. Archived, closed and finished goals keep everything (their key still
 * exists). A sub-goal whose parent is dormant shows as a top goal until the parent returns.
 */
export function reconcileGoalExtras(extras: GoalExtras, liveKeys: ReadonlySet<string>, today: string): {extras: GoalExtras; changed: boolean; orphanImages: string[]} {
  const orphanImages: string[] = [];
  let changed = false;
  const goals: GoalExtras['goals'] = {}, dormant: Dormant = {};
  const before = (extras.dormant ?? {}) as Dormant;
  for (const [k, e] of Object.entries(extras.goals)) {
    if (liveKeys.has(k)) goals[k] = e;
    else { changed = true; dormant[k] = {...e, dormantSince: today}; }
  }
  for (const [k, e] of Object.entries(before)) {
    const {dormantSince, ...rest} = e;
    if (liveKeys.has(k) && !goals[k]) { changed = true; goals[k] = rest; continue; }
    if (dormant[k]) continue;
    const age = (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${dormantSince}T12:00:00Z`)) / 86_400_000;
    if (age > DORMANT_DAYS) { changed = true; if (rest.vision?.kind === 'photo') orphanImages.push(rest.vision.imageId); continue; }
    dormant[k] = e;
  }
  if (!changed) return {extras, changed, orphanImages};
  const {dormant: _d, ...base} = extras; void _d;
  return {extras: goalExtrasSchema.parse({...base, goals, ...(Object.keys(dormant).length ? {dormant} : {})}), changed, orphanImages};
}
/** A parent that is shown: a sub-goal whose parent is not live shows as a top goal. */
export const liveParent = (extras: GoalExtras, goalKey: string, liveKeys: ReadonlySet<string>) => { const p = extras.goals[goalKey]?.parentKey; return p && liveKeys.has(p) ? p : undefined; };
/** Moves a goal's extras to a new key (a goal recreated under another id, such as a restore that renumbers it). */
export function moveGoalExtras(extras: GoalExtras, from: string, to: string): GoalExtras {
  key.parse(to);
  const e = extras.goals[from];
  if (!e || from === to) return extras;
  const goals = Object.fromEntries(Object.entries(extras.goals).filter(([k]) => k !== from).map(([k, v]) => [k, v.parentKey === from ? {...v, parentKey: to} : v]));
  goals[to] = e;
  return goalExtrasSchema.parse({...extras, goals});
}
