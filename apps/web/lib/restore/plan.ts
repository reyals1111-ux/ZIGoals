import type {z} from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {PLATFORM_KEY, platformSchema} from '../positions';
import {HABITS_KEY, habitDataSchema, type HabitData} from '../habits';
import {isDeletedHabit} from '../habit-delete';
import {HEALTH_STORAGE_KEY, healthSchema} from '../health';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema} from '../dashboard-settings';
import {CURRENT_VERSIONS} from '../vault/versions';
import {PORTFOLIO_KEY, portfolioDataSchema, emptyPortfolioData} from '../portfolio/schema';
import {GOAL_EXTRAS} from '../goal-extras/store';
import {AVERAGE_GOALS} from '../average-goals/store';
import {CALCULATOR} from '../compound/store';
import {LIFE_REVIEW} from '../life-review/store';
import {TODAY_CARDS} from '../today-cards/store';
import {REMINDERS_PLAN} from '../reminders-plan/schema';
import {HABIT_EXTRAS} from '../habits-extras/schema';
import {GAME} from '../game/schema';
import {HEALTH_COACH} from '../health-aa/coach-schema';
import {MICRO_TARGETS} from '../health-aa/micro';
import {MACRO_MODE} from '../health-aa/macro-mode';
import {AISLES_RECORD} from '../health-aa/aisles';
import {MEASUREMENTS_CUSTOM} from '../health-aa/measurements-custom';
import {HEALTH_VITAMINS} from '../health-vitamins/schema';
import {ACCOUNTS} from '../accounts/schema';
import {MILESTONE_DATES} from '../goals/milestone-dates';
import {REMINDERS_KEY, remindersSchema, emptyReminders} from '../reminders/schema';
import {HEALTH_GOALS_KEY, healthGoalsSchema, emptyHealthGoals} from '../health-goals/schema';
import {WEEKLY_REVIEW_KEY, weeklyReviewSchema, emptyWeeklyReview} from '../weekly-review/schema';
import {FASTING_KEY, fastingSchema, emptyFasting} from '../fasting/schema';
import {INSIGHTS_KEY, insightsSchema, emptyInsights} from '../insights/schema';
import {HABIT_HEALTH_LINKS_KEY, habitHealthLinksSchema, emptyHabitHealthLinks} from '../habit-health-links/schema';
import {summarizeBackupModules} from '../vault/backup-preview';
import {WORKOUTS} from '../workouts/schema';
import {MONEY_LOG} from '../money-log/schema';
import {MEAL_ESTIMATES} from '../meal-estimates/schema';
import {TASKS} from '../tasks/schema';
import {READING_SOURCES} from '../wealth-sources/schema';
import {PRICE_ALERTS} from '../price-alerts/schema';
import {FOCUS_SESSIONS} from '../focus-sessions/schema';
import {GUIDED_JOURNEYS} from '../guided/schema';
import {RECEIPTS} from '../portfolio/receipts';
import {IMPORTS} from '../portfolio/wallet-import';
import {EXCHANGES_RECORD} from '../exchanges/record';
import {JOURNAL} from '../journal/schema';
import {ENERGY} from '../energy/schema';

/**
 * Session AB-Cloud Part 5 ([TIER 3] (data formats), ADR-023 C22): what "Restore from a backup" can bring back from an
 * Export everything ZIP, and how. Pure: it reads the parsed `everything.json` and the values this device holds now, and
 * answers what each part would become; lib/restore/apply.ts writes it.
 *
 * - Each part is a module (the four synced records, validated by their own strict schemas, a newer version refused) or a
 *   device record with a schema; photos come back to this device only. Everything else in the file is never restored:
 *   keys and secrets are never in it, and push, ZIGi's settings, notes, usage and conversations, an import's undo, a run
 *   in progress, the welcome's setup, display choices and recent searches belong to the device they were made on.
 * - **Merge** adds what the backup has and this device does not, and changes nothing this device holds: a record with the
 *   same id (or day, date, week or key) keeps this device's copy whole; a field this device has keeps its value. The
 *   result must still pass the record's schema, or the merge is refused and nothing is written.
 * - **Replace** takes the backup's copy; a Habits replace keeps this device's deleted-habit markers (so sync never
 *   brings a deleted habit back) and a goal-extras replace keeps the extras of goals this device deleted (dormant, C11).
 */
