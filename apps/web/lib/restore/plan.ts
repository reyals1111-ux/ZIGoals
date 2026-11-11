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
import {MUSIC_MIX} from '../music/mix-store';
import {BILLS} from '../bills/schema';
import {BUDGETS} from '../budgets/schema';
import {TARGET_ALLOCATION} from '../allocation/target';
import {CSV_MAPPINGS} from '../csv/templates/saved';
import {AUTO_RULES} from '../auto-rules/schema';
import {FOOD_SCANS} from '../food-scans/schema';
import {NUTRIENT_EXTRAS_RECORD} from '../health-vitamins/extras';
import {HEALTH_EXTRAS} from '../health-extras';
import {PROFILE_NAME} from '../onboarding-setup';
import {WATCHLIST_MORE} from '../markets-watchlist-more';
import {GROCERY_RECORD} from '../grocery/schema';
import {CALORIE_WEEK} from '../health-aa/calorie-week';
import {COMPARE_PAIR} from '../compare/schema';
import {SUPPLEMENTS} from '../supplements/schema';
import {GOV_REMINDERS} from '../zigchain-eco/governance';
import {INSIGHT_FEEDBACK} from '../insight-feedback/store';
import {FOCUS_ROUNDS} from '../focus-rounds/store';
import {CYCLE} from '../cycle/store';
import {SCALES} from '../scales/store';
import {HEALTH_NUMBERS} from '../health-numbers/store';
import {NOVA_HERMES} from '../nova/hermes-record';
import {NOVA_SETUP} from '../nova/setup';
import {NOVA_WORKFLOWS} from '../nova/workflows/schema';
import {NOVA_BRIEFS} from '../nova/briefs-record';
import {NOVA_BRIDGE} from '../nova/bridge';
import {NOVA_STORE} from '../nova/store';
import {NOVA_STAGE} from '../nova/stage/record';
import {keepWorldSwitch, NOVA_WORLD_RESTORE} from '../nova/world/record';
import {CALENDAR_IMPORT} from '../ics/calendar';
import {NOTES} from '../notes/schema';
import {NETWORTH_MILESTONES} from '../networth-milestones/milestones';
import {SAVINGS_CHALLENGES} from '../savings-challenges/challenges';
import {DEBT_PLANNER} from '../debt-planner/store';
import {WRAPPED} from '../wrapped/store';
import {AGENDA} from '../agenda/store';
import {JOURNAL_DISPLAY} from '../on-this-day/store';
import {FIRST_WEEK} from '../first-week/store';
import {EXPERIMENTS} from '../experiments/store';
import {MONEY_RULES} from '../money-rules/schema';
import {MONEY_REVIEW} from '../money-review/review';
import {FI_MODEL} from '../fi-model/store';
import {EMERGENCY_SHEET} from '../emergency-sheet/schema';
import {MUSCLE_RECOVERY} from '../muscle-freshness/model';
import {FOOD_DISPLAY} from '../food-display/schema';
import {REWARDS_SHELF} from '../rewards-shelf/store';
import {FOCUS_SESSIONS} from '../focus-sessions/schema';
import {GUIDED_JOURNEYS} from '../guided/schema';
import {RECEIPTS} from '../portfolio/receipts';
import {IMPORTS} from '../portfolio/wallet-import';
import {EXCHANGES_RECORD} from '../exchanges/record';
import {JOURNAL} from '../journal/schema';
import {ENERGY} from '../energy/schema';
import {AI_MEMORY, HEALTH_NOTE_CATEGORIES} from '../ai/store/records';
import {CHECKLIST, CHECKLIST_DAYS} from '../checklist/schema';

/**
 * Session AB-Cloud Part 5 ([TIER 3] (data formats), ADR-023 C22): what "Restore from a backup" can bring back from an
 * Export everything ZIP, and how. Pure: it reads the parsed `everything.json` and the values this device holds now, and
 * answers what each part would become; lib/restore/apply.ts writes it.
 *
 * - Each part is a module (the four synced records, validated by their own strict schemas, a newer version refused) or a
 *   device record with a schema; photos come back to this device only. Everything else in the file is never restored:
 *   keys and secrets are never in it, and push, ZIGi's settings, usage and conversations, an import's undo, a run
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
/**
 * Session AK WA (owner follow-up 2 N7): one record restored as two parts. `pick` is the part's share of a value (the
 * backup's, or this device's for the preview), `has` whether a value holds any of it, and `replace` what a Replace writes:
 * the backup's share with the rest of this device's record left exactly as it is. A Merge is the usual one (only what this
 * device lacks is added) on the part's share. Both parts write the same key; Undo goes back newest first, so it holds.
 */
