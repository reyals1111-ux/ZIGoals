import {expect, test} from 'vitest';
import {AK_DATABASES, AK_ERASE_KEYS, AK_PERSONAL_KEYS} from './ak-device-keys';
import {MEAL_PHOTO_DB} from './meal-estimates/photos';
import {FOOD_SCANS_KEY} from './food-scans/schema';
import {COMPARE_PAIR_KEY} from './compare/schema';
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
  expect(AK_PERSONAL_KEYS).toEqual([NOTIFY_KEY, MUSIC_MIX_KEY, AUTO_RULES_KEY, BILLS_KEY, BUDGETS_KEY, TARGET_ALLOCATION_KEY, CSV_MAPPINGS_KEY, BACKUP_REMINDER_KEY, FOOD_SCANS_KEY, NUTRIENT_EXTRAS_KEY, GROCERY_KEY, CALORIE_WEEK_KEY, COMPARE_PAIR_KEY, MUSCLE_RECOVERY_KEY, FOOD_DISPLAY_KEY, REWARDS_SHELF_KEY, MONEY_RULES_KEY, MONEY_REVIEW_KEY, FI_MODEL_KEY, EMERGENCY_SHEET_KEY]);
  expect(AK_DATABASES).toEqual([NOTIFY_DB, NOTIFY_ACTIONS_DB, GENERIC_FOOD_DATABASE, 'zigoals-music-byo-v1', 'zigoals-offline-queue-v1', MEAL_PHOTO_DB, 'zigoals-lichess-v1']);
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
