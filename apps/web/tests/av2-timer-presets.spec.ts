import {expect, test, type Page} from '@playwright/test';
import {health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {HABIT_EXTRAS_KEY} from '../lib/aa-device-keys';
import {HEALTH_EXTRAS_KEY} from '../lib/health-extras';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {MEDITATION_RUN_KEY} from '../lib/meditation/schema';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #184, Insight Timer's meditation timer): Health → Meditation → Your timer
 * presets makes a preset (a length, a moment to settle in, a start and an end bell, a bell along the way); Begin offers
 * it as one choice; the session settles in, then rings the preset's own bells (a MOCK AudioContext records them); a
 * session with no set length counts up and is saved at the time spent; a delete has Undo. 390 and 1440 in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Fictional records.
 */
async function mockAudio(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {__bells: {f: number; at: number}[]};
    w.__bells = [];
    class FakeContext {
      state = 'running'; destination = {};
      get currentTime() { return performance.now() / 1000; }
      createOscillator() { const o = {f: 0, type: '', frequency: {setValueAtTime: (v: number) => { o.f = v; }}, connect: () => undefined, start: (t: number) => { w.__bells.push({f: Math.round(o.f), at: t}); }, stop: () => undefined}; return o; }
      createGain() { const p = {setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined}; return {gain: p, connect: () => undefined}; }
      resume() { this.state = 'running'; return Promise.resolve(); }
    }
    (window as unknown as {AudioContext: unknown}).AudioContext = FakeContext;
  });
}
const bells = (page: Page) => page.evaluate(() => (window as unknown as {__bells: {f: number; at: number}[]}).__bells);
const PRESET = {id: 'tp-spec-evening', name: 'Evening sit', minutes: 20, warmup: 30, start: 'bowl', end: 'chime', volume: 60, intervals: [{sound: 'soft', every: 300}, {sound: 'chime', every: 60, times: 2, from: 'end'}]};
const fold = (page: Page) => page.locator('details', {has: page.getByText('Your timer presets: lengths and bells', {exact: true})});
async function openFold(page: Page) { await page.getByText('Your timer presets: lengths and bells', {exact: true}).click(); await expect(fold(page).locator('.timer-presets')).toBeVisible(); }

