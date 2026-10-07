import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from '../lib/health';
import {HABITS_KEY, createHabit, emptyHabitData} from '../lib/habits';
import {emptyMeditation, MEDITATION_RUN_KEY, type Meditation} from '../lib/meditation/schema';
import {saveManual} from '../lib/meditation/engine';
import {withHealthGroup} from '../lib/vault/w-homes';
import {W_REMINDERS_KEY} from '../lib/w-device-keys';
import {isPhone, openTodayWidgets} from './phone-nav';

// Session W Part 5: Meditation, a view of Health (/app/health?view=meditation). The timer is worked out from instants;
// the bells are made on the device (a MOCK AudioContext records them here); the screen wake lock is a MOCK too. Every
// record is fictional; every request to the server is answered offline.
const BXL = 'Europe/Brussels';
test.use({timezoneId: BXL});
const MORNING = new Date('2026-10-21T05:00:00.000Z'); // 07:00 in Brussels

/** MOCK Web Audio and Screen Wake Lock: what was struck (frequency, when), what was cancelled, the lock's requests. */
async function mocks(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {__bells: {f: number; at: number}[]; __cancelled: number; __wake: string[]};
    w.__bells = []; w.__cancelled = 0; w.__wake = [];
    class FakeContext {
      state = 'running'; destination = {};
      get currentTime() { return performance.now() / 1000; }
      createOscillator() { const o = {f: 0, type: '', frequency: {setValueAtTime: (v: number) => { o.f = v; }}, connect: () => undefined, start: (t: number) => { w.__bells.push({f: Math.round(o.f), at: t}); }, stop: (t: number) => { if (t === 0) w.__cancelled++; }}; return o; }
      createGain() { const p = {setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined}; return {gain: p, connect: () => undefined}; }
      resume() { this.state = 'running'; return Promise.resolve(); }
    }
    (window as unknown as {AudioContext: unknown}).AudioContext = FakeContext;
    Object.defineProperty(navigator, 'wakeLock', {configurable: true, value: {request: async (type: string) => { w.__wake.push(`request ${type}`); return {release: async () => { w.__wake.push('release'); }}; }}});
  });
}
async function seed(page: Page, {health, settings = {}, extra = {}}: {health?: HealthData; settings?: Record<string, unknown>; extra?: Record<string, string>} = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  const records: Record<string, string> = {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true, ...settings}), ...extra};
  if (health) records[HEALTH_STORAGE_KEY] = JSON.stringify(healthSchema.parse(health));
  await page.evaluate(entries => { for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value); }, records);
}
const withMeditation = (m: Meditation, base: HealthData = createEmptyHealth()) => withHealthGroup(base, 'meditation', m, false);
const stored = async (page: Page) => (await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), HEALTH_STORAGE_KEY)) as (HealthData & {meditation?: Meditation}) | null;
const runRecord = (page: Page) => page.evaluate(key => localStorage.getItem(key), MEDITATION_RUN_KEY);
const bells = (page: Page) => page.evaluate(() => (window as unknown as {__bells: {f: number; at: number}[]}).__bells);
const cancelled = (page: Page) => page.evaluate(() => (window as unknown as {__cancelled: number}).__cancelled);
const wake = (page: Page) => page.evaluate(() => (window as unknown as {__wake: string[]}).__wake);
async function openMeditation(page: Page) {
  await page.goto('/app/health?view=meditation');
  await expect(page.getByRole('heading', {level: 1, name: 'Breathe. Be here.'})).toBeVisible();
}
const begin = (page: Page) => page.getByRole('form', {name: 'Begin a session'});
const note = (page: Page) => page.locator('.sleep-note');

