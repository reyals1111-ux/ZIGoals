import {HEALTH_EXTRAS} from '../../health-extras';
import {NOTIFY_PREFS} from '../../notify/prefs';
import {MORE_GOALS} from '../../health-goals/more';
import {CIRCUITS} from '../../workouts/circuits';
import {WORKOUT_PLACES} from '../../workouts/places-schema';
import {MONEY_MORE} from '../../money-more/schema';
import {STORE_CARDS} from '../../store-cards/schema';
import {MONEY_LOG_BUSINESS} from '../../money-more/spaces';
import {NUTRIENT_EXTRAS_RECORD} from '../../health-vitamins/extras';
import {EVENING_PLAN} from '../../evening-plan/schema';
import {BODY_EXTRAS} from '../../body-extras/schema';
import {WEALTH_SHEET} from '../../wealth-sheet/schema';
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
import {WORKOUT_SPLITS} from '../../workouts/splits-schema';
import {MONEY_REVIEW} from '../../money-review/review';

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
    workouts: one(WORKOUTS), remindersPlan: one(REMINDERS_PLAN), habitTimes: extras?.times ?? null,
    // Session AV (1c, f1): what the on-device answers read for the running bests, today's focus habit and money that asks for a look.
    splits: one(WORKOUT_SPLITS), habitFocus: (extras as {focus?: unknown} | null)?.focus ?? null, moneyReview: one(MONEY_REVIEW),
    // Session AV lane 2 (habits): the whole habit extras record, for each habit's own options, areas and focus days (av2-habits.ts).
    habitExtras: extras,
    // Session AV lane 2, batch 2 (body, money).
    eveningPlan: one(EVENING_PLAN), bodyExtras: one(BODY_EXTRAS), wealthSheet: one(WEALTH_SHEET), nutrientExtras: one(NUTRIENT_EXTRAS_RECORD), moneyMore: one(MONEY_MORE), storeCards: one(STORE_CARDS), moneyLogBusiness: one(MONEY_LOG_BUSINESS), workoutPlaces: one(WORKOUT_PLACES),
    // Session AV lane 2, round 3 (health; each answer checks the Health gate first, as the batch 2 Health records do).
    healthExtras: one(HEALTH_EXTRAS), notifyPrefs: one(NOTIFY_PREFS), healthGoalsMore: one(MORE_GOALS), workoutCircuits: one(CIRCUITS)};
}
