/**
 * The first-run welcome (Session E): whether this device has already seen or dismissed it.
 * One device-only flag, `{version:1, seen:true}`. It holds no personal content, is never synced and is not part of
 * backups. Loading is tolerant and fails closed: anything present but unreadable counts as seen, so a stored value can
 * never bring the welcome back to someone who already has data; only a missing value means "not seen yet".
 */
import {HABIT_HEALTH_LINKS_KEY} from './habit-health-links/schema';
import {HEALTH_GOALS_KEY} from './health-goals/schema';
import {WEEKLY_REVIEW_KEY} from './weekly-review/schema';
import {FASTING_KEY} from './fasting/schema';
import {INSIGHTS_KEY} from './insights/schema';
import {IMPORT_UNDO_KEY} from './import/undo-schema';
import {PUSH_KEY} from './push/client';
import {GUIDE_KEY} from './coach/schema';
import {AI_SETTINGS_KEY} from './ai/launcher-record';
import {TODAY_FOLDS_KEY} from './today-folds';
import {ZIGI_DISPLAY_KEYS, ZIGI_PERSONAL_KEYS} from './ai/store/keys';
import {Z_DISPLAY_KEYS, Z_PERSONAL_KEYS} from './z-device-keys';
import {W_DISPLAY_KEYS, W_PERSONAL_KEYS} from './w-device-keys';
import {AA_DISPLAY_KEYS, AA_PERSONAL_KEYS} from './aa-device-keys';
import {AB_DESIGN_DISPLAY_KEYS} from './ab-design-keys';
import {AB_CLOUD_PERSONAL_KEYS} from './ab-cloud-device-keys';
import {LINKED_WALLETS_KEY} from './linked-wallets-key';
import {EARN_DISPLAY_KEYS, EARN_PERSONAL_KEYS} from './af-earn-keys';
import {AF_CHECKLIST_PERSONAL_KEYS} from './af-checklist-keys';
import {STAKING_JOURNAL_KEY, STAKING_PREFS_KEY, VALIDATOR_ALERTS_KEY} from './af-signing-keys';
import {WALLET_PERSONAL_KEYS} from './af-wallet-keys';
import {AF_ZIGI_DISPLAY_KEYS, AF_ZIGI_PERSONAL_KEYS} from './af-zigi-keys';
import {AF_EXTRAS_DISPLAY_KEYS, AF_EXTRAS_PERSONAL_KEYS} from './af-extras-keys';
import {AH_DISPLAY_KEYS, AH_PERSONAL_KEYS} from './ah-device-keys';
import {AI_PERSONAL_KEYS} from './ai-device-keys';
import {AJ_PERSONAL_KEYS} from './aj-device-keys';
// AA-Cloud's six device keys as literals (ADR-022 B53): importing their store modules here would carry every schema into
// each page that asks "is this device new?"; lib/onboarding.test.ts keeps the literals equal to the stores' constants.
const GOAL_EXTRAS_KEY = 'zigoals:goal-extras:v1', AVERAGE_GOALS_KEY = 'zigoals:average-goals:v1', CALCULATOR_KEY = 'zigoals:calculator:v1', SEARCH_RECENT_KEY = 'zigoals:search-recent:v1', LIFE_REVIEW_KEY = 'zigoals:life-review:v1', TODAY_CARDS_KEY = 'zigoals:today-cards:v1';
export const ONBOARDING_KEY = 'zigoals:onboarding:v1';
export type OnboardingFlag = { version: 1; seen: true };
type Read = Pick<Storage, 'getItem'>;
type Write = Pick<Storage, 'setItem'>;

/** True when the welcome was seen, dismissed or finished on this device, or when the stored value cannot be read. */
export function onboardingSeen(storage: Read | null | undefined): boolean {
  let raw: string | null;
  try { if (!storage) return true; raw = storage.getItem(ONBOARDING_KEY); } catch { return true; }
  if (raw === null) return false;
  // Present in any shape: seen. Only an exact, valid flag is ever written.
  return true;
}

/** Records that the welcome was seen. Returns false when storage refused the write (the welcome may then return). */
export function markOnboardingSeen(storage: Write | null | undefined): boolean {
  try { storage?.setItem(ONBOARDING_KEY, JSON.stringify({ version: 1, seen: true } satisfies OnboardingFlag)); return !!storage; } catch { return false; }
}

