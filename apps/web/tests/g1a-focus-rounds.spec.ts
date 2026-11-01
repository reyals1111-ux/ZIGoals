import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {FOCUS_ROUNDS_KEY} from '../lib/focus-rounds/store';
import {FOCUS_SESSIONS_KEY} from '../lib/focus-sessions/schema';

/**
 * Session AK (BUILD list 2 #15, lane G1a): Focus intervals on the Pomodoro rounds — the bell choice is kept; starting a
 * run rings the bell now and plans one for each change ahead on the audio clock (a stand-in AudioContext counts the
 * strikes; the chime is three partials a strike); only focus blocks count toward the totals. Fresh start, fixed clock.
 */
const TODAY = '2026-11-04';
test.use({timezoneId: 'UTC'});
async function fresh(page: Page) {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => {
    const w = window as unknown as {__starts: number[]; AudioContext: unknown};
    w.__starts = [];
    const param = () => ({value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}});
    w.AudioContext = class { currentTime = 0; state = 'running'; destination = {}; sampleRate = 48000; resume() { return Promise.resolve(); }
      createOscillator() { return {type: '', frequency: param(), detune: param(), connect() {}, disconnect() {}, start: (t: number) => { w.__starts.push(t); }, stop() {}}; }
      createGain() { return {gain: param(), connect() {}, disconnect() {}}; } };
  });
  await page.goto('/manifest.webmanifest');
  await page.evaluate(k => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({version: 1, seen: true})); }, 'zigoals:onboarding:v1');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true})]);
}

test('the bell choice is kept; a run rings now and at each change ahead; breaks are not counted', async ({page}) => {
  await fresh(page);
  await page.goto('/app/journey#focus');
  const garden = page.getByRole('region', {name: 'Grow something while you focus'});
  await garden.getByRole('button', {name: 'Pomodoro'}).click();
  const pomodoro = page.getByRole('region', {name: /^Pomodoro/});
  await pomodoro.getByText(/^Bell and breaks:/).click();
  await expect(pomodoro.getByLabel('A bell at each change')).toHaveValue('bowl');
  await pomodoro.getByLabel('A bell at each change').selectOption('chime');
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), FOCUS_ROUNDS_KEY)).toMatchObject({version: 1, bell: 'chime'});
  await expect(pomodoro.getByRole('checkbox', {name: 'Fade the focus sound during breaks'})).toBeChecked();
  await pomodoro.getByLabel('Focus block').selectOption('15');
  await pomodoro.getByLabel('Blocks').selectOption('1');
  await pomodoro.getByLabel('Long break').selectOption('10');
  await pomodoro.getByRole('button', {name: 'Start the Pomodoro'}).click();
  await expect(pomodoro.getByRole('timer')).toHaveText('15:00');
  // Now, the end of the block (15 min) and the end of the run (25 min): three strikes of three partials.
  await expect.poll(() => page.evaluate(() => (window as unknown as {__starts: number[]}).__starts.length)).toBe(9);
  await page.clock.fastForward('25:02');
  await expect(pomodoro).toContainText('Run finished. 1 block grown');
  expect(await page.evaluate(() => (window as unknown as {__starts: number[]}).__starts.length)).toBe(9);
  const focus = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), FOCUS_SESSIONS_KEY) as {sessions: {plannedMinutes: number; focusedSeconds: number}[]};
  expect(focus.sessions).toMatchObject([{plannedMinutes: 15, focusedSeconds: 900}]);
});
