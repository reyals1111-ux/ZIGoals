// Types for generate.mjs (Session AX heavy profile, test-only), used by heavy-profile.test.ts and
// apps/web/tests/helpers/heavy-profile.ts.

export const DEFAULT_SEED: number;
export const TIME_ZONE: string;
export const TARGETS: Readonly<Record<'moneyEntries' | 'tasks' | 'journalEntries' | 'journalPhotos' | 'foodLogs' | 'sleepNights' | 'workouts' | 'habits' | 'moodDays' | 'notes' | 'goals', number>>;
export const PHOTO_WEBP_BASE64: string;
export const ONBOARDING_KEY: string;
export const KEYS: Readonly<Record<HeavyRecordName, string>>;
export type HeavyRecordName = 'platform' | 'habits' | 'health' | 'portfolio' | 'moneyLog' | 'accounts' | 'budgets' | 'bills' | 'tasks' | 'journal' | 'energy' | 'workouts' | 'notes' | 'averageGoals';
/** Real ids in the profile, for the dynamic routes (/app/goals/[id], /app/goals/tracked/[id], /app/goals/average/[id], /app/wealth/asset/[id], /app/portfolio/coin/[id]). */
export type HeavyProfileIds = {goals: string[]; trackedGoals: string[]; averageGoals: string[]; wealthAssets: string[]; portfolioCoins: string[]; portfolio: string; accounts: string[]};
export type HeavyProfile = {
  end: string; seed: number; start: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  records: Record<HeavyRecordName, any>;
  /** localStorage key → stored string. */
  storage: Record<string, string>;
  photoIds: string[]; ids: HeavyProfileIds; counts: Record<string, number>;
  /** Characters of every stored string together (Chromium keeps about 5.2 million per origin). */
  chars: number; bytes: Record<string, number>;
};
export function addDays(day: string, n: number): string;
export function buildHeavyProfile(options?: {end?: string; seed?: number}): HeavyProfile;
export function everythingJson(profile: HeavyProfile): {format: 'zigoals-everything'; version: 1; exportedAt: string; modules: Record<string, unknown>; device: Record<string, unknown>; portfolio: unknown; unreadable: string[]};
export function storedZip(files: {name: string; data: string | Uint8Array}[], modified?: Date): Buffer;
export function heavyProfileZip(profile: HeavyProfile): Buffer;
