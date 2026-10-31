import {test, type Page} from '@playwright/test';
import {desktopOnly, expect, hydrated, seedRecords} from './journey-helpers';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../../lib/habits';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY} from '../../lib/health';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema} from '../../lib/positions';
import {CHECKLIST_KEY} from '../../lib/af-checklist-keys';
import {emptyChecklist} from '../../lib/checklist/schema';
import {addCustom} from '../../lib/checklist/store';

/**
 * Session AK F2, journey 6: data safety. A device with habits, Health, a goal, a money log, a Checklist, notifications on
 * (push stubbed as in tests/pwa-ak.spec.ts) and the offline worker's caches. Export everything → Test a backup (every part
 * would restore, nothing on the device changes) → Erase everything (the push device record is deleted on the server with
 * the device's own secret, the caches and every ZIGoals database and key are gone) → a fresh start → Restore from the
 * ZIP → every record is back, value for value. Fictional data.
 */
test.use({actionTimeout: 20_000, timezoneId: 'Europe/Brussels', serviceWorkers: 'allow'});
desktopOnly();
const PUBLIC_KEY = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const HABIT = '11111111-1111-4111-8111-1111111111a6';
function records() {
  let habits = createHabit(emptyHabitData(), {title: 'Fictional journal', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00Z'), HABIT);
  habits = logHabitValue(habits, HABIT, '2026-10-20', 1, {mode: 'set'}, new Date('2026-10-20T08:00:00Z'));
  const health = createEmptyHealth();
  health.weights.push({id: 'health_weight-001', date: '2026-10-20', grams: 71200, createdAt: '2026-10-20T07:00:00.000Z', updatedAt: '2026-10-20T07:00:00.000Z'});
  const goal = privateGoalSchema.parse({id: '66', name: 'Fictional sabbatical', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '900000', notes: '', createdAt: '2026-10-01T08:00:00.000Z', milestones: []});
  return {
    [HABITS_KEY]: habits,
    [HEALTH_STORAGE_KEY]: healthSchema.parse({...health, schemaVersion: 4}),
    [PLATFORM_KEY]: {...emptyPlatform(), goals: [goal]},
    [CHECKLIST_KEY]: addCustom(emptyChecklist(), {label: 'Fictional tidy desk'}, {id: 'ck_desk', at: new Date('2026-10-01T08:00:00Z')}),
    'zigoals:money-log:v1': {version: 1, entries: [{id: 'f6f6f6f6-0000-4000-8000-000000000001', kind: 'expense', amount: '12.50', currency: 'EUR', category: 'Food & drink', note: 'Fictional lunch', date: '2026-10-20', createdAt: '2026-10-20T12:00:00.000Z'}]},
  };
}
const zigoals = (page: Page) => page.evaluate(async () => ({
  keys: Object.keys(localStorage).filter(k => k.startsWith('zigoals')).length + Object.keys(sessionStorage).filter(k => k.startsWith('zigoals')).length,
  databases: (await indexedDB.databases()).map(d => d.name ?? '').filter(n => n.startsWith('zigoals')),
  caches: (await caches.keys()).filter(k => k.startsWith('zigoals')),
}));
const value = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);

test('@journey 6 data safety: Export everything → Test a backup → Erase everything → restore → every value back', async ({page, context}) => {
  test.setTimeout(180_000);
  await context.grantPermissions(['notifications']);
  // The browser keeps its push subscription across page loads; the stub does too (in this origin's storage, shared by its tabs).
  await context.addInitScript(() => {
    const KEY = 'fixture-push-subscription', make = (endpoint: string) => ({endpoint, async unsubscribe() { localStorage.removeItem(KEY); return true; }, toJSON() { return {endpoint}; }});
    PushManager.prototype.subscribe = async function () { localStorage.setItem(KEY, 'https://fcm.googleapis.com/wp/fixture-journey-6'); return make(localStorage.getItem(KEY)!) as unknown as PushSubscription; };
    PushManager.prototype.getSubscription = async function () { const e = localStorage.getItem(KEY); return (e ? make(e) : null) as unknown as PushSubscription | null; };
  });
  const deletes: string[] = [];
  await context.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await context.route('**/api/push-device', route => {
    const r = route.request();
    if (r.method() === 'GET') return route.fulfill({json: {enabled: true, publicKey: PUBLIC_KEY}});
    if (r.method() === 'PUT') return route.fulfill({json: {registered: true, next: null, wakes: 0}});
    deletes.push(r.postData() ?? ''); return route.fulfill({json: {deleted: true}});
  });
  const seeded = records();
  await seedRecords(page, seeded);

  // The device in use: the offline worker caches pages; notifications are on.
  await page.goto('/app');
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.active?.scriptURL ?? ''), {timeout: 30_000}).toMatch(/\/sw\.js/);
  await page.reload(); await hydrated(page);
  await page.goto('/app/habits'); await hydrated(page);
  await page.goto('/app/settings#notifications'); await hydrated(page);
  await page.locator('#notifications').getByRole('button', {name: 'Turn on notifications'}).click();
  await expect(page.locator('#notifications').getByRole('status').first()).toHaveText('On for this device.');
  const before = await zigoals(page);
  // The records as the app keeps them (it may have tidied the seeded shapes on load): these must all come back.
  const kept: Record<string, unknown> = {};
  for (const key of Object.keys(seeded)) kept[key] = await value(page, key);
  expect(Object.values(kept).every(v => v !== null)).toBe(true);
  expect(before.caches.length).toBeGreaterThan(0);
  expect(before.databases).toContain('zigoals-notify-v1');

  // Export everything.
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await waiting).createReadStream()) chunks.push(Buffer.from(chunk));
  const zip = Buffer.concat(chunks);

  // Test a backup: every part would restore; nothing on this device changes.
  await page.goto('/app/settings/data'); await hydrated(page);
  const snapshotBefore = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => k.startsWith('zigoals:') && !k.includes('notify')).sort()));
  await page.getByLabel(/^Test a backup: choose a backup file/).setInputFiles({name: 'zigoals-export.zip', mimeType: 'application/zip', buffer: zip});
  await expect(page.locator('.test-backup [role=status]')).toContainText(/^All \d+ parts would restore\./, {timeout: 20_000});
  // Owner question J6-2: the Checklist is never restored (lib/restore/plan.ts NEVER_RESTORED), and Test a backup says so.
  await expect(page.locator('.test-backup [role=status]')).toContainText('The Checklist is never restored from a backup');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => k.startsWith('zigoals:') && !k.includes('notify')).sort()))).toBe(snapshotBefore);

  // Erase everything: typed confirmation; the server's device record, the caches and every database and key go.
  await page.goto('/app/settings#erase-everything'); await hydrated(page);
  const erase = page.locator('#erase-everything');
  await erase.getByRole('button', {name: 'Erase everything…', exact: true}).click();
  await erase.getByLabel('Type ERASE to confirm').fill('ERASE');
  await erase.getByRole('button', {name: 'Erase everything', exact: true}).click();
  await expect(erase.getByRole('status')).toContainText(/^Erased \d+ records and \d+ stores from this browser\./, {timeout: 20_000});
  expect(deletes.length).toBe(1);
  expect(deletes[0]).toContain('secret');
  const after = await zigoals(page);
  expect({keys: after.keys, databases: after.databases}).toEqual({keys: 0, databases: []});
  expect(after.caches.filter(k => !k.startsWith('zigoals-static-'))).toEqual([]); // no cached page is left
  // Nothing but the build's public hashed files may be here; journey 6b (bug J6-1, fixed) checks that no ZIGoals cache is left.
  const leftover = await page.evaluate(async () => { const out: string[] = []; for (const k of await caches.keys()) if (k.startsWith('zigoals')) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname); return out; });
  expect(leftover.filter(p => !p.startsWith('/_next/static/'))).toEqual([]);

  // A fresh start: the welcome is back; then Restore from the ZIP.
  await page.goto('/app'); await hydrated(page);
  await expect(page.getByRole('region', {name: 'Set up your first goal and habit in about a minute.'})).toBeVisible();
  await page.goto('/app/settings/data'); await hydrated(page);
  const restore = page.getByRole('region', {name: 'Restore from a backup'});
  await restore.getByLabel('Export everything ZIP').setInputFiles({name: 'zigoals-export.zip', mimeType: 'application/zip', buffer: zip});
  const preview = restore.getByLabel('What this backup holds');
  await expect(preview.getByRole('combobox').first()).toBeVisible();
  for (const select of await preview.getByRole('combobox').all()) {
    const options = await select.locator('option').evaluateAll(o => o.map(x => (x as HTMLOptionElement).value));
    await select.selectOption(options.includes('replace') ? 'replace' : options.includes('merge') ? 'merge' : 'leave');
  }
  await preview.getByLabel(/I checked my choices/).check();
  await preview.getByRole('button', {name: 'Restore the chosen parts'}).click();
  await expect(restore.getByRole('status').filter({hasText: 'Restored:'})).toBeVisible({timeout: 20_000});
  // Every restorable record is back, value for value. The Checklist is listed as never restored (lib/restore/plan.ts
  // NEVER_RESTORED), so it is not expected back (JOURNEY_BUGS.md J6-2 asks whether that should stay so).
  for (const [key, expected] of Object.entries(kept)) if (key !== CHECKLIST_KEY) expect(await value(page, key), key).toMatchObject(expected as Record<string, unknown>); // a field the schema defaults may be written out
  await page.goto('/app/habits'); await hydrated(page);
  await expect(page.getByRole('article', {name: 'Fictional journal', exact: true})).toBeVisible();
});

// Bug J6-1 (docs/review/session-ak/JOURNEY_BUGS.md): right after "Erase everything" the offline worker is still running
// and caches the next hashed files the page loads, so a "zigoals-static-v1" cache is back at once.
test('@journey 6b bug J6-1: after Erase everything no ZIGoals cache is left', async ({page, context}) => {
  await context.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await seedRecords(page, records());
  await page.goto('/app');
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.active?.scriptURL ?? ''), {timeout: 30_000}).toMatch(/\/sw\.js/);
  await page.reload(); await hydrated(page);
  await page.goto('/app/settings#erase-everything'); await hydrated(page);
  const erase = page.locator('#erase-everything');
  await erase.getByRole('button', {name: 'Erase everything…', exact: true}).click();
  await erase.getByLabel('Type ERASE to confirm').fill('ERASE');
  await erase.getByRole('button', {name: 'Erase everything', exact: true}).click();
  await expect(erase.getByRole('status')).toContainText('Erased');
  expect((await zigoals(page)).caches).toEqual([]);
});