test('a one-minute sitting: its bell, a pause, the end, how you feel, saved to Health', async ({page}) => {
  await page.clock.install({time: MORNING});
  await mocks(page);
  await seed(page);
  await openMeditation(page);
  const form = begin(page);
  await form.getByRole('radio', {name: '1 min', exact: true}).check();
  await form.getByRole('group', {name: 'How do you feel before? (optional)'}).getByRole('button', {name: '3 · OK', exact: true}).click();
  await form.getByRole('button', {name: 'Begin', exact: true}).click();
  const session = page.getByRole('region', {name: 'Meditation in progress'});
  await expect(session.getByRole('timer')).toHaveAttribute('aria-label', '01:00 left');
  await expect(session.locator('.meditation-left')).toHaveText('01:00 left of 1 min');
  // The bowl struck at the start (196 Hz and its partials), and the end bell already scheduled 60 s ahead.
  await expect.poll(async () => (await bells(page)).filter(b => b.f === 196).length).toBe(2);
  const [startBell, endBell] = (await bells(page)).filter(b => b.f === 196);
  expect(endBell!.at - startBell!.at).toBeCloseTo(60, 0);
  await expect.poll(() => wake(page)).toEqual(['request screen']);
  await expect(session).toContainText('The screen stays on during the session.');
  // The installed clock also flows on its own between steps, so "40 s left" may already read 39.
  const left = session.locator('.meditation-left');
  await page.clock.fastForward(20_000);
  await expect(left).toHaveText(/^00:(40|39) left of 1 min$/);
  await session.getByRole('button', {name: 'Pause', exact: true}).click();
  await expect(session).toContainText('PAUSED');
  // A pause cancels the bells to come; the clock stands still.
  await expect.poll(() => cancelled(page)).toBeGreaterThan(0);
  const atPause = await left.textContent();
  await page.clock.fastForward(30_000);
  await expect(left).toHaveText(atPause!);
  await session.getByRole('button', {name: 'Resume', exact: true}).click();
  await page.clock.fastForward(41_000);
  const done = page.getByRole('region', {name: '1 min of stillness'});
  await expect(done).toBeVisible();
  await expect(done.getByRole('heading', {name: '1 min of stillness'})).toBeFocused();
  await expect.poll(async () => (await wake(page)).filter(e => e === 'release').length).toBeGreaterThan(0);
  await done.getByRole('group', {name: 'How do you feel now? (optional)'}).getByRole('button', {name: '4 · Calm', exact: true}).click();
  await done.getByLabel('Note (optional)').fill('fictional morning');
  await done.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(note(page)).toHaveText('Saved: 1 min.');
  const recent = page.getByRole('region', {name: 'Recent sessions'});
  await expect(recent).toContainText('Sitting · 2026-10-21');
  await expect(recent).toContainText('07:00 · 1 min · feeling 3 → 4 of 5');
  const health = await stored(page);
  expect(health!.schemaVersion).toBe(4);
  // Begun a few seconds after 07:00 (the installed clock also flows on its own).
  expect(health!.meditation!.sessions).toMatchObject([{startedAt: expect.stringMatching(/^2026-10-21T05:00:[0-5]\d\.\d{3}Z$/), seconds: 60, kind: 'timer', source: 'timer', moodBefore: 3, moodAfter: 4, note: 'fictional morning', timeZone: BXL}]);
  expect(JSON.parse((await runRecord(page))!)).toEqual({version: 1, run: null});
  await expect(page.getByRole('region', {name: 'Your practice'})).toContainText('1 min');
});