export type RestoreGroup = 'Goals and Wealth' | 'Habits' | 'Today and Life' | 'Health' | 'Photos';
export const RESTORE_GROUPS: readonly RestoreGroup[] = ['Goals and Wealth', 'Habits', 'Today and Life', 'Health', 'Photos'];
export type RestoreMode = 'leave' | 'merge' | 'replace';
export type ModuleName = 'finance' | 'habits' | 'health' | 'settings';
type Part = {id: string; label: string; group: RestoreGroup; key: string; schema: z.ZodType<unknown>; empty: () => unknown; health: boolean};
export type ModulePart = Part & {kind: 'module'; name: ModuleName};
export type DevicePart = Part & {kind: 'device'; name: string};
const mod = (name: ModuleName, label: string, group: RestoreGroup, key: string, schema: z.ZodType<unknown>): ModulePart => ({kind: 'module', id: `module:${name}`, name, label, group, key, schema, empty: () => undefined, health: name === 'health'});
const dev = <T,>(name: string, label: string, group: RestoreGroup, spec: DeviceRecordSpec<T>, health = false): DevicePart => ({kind: 'device', id: `device:${name}`, name, label, group, key: spec.key, schema: spec.schema as z.ZodType<unknown>, empty: spec.empty as () => unknown, health});
const spec = <T,>(key: string, schema: z.ZodType<T>, empty: () => T): DeviceRecordSpec<T> => ({key, schema, empty});