export type PartSlice = {pick: (value: unknown) => unknown; has: (value: unknown) => boolean; replace: (current: unknown, backup: unknown) => unknown; summarize?: (value: unknown) => PartSummary};
export type DevicePart = Part & {kind: 'device'; name: string; slice?: PartSlice;
  /** What a restore never changes on this device (security review AM-S9): given this device's stored record as it is and the value about to be written, the value to write. */
  local?: (currentRaw: unknown, next: unknown) => unknown};
const mod = (name: ModuleName, label: string, group: RestoreGroup, key: string, schema: z.ZodType<unknown>): ModulePart => ({kind: 'module', id: `module:${name}`, name, label, group, key, schema, empty: () => undefined, health: name === 'health'});
const dev = <T,>(name: string, label: string, group: RestoreGroup, spec: DeviceRecordSpec<T>, health = false): DevicePart => ({kind: 'device', id: `device:${name}`, name, label, group, key: spec.key, schema: spec.schema as z.ZodType<unknown>, empty: spec.empty as () => unknown, health});
const spec = <T,>(key: string, schema: z.ZodType<T>, empty: () => T): DeviceRecordSpec<T> => ({key, schema, empty});
/**
 * N7: the shared memory of ZIGi and NOVA (`zigoals:ai-memory:v1`, lib/ai/memory.ts). A note filed under Health or Diet
 * (HEALTH_NOTE_CATEGORIES: the notes ZIGi's and NOVA's Health gate holds back) restores only with the Health choice; every
 * other note, and the "notes from ZIGi's cards" choice, with Today and Life.
 */
const notesIn = (v: unknown): unknown[] => isObject(v) && Array.isArray(v.notes) ? v.notes : [];
const healthNote = (n: unknown) => isObject(n) && typeof n.category === 'string' && HEALTH_NOTE_CATEGORIES.includes(n.category);
function memorySlice(health: boolean): PartSlice {
  const mine = (n: unknown) => healthNote(n) === health;
  return {
    pick: v => health ? {version: 1, notes: notesIn(v).filter(mine)} : {...(isObject(v) ? v : {version: 1}), notes: notesIn(v).filter(mine)},
    has: v => notesIn(v).some(mine) || (!health && isObject(v) && v.consent !== undefined),
    replace: (current, backup) => ({...(health ? (isObject(current) ? current : {version: 1}) : isObject(backup) ? backup : {version: 1}), notes: [...notesIn(current).filter(n => !mine(n)), ...notesIn(backup).filter(mine)]}),
  };
}
/**
 * Session AL (P-LS-36, LS-025, LS-064; TIER 3 (stored format), behaviour additive): the Checklist restores from Export
 * everything, with the rule its sync section follows (lib/vault/extras-sections.ts). Its path (favourites, custom items,
 * orbits, order) and its day history restore with Today and Life; the Health quick inputs on the path (`healthItems`)
 * only with the Health choice; today's tick receipts (`today`, which can name a Health entry) never: they stay as they
 * are on this device. Each part's Replace leaves the other part's share of the record exactly as this device holds it.
 */
