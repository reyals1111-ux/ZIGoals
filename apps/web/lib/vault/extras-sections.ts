import type {DeviceRecordSpec} from '../device-record';
import {GOAL_EXTRAS} from '../goal-extras/store';
import {AVERAGE_GOALS} from '../average-goals/store';
import {CALCULATOR} from '../compound/store';
import {LIFE_REVIEW} from '../life-review/store';
import {TODAY_CARDS} from '../today-cards/store';
import {REMINDERS_PLAN} from '../reminders-plan/schema';
import {HABIT_EXTRAS} from '../habits-extras/schema';
import {ROUTINE_RUN} from '../routines/run-schema';
import {GAME} from '../game/schema';
import {HEALTH_COACH} from '../health-aa/coach-schema';
import {MICRO_TARGETS} from '../health-aa/micro';
import {MACRO_MODE} from '../health-aa/macro-mode';
import {AISLES_RECORD} from '../health-aa/aisles';
import {MEASUREMENTS_CUSTOM} from '../health-aa/measurements-custom';
import {HEALTH_VITAMINS} from '../health-vitamins/schema';
import {CHECKLIST, CHECKLIST_DAYS} from '../checklist/schema';
import {NOVA_STORE} from '../nova/store';
import {NOVA_STAGE} from '../nova/stage/record';
import {JOURNAL} from '../journal/schema';
import {MONEY_LOG} from '../money-log/schema';
import {BUDGETS} from '../budgets/schema';
import {BUDGET_PERIODS} from '../budgets/periods';
import {BILLS} from '../bills/schema';
import {MONEY_RULES} from '../money-rules/schema';
import {MONEY_TAGS_RECORD} from '../money-tags/schema';
import {MONEY_REVIEW} from '../money-review/review';
import {WORKOUTS} from '../workouts/schema';
import {WORKOUT_SPLITS} from '../workouts/splits-schema';
import type {ExtrasChoiceSectionName} from './extras-keys';
import {fitNovaArrangement, fitNovaStage, NOVA_DEVICE_FIELDS, NOVA_STAGE_DEVICE_FIELDS, NOVA_SYNC_FIELDS} from './extras-nova';

/**
 * Session AB-Cloud Part 2 ([TIER 3] (sync), ADR-023 C4): what each encrypted extras section carries. Every record is a
 * device key (still what its pages read and write, C2) named in the section by that key, so a later build's record
 * travels under its own name and this build carries it through untouched. `deviceFields` stay on each device and never
 * travel (C11): a goal's dormant extras (kept 90 days by the device that stopped showing the goal) and which habit
 * sections a person folded on this screen.
 *
 * Never synced, on purpose: recent searches, the welcome's setup, vision photos, progress photos and their index (owner
 * decision: photos stay on the device), and AB-Design's display preferences.
 */
export type ExtrasSectionName = 'goals' | 'life' | 'habits' | 'health' | 'checklist' | 'nova' | ExtrasChoiceSectionName;
/**
 * `deviceFields` is a deny-list: every other field of the record travels, a field a later build adds included.
 *
 * Session AM (ADR-038 D18; TIER 3 (sync)): `syncFields` is the allow-list for a record of which only a part travels.
 * Only the fields it names ever leave the device or are written from another device; every other field stays here, a
 * field a later build adds included (it cannot start travelling by accident), and the record itself is never removed by
 * a sync. A field of that record a later build lets travel is carried in the cloud copy as it is, never read or written
 * here. `fit` brings a value this merge joined from two devices back inside the record's own bounds (two lists joined
 * can be longer than one device's may be), so such a merge is never refused for its size. `verbatim`: the record travels and is written as it
 * is stored, checked by its schema but not rewritten by it, so a value a later build writes inside a field this build
 * reads tolerantly (an enum it does not know reads as a default) is carried, never replaced by this build's default.
 * The sections before Session AM use none of the three and behave as they did.
 */