test('a reload in the middle keeps the time; a session that ended while away asks to be saved, or let go', async ({page}) => {
  await page.clock.install({time: MORNING});
  await mocks(page);
  await seed(page);
  await openMeditation(page);
  await begin(page).getByRole('radio', {name: '3 min', exact: true}).check();
  await begin(page).getByRole('button', {name: 'Begin', exact: true}).click();
  await page.clock.fastForward(65_000);
  await page.reload();
  const session = page.getByRole('region', {name: 'Meditation in progress'});
  // Worked out from the stored start and the page's own clock: exactly what is left.
  // The page shows what its last one-second tick computed: now's value, or one second more. Read and computed in the
  // same instant in the page (a value worked out first and compared later goes stale while the clock runs).
  await expect.poll(() => session.locator('.meditation-left').evaluate((el, key) => {
    const run = JSON.parse(localStorage.getItem(key)!).run, left = Math.ceil(Math.max(0, run.plannedSec * 1000 - (Date.now() - Date.parse(run.startedAt) - run.pausedMs)) / 1000);
    const text = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')} left of 3 min`;
    return [text(left), text(left + 1)].includes(el.textContent ?? '') ? 'as computed' : `"${el.textContent}" while ${text(left)} is left`;
  }, MEDITATION_RUN_KEY)).toBe('as computed');
  // After a reload the browser keeps sound off until a tap; the session says so, and one tap brings the bells back.
  await expect(session).toContainText('The bells are quiet until you tap “Turn on the bells”');
  await session.getByRole('button', {name: 'Turn on the bells', exact: true}).click();
  await page.clock.fastForward(1_000);
  await expect(session).not.toContainText('The bells are quiet');
  // Away for ten minutes without a single tick (a background tab), then back.
  await page.clock.setSystemTime(new Date(MORNING.getTime() + 11 * 60_000));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const done = page.getByRole('region', {name: '3 min of stillness'});
  await expect(done).toBeVisible();
  await done.getByRole('button', {name: 'Don’t save', exact: true}).click();
  await expect(note(page)).toHaveText('The session was not saved.');
  expect((await stored(page))?.meditation).toBeUndefined();
  expect(JSON.parse((await runRecord(page))!)).toEqual({version: 1, run: null});
});

