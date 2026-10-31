import {AUTO_RULES} from '../../auto-rules/schema';
import {BILLS} from '../../bills/schema';
import {readDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {PRICE_ALERTS} from '../../price-alerts/schema';
import type {AkToolSources} from './ak-tools';
import {DEBT_PLANNER} from '../../debt-planner/store';
import {SUPPLEMENTS} from '../../supplements/schema';
import {SAVINGS_CHALLENGES} from '../../savings-challenges/challenges';
import {WORKOUTS} from '../../workouts/schema';
import {REMINDERS_PLAN} from '../../reminders-plan/schema';
import {HABIT_EXTRAS} from '../../habits-extras/schema';

/**
 * Session AK (Part 12): the device records ZIGi's AK tools read, read at the moment of the question (like the rest
 * of the tool sources). A record that cannot be read is null: its tool then says nothing is kept, and nothing is guessed.
 */
type Read = {getItem(key: string): string | null};
export function readAkToolSources(storage: Read): AkToolSources {
  const one = <T>(spec: DeviceRecordSpec<T>): T | null => { try { const r = readDeviceRecord(storage, spec); return r.unreadable ? null : r.data; } catch { return null; } };
  // Owner follow-up 1 (F9): the F4–F5 records ZIGi's newer tools and local answers read (f9-tools.ts); Health's behind the Health gate there.
  const extras = one(HABIT_EXTRAS);
  return {autoRules: one(AUTO_RULES), bills: one(BILLS), priceAlerts: one(PRICE_ALERTS), debtPlanner: one(DEBT_PLANNER), supplements: one(SUPPLEMENTS), savingsChallenges: one(SAVINGS_CHALLENGES),
    workouts: one(WORKOUTS), remindersPlan: one(REMINDERS_PLAN), habitTimes: extras?.times ?? null};
}
