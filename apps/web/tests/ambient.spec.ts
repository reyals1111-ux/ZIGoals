import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {MUSIC_KEY} from '../lib/w-device-keys';
import {isPhone} from './phone-nav';

// Session W Part 6: ambient focus sounds, made on the device. A MOCK AudioContext records what the page builds and when it
// starts and stops; nothing is downloaded (the test also proves no request leaves for a sound file).
test.use({timezoneId: 'Europe/Brussels'});
async function mocks(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {__audio: {what: string; value?: unknown; at?: number}[]};
    w.__audio = [];
    const param = (name: string) => ({value: 0.2, setValueAtTime: (v: number, t: number) => w.__audio.push({what: `${name} set`, value: v, at: t}), linearRampToValueAtTime: (v: number, t: number) => w.__audio.push({what: `${name} ramp`, value: v, at: t}), exponentialRampToValueAtTime: () => undefined, cancelScheduledValues: () => undefined, setTargetAtTime: (v: number) => w.__audio.push({what: `${name} target`, value: v})});
    class FakeContext {
      state = 'running'; destination = {}; sampleRate = 8000;
      get currentTime() { return performance.now() / 1000; }
      createOscillator() { return {type: '', frequency: param('osc.frequency'), connect: () => undefined, start: () => w.__audio.push({what: 'osc start'}), stop: (t: number) => w.__audio.push({what: 'osc stop', at: t})}; }
      createGain() { return {gain: param('gain'), connect: () => undefined}; }
      createBiquadFilter() { const f: Record<string, unknown> = {frequency: param('filter.frequency'), Q: param('filter.Q'), connect: () => undefined}; return new Proxy(f, {set: (t, k, v) => { t[k as string] = v; if (k === 'type') w.__audio.push({what: 'filter', value: v}); return true; }}); }
      createBuffer(_c: number, length: number) { w.__audio.push({what: 'buffer', value: length}); const data = new Float32Array(length); return {getChannelData: () => data}; }
      createBufferSource() { return {buffer: null, loop: false, connect: () => undefined, start: () => w.__audio.push({what: 'source start'}), stop: (t: number) => w.__audio.push({what: 'source stop', at: t})}; }
      resume() { return Promise.resolve(); }
    }
    (window as unknown as {AudioContext: unknown}).AudioContext = FakeContext;
  });
}
async function seed(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('habits-health'), onboarded: true})]);
}
const audio = (page: Page) => page.evaluate(() => (window as unknown as {__audio: {what: string; value?: unknown; at?: number}[]}).__audio);
const player = (page: Page) => page.getByRole('region', {name: 'Focus sounds'});

test('a rain-like sound plays here, follows you around ZIGoals with a Stop button, and stops', async ({page, baseURL}) => {
  await mocks(page);
  await seed(page);
  const outside: string[] = [];
  page.on('request', request => { if (!request.url().startsWith(baseURL!) && !request.url().startsWith('data:')) outside.push(request.url()); });
  await page.goto('/app/health?view=meditation');
  const p = player(page);
  await expect(p.getByRole('status')).toHaveText('Off');
  await p.getByRole('button', {name: 'Rain-like', exact: true}).click();
  await expect(p.getByRole('button', {name: 'Rain-like', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await p.getByRole('button', {name: 'Play', exact: true}).click();
  await expect(p.getByRole('status')).toHaveText('Playing Rain-like');
  // Made here: a noise buffer through a high-pass and a low-pass filter, faded in.
  const built = await audio(page);
  expect(built.some(e => e.what === 'buffer')).toBe(true);
  expect(built.filter(e => e.what === 'filter').map(e => e.value)).toEqual(['highpass', 'lowpass']);
  expect(built.some(e => e.what === 'gain ramp' && (e.value as number) > 0)).toBe(true);
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), MUSIC_KEY))!)).toMatchObject({ambient: {sound: 'rain', stopOnHide: false}});
  // Another page, by the app's own navigation: still playing, with a Stop pill.
  await page.locator('a[href="/app"]:visible').filter({hasText: 'Today'}).first().click();
  await page.waitForURL(/\/app$/);
  const pill = page.getByRole('group', {name: 'Focus sound'});
  await expect(pill).toContainText('Rain-like');
  if (await isPhone(page)) expect((await pill.getByRole('button', {name: 'Stop'}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await pill.getByRole('button', {name: 'Stop', exact: true}).click();
  await expect(pill).toHaveCount(0);
  expect((await audio(page)).some(e => e.what === 'source stop')).toBe(true);
  expect(outside).toEqual([]);
});

// Session X P2.5: the clock follows the app's one display rule (lib/visual-format.ts), not a fixed British clock: a
// 24-hour region reads 22:15, as above en-US reads 10:15 PM.
for (const locale of ['nl-BE', 'en-GB']) test.describe(locale, () => {
  test.use({locale});
  test(`${locale}: the timer's stop time is written in the region's clock`, async ({page}) => {
    await page.clock.install({time: new Date('2026-10-21T20:00:00.000Z')}); // 22:00 in Brussels
    await mocks(page);
    await seed(page);
    await page.goto('/app/health?view=meditation');
    const p = player(page);
    await p.getByLabel('Stop after').selectOption({label: '15 min'});
    await p.getByRole('button', {name: 'Play', exact: true}).click();
    await expect(p.getByRole('status')).toHaveText(/^Playing Brown noise · stops at 22:1[45]$/);
  });
});

test('the timer says when it stops, and the volume is kept on this device', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-21T20:00:00.000Z')}); // 22:00 in Brussels
  await mocks(page);
  await seed(page);
  await page.goto('/app/health?view=meditation');
  const p = player(page);
  await p.getByLabel('Stop after').selectOption({label: '15 min'});
  await p.getByLabel(/^Volume/).fill('40');
  await p.getByRole('button', {name: 'Play', exact: true}).click();
  // The suite's en-US: the time in the app's display rule (lib/visual-format.ts), as every other clock shows it.
  await expect(p.getByRole('status')).toHaveText(/^Playing Brown noise · stops at 10:1[45] PM$/);
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), MUSIC_KEY))!)).toMatchObject({volume: 40, ambient: {sound: 'brown', timerMin: 15}});
  // The fade is scheduled on the audio clock: down to silence 15 minutes after the start.
  const ramps = (await audio(page)).filter(e => e.what === 'gain ramp' && e.value === 0);
  expect(ramps.length).toBeGreaterThan(0);
  await page.clock.fastForward(15 * 60_000 + 1_000);
  await expect(p.getByRole('status')).toHaveText('Off');
});

test('"Stop when I leave ZIGoals": switching away stops the sound', async ({page}) => {
  await mocks(page);
  await seed(page);
  await page.goto('/app/health?view=meditation');
  const p = player(page);
  await p.getByRole('checkbox', {name: 'Stop when I leave ZIGoals (another tab or app)'}).check();
  await p.getByRole('button', {name: 'Soft drone', exact: true}).click();
  await p.getByRole('button', {name: 'Play', exact: true}).click();
  await expect(p.getByRole('status')).toHaveText('Playing Soft drone');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'}); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(p.getByRole('status')).toHaveText('Off');
});