export const MODULE_PARTS: readonly ModulePart[] = [
  mod('finance', 'Goals and Wealth', 'Goals and Wealth', PLATFORM_KEY, platformSchema as z.ZodType<unknown>),
  mod('habits', 'Habits', 'Habits', HABITS_KEY, habitDataSchema as z.ZodType<unknown>),
  mod('settings', 'Today preferences', 'Today and Life', DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema as z.ZodType<unknown>),
  mod('health', 'Health', 'Health', HEALTH_STORAGE_KEY, healthSchema as z.ZodType<unknown>),
];
/** Names are Export everything's `device` names (lib/export/everything.ts DEVICE_KEYS). */
export const DEVICE_PARTS: readonly DevicePart[] = [
  dev('goalExtras', 'Goal plans, areas and visions', 'Goals and Wealth', GOAL_EXTRAS),
  dev('averageGoals', 'Average goals', 'Goals and Wealth', AVERAGE_GOALS),
  dev('accounts', 'Accounts and debts', 'Goals and Wealth', ACCOUNTS),
  dev('milestoneDates', 'Milestone dates', 'Goals and Wealth', MILESTONE_DATES),
  dev('calculator', 'Calculator scenarios', 'Goals and Wealth', CALCULATOR),
  dev('workouts', 'Workouts', 'Health', WORKOUTS),
  dev('moneyLog', 'Spending', 'Goals and Wealth', MONEY_LOG),
  dev('journal', 'Journal', 'Today and Life', JOURNAL),
  dev('energy', 'Daily energy', 'Health', ENERGY),
  dev('mealEstimates', 'Meal estimate ranges', 'Health', MEAL_ESTIMATES, true),
  dev('tasks', 'Tasks', 'Today and Life', TASKS),
  dev('portfolioReceipts', 'Portfolio rewards, income and airdrops', 'Goals and Wealth', RECEIPTS),
  dev('portfolioImports', 'Portfolio rows from wallets', 'Goals and Wealth', IMPORTS),
  dev('readingSources', 'Where wealth readings came from', 'Goals and Wealth', READING_SOURCES),
  dev('priceAlerts', 'Price alerts', 'Goals and Wealth', PRICE_ALERTS),
  dev('focusSessions', 'Focus sessions', 'Today and Life', FOCUS_SESSIONS),
  dev('guidedJourneys', 'Guided journeys', 'Today and Life', GUIDED_JOURNEYS),
  dev('exchanges', 'Exchanges read (balances only)', 'Goals and Wealth', EXCHANGES_RECORD),
  dev('portfolio', 'Portfolio', 'Goals and Wealth', spec(PORTFOLIO_KEY, portfolioDataSchema, emptyPortfolioData)),
  dev('habitExtras', 'Habit extras', 'Habits', HABIT_EXTRAS),
  dev('game', 'Levels and streak shields', 'Habits', GAME),
  dev('reminders', 'Habit reminders', 'Habits', spec(REMINDERS_KEY, remindersSchema, emptyReminders)),
  dev('todayCards', 'Cards kept on Today', 'Today and Life', TODAY_CARDS),
  dev('lifeReview', 'Life review focus', 'Today and Life', LIFE_REVIEW),
  dev('weeklyReview', 'Weekly reviews', 'Today and Life', spec(WEEKLY_REVIEW_KEY, weeklyReviewSchema, emptyWeeklyReview)),
  dev('remindersPlan', 'Reminders plan', 'Today and Life', REMINDERS_PLAN),
  dev('insights', 'Dismissed insights', 'Today and Life', spec(INSIGHTS_KEY, insightsSchema, emptyInsights)),
  dev('healthGoals', 'Health goals', 'Health', spec(HEALTH_GOALS_KEY, healthGoalsSchema, emptyHealthGoals), true),
  dev('fasting', 'Fasting', 'Health', spec(FASTING_KEY, fastingSchema, emptyFasting), true),
  dev('habitHealthLinks', 'Habit and Health links', 'Health', spec(HABIT_HEALTH_LINKS_KEY, habitHealthLinksSchema, emptyHabitHealthLinks), true),
  dev('healthCoach', 'Health coach', 'Health', HEALTH_COACH, true),
  dev('microTargets', 'Micronutrient targets', 'Health', MICRO_TARGETS, true),
  dev('healthVitamins', 'Vitamins', 'Health', HEALTH_VITAMINS, true),
  dev('macroMode', 'Macro mode', 'Health', MACRO_MODE, true),
  dev('aisles', 'Shopping aisles', 'Health', AISLES_RECORD, true),
  dev('measurementsCustom', 'Custom measurements', 'Health', MEASUREMENTS_CUSTOM, true),
];
/** What a file may hold and this never restores, said in the preview. */
export const NEVER_RESTORED = 'Never restored: keys and secrets (Export everything never holds them), notifications, ZIGi’s settings, notes, usage and conversations, an import’s undo, a timer or routine in progress, the welcome’s setup, display choices, recent searches, linked wallet addresses, Point & tell notes, Earn progress and choices, Checklist favourites and day history, the staking journal and the practice/real choice, linked wallet balances, Goal Vault links, validator health alerts, ZIGi\'s plans, My universe milestones, Day timeline times and the Stories you opened and legacy simulation Goals (use an encrypted copy for those).';
export const NEWER_PART_MESSAGE = 'Saved by a newer ZIGoals. Update the app on this device, then restore this part.';
export const INVALID_PART_MESSAGE = 'This part did not read as a valid record, so it is left out.';
export const MERGE_REFUSED_MESSAGE = 'These records cannot be merged safely. Choose Replace, or leave them as they are.';
/**
 * Session AD item 11 (ADR-026), backups older than this build. Every section's version 1 and later is still read (each
 * section's schema reads its earlier versions), so an older part restores, with a note; only a version below the first
 * one ZIGoals ever wrote (an early test file) is left out. A Replace never puts an older version over a newer one this
 * device holds (storage refuses that too); Merge stays possible.
 */
