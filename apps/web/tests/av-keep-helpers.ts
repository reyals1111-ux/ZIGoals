import {type Page} from '@playwright/test';
import {notesSchema} from '../lib/notes/schema';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

/** Session AV Part 3 (D-KEEP): a device that already holds `n` fictional notes (each a record with an id). */
export function notes(n: number): string {
  const at = '2026-11-18T09:00:00.000Z';
  return JSON.stringify(notesSchema.parse({version: 1, voice: false, notes: Array.from({length: n}, (_, i) => ({id: `n_av_${String(i).padStart(3, '0')}`, kind: 'inbox', title: `Fictional note ${i + 1}`, body: '', createdAt: at}))}));
}
export const REMINDER_KEY = 'zigoals:backup-reminder:v1';
/** A device that said "Not now" to the welcome and has read What's new (unless `whatsNew`), with these records; every /api call answers 503. */
export async function device(page: Page, records: Record<string, string> = {}, {homeScreen = false, whatsNew = false}: {homeScreen?: boolean; whatsNew?: boolean} = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  if (homeScreen) await page.addInitScript(() => { Object.defineProperty(navigator, 'standalone', {configurable: true, get: () => true}); });
  await page.addInitScript(values => { if (sessionStorage.getItem('av-seeded')) return; sessionStorage.setItem('av-seeded', '1'); localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), ...(whatsNew ? {} : {[WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})}), ...records});
}
export const reminder = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Record<string, unknown> | null, REMINDER_KEY);
export const card = (page: Page) => page.locator('section.keep-data-card');
/** On a phone the card is one row that opens; this opens it (a computer shows it open). */
export async function openCard(page: Page) {
  await card(page).getByRole('heading').first().waitFor();
  const fold = card(page).locator('details.keep-data-fold').first();
  if (await fold.count() && !(await fold.evaluate(d => (d as HTMLDetailsElement).open))) await fold.locator('> summary').click();
}