const listOf = (v: unknown, k: string): unknown[] => isObject(v) && Array.isArray(v[k]) ? v[k] as unknown[] : [];
const idsOf = (list: unknown[]) => list.flatMap(i => isObject(i) && typeof i.id === 'string' ? [i.id] : []);
const countOf = (label: string, n: number) => `${n} ${label}`;
const checklistPathSlice: PartSlice = {
  pick: v => ({...(isObject(v) ? v : {version: 1}), healthItems: []}),
  has: v => listOf(v, 'items').length > 0 || listOf(v, 'sections').length > 0,
  replace: (current, backup) => ({...(isObject(backup) ? backup : {version: 1}), healthItems: listOf(current, 'healthItems')}),
  summarize: v => ({counts: [countOf(listOf(v, 'items').length === 1 ? 'item on the path' : 'items on the path', listOf(v, 'items').length), ...(listOf(v, 'sections').length ? [countOf(listOf(v, 'sections').length === 1 ? 'orbit' : 'orbits', listOf(v, 'sections').length)] : [])].join(' · '), from: null, through: null}),
};
const checklistHealthSlice: PartSlice = {
  pick: v => { const health = listOf(v, 'healthItems'), ids = new Set(idsOf(health)); return {version: 1, items: [], healthItems: health, order: listOf(v, 'order').filter(id => typeof id === 'string' && ids.has(id))}; },
  has: v => listOf(v, 'healthItems').length > 0,
  replace: (current, backup) => {
    const here = isObject(current) ? current : {version: 1, items: [], order: []}, order = listOf(here, 'order');
    return {...here, healthItems: listOf(backup, 'healthItems'), order: [...order, ...listOf(backup, 'order').filter(id => !order.includes(id))]};
  },
  summarize: v => ({counts: countOf(listOf(v, 'healthItems').length === 1 ? 'Health quick input' : 'Health quick inputs', listOf(v, 'healthItems').length), from: null, through: null}),
};
const daysOf = (v: unknown): Record<string, unknown> => isObject(v) && isObject(v.days) ? v.days : {};
const checklistDaysSlice: PartSlice = {
  pick: v => { if (!isObject(v)) return {version: 1, days: {}}; const {today, ...rest} = v; void today; return rest; },
  has: v => Object.keys(daysOf(v)).length > 0,
  replace: (current, backup) => { const {today: _drop, ...rest} = isObject(backup) ? backup : {version: 1, days: {}}; void _drop; return {...rest, ...(isObject(current) && current.today !== undefined ? {today: current.today} : {})}; },
  summarize: v => { const d = Object.keys(daysOf(v)).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort(); return {counts: countOf(d.length === 1 ? 'day recorded' : 'days recorded', Object.keys(daysOf(v)).length), from: d[0] ?? null, through: d.at(-1) ?? null}; },
};
const checklistParts: readonly DevicePart[] = [
  {...dev('checklist', 'Checklist path and favourites', 'Today and Life', CHECKLIST), slice: checklistPathSlice},
  {...dev('checklistHealth', 'Checklist Health quick inputs', 'Health', CHECKLIST, true), name: 'checklist', slice: checklistHealthSlice},
  {...dev('checklistDays', 'Checklist day history', 'Today and Life', CHECKLIST_DAYS), slice: checklistDaysSlice},
];
const memoryPart = (health: boolean): DevicePart => ({...dev(health ? 'aiMemoryHealth' : 'aiMemory', health ? 'Memory notes about health and diet (ZIGi and NOVA)' : 'Memory for ZIGi and NOVA', health ? 'Health' : 'Today and Life', AI_MEMORY, health), name: 'aiMemory', slice: memorySlice(health)});

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
  // Session AL (P-LS-36): the Checklist's path, its Health quick inputs (Health choice only) and its day history.
  ...checklistParts,
  dev('portfolioReceipts', 'Portfolio rewards, income and airdrops', 'Goals and Wealth', RECEIPTS),
  dev('portfolioImports', 'Portfolio rows from wallets', 'Goals and Wealth', IMPORTS),
  dev('readingSources', 'Where wealth readings came from', 'Goals and Wealth', READING_SOURCES),
  dev('priceAlerts', 'Price alerts', 'Goals and Wealth', PRICE_ALERTS),
  // Session AK: the sound mix, bills, budgets, the target mix, saved CSV matches, habit rules.
  dev('musicMix', 'Sound mix and timer', 'Today and Life', MUSIC_MIX),
  dev('bills', 'Bills', 'Goals and Wealth', BILLS),
  dev('budgets', 'Budgets', 'Goals and Wealth', BUDGETS),
  dev('targetAllocation', 'Target mix', 'Goals and Wealth', TARGET_ALLOCATION),
  dev('csvMappings', 'Saved CSV column matches', 'Goals and Wealth', CSV_MAPPINGS),
  dev('autoRules', 'Habit rules', 'Habits', AUTO_RULES),
  // Session AK Part 4: Health-describing, so restored only with the Health choice.
  dev('foodScans', 'Barcodes you scanned', 'Health', FOOD_SCANS, true),
  dev('nutrientExtras', 'Extra nutrients', 'Health', NUTRIENT_EXTRAS_RECORD, true),
  // Session AL (GAP-045, GAP-079): meal names and times, drink types; Health-describing, so only with the Health choice.
  dev('healthExtras', 'Meal names and drink types', 'Health', HEALTH_EXTRAS, true),
  dev('grocery', 'Grocery ticks and pantry', 'Health', GROCERY_RECORD, true),
  dev('calorieWeek', 'Weekly calorie budget', 'Health', CALORIE_WEEK, true),
  dev('comparePair', 'Your last comparison', 'Health', COMPARE_PAIR, true),
  dev('supplements', 'Supplements and medication', 'Health', SUPPLEMENTS, true),
  dev('govReminders', 'Governance vote reminders', 'Goals and Wealth', GOV_REMINDERS),
  dev('insightFeedback', 'Was this useful? on ZIGi notes', 'Today and Life', INSIGHT_FEEDBACK),
  dev('focusRounds', 'Focus bell and breaks', 'Today and Life', FOCUS_ROUNDS),
  // Session AL (NB-006): the name the person gave in setup, for Today's greeting.
  dev('profileName', 'Your name for the greeting', 'Today and Life', PROFILE_NAME),
  // Session AL (C-TK-20): Markets favourites beyond the synced eight.
  dev('watchlistMore', 'More Markets favourites', 'Goals and Wealth', WATCHLIST_MORE),
  dev('cycle', 'Cycle log', 'Health', CYCLE, true),
  dev('scales', 'Your own scales', 'Today and Life', SCALES),
  dev('healthNumbers', 'Your numbers (blood pressure and lab values)', 'Health', HEALTH_NUMBERS, true),
  dev('novaHermes', 'Hermes Agent connection', 'Today and Life', NOVA_HERMES),
  dev('novaSetup', 'NOVA setup and privacy mode', 'Today and Life', NOVA_SETUP),
  dev('novaWorkflows', 'NOVA workflows', 'Today and Life', NOVA_WORKFLOWS),
  // Security review Z1B-2: briefs can hold Health lines (sleep, water, steps, foods), so they restore only with the Health choice.
  dev('novaBriefs', 'NOVA briefs', 'Health', NOVA_BRIEFS, true),
  dev('novaBridge', 'NOVA chat origins', 'Today and Life', NOVA_BRIDGE),
  dev('nova', 'NOVA layout and persona', 'Today and Life', NOVA_STORE),
  // Session AM (ADR-038 D16, D17; TIER 3 (stored format), additive): what the person asked NOVA for and the widgets it made;
  // the weather switch, the chosen place and its last reading.
  dev('novaStage', 'NOVA requests and made widgets', 'Today and Life', NOVA_STAGE),
  // Security review AM-S9: the place is restored, the switch is not (outside data is off until turned on on this device).
  {...dev('novaWorld', 'NOVA weather place', 'Today and Life', NOVA_WORLD_RESTORE), local: keepWorldSwitch},
  dev('calendarImport', 'Imported calendars', 'Today and Life', CALENDAR_IMPORT),
  dev('notes', 'Notes', 'Today and Life', NOTES),
  // Session AK WA (N7): ZIGi's and NOVA's one memory; its health and diet notes only with the Health choice.
  memoryPart(false), memoryPart(true),
  dev('networthMilestones', 'Net-worth milestones', 'Goals and Wealth', NETWORTH_MILESTONES),
  dev('savingsChallenges', 'Savings challenges', 'Goals and Wealth', SAVINGS_CHALLENGES),
  dev('debtPlanner', 'Debt payoff planner', 'Goals and Wealth', DEBT_PLANNER),
  dev('wrapped', 'ZIGoals Wrapped', 'Today and Life', WRAPPED),
  dev('agenda', 'Agenda view and filters', 'Today and Life', AGENDA),
  dev('journalDisplay', 'On this day choices', 'Today and Life', JOURNAL_DISPLAY),
  dev('firstWeek', 'Your first week', 'Today and Life', FIRST_WEEK),
  dev('experiments', 'Experiments', 'Health', EXPERIMENTS, true),
  dev('moneyRules', 'Money log rules', 'Goals and Wealth', MONEY_RULES),
  dev('moneyReview', 'Imported entries to review', 'Goals and Wealth', MONEY_REVIEW),
  dev('fiModel', 'Financial freedom inputs', 'Goals and Wealth', FI_MODEL),
  dev('emergencySheet', 'Emergency sheet', 'Goals and Wealth', EMERGENCY_SHEET),
  dev('muscleRecovery', 'Recovery days per muscle group', 'Health', MUSCLE_RECOVERY, true),
  dev('foodDisplay', 'Food quality letter choices', 'Health', FOOD_DISPLAY, true),
  dev('rewardsShelf', 'Rewards shelf', 'Today and Life', REWARDS_SHELF),
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
export const NEVER_RESTORED = 'Never restored: keys and secrets (Export everything never holds them), notifications, ZIGi’s settings, usage and conversations, an import’s undo, a timer or routine in progress, the welcome’s setup, display choices, recent searches, linked wallet addresses, Point & tell notes, Earn progress and choices, today’s Checklist ticks, the staking journal and the practice/real choice, linked wallet balances, Goal Vault links, validator health alerts, ZIGi\'s plans, My universe milestones, Day timeline times and the Stories you opened and legacy simulation Goals (use an encrypted copy for those).';
export const NEWER_PART_MESSAGE = 'Saved by a newer ZIGoals. Update the app on this device, then restore this part.';
export const INVALID_PART_MESSAGE = 'This part did not read as a valid record, so it is left out.';
export const MAX_DEVICE_PART_CHARS = 5_000_000;
export const TOO_LARGE_PART_MESSAGE = 'This part is larger than this device can keep for it (about 5 MB), so it is left out.';
const serializedLength = (value: unknown): number => { try { return JSON.stringify(value)?.length ?? 0; } catch { return Number.POSITIVE_INFINITY; } };
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
export const summarizePart = (part: ModulePart | DevicePart, value: unknown): PartSummary => part.kind === 'module' ? moduleSummary(part, value) : part.slice ? sliceSummary(part.slice, value) : summarizeValue(value);
const NO_NOTES: PartSummary = {counts: 'No notes', from: null, through: null};
const sliceSummary = (slice: PartSlice, value: unknown): PartSummary => { const mine = slice.pick(value); if (slice.summarize) return slice.summarize(mine); return notesIn(mine).length ? summarizeValue(mine) : slice.has(mine) ? {counts: 'Settings only', from: null, through: null} : NO_NOTES; };
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
    // Release review AL (RR-7): a part is "saved by an earlier version" only when this build reads it through a migration
    // (its schema lifts the stored version). Each store writes the lowest version its content needs (Habits 2 until a Health
    // link, Health 1 until fasting…), so a lower number than CURRENT_VERSIONS (the newest it reads) is often today's format:
    // a backup made seconds earlier said every part was older.
    const read = parsed.success && isObject(parsed.data) ? parsed.data.schemaVersion : undefined;
    const note = typeof version === 'number' && typeof read === 'number' && read > version ? {note: OLDER_READABLE_NOTE} : {};
    out.push(parsed.success ? {...part, ...note, value: parsed.data, summary: moduleSummary(part, parsed.data)} : {...part, problem: INVALID_PART_MESSAGE, summary: null});
  }
  for (const part of DEVICE_PARTS) {
    const value = part.name === 'portfolio' ? json.portfolio : json.device?.[part.name];
    if (value === undefined) continue;
    const version = isObject(value) ? value.version : undefined;
    // Session AK Part 15 (F8): a device record lives in this browser's storage, which holds about five million
    // characters for the whole site; a part larger than that (a loose record keeps unknown fields) is left out unread.
    if (serializedLength(value) > MAX_DEVICE_PART_CHARS) { out.push({...part, problem: TOO_LARGE_PART_MESSAGE, summary: null}); continue; }
    const parsed = part.schema.safeParse(value);
    // N7: a part that is a share of its record is offered only when the file holds some of that share.
    if (parsed.success && part.slice) { const mine = part.slice.pick(parsed.data); if (part.slice.has(mine)) out.push({...part, value: mine, summary: sliceSummary(part.slice, mine)}); }
    else if (parsed.success) out.push({...part, value: parsed.data, summary: summarizeValue(parsed.data)});
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
  else next = part.name === 'habits' ? keepDeletedHabits(current, part.value) : part.name === 'goalExtras' ? keepDormant(current, part.value) : part.kind === 'device' && part.slice ? part.slice.replace(current, part.value) : part.value;
  const parsed = part.schema.safeParse(next);
  if (!parsed.success) return {error: mode === 'merge' ? MERGE_REFUSED_MESSAGE : INVALID_PART_MESSAGE};
  return {value: parsed.data};
}