export const OLDER_PART_MESSAGE = 'Saved by an early test version of ZIGoals that this app no longer reads, so this part is left out.';
export const OLDER_READABLE_NOTE = 'Saved by an earlier version of ZIGoals. This version still reads it, so it can be restored.';
export const OLDER_THAN_DEVICE_MESSAGE = 'This device holds these records in a newer format than the backup, so the backup cannot replace them. Choose Merge to add what is missing; nothing this device holds is changed.';

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const UNSAFE = new Set(['__proto__', 'constructor', 'prototype']);
const IDENTITY_KEYS = ['id', 'day', 'date', 'weekStart', 'key'] as const;
const STAMPS = ['updatedAt', 'createdAt', 'at', 'setAt', 'savedAt'] as const;
function identityKey(list: readonly unknown[]): string | null {
  for (const k of IDENTITY_KEYS) if (list.length && list.every(v => isObject(v) && typeof v[k] === 'string')) return k;
  return null;
}
/** A record of its own (an id or a stamp): kept whole, never mixed with the backup's copy. */
const isEntity = (v: Record<string, unknown>) => typeof v.id === 'string' || STAMPS.some(k => typeof v[k] === 'string');

/** Merge: this device's value with what only the backup has added; nothing this device holds is changed. */
export function mergeKeep(current: unknown, backup: unknown): unknown {
  if (current === undefined) return backup;
  if (backup === undefined) return current;
  if (Array.isArray(current) && Array.isArray(backup)) {
    const k = identityKey([...current, ...backup]);
    if (!k) return current.length ? current : backup;
    const held = new Set(current.map(v => (v as Record<string, unknown>)[k]));
    return [...current, ...backup.filter(v => !held.has((v as Record<string, unknown>)[k]))];
  }
  if (isObject(current) && isObject(backup) && !isEntity(current)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(current)) if (!UNSAFE.has(k)) out[k] = v;
    for (const [k, v] of Object.entries(backup)) if (!UNSAFE.has(k)) out[k] = Object.hasOwn(current, k) ? mergeKeep(current[k], v) : v;
    return out;
  }
  return current;
}

export type PartSummary = {counts: string; from: string | null; through: string | null};
const DATE_FIELDS = new Set(['date', 'day', 'at', 'createdAt', 'updatedAt', 'occurredAt', 'observedAt', 'startedAt', 'start', 'setAt', 'savedAt', 'weekStart', 'recordedAt']);
/** Records (list items, map entries) and the stored date range of any value, for the preview; never a computed figure. */
export function summarizeValue(value: unknown): PartSummary {
  let records = 0, from: string | null = null, through: string | null = null;
  const seeDate = (s: string) => { const d = /^\d{4}-\d{2}-\d{2}/.exec(s)?.[0]; if (!d) return; if (!from || d < from) from = d; if (!through || d > through) through = d; };
  const walk = (v: unknown, depth: number) => {
    if (depth > 12) return;
    if (Array.isArray(v)) { for (const item of v) { if (isObject(item)) records++; walk(item, depth + 1); } return; }
    if (!isObject(v)) return;
    const entries = Object.entries(v), map = entries.length > 0 && entries.every(([, x]) => isObject(x)) && depth > 0;
    if (map) records += entries.length;
    for (const [k, x] of entries) { if (typeof x === 'string' && DATE_FIELDS.has(k)) seeDate(x); else walk(x, depth + 1); }
  };
  walk(value, 0);
  return {counts: records ? `${records} ${records === 1 ? 'record' : 'records'}` : 'Settings only', from, through};
}
/** A part's summary: a module's own counts (the encrypted backup's preview labels), or the generic one. */
export const summarizePart = (part: ModulePart | DevicePart, value: unknown): PartSummary => part.kind === 'module' ? moduleSummary(part, value) : summarizeValue(value);
function moduleSummary(part: ModulePart, value: unknown): PartSummary {
  try {
    const [s] = summarizeBackupModules({[part.name]: JSON.stringify(value)} as Partial<Record<ModuleName, string>>);
    const counts = s!.counts.filter(c => c.count > 0).map(c => `${c.label}: ${c.count}`).join(' · ');
    return {counts: counts || 'Saved preferences', from: s!.from, through: s!.through};
  } catch { return summarizeValue(value); }
}

