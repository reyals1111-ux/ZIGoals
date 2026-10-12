import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, saveHabitTimezone, type HabitData, type HabitInput} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {ONBOARDING_SETUP_KEY, REMINDERS_PLAN_KEY} from '../lib/aa-device-keys';
import {REMINDERS_KEY} from '../lib/reminders/schema';
import {isPhone} from './phone-nav';

/**
 * Session AA-Local Part 4: swipe actions on phones (right completes with the indicator; left only reveals; a fast swipe
 * never deletes; the actions are also buttons), the personalised welcome's focuses step (suggestions, the recorded setup,
 * Undo setup within a day), and the Reminders page (every type with its time, quiet hours, the plan's card on Today, push
 * labelled off). Fictional records; the clock is fixed.
 */
test.use({timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-07';
const ID = {stretch: '11111111-1111-4111-8111-111111111111', read: '22222222-2222-4222-8222-222222222222'};
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
function habits(): HabitData { let d = saveHabitTimezone(emptyHabitData(), 'Europe/Brussels'); d = createHabit(d, input('Fictional stretch'), new Date('2026-09-01T06:00:00Z'), ID.stretch); d = createHabit(d, input('Fictional read'), new Date('2026-09-01T06:00:00Z'), ID.read); return d; }
async function seed(page: Page, extra: Record<string, string> = {}, clock = '08:00') {
  await page.clock.install({time: new Date(`${TODAY}T${clock}:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[HABITS_KEY]: JSON.stringify(habits()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), ...extra});
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
/** A touch swipe as pointer events (Playwright's touchscreen has no drag): down, a few moves, up. */
async function swipe(page: Page, selector: string, dx: number, fast = false) {
  await page.locator(selector).first().evaluate((el, [dx, fast]) => {
    const r = el.getBoundingClientRect(), x0 = r.left + r.width * 0.3, y0 = r.top + Math.min(40, r.height / 2);
    const ev = (type: string, x: number) => el.dispatchEvent(new PointerEvent(type, {pointerType: 'touch', pointerId: 7, isPrimary: true, clientX: x, clientY: y0, bubbles: true, cancelable: true}));
    ev('pointerdown', x0); const steps = fast ? 2 : 8; for (let i = 1; i <= steps; i++) ev('pointermove', x0 + (dx * i) / steps); ev('pointerup', x0 + dx);
  }, [dx, fast] as [number, boolean]);
}

test('S5: on a phone, a swipe right completes the check-in; a swipe left only reveals; a fast left swipe never deletes', async ({page}) => {
  await seed(page); await page.goto('/app/habits');
  const phone = await isPhone(page); test.skip(!phone, 'phones only');
  const card = page.getByRole('article', {name: 'Fictional stretch', exact: true});
  await expect(card).toHaveAttribute('data-swipe', 'rest');
  await swipe(page, 'article[aria-label="Fictional stretch"] > :not(.swipe-indicator):not(.swipe-actions)', 220);
  await expect(card.getByText('Complete', {exact: true}).first()).toBeVisible();
  await expect.poll(async () => (await stored(page, HABITS_KEY) as HabitData).habits.find(h => h.id === ID.stretch)!.entries.find(e => e.date === TODAY)?.count).toBe(1);
  const read = page.getByRole('article', {name: 'Fictional read', exact: true});
  await swipe(page, 'article[aria-label="Fictional read"] > :not(.swipe-indicator):not(.swipe-actions)', -400, true);
  await expect(read).toHaveAttribute('data-swipe', 'revealed');
  await expect(read.getByRole('group', {name: 'Actions for Fictional read'}).getByRole('button', {name: 'Archive'})).toBeVisible();
  const data = await stored(page, HABITS_KEY) as HabitData;
  expect(data.habits).toHaveLength(2); expect(data.habits.find(h => h.id === ID.read)!.rules.at(-1)!.state).toBe('active');
  await read.getByRole('group', {name: 'Actions for Fictional read'}).getByRole('button', {name: 'Archive'}).click();
  await expect(read.getByRole('group', {name: 'Actions for Fictional read'}).getByRole('button', {name: 'Archive?'})).toBeVisible(); // a confirmation, never a direct delete
});

test('S4: the focuses step suggests habits and a goal, the setup is recorded and can be undone for a day', async ({page}) => {
  await seed(page, {}, '08:00');
  await page.evaluate(() => { localStorage.removeItem('zigoals:onboarding:v1'); localStorage.removeItem('zigoals:habits:v1'); });
  await page.goto('/app/welcome');
  await page.getByRole('button', {name: 'Let’s begin', exact: true}).click(); // welcome → pillars
  await page.getByRole('button', {name: 'Continue without choosing', exact: true}).click(); // pillars → focuses
  await expect(page.getByRole('heading', {name: 'Two or three things to focus on.'})).toBeVisible();
  await page.getByRole('checkbox', {name: /Move more/}).check();
  await page.getByRole('checkbox', {name: /Save for something/}).check();
  await page.getByRole('checkbox', {name: /Stay in touch/}).check();
  await expect(page.getByRole('checkbox', {name: /Read more/})).toBeDisabled(); // three at most
  await expect(page.getByText(/Suggested: Walk, Call a friend, Contribute, the goal “Emergency fund”/)).toBeVisible(); // in the focuses' own order
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(page.getByRole('checkbox', {name: /Call a friend/})).toBeChecked();
  await expect(page.getByLabel('Goal name')).toHaveValue('Emergency fund');
  await page.getByLabel('Target amount').fill('1000');
  await page.getByRole('button', {name: 'Continue', exact: true}).click(); // starters → tour
  await page.getByRole('button', {name: 'Skip the tour', exact: true}).click(); // tour → install
  await page.getByRole('button', {name: 'Continue', exact: true}).click(); // install → ZIGi
  await page.getByRole('button', {name: 'Continue', exact: true}).click(); // ZIGi → data
  await expect(page.getByText(/Your focuses: Move more, Save for something, Stay in touch\./)).toBeVisible();
  await page.getByRole('button', {name: 'Finish setup', exact: true}).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);
  const setup = await stored(page, ONBOARDING_SETUP_KEY) as {habitIds: string[]; goalId?: string; widgetIds: string[]; focuses: string[]};
  expect(setup.focuses).toEqual(['move', 'save', 'connect']); expect(setup.habitIds.length).toBeGreaterThanOrEqual(1); expect(setup.goalId).toBeTruthy();
  const created = (await stored(page, HABITS_KEY) as HabitData).habits.map(h => h.title);
  expect(created).toEqual(expect.arrayContaining(['Call a friend']));
  await page.goto('/app/welcome');
  await page.getByRole('button', {name: 'Undo setup', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Undo setup', exact: true})).toHaveCount(0);
  await expect.poll(async () => (await stored(page, HABITS_KEY) as HabitData | null)?.habits.filter(h => !('deleted' in h) && h.title === 'Call a friend').length ?? 0).toBe(0);
  expect((await stored(page, ONBOARDING_SETUP_KEY) as {undone?: boolean}).undone).toBe(true);
});

test('S7: the Reminders page lists every type with its time and quiet hours; a bedtime reminder shows on Today; push is labelled off', async ({page}) => {
  await seed(page, {}, '20:30'); // 22:30 in Brussels: inside the default quiet hours
  await page.goto('/app/settings/reminders');
  await expect(page.getByRole('heading', {name: 'Every reminder, in one place.'})).toBeVisible();
  await expect(page.getByText(/Push delivery is off/)).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Nothing between 22:00 and 08:00'})).toBeVisible();
  await page.getByRole('switch', {name: /Bedtime/}).check();
  await page.getByLabel('Bedtime time').fill('21:00');
  await page.getByLabel('Fictional stretch reminder time').fill('07:30');
  await expect.poll(() => stored(page, REMINDERS_PLAN_KEY)).toMatchObject({items: {bedtime: {on: true, time: '21:00'}}});
  await expect.poll(() => stored(page, REMINDERS_KEY)).toMatchObject({habits: {[ID.stretch]: {time: '07:30'}}});
  await page.goto('/app');
  await expect(page.getByRole('article', {name: 'Reminder: Bedtime'})).toHaveCount(0); // quiet hours
  await page.goto('/app/settings/reminders');
  await page.getByLabel('From').fill('23:30'); await page.getByLabel('Until').fill('07:00');
  await page.getByRole('button', {name: 'Save quiet hours', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Nothing between 23:30 and 07:00'})).toBeVisible();
  await page.goto('/app');
  const card = page.getByRole('article', {name: 'Reminder: Bedtime'});
  await expect(card).toBeVisible();
  await card.getByRole('button', {name: 'Dismiss for today', exact: true}).click();
  await expect(card).toHaveCount(0);
  await expect.poll(() => stored(page, REMINDERS_PLAN_KEY)).toMatchObject({dismissed: {bedtime: TODAY}});
});
