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
export type ExtrasSectionName = 'goals' | 'life' | 'habits' | 'health';
export type ExtrasRecord = {spec: DeviceRecordSpec<unknown>; deviceFields?: readonly string[]};
export type ExtrasSection = {name: ExtrasSectionName; consent: 'account' | 'health'; records: readonly ExtrasRecord[]};
const record = <T,>(spec: DeviceRecordSpec<T>, deviceFields?: readonly string[]): ExtrasRecord => ({spec: spec as DeviceRecordSpec<unknown>, ...(deviceFields ? {deviceFields} : {})});
export const EXTRAS_SECTIONS: readonly ExtrasSection[] = [
  {name: 'goals', consent: 'account', records: [record(GOAL_EXTRAS, ['dormant']), record(AVERAGE_GOALS)]},
  {name: 'life', consent: 'account', records: [record(CALCULATOR), record(LIFE_REVIEW), record(TODAY_CARDS), record(REMINDERS_PLAN)]},
  {name: 'habits', consent: 'account', records: [record(HABIT_EXTRAS, ['folds']), record(ROUTINE_RUN), record(GAME)]},
  // Health-describing records travel only under the Health consent (SYNC_HOMES rule), never pre-ticked.
  {name: 'health', consent: 'health', records: [record(HEALTH_COACH), record(MICRO_TARGETS), record(MACRO_MODE), record(AISLES_RECORD), record(MEASUREMENTS_CUSTOM), record(HEALTH_VITAMINS)]},
];
/** Every device key the extras carry: an edit to one schedules a sync, like a module edit. */
export const EXTRAS_KEYS: readonly string[] = EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key));