export type PlannedPart = (ModulePart | DevicePart) & {value?: unknown; problem?: string; note?: string; summary: PartSummary | null};
/** The parts of a parsed everything.json: every module and device part present in it, each validated or explained. */
export function planParts(json: {modules?: Record<string, unknown>; device?: Record<string, unknown>; portfolio?: unknown}): PlannedPart[] {
  const out: PlannedPart[] = [];
  for (const part of MODULE_PARTS) {
    const value = json.modules?.[part.name];
    if (value === undefined) continue;
    const version = isObject(value) ? value.schemaVersion : undefined;
    if (typeof version === 'number' && version > CURRENT_VERSIONS[part.name]) { out.push({...part, problem: NEWER_PART_MESSAGE, summary: null}); continue; }
    if (typeof version === 'number' && version < 1) { out.push({...part, problem: OLDER_PART_MESSAGE, summary: null}); continue; }
    const parsed = part.schema.safeParse(value);
    const note = typeof version === 'number' && version < CURRENT_VERSIONS[part.name] ? {note: OLDER_READABLE_NOTE} : {};
    out.push(parsed.success ? {...part, ...note, value: parsed.data, summary: moduleSummary(part, parsed.data)} : {...part, problem: INVALID_PART_MESSAGE, summary: null});
  }
  for (const part of DEVICE_PARTS) {
    const value = part.name === 'portfolio' ? json.portfolio : json.device?.[part.name];
    if (value === undefined) continue;
    const version = isObject(value) ? value.version : undefined;
    const parsed = part.schema.safeParse(value);
    if (parsed.success) out.push({...part, value: parsed.data, summary: summarizeValue(parsed.data)});
    else out.push({...part, problem: typeof version === 'number' && version > 1 ? NEWER_PART_MESSAGE : typeof version === 'number' && version < 1 ? OLDER_PART_MESSAGE : INVALID_PART_MESSAGE, summary: null});
  }
  return out;
}

/** This device's deleted-habit markers that the backup does not hold, kept by a Habits replace. */
function keepDeletedHabits(current: unknown, backup: unknown): unknown {
  const now = habitDataSchema.safeParse(current);
  if (!now.success || !isObject(backup) || !Array.isArray(backup.habits)) return backup;
  const ids = new Set((backup.habits as {id: string}[]).map(h => h.id));
  const shells = (now.data as HabitData).habits.filter(h => isDeletedHabit(h) && !ids.has(h.id));
  return shells.length ? {...backup, habits: [...backup.habits, ...shells]} : backup;
}
/** A goal-extras replace keeps the extras this device holds for goals it deleted (C11: `dormant` stays on the device). */
function keepDormant(current: unknown, backup: unknown): unknown {
  if (!isObject(current) || !isObject(current.dormant) || !isObject(backup)) return backup;
  return {...backup, dormant: {...current.dormant, ...(isObject(backup.dormant) ? backup.dormant : {})}};
}

const versionOf = (v: unknown) => isObject(v) && typeof v.schemaVersion === 'number' ? v.schemaVersion : null;
/** A module this device holds in a newer version than the backup's: Replace is refused (Merge is not). */
export function replaceRefused(part: PlannedPart, current: unknown): boolean {
  if (part.kind !== 'module') return false;
  const held = versionOf(current), backup = versionOf(part.value);
  return held !== null && backup !== null && held > backup;
}
/** What a part becomes: the validated value to write, or the reason nothing is written. `current` is this device's parsed value (undefined when it holds none). */
export function nextValue(part: PlannedPart, mode: Exclude<RestoreMode, 'leave'>, current: unknown): {value: unknown} | {error: string} {
  if (part.problem || part.value === undefined) return {error: part.problem ?? INVALID_PART_MESSAGE};
  if (mode === 'replace' && replaceRefused(part, current)) return {error: OLDER_THAN_DEVICE_MESSAGE};
  let next: unknown;
  if (mode === 'merge') next = mergeKeep(current, part.value);
  else next = part.name === 'habits' ? keepDeletedHabits(current, part.value) : part.name === 'goalExtras' ? keepDormant(current, part.value) : part.value;
  const parsed = part.schema.safeParse(next);
  if (!parsed.success) return {error: mode === 'merge' ? MERGE_REFUSED_MESSAGE : INVALID_PART_MESSAGE};
  return {value: parsed.data};
}
