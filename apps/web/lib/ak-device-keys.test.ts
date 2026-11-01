import {expect, test} from 'vitest';
import {AK_DATABASES, AK_ERASE_KEYS, AK_PERSONAL_KEYS} from './ak-device-keys';
import {MEAL_PHOTO_DB} from './meal-estimates/photos';
import {FOOD_SCANS_KEY} from './food-scans/schema';
import {COMPARE_PAIR_KEY} from './compare/schema';
import {SUPPLEMENTS_KEY} from './supplements/schema';
import {GOV_REMINDERS_KEY} from './zigchain-eco/governance';
import {FOCUS_ROUNDS_KEY} from './focus-rounds/store';
import {CYCLE_KEY} from './cycle/store';
import {SCALES_KEY} from './scales/store';
import {HEALTH_NUMBERS_KEY} from './health-numbers/store';
import {NOVA_HERMES_KEY} from './nova/hermes-record';
import {NOVA_SETUP_KEY} from './nova/setup';
import {NOVA_WORKFLOWS_KEY} from './nova/workflows/schema';
import {NOVA_BRIEFS_KEY} from './nova/briefs';
import {NOVA_BRIDGE_KEY} from './nova/bridge';
import {NOVA_KEY} from './nova/store';
import {CALENDAR_IMPORT_KEY} from './ics/calendar';
import {NOTES_KEY} from './notes/schema';
import {NETWORTH_MILESTONES_KEY} from './networth-milestones/milestones';
import {SAVINGS_CHALLENGES_KEY} from './savings-challenges/challenges';
import {DEBT_PLANNER_KEY} from './debt-planner/store';
import {WRAPPED_KEY} from './wrapped/store';
import {AGENDA_KEY} from './agenda/store';
import {JOURNAL_DISPLAY_KEY} from './on-this-day/store';
import {FIRST_WEEK_KEY} from './first-week/store';
import {EXPERIMENTS_KEY} from './experiments/store';
import {MONEY_RULES_KEY} from './money-rules/schema';
import {MONEY_REVIEW_KEY} from './money-review/review';
import {FI_MODEL_KEY} from './fi-model/store';
import {EMERGENCY_SHEET_KEY} from './emergency-sheet/schema';
import {MUSCLE_RECOVERY_KEY} from './muscle-freshness/model';
import {FOOD_DISPLAY_KEY} from './food-display/schema';
import {REWARDS_SHELF_KEY} from './rewards-shelf/store';
import {NUTRIENT_EXTRAS_KEY} from './health-vitamins/extras';
import {GROCERY_KEY} from './grocery/schema';
import {CALORIE_WEEK_KEY} from './health-aa/calorie-week';
import {forgetAaDeviceRecords, ERASED_DATABASES} from './aa-device-forget';
import {NOTIFY_KEY} from './notify/prefs';
import {NOTIFY_ACTIONS_DB, NOTIFY_DB} from './notify/db';
import {GENERIC_FOOD_DATABASE} from './food-generic/store';
import {MUSIC_MIX_KEY} from './music/mix-store';
import {AUTO_RULES_KEY} from './auto-rules/schema';
import {BILLS_KEY} from './bills/schema';
import {BUDGETS_KEY} from './budgets/schema';
import {TARGET_ALLOCATION_KEY} from './allocation/target';
import {CSV_MAPPINGS_KEY} from './csv/templates/saved';
import {BACKUP_REMINDER_KEY} from './backup-reminder';
import {EVERYTHING_KEYS} from './export/everything';
import {KNOWN_DATABASES} from './erase-everything';

// Session AK: this session's keys are the owners' constants, are exported, and go with the account's erase.
test('the literals equal the owners\' constants', () => {
  expect(AK_PERSONAL_KEYS).toEqual([NOTIFY_KEY, MUSIC_MIX_KEY, AUTO_RULES_KEY, BILLS_KEY, BUDGETS_KEY, TARGET_ALLOCATION_KEY, CSV_MAPPINGS_KEY, BACKUP_REMINDER_KEY, FOOD_SCANS_KEY, NUTRIENT_EXTRAS_KEY, GROCERY_KEY, CALORIE_WEEK_KEY, COMPARE_PAIR_KEY, MUSCLE_RECOVERY_KEY, FOOD_DISPLAY_KEY, REWARDS_SHELF_KEY, MONEY_RULES_KEY, MONEY_REVIEW_KEY, FI_MODEL_KEY, EMERGENCY_SHEET_KEY, SUPPLEMENTS_KEY, EXPERIMENTS_KEY, FIRST_WEEK_KEY, JOURNAL_DISPLAY_KEY, AGENDA_KEY, WRAPPED_KEY, DEBT_PLANNER_KEY, SAVINGS_CHALLENGES_KEY, NETWORTH_MILESTONES_KEY, NOTES_KEY, CALENDAR_IMPORT_KEY, NOVA_KEY, NOVA_BRIDGE_KEY, NOVA_BRIEFS_KEY, NOVA_WORKFLOWS_KEY, NOVA_SETUP_KEY, NOVA_HERMES_KEY, HEALTH_NUMBERS_KEY, SCALES_KEY, CYCLE_KEY, FOCUS_ROUNDS_KEY, GOV_REMINDERS_KEY]);
  expect(AK_DATABASES).toEqual([NOTIFY_DB, NOTIFY_ACTIONS_DB, GENERIC_FOOD_DATABASE, 'zigoals-music-byo-v1', 'zigoals-offline-queue-v1', MEAL_PHOTO_DB, 'zigoals-lichess-v1', 'zigoals-notes-photos-v1', 'zigoals-money-photos-v1']);
});
test('each key is exported and the account erase removes it; each database is erased by both erases', async () => {
  for (const key of AK_PERSONAL_KEYS) {
    expect(EVERYTHING_KEYS).toContain(key);
    const m = new Map<string, string>([[key, '{}']]);
    forgetAaDeviceRecords({getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k)} as Storage);
    expect(m.has(key)).toBe(false);
  }
  expect(AK_ERASE_KEYS).toEqual(AK_PERSONAL_KEYS);
  for (const db of AK_DATABASES) { expect(KNOWN_DATABASES).toContain(db); expect(ERASED_DATABASES).toContain(db); }
});