test('make a preset, begin it: settling in, then its own bells', async ({page}) => {
  await mockAudio(page);
  await openHealth(page, healthRecord(health()), '/app/health?view=meditation');
  await openFold(page);
  await expect(fold(page)).toContainText('No presets yet.');
  await fold(page).getByRole('button', {name: 'New preset', exact: true}).click();
  const form = page.getByRole('form', {name: 'New timer preset'});
  await expect(form.getByLabel('Name')).toBeFocused();
  // A name is needed: said at the field.
  await form.getByRole('button', {name: 'Save preset', exact: true}).click();
  await expect(form.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true');
  await form.getByLabel('Name').fill('Morning sit');
  await form.getByRole('radio', {name: '10 min', exact: true}).check();
  await form.getByLabel('Settle in before the first bell').selectOption({label: '15 s'});
  // Session AV lane 2 (getByLabel('End bell') also matched the “Try the end bell” button: the select by its role and exact name, deliberate)
  await form.getByRole('combobox', {name: 'End bell', exact: true}).selectOption({label: 'Chime'});
  await form.getByRole('button', {name: 'Add a bell along the way', exact: true}).click();
  const bell = form.getByRole('group', {name: 'Bell 1 along the way'});
  await bell.getByLabel('Sound').selectOption({label: 'Soft tone'});
  await bell.getByLabel('Every').selectOption({label: '2 min'});
  await form.getByRole('button', {name: 'Save preset', exact: true}).click();
  await expect(fold(page).getByRole('status')).toHaveText('Saved: the preset “Morning sit”. It is under Begin.');
  await expect(fold(page).getByRole('list', {name: 'Your timer presets'})).toContainText('10 min · settle 15 s · Singing bowl to begin, Chime to end · 1 bell along the way');
  await expect(fold(page).getByRole('button', {name: 'New preset', exact: true})).toBeFocused();
  const extras = await stored<{meditationTimer: {presets: {name: string; minutes: number; warmup: number; end: string; intervals: unknown[]}[]}}>(page, HABIT_EXTRAS_KEY);
  expect(extras.meditationTimer.presets).toMatchObject([{name: 'Morning sit', minutes: 10, warmup: 15, start: 'bowl', end: 'chime', intervals: [{sound: 'soft', every: 120}]}]);

  const begin = page.getByRole('form', {name: 'Begin a session'});
  await begin.getByRole('group', {name: 'Your presets'}).getByRole('radio', {name: /^Morning sit/}).check();
  await expect(begin.getByRole('group', {name: 'How long?'})).toHaveCount(0);
  await begin.getByRole('button', {name: 'Begin', exact: true}).click();
  const session = page.getByRole('region', {name: 'Meditation in progress'});
  await expect(session).toContainText('SETTLING IN');
  await expect(session.getByRole('timer')).toHaveAttribute('aria-label', /^00:1[45] to settle in$/);
  await expect(session.locator('.meditation-settling')).toHaveText(/^Settling in\. The start bell rings in 00:1[45], then 10 min begin\.$/);
  // The run starts when settling in ends; its bells are kept beside it under that start.
  const run = JSON.parse((await page.evaluate(k => localStorage.getItem(k), MEDITATION_RUN_KEY))!).run;
  expect(run.plannedSec).toBe(600);
  expect((await stored<{meditationRun: {startedAt: string}}>(page, HEALTH_EXTRAS_KEY)).meditationRun.startedAt).toBe(run.startedAt);
  // Scheduled on the audio clock: the bowl once (at the end of settling in), the soft tone four times, the chime at the end.
  await expect.poll(async () => (await bells(page)).filter(b => b.f === 196).length).toBe(1);
  const all = await bells(page), start = all.find(b => b.f === 196)!.at;
  expect(all.filter(b => b.f === 440).map(b => Math.round(b.at - start))).toEqual([120, 240, 360, 480]);
  expect(all.filter(b => b.f === 880).map(b => Math.round(b.at - start))).toEqual([600]);
  await page.clock.fastForward(16_000);
  await expect(session.getByRole('timer')).toHaveAttribute('aria-label', /^(10:00|09:59|09:58) left$/);
  await expect(session).toContainText('IN PROGRESS');
});

test('no set length counts up and saves the time spent; a preset deleted comes back with Undo', async ({page}) => {
  await mockAudio(page);
  await openHealth(page, {...healthRecord(health()), [HABIT_EXTRAS_KEY]: {version: 1, meditationTimer: {presets: [PRESET]}}}, '/app/health?view=meditation');
  const begin = page.getByRole('form', {name: 'Begin a session'});
  await expect(begin.getByRole('group', {name: 'Your presets'})).toContainText('Evening sit');
  await begin.getByRole('radio', {name: 'No set length', exact: true}).check();
  await expect(begin).toContainText('The clock counts up until you end the session (at most 4 hours).');
  await begin.getByRole('button', {name: 'Begin', exact: true}).click();
  const session = page.getByRole('region', {name: 'Meditation in progress'});
  await expect(session.getByRole('timer')).toHaveAttribute('aria-label', /^00:0\d so far$/);
  await page.clock.fastForward(125_000);
  await expect(session.locator('.meditation-left')).toHaveText(/^02:0\d so far · no set length \(at most 4 hours\)$/);
  await session.getByRole('button', {name: 'End now', exact: true}).click();
  const done = page.getByRole('region', {name: '2 min of stillness'});
  await expect(done.getByRole('heading', {name: '2 min of stillness'})).toBeFocused();
  await done.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.locator('.sleep-note')).toHaveText('Saved: 2 min.');
  const h = await stored<{meditation: {sessions: {seconds: number}[]}}>(page, HEALTH_STORAGE_KEY);
  expect(h.meditation.sessions[0]!.seconds).toBeGreaterThanOrEqual(125);
  expect(h.meditation.sessions[0]!.seconds).toBeLessThan(135);

  await openFold(page);
  await fold(page).getByRole('button', {name: 'Delete the preset Evening sit', exact: true}).click();
  await expect(fold(page).getByRole('status')).toHaveText('The preset “Evening sit” is deleted.');
  await expect(fold(page)).toContainText('No presets yet.');
  await expect(fold(page).getByRole('button', {name: 'New preset', exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(async () => (await stored<{meditationTimer?: {presets: {id: string}[]}}>(page, HABIT_EXTRAS_KEY)).meditationTimer?.presets.map(p => p.id)).toEqual(['tp-spec-evening']);
});

for (const theme of THEMES) test(`${theme}: the presets fold and its form`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, {...healthRecord(health()), [HABIT_EXTRAS_KEY]: {version: 1, meditationTimer: {presets: [PRESET]}}}, '/app/health?view=meditation');
  await openFold(page);
  await expect(fold(page).getByRole('list', {name: 'Your timer presets'})).toContainText('20 min · settle 30 s · Singing bowl to begin, Chime to end · 2 bells along the way');
  await fold(page).getByRole('button', {name: 'Edit the preset Evening sit', exact: true}).click();
  const form = page.getByRole('form', {name: 'Edit the preset Evening sit'});
  await expect(form.getByRole('group', {name: 'Bell 2 along the way'}).getByLabel('Counted')).toHaveValue('end');
  const findings = await axe(page, fold(page));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