/**
 * Device keys that hold personal records outside the four synced modules (Session P, PR 3; docs/product/features/README.md).
 * They are deliberately not in NON_PERSONAL_KEYS: a device with any of them is not new, so the welcome never returns.
 * Session W adds its own (lib/w-device-keys.ts): its personal records here, its two display preferences below; Session
 * Z-Cloud its own (lib/z-device-keys.ts): ZIGi's suggestions here, the voice choices below.
 */
export const DEVICE_RECORD_KEYS: readonly string[] = [HABIT_HEALTH_LINKS_KEY, HEALTH_GOALS_KEY, WEEKLY_REVIEW_KEY, FASTING_KEY, INSIGHTS_KEY, IMPORT_UNDO_KEY, PUSH_KEY, GUIDE_KEY, AI_SETTINGS_KEY, ...ZIGI_PERSONAL_KEYS, ...W_PERSONAL_KEYS, ...Z_PERSONAL_KEYS, ...AA_PERSONAL_KEYS,
  // Session AA-Cloud's five personal device keys (ADR-021; listed here by the second merger, ADR-022 B52).
  GOAL_EXTRAS_KEY, AVERAGE_GOALS_KEY, CALCULATOR_KEY, SEARCH_RECENT_KEY, LIFE_REVIEW_KEY,
  // Session AB-Cloud's own (lib/ab-cloud-device-keys.ts): vitamins, Point & tell's notes.
  ...AB_CLOUD_PERSONAL_KEYS,
  // Session AD item 11: a restore's undo record (lib/restore/apply.ts RESTORE_UNDO_KEY; written as text so this module stays light).
  'zigoals:restore-undo:v1',
  // Session AE (Part 6, ADR-027): the wallets linked read-only; public addresses are personal data.
  LINKED_WALLETS_KEY,
  // Session AF (ADR-028): Earn's Start-here progress and Academy results, the Checklist's favourites and day history.
  ...EARN_PERSONAL_KEYS, ...AF_CHECKLIST_PERSONAL_KEYS, STAKING_JOURNAL_KEY, VALIDATOR_ALERTS_KEY, ...WALLET_PERSONAL_KEYS, ...AF_ZIGI_PERSONAL_KEYS, ...AF_EXTRAS_PERSONAL_KEYS,
  // Session AH (lib/ah-device-keys.ts): workouts and Portfolio's last-visit note.
  ...AH_PERSONAL_KEYS,
  // Session AI: the expense log, journal, energy, meal ranges, tasks and the Portfolio's side records.
  ...AI_PERSONAL_KEYS, ...AJ_PERSONAL_KEYS];
/**
 * Device keys that hold no personal records: display preferences, public caches and this flag. The sync offer's "Not now"
 * (lib/sync-offer/offer.ts, written as text here so this module stays free of its schema) joined in Session X Part 10, as
 * Session L's follow-up asked: on its own it no longer keeps the welcome away from a device with nothing on it.
 */
export const NON_PERSONAL_KEYS: readonly string[] = [ONBOARDING_KEY, 'zigoals:whats-new:v1', 'zigoals:motion:v1', 'zigoals:sync-offer:v1', 'zigoals:layout:v1', 'zigoals:settings:v1', 'zigoals:public-market-quotes:v1', 'zigoals:public-market-insights:v1', TODAY_FOLDS_KEY, ...ZIGI_DISPLAY_KEYS, ...W_DISPLAY_KEYS, ...Z_DISPLAY_KEYS, ...AA_DISPLAY_KEYS, TODAY_CARDS_KEY, ...AB_DESIGN_DISPLAY_KEYS, ...EARN_DISPLAY_KEYS, STAKING_PREFS_KEY, ...AF_ZIGI_DISPLAY_KEYS, ...AF_EXTRAS_DISPLAY_KEYS, ...AH_DISPLAY_KEYS];

/**
 * Whether this device looks brand-new: no ZIGoals key other than the non-personal ones above (Today settings are
 * checked separately, through their own onboarded flag). Any error reading counts as "not new", so the welcome never
 * appears when it cannot be sure.
 */
export function noExistingData(storage: Pick<Storage, 'length' | 'key'> | null | undefined, allowed: readonly string[] = NON_PERSONAL_KEYS): boolean {
  try {
    if (!storage) return false;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key === null || (key.startsWith('zigoals') && !allowed.includes(key))) return false;
    }
    return true;
  } catch { return false; }
}
