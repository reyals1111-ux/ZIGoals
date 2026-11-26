import type {Page} from '@playwright/test';
import {ONBOARDING_KEY, PHOTO_WEBP_BASE64, buildHeavyProfile, type HeavyProfile} from '../../../../scripts/heavy-profile/generate.mjs';

/**
 * Session AX (review helper, test-only): seeds the heavy profile (scripts/heavy-profile/generate.mjs — two years of
 * records in every pillar, ending today) into this page's browser context, as the person's own local data (not the
 * Showcase): every record into localStorage and the journal's photo stubs into its IndexedDB store, the welcome marked
 * seen. Takes a second or two; the page is left on /app/settings, so go to the route under test next.
 *
 *   const profile = await seedHeavyProfile(page);
 *   await page.goto(`/app/goals/tracked/${profile.ids.trackedGoals[0]}`);
 */
export type SeedOptions = {end?: string; seed?: number; photos?: boolean};
const built = new Map<string, HeavyProfile>();
/** The profile for a run day (default: today on this machine), built once per worker. */
export function heavyProfile({end, seed}: Omit<SeedOptions, 'photos'> = {}): HeavyProfile {
  const key = `${end ?? ''}|${seed ?? ''}`;
  let profile = built.get(key);
  if (!profile) { profile = buildHeavyProfile({...(end ? {end} : {}), ...(seed !== undefined ? {seed} : {})}); built.set(key, profile); }
  return profile;
}
export async function seedHeavyProfile(page: Page, options: SeedOptions = {}): Promise<HeavyProfile> {
  const profile = heavyProfile(options);
  await page.goto('/app/settings');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 30_000});
  await page.evaluate(async ({storage, onboarding, photoIds, photo, at}) => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem(onboarding, JSON.stringify({version: 1, seen: true}));
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
    if (!photoIds.length) return;
    const bytes = Uint8Array.from(atob(photo), c => c.charCodeAt(0));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('zigoals-journal-media-v1', 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('media')) req.result.createObjectStore('media'); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('media', 'readwrite'), s = t.objectStore('media');
      for (const id of photoIds) s.put({kind: 'photo', blob: new Blob([bytes], {type: 'image/webp'}), type: 'image/webp', bytes: bytes.length, at}, `local:${id}`);
      t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error);
    });
  }, {storage: profile.storage, onboarding: ONBOARDING_KEY, photoIds: options.photos === false ? [] : profile.photoIds, photo: PHOTO_WEBP_BASE64, at: `${profile.end}T20:00:00.000Z`});
  return profile;
}
/** Real routes for the dynamic pages, from the profile's own ids. */
export function heavyProfileRoutes(profile: HeavyProfile): Record<string, string> {
  return {
    goal: `/app/goals/${profile.ids.goals[0]}`, trackedGoal: `/app/goals/tracked/${profile.ids.trackedGoals[0]}`, averageGoal: `/app/goals/average/${profile.ids.averageGoals[0]}`,
    wealthAsset: `/app/wealth/asset/${encodeURIComponent(profile.ids.wealthAssets[0]!)}`, portfolioCoin: `/app/portfolio/coin/${profile.ids.portfolioCoins[0]}?portfolio=${profile.ids.portfolio}`,
  };
}
