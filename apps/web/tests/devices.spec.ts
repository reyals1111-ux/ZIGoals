import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {isPhone} from './phone-nav';

// Session W Part 8: Health → Devices. Web Bluetooth is a MOCK (navigator.bluetooth replaced before the page loads): a
// fictional strap and a fictional scale whose characteristics the test drives with bytes laid out as the Bluetooth
// SIG's GATT supplement says. Linked accounts are off in this build (no NEXT_PUBLIC_HEALTH_LINK), so they say so.
test.use({timezoneId: 'Europe/Brussels'});
const MORNING = new Date('2026-10-21T05:00:00.000Z');
async function seed(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('habits-health'), onboarded: true})]);
}
async function bluetooth(page: Page, policy: boolean | null = true) {
  await page.addInitScript(({policy}) => {
    const w = window as unknown as {__bt: {asked: unknown[]; hr: (bpm: number, flags?: number) => void; weight: (raw: number) => void}};
    const characteristic = () => { const t = new EventTarget() as EventTarget & {value: DataView | null; startNotifications: () => Promise<unknown>; stopNotifications: () => Promise<unknown>}; t.value = null; t.startNotifications = async () => t; t.stopNotifications = async () => t; return t; };
    const hr = characteristic(), weight = characteristic();
    const emit = (c: typeof hr, bytes: number[]) => { c.value = new DataView(new Uint8Array(bytes).buffer); c.dispatchEvent(new Event('characteristicvaluechanged')); };
    w.__bt = {asked: [], hr: (bpm, flags = 0x06) => emit(hr, [flags, bpm]), weight: raw => emit(weight, [0x00, raw & 0xFF, (raw >> 8) & 0xFF])};
    const device = (name: string, services: Record<string, Record<string, unknown>>) => {
      const d = new EventTarget() as EventTarget & {name: string; gatt: unknown};
      const gatt = {connected: true, connect: async () => gatt, disconnect: () => { gatt.connected = false; }, getPrimaryService: async (s: string) => { if (!services[s]) throw new DOMException('No such service', 'NotFoundError'); return {getCharacteristic: async (c: string) => services[s]![c]}; }};
      d.name = name; d.gatt = gatt; return d;
    };
    Object.defineProperty(navigator, 'bluetooth', {configurable: true, value: {requestDevice: async (options: {filters: {services: string[]}[]}) => { w.__bt.asked.push(options); return options.filters.some(f => f.services.includes('heart_rate')) ? device('Fictional Strap', {heart_rate: {heart_rate_measurement: hr}}) : device('Fictional Scale', {weight_scale: {weight_measurement: weight}}); }}});
    if (policy !== null) Object.defineProperty(Document.prototype, 'permissionsPolicy', {configurable: true, get: () => ({allowsFeature: (f: string) => f === 'bluetooth' ? policy : f === 'camera'})});
  }, {policy});
}
const health = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), HEALTH_STORAGE_KEY);

test('the honest list: Bluetooth here, linked accounts that need ZIGoals\' setup, and the importer for the rest', async ({page}) => {
  await bluetooth(page);
  await seed(page);
  await page.goto('/app/health');
  await page.getByRole('link', {name: 'Open Devices'}).click();
  await expect(page.getByRole('heading', {level: 1, name: 'Your devices, honestly.'})).toBeVisible();
  const links = page.getByRole('region', {name: 'Linked accounts'});
  await expect(links.getByText('Needs setup by ZIGoals')).toHaveCount(4);
  for (const name of ['Oura', 'Withings', 'Polar', 'Strava']) await expect(links.getByText(name, {exact: true})).toBeVisible();
  await expect(links.getByRole('button')).toHaveCount(0);
  const instead = page.getByRole('region', {name: 'Bring your history instead'});
  await expect(instead).toContainText('turned off 30 October 2026');
  await expect(instead.getByRole('link', {name: 'Settings → Switch to ZIGoals →'})).toHaveAttribute('href', '/app/settings#switch-import');
  if (await isPhone(page)) expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('without Web Bluetooth, or without Health\'s own policy, the page says so and offers a fresh Health', async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'bluetooth', {configurable: true, value: undefined}));
  await seed(page);
  await page.goto('/app/health?view=devices');
  await expect(page.getByRole('region', {name: 'On this device, by Bluetooth'})).toContainText('This browser has no Web Bluetooth');
  const other = await page.context().newPage();
  await bluetooth(other, false);
  await other.goto('/app/health?view=devices');
  const reload = other.getByRole('link', {name: 'Reload Health for Bluetooth'});
  await expect(reload).toHaveAttribute('href', '/app/health?view=devices');
});

