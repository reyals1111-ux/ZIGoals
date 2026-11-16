import {DAY_GOAL_RECORD} from '../../checklist/day-goal';
import {COUNTDOWNS} from '../../countdowns/schema';
import {DAY_ENDS_RECORD} from '../../day-boundary';
import {readDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {MONEY_TAGS_RECORD} from '../../money-tags/schema';
import {MOOD_TAGS} from '../../mood-tags/schema';
import {NETWORTH_HISTORY} from '../../networth-history';
import {TEMPLATE_COUNTS} from '../cards/life-insights';
import type {ConnectData} from '../summon/connect-lines';
import {widgetSpec} from '../widgets/catalog';
import {getAppStorage} from '../../showcase-storage';
import {SYMPTOMS} from '../../symptoms/schema';
import {TASK_WHEN} from '../../tasks/when';
import {WORKOUT_SPLITS} from '../../workouts/splits-schema';

/**
 * Session AM-2 (step 3, "NOVA connected"): the device records a line of one of the newer widgets needs and NOVA's chat
 * engine does not hold (net-worth history, money tags, This evening and Someday, countdowns, the day's two rules, run
 * splits, mood tags, symptoms), read as their widgets read them: this device's own record, nothing fetched.
 *
 * Read only what the request asks for, and only behind its switch: a record is read when one of the widgets being made
 * needs it AND that widget's gate is open right now (`gateOpen`). So the health-type records (mood tags, symptoms, run
 * splits; ADR-040 owner addition 1) are never read for NOVA's words unless NOVA's Health permission and the device's
 * Health switch are both on (ADR-037 Q14, Q16); with the gate closed the line is the locked sentence and nothing is read.
 * A record that does not read gives null: no line, never a zero.
 */
function record<T>(spec: DeviceRecordSpec<T>): T | null {
  try { const read = readDeviceRecord(getAppStorage(), spec); return read.unreadable ? null : read.data; } catch { return null; }
}
export function connectExtras(widgets: readonly {id: string}[], gateOpen: (id: string) => boolean): ConnectData {
  const wants = (id: string) => widgets.some(w => w.id === id) && (!widgetSpec(id)?.gate || gateOpen(id));
  return {
    ...(wants('net-worth-history') ? {networthHistory: record(NETWORTH_HISTORY)} : {}),
    ...(wants('money-tags') ? {moneyTags: record(MONEY_TAGS_RECORD)} : {}),
    ...(wants('tasks-later') ? {taskWhen: record(TASK_WHEN)} : {}),
    ...(wants('countdowns') ? {countdowns: record(COUNTDOWNS)} : {}),
    ...(wants('day-rules') ? {dayGoal: record(DAY_GOAL_RECORD), dayEnds: record(DAY_ENDS_RECORD)} : {}),
    ...(wants('run-splits') ? {splits: record(WORKOUT_SPLITS)} : {}),
    ...(wants('mood-tags') ? {moodTags: record(MOOD_TAGS)} : {}),
    ...(wants('symptoms') ? {symptoms: record(SYMPTOMS)} : {}),
    ...(wants('templates') ? {templates: TEMPLATE_COUNTS} : {}),
  };
}