test('breathing: the circle moves only while motion is allowed; reduced motion and Motion Off keep it still, with words and a count', async ({page}) => {
  await page.clock.install({time: MORNING});
  await mocks(page);
  await seed(page);
  await openMeditation(page);
  const form = begin(page);
  await form.getByRole('radio', {name: 'Breathe with a guide', exact: true}).check();
  await form.getByRole('radio', {name: /^Box breathing/}).check();
  await form.getByRole('radio', {name: '1 min', exact: true}).check();
  await expect(form).toContainText('If you feel dizzy or unwell, stop and breathe normally.');
  await form.getByRole('button', {name: 'Begin', exact: true}).click();
  const guide = page.locator('.breathing');
  // The session comes into view with the focus on it (the Begin button is gone with the form).
  await expect(page.locator('.breathing-stage')).toBeInViewport();
  await expect(page.getByRole('heading', {name: 'Breathing in progress'})).toBeFocused();
  await expect(guide).toHaveAttribute('data-motion', 'on');
  // Begin was the tap browsers ask for: no "bells are quiet" prompt, though the guide began without a bell.
  await expect(page.locator('.meditation-session')).not.toContainText('The bells are quiet');
  await expect(guide.locator('.breathing-words')).toHaveText('Breathe in · 4');
  await expect(guide.locator('[aria-live="polite"]')).toHaveText('Breathe in, 4 seconds');
  await page.clock.fastForward(4_100);
  await expect(guide.locator('.breathing-words')).toHaveText('Hold · 4');
  await expect(guide.locator('[aria-live="polite"]')).toHaveText('Hold, 4 seconds');
  await expect.poll(() => guide.locator('.breathing-circle').evaluate(el => (el as HTMLElement).style.transform)).toMatch(/^scale\(/);
  // The device asks for reduced motion: the circle stands still, the words and the count go on.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(guide).toHaveAttribute('data-motion', 'off');
  expect(await guide.locator('.breathing-circle').evaluate(el => (el as HTMLElement).style.transform)).toBe('');
  await page.clock.fastForward(4_000);
  await expect(guide.locator('.breathing-words')).toHaveText('Breathe out · 4');
  // Motion Off in Settings does the same, after a reload too.
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off'));
  await page.reload();
  await expect(page.locator('.breathing')).toHaveAttribute('data-motion', 'off');
  await page.getByRole('button', {name: 'Pause', exact: true}).click();
  await expect(page.locator('.breathing-words')).toHaveText('Paused');
  await page.getByRole('button', {name: 'End now', exact: true}).click();
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(note(page)).toContainText('Saved:');
  expect((await stored(page))!.meditation!.sessions).toMatchObject([{kind: 'breathing', pattern: 'box', source: 'breathing'}]);
});

test('mindful minutes by hand: logged, corrected, deleted; your weekly goal; your bell', async ({page}) => {
  await page.clock.install({time: MORNING});
  await mocks(page);
  await seed(page);
  await openMeditation(page);
  const manual = page.getByRole('form', {name: 'Log mindful minutes'});
  await expect(manual.getByLabel('Began (date)')).toHaveValue('2026-10-21');
  await manual.getByLabel('Began (time)').fill('06:30');
  await manual.getByLabel('Minutes').fill('12');
  await manual.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(note(page)).toHaveText('Mindful minutes saved.');
  const recent = page.getByRole('region', {name: 'Recent sessions'});
  await expect(recent).toContainText('Mindful minutes · 2026-10-21');
  await expect(recent).toContainText('06:30 · 12 min');
  await recent.getByRole('button', {name: 'Edit the session of 2026-10-21 at 06:30', exact: true}).click();
  const edit = page.getByRole('form', {name: 'Edit this session'});
  await edit.getByLabel('Minutes').fill('15');
  await edit.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect(note(page)).toHaveText('Session updated.');
  await expect(recent).toContainText('06:30 · 15 min');
  // Refusals: a session that would end in the future, minutes that are not whole.
  await manual.getByLabel('Began (time)').fill('06:55');
  await manual.getByLabel('Minutes').fill('30');
  await manual.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(manual.getByRole('alert')).toHaveText('A session cannot end in the future.');
  await manual.getByLabel('Minutes').fill('ten');
  await manual.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(manual.getByRole('alert')).toHaveText('Enter whole minutes from 1 to 1440.');
  // Your own weekly goal, then the bell.
  const goal = page.getByRole('form', {name: 'Your weekly goal'});
  await goal.getByLabel('Minutes a week I aim for').selectOption({label: '90 minutes'});
  await goal.getByRole('button', {name: 'Save goal', exact: true}).click();
  await expect(note(page)).toHaveText('Your weekly goal is saved.');
  await expect(page.getByRole('region', {name: 'Your practice'})).toContainText('of your goal of 1 h 30 min a week');
  await expect(page.getByRole('figure', {name: 'Minutes a week · last 8 weeks'}).locator('.sleep-key')).toHaveText('Goal 1 h 30 min a week');
  const bell = page.getByRole('form', {name: 'Your bell'});
  await bell.getByRole('radio', {name: 'Chime', exact: true}).check();
  await bell.getByLabel('A bell during the session').selectOption({label: 'Every 5 min'});
  await bell.getByRole('button', {name: 'Try the bell', exact: true}).click();
  await expect.poll(async () => (await bells(page)).some(b => b.f === 880)).toBe(true);
  await bell.getByRole('button', {name: 'Save bell', exact: true}).click();
  await expect(note(page)).toHaveText('Your bell is saved.');
  expect((await stored(page))!.meditation).toMatchObject({goal: {minutesPerWeek: 90}, bells: {sound: 'chime', volume: 60, intervalMin: 5}});
  await recent.getByRole('button', {name: 'Delete the session of 2026-10-21 at 06:30', exact: true}).click();
  await recent.getByRole('button', {name: 'Delete it', exact: true}).click();
  await expect(note(page)).toHaveText('The session is deleted.');
  expect((await stored(page))!.meditation!.sessions).toEqual([]);
});

test('a habit linked to mindful minutes ticks itself off', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-21T09:00:00.000Z')});
  const id = '92000000-0000-4000-8000-0000000000b2';
  const habits = createHabit(emptyHabitData(), {title: 'Meditate 10 minutes', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00.000Z'), id);
  const sessions = saveManual(emptyMeditation(), {date: '2026-10-21', time: '07:00', minutes: 12, timeZone: BXL}, new Date('2026-10-21T08:00:00.000Z'));
  const health: HealthData = {...withMeditation(sessions), habitLinks: {version: 1, links: {[id]: {version: 1, measure: 'meditationMinutes', rule: 'at-least', target: 10, updatedAt: '2026-10-20T08:00:00.000Z'}}, applied: []}} as HealthData;
  await seed(page, {health, extra: {[HABITS_KEY]: JSON.stringify(habits)}});
  await page.goto('/app/habits');
  await expect(page.locator('#main .habit-auto-badge').first()).toHaveText('Done automatically · from your meditation log · 12 min');
});

test('Today: the Meditation widget, the reminder ("Not today") and the Health card', async ({page}) => {
  await page.clock.install({time: new Date('2026-10-21T06:00:00.000Z')}); // 08:00 in Brussels
  const m = saveManual(emptyMeditation(), {date: '2026-10-20', time: '07:00', minutes: 20, timeZone: BXL}, new Date('2026-10-20T08:00:00.000Z'));
  const preset = presetSettings('habits-health');
  const widget = {id: 'w-meditation-fixture', kind: 'meditation', metric: 'week', title: '', size: 'compact', hidden: false, revision: 1};
  await seed(page, {health: withMeditation(m), settings: {schemaVersion: 3, widgets: [...preset.widgets, widget]}, extra: {[W_REMINDERS_KEY]: JSON.stringify({version: 1, meditation: {time: '07:30'}, chained: {}, contributions: {}, dismissed: {}})}});
  await page.goto('/app');
  await openTodayWidgets(page);
  const card = page.getByRole('article', {name: 'Meditation', exact: true});
  await expect(card).toContainText('20 min this week');
  const reminder = page.getByRole('article', {name: 'Reminder: Time to meditate'});
  await expect(reminder.getByRole('link', {name: 'Open Meditation'})).toHaveAttribute('href', '/app/health?view=meditation');
  await reminder.getByRole('button', {name: 'Not today', exact: true}).click();
  await expect(reminder).toHaveCount(0);
  await page.goto('/app/health');
  if (await isPhone(page)) await page.locator('.phone-fold-toggle').filter({hasText: 'Meditation'}).click();
  const healthCard = page.getByRole('region', {name: 'Breathe.'});
  await expect(healthCard).toContainText('20 min this week');
  await healthCard.getByRole('link', {name: 'Begin a session'}).click();
  await expect(page).toHaveURL(/\/app\/health\?view=meditation$/);
});

test('Showcase: fictional sessions, and nothing asked of any other site', async ({page, baseURL}) => {
  await page.clock.install({time: MORNING});
  const outside: string[] = [];
  page.on('request', request => { if (!request.url().startsWith(baseURL!) && !request.url().startsWith('data:')) outside.push(request.url()); });
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await openMeditation(page);
  await expect(page.getByRole('region', {name: 'Recent sessions'})).toContainText('SHOWCASE DATA · fictional session');
  await expect(page.getByRole('region', {name: 'Your practice'})).toContainText('of your goal of 1 h 00 min a week');
  expect(outside).toEqual([]);
});

test('phones: the running session is the whole view; no sideways scroll; the controls are big enough', async ({page}) => {
  test.skip(test.info().project.name !== 'mobile', 'phone layout');
  await page.clock.install({time: MORNING});
  await mocks(page);
  await seed(page);
  await openMeditation(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({width, height: 760});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await begin(page).getByRole('radio', {name: '5 min', exact: true}).check();
  await begin(page).getByRole('button', {name: 'Begin', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Your practice'})).toHaveCount(0);
  await expect(page.getByRole('form', {name: 'Log mindful minutes'})).toHaveCount(0);
  for (const name of ['Pause', 'End now']) expect((await page.getByRole('button', {name, exact: true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
