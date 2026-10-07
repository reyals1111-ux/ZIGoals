import {expect, test, type Page} from '@playwright/test';
import {emptyPlatform, privateGoalSchema} from '../lib/positions';
import {recordGoalChanges} from '../lib/goal-intelligence';
import {createHabit, emptyHabitData} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

// Session W Part 17 (owner decision W2, TIMEZONE_PHASE4_DECISIONS.md): "Your time zone" in Settings, the plan's zone in
// its form and summary, "due today" on the due day, the one-time card on Today, and Today's Health day. Offline fixture.
test.use({timezoneId: 'America/New_York'});
const SETTINGS = 'zigoals:settings:v1', PLATFORM = 'zigoals:platform:v1', HABITS = 'zigoals:habits:v1', W_REMINDERS = 'zigoals:w-reminders:v1';
async function seed(page: Page, records: Record<string, unknown>) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.addInitScript(values => {
    if (sessionStorage.getItem('tz-fixture')) return;
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem('zigoals:motion:v1', 'off');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('tz-fixture', '1');
  }, records);
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const onboarded = {...presetSettings('habits-health'), onboarded: true};
const planGoal = (id: string, plan?: Record<string, unknown>, created = '2026-09-20T12:00:00.000Z') => privateGoalSchema.parse({id, name: `Fictional trip ${id}`, type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', notes: 'Browser fixture', createdAt: created, milestones: [], ...(plan ? {plan} : {})});

test('Settings → Your time zone: saving writes it once (settings v2), Habits follow it, a wrong name is refused', async ({page}) => {
  await seed(page, {[SETTINGS]: onboarded});
  await page.goto('/app/settings');
  const section = page.getByRole('region', {name: 'Your time zone', exact: true});
  await expect(section).toContainText('Not written down yet: your days follow this device (America/New_York).');
  await section.getByLabel('Your time zone', {exact: true}).fill('Not/AZone');
  await section.getByRole('button', {name: 'Save my time zone', exact: true}).click();
  await expect(section.getByRole('alert')).toHaveText('Choose an IANA time zone name, for example Europe/Brussels.');
  expect((await stored(page, SETTINGS)).schemaVersion).toBe(1);
  await section.getByLabel('Your time zone', {exact: true}).fill('Asia/Tokyo');
  await section.getByRole('button', {name: 'Save my time zone', exact: true}).click();
  await expect(section.getByRole('status')).toHaveText('Your time zone is saved. Past entries keep their dates.');
  expect(await stored(page, SETTINGS)).toMatchObject({schemaVersion: 2, journalTimeZone: 'Asia/Tokyo'});
  await expect(section).toContainText('Your days follow Asia/Tokyo.');
  await page.goto('/app/habits');
  // In #main: while the streamed page swaps in, React's hidden server copy (div#S:0) can briefly hold a second one.
  await expect(page.locator('#main .habit-privacy')).toContainText('Days use Asia/Tokyo, your time zone.');
});

test('a plan shows its zone: "Dates use UTC" for a zone-less plan, a new zone kept on save (finance v4), a new plan prefilled with the journal zone', async ({page}) => {
  const s = recordGoalChanges(emptyPlatform(), {...emptyPlatform(), goals: [planGoal('91', {amount: '50000', asset: 'EUR', decimals: 2, cadence: 'monthly', nextDate: '2026-12-15', active: true}), planGoal('92')]}, Date.parse('2026-09-20T12:00:00.000Z'));
  await seed(page, {[PLATFORM]: s, [SETTINGS]: {...onboarded, schemaVersion: 2, journalTimeZone: 'Europe/Brussels'}});
  await page.goto('/app/goals/tracked/91#contribution-plan');
  const plan = page.locator('#contribution-plan');
  await expect(plan).toContainText('Dates use UTC.');
  await expect(plan.getByLabel('Plan time zone', {exact: true})).toHaveValue('UTC');
  await plan.getByLabel('Plan time zone', {exact: true}).fill('America/New_York');
  await plan.getByRole('button', {name: 'Save contribution plan', exact: true}).click();
  await expect(plan.locator('summary').first()).toContainText('America/New_York time');
  const finance = await stored(page, PLATFORM);
  expect(finance.schemaVersion).toBe(4);
  expect(finance.goals[0].plan.timeZone).toBe('America/New_York');
  expect(finance.goals[0].planRevisions.at(-1).terms.timeZone).toBe('America/New_York');
  // A Goal without a plan yet: its first plan would follow the journal zone.
  await page.goto('/app/goals/tracked/92#contribution-plan');
  const fresh = page.locator('#contribution-plan');
  await expect(fresh.getByLabel('Plan time zone', {exact: true})).toHaveValue('Europe/Brussels');
  await expect(fresh).toContainText('Dates use Europe/Brussels.');
});

test('on the due day the Goal says "due today", not behind (T6-B); the next day it is behind', async ({page}) => {
  const s = recordGoalChanges(emptyPlatform(), {...emptyPlatform(), goals: [planGoal('93', {amount: '50000', asset: 'EUR', decimals: 2, cadence: 'monthly', nextDate: '2026-10-15', active: true, timeZone: 'America/New_York'})]}, Date.parse('2026-09-20T12:00:00.000Z'));
  await seed(page, {[PLATFORM]: {...s, schemaVersion: 4}, [SETTINGS]: onboarded});
  // 21:30 in New York on the due day (QA-04): already the 16th in UTC.
  await page.clock.setFixedTime(new Date('2026-10-16T01:30:00.000Z'));
  await page.goto('/app/goals/tracked/93');
  const hero = page.locator('.funding-wealth-hero');
  await expect(hero).toContainText('is due today.');
  await expect(hero).not.toContainText('behind');
  await page.clock.setFixedTime(new Date('2026-10-16T05:00:00.000Z'));
  await page.reload();
  await expect(hero).toContainText('Your recorded contributions are behind your plan.');
});

test('Today offers to write the time zone down once: "Not now" hides it on this device; "Use …" saves it', async ({page}) => {
  const habits = createHabit(emptyHabitData(), {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T12:00:00.000Z'), '92000000-0000-4000-8000-000000000901');
  await seed(page, {[HABITS]: habits, [SETTINGS]: onboarded, [WHATS_NEW_KEY]: {version: 1, dismissed: [WHATS_NEW_RELEASE]}});
  await page.goto('/app');
  const card = page.locator('.journal-zone-card');
  // On a phone one For-you card is open; the time zone card has the lowest priority, so it may wait behind "Show more".
  const more = async () => { await expect(page.getByRole('heading', {level: 1})).toBeVisible(); const fold = page.locator('.for-you-fold .phone-fold-toggle'); if (await fold.count() && await card.count() === 0) await fold.click(); };
  await more();
  await expect(card).toContainText('Your days follow this device for now.');
  await card.getByRole('button', {name: 'Not now', exact: true}).click();
  await expect(card).toHaveCount(0);
  expect(Object.keys((await stored(page, W_REMINDERS)).dismissed)).toEqual(['journal-zone']);
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('.journal-zone-card')).toHaveCount(0);
  // Another device, the same records: "Use America/New_York" writes the zone and the card leaves.
  await page.evaluate(key => localStorage.removeItem(key), W_REMINDERS);
  await page.reload();
  await more();
  await page.locator('.journal-zone-card').getByRole('button', {name: 'Use America/New_York', exact: true}).click();
  await expect(page.locator('.journal-zone-card')).toHaveCount(0);
  expect(await stored(page, SETTINGS)).toMatchObject({schemaVersion: 2, journalTimeZone: 'America/New_York'});
});

test('Today\'s Health card follows the journal zone and says it when it is not this device\'s (QA-24-B)', async ({page}) => {
  await seed(page, {[DASHBOARD_SETTINGS_KEY]: {...onboarded, schemaVersion: 2, journalTimeZone: 'Europe/Brussels'}, [WHATS_NEW_KEY]: {version: 1, dismissed: [WHATS_NEW_RELEASE]}});
  await page.goto('/app');
  await expect(page.locator('.health-today .health-today-zone')).toHaveText('Today in Europe/Brussels');
});