export type ExtrasRecord = {spec: DeviceRecordSpec<unknown>; deviceFields?: readonly string[]; syncFields?: readonly string[]; verbatim?: true; fit?: (merged: Record<string, unknown>, local: Record<string, unknown> | undefined, remote: Record<string, unknown> | undefined) => Record<string, unknown>};
export type ExtrasSection = {name: ExtrasSectionName; consent: 'account' | 'health'; records: readonly ExtrasRecord[]};
/** Session AV lane 2 (sync): the journal's fields that stay on each device (see EXTRAS_CHOICE_SECTION_LIST). */
export const JOURNAL_DEVICE_FIELDS = ['shareWithAi', 'versions', 'reminder', 'todayLines', 'affirmations'] as const;
const record = <T,>(spec: DeviceRecordSpec<T>, deviceFields?: readonly string[], more?: Pick<ExtrasRecord, 'syncFields' | 'fit' | 'verbatim'>): ExtrasRecord => ({spec: spec as DeviceRecordSpec<unknown>, ...(deviceFields ? {deviceFields} : {}), ...more});
export const EXTRAS_SECTIONS: readonly ExtrasSection[] = [
  {name: 'goals', consent: 'account', records: [record(GOAL_EXTRAS, ['dormant']), record(AVERAGE_GOALS)]},
  {name: 'life', consent: 'account', records: [record(CALCULATOR), record(LIFE_REVIEW), record(TODAY_CARDS), record(REMINDERS_PLAN)]},
  {name: 'habits', consent: 'account', records: [record(HABIT_EXTRAS, ['folds', 'listMode']), record(ROUTINE_RUN), record(GAME)]},
  // Health-describing records travel only under the Health consent (SYNC_HOMES rule), never pre-ticked.
  {name: 'health', consent: 'health', records: [record(HEALTH_COACH), record(MICRO_TARGETS), record(MACRO_MODE), record(AISLES_RECORD), record(MEASUREMENTS_CUSTOM), record(HEALTH_VITAMINS)]},
  // Session AK (8.10, AFL8; TIER 3 (auth/sync)): the Checklist's favourites, custom items, orbits and day counts travel;
  // its Health quick inputs (`healthItems`) and today's tick receipts (`today`, which can name a Health entry) stay on each
  // device, so nothing Health-describing leaves without the Health consent. Effective once private-sync is redeployed.
  {name: 'checklist', consent: 'account', records: [record(CHECKLIST, ['healthItems']), record(CHECKLIST_DAYS, ['today'])]},
  // Session AM (ADR-038 O2, D18, D19; TIER 3 (sync)): NOVA's requests, the widgets it made, their parameters and the dock
  // travel whole (`zigoals:nova-stage:v1`); of NOVA's own record (`zigoals:nova:v1`) only the layout and the arranged
  // (pinned) widgets travel, by allow-list; the side bars, the persona, the names, the instructions, the wake phrase, the
  // start page, the opening and the dock's order stay on each device. Nothing here is Health data (kinds, ids, times and
  // the person's own words; never a figure). `zigoals:nova-world:v1` and every other NOVA key are not in any section.
  // Effective once private-sync is redeployed; until then this section is not listed and NOVA stays on the device.
  {name: 'nova', consent: 'account', records: [record(NOVA_STAGE, NOVA_STAGE_DEVICE_FIELDS, {verbatim: true, fit: fitNovaStage}), record(NOVA_STORE, NOVA_DEVICE_FIELDS, {syncFields: NOVA_SYNC_FIELDS, verbatim: true, fit: fitNovaArrangement})]},
];
/** Every device key the extras carry: an edit to one schedules a sync, like a module edit. */
export const EXTRAS_KEYS: readonly string[] = EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key));

/**
 * Session AV lane 2 (sync; LEDGER #41 Day One, #134 YNAB, #209 Strong; TIER 3 (sync)): the sections that travel only once
 * the person chose each one on this device (lib/vault/extras-keys.ts EXTRAS_CHOICE_SECTIONS), each in its own section so
 * that one large record never stops another's sync. They are not in EXTRAS_SECTIONS: a device that chose none syncs,
 * asks and stores exactly what it did before. Every record is loose and keeps fields a later build adds, so it travels
 * as stored (`verbatim`), checked by its schema but never rewritten by it.
 *
 * - `journal` (account consent): the entries, the journals, the own templates, the prompt packs and the default
 *   template. Stay on each device: whether ZIGi may send entries to the person's own AI (`shareWithAi`, a consent given
 *   per device), the earlier versions (`versions`, up to 200,000 characters, kept where the change was made), the
 *   reminder to write (it rings where it was set) and what Today shows of the journal (`todayLines`, `affirmations`:
 *   Today is often a shared screen). Photos and voice notes stay on the device where they were added (owner decision:
 *   photos stay on the device); an entry names them by id and says so where they are missing.
 * - `money` (account consent): the spending log, budgets and pay periods, bills, rules, tags and the reviewed marks.
 * - `workouts` (Health consent, as every Health-describing record): the workout log, its routines and custom exercises,
 *   and the splits of imported runs. Only while Health sync is on; held after a Health deletion like the Health extras.
 */
export const EXTRAS_CHOICE_SECTION_LIST: readonly ExtrasSection[] = [
  {name: 'journal', consent: 'account', records: [record(JOURNAL, JOURNAL_DEVICE_FIELDS, {verbatim: true})]},
  {name: 'money', consent: 'account', records: [record(MONEY_LOG, undefined, {verbatim: true}), record(BUDGETS, undefined, {verbatim: true}), record(BUDGET_PERIODS, undefined, {verbatim: true}), record(BILLS, undefined, {verbatim: true}), record(MONEY_RULES, undefined, {verbatim: true}), record(MONEY_TAGS_RECORD, undefined, {verbatim: true}), record(MONEY_REVIEW, undefined, {verbatim: true})]},
  {name: 'workouts', consent: 'health', records: [record(WORKOUTS, undefined, {verbatim: true}), record(WORKOUT_SPLITS, undefined, {verbatim: true})]},
];
/** Every section a sync may run, the chosen ones after the six. */
export const ALL_EXTRAS_SECTIONS: readonly ExtrasSection[] = [...EXTRAS_SECTIONS, ...EXTRAS_CHOICE_SECTION_LIST];