test('a heart-rate monitor: live readings; a meditation keeps lowest, average and highest only when ticked', async ({page}) => {
  await page.clock.install({time: MORNING});
  await bluetooth(page);
  await seed(page);
  await page.goto('/app/health?view=devices');
  const monitor = page.getByRole('group', {name: 'Heart-rate monitor'});
  await monitor.getByRole('button', {name: 'Connect a heart-rate monitor'}).click();
  await expect(monitor).toContainText('Fictional Strap');
  await page.evaluate(() => (window as unknown as {__bt: {hr: (b: number) => void}}).__bt.hr(64));
  await expect(monitor.locator('.devices-reading')).toHaveText('♥ 64 bpm');
  expect(await page.evaluate(() => (window as unknown as {__bt: {asked: unknown[]}}).__bt.asked)).toEqual([{filters: [{services: ['heart_rate']}]}]);
  // Into Meditation by the app's own links (the same page, so the monitor stays connected).
  await page.getByRole('link', {name: '← Health'}).click();
  if (await isPhone(page)) await page.getByRole('button', {name: /^Meditation/}).click();
  await page.getByRole('link', {name: 'Begin a session'}).click();
  const form = page.getByRole('form', {name: 'Begin a session'});
  await form.getByRole('radio', {name: '1 min', exact: true}).check();
  await form.getByRole('button', {name: 'Begin', exact: true}).click();
  const session = page.getByRole('region', {name: 'Meditation in progress'});
  for (const bpm of [62, 60, 58, 57, 59, 61, 63, 60, 58, 57, 56, 58]) { await page.clock.fastForward(4_000); await page.evaluate(b => (window as unknown as {__bt: {hr: (b: number) => void}}).__bt.hr(b), bpm); }
  await expect(session.locator('.meditation-heart')).toHaveText('♥ 58 bpm');
  await page.clock.fastForward(20_000);
  const done = page.getByRole('region', {name: '1 min of stillness'});
  const keep = done.getByRole('checkbox', {name: /Keep my heart rate from this session: lowest 56, average 59, highest 63 bpm/});
  await expect(keep).not.toBeChecked();
  await keep.check();
  await done.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await health(page))?.meditation?.sessions?.[0]?.heartRate).toEqual({avg: 59, min: 56, max: 63});
});

test('a scale: each reading waits to be saved; saving again on the same day says it replaces', async ({page}) => {
  await bluetooth(page);
  await seed(page);
  await page.goto('/app/health?view=devices');
  const scale = page.getByRole('group', {name: 'Scale'});
  await scale.getByRole('button', {name: 'Connect a scale'}).click();
  await expect(scale).toContainText('Fictional Scale: step on the scale.');
  await page.evaluate(() => (window as unknown as {__bt: {weight: (r: number) => void}}).__bt.weight(14040));
  await expect(scale.locator('.devices-reading')).toHaveText('70.2 kg');
  expect((await health(page))?.weights ?? []).toEqual([]);
  await scale.getByRole('button', {name: 'Save as today’s weight'}).click();
  await expect(scale.getByRole('status')).toContainText('70.2 kg');
  expect((await health(page)).weights.map((w: {grams: number}) => w.grams)).toEqual([70200]);
  await page.evaluate(() => (window as unknown as {__bt: {weight: (r: number) => void}}).__bt.weight(14100));
  await expect(scale.getByText(/You already have a weight for .+ \(70\.2 kg\); saving replaces it\./)).toBeVisible();
  await scale.getByRole('button', {name: 'Replace today’s weight'}).click();
  await expect.poll(async () => (await health(page)).weights.map((w: {grams: number}) => w.grams)).toEqual([70500]);
});
