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
 */
export const DEVICE_RECORD_KEYS: readonly string[] = [HABIT_HEALTH_LINKS_KEY, HEALTH_GOALS_KEY, WEEKLY_REVIEW_KEY, FASTING_KEY, INSIGHTS_KEY, IMPORT_UNDO_KEY];
/** Device keys that hold no personal records: display preferences, public caches and this flag. */
export const NON_PERSONAL_KEYS: readonly string[] = [ONBOARDING_KEY, 'zigoals:whats-new:v1', 'zigoals:motion:v1', 'zigoals:layout:v1', 'zigoals:settings:v1', 'zigoals:public-market-quotes:v1', 'zigoals:public-market-insights:v1'];

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
