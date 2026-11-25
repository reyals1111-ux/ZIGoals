import {expect, test, type Page} from '@playwright/test';
import {AT, back, health, healthRecord, openHealth, stored, TODAY} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {isPhone, openFold} from './phone-nav';
import {saveActivity} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import {vitalDaySchema} from '../lib/vitals/schema';
import {ACTIVITY_EXTRAS_KEY} from '../lib/aw-kcal/activity-extras';

/**
 * Session AW (kcal; owner decision 1a and amendment 4, ADR-046): Health → Activity shows no estimated calorie burn anywhere
 * (a walk with a weight logged gets no figure); a manual activity shows its minutes, distance and effort; calories show
 * only as typed, "320 kcal · you entered", kept in their own record (`zigoals:activity-extras:v1`) that a correction
 * updates and a removal removes; imported active energy reads "from your file". At 390 (the phone project) and 1440, in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Nothing here moves, so there is no motion to still.
 * Fictional data.
 */
const RUN = 'health_run-aw-0001', WALK = 'health_walk-aw-0001';
function records() {
  let h = health({weights: [{id: 'health_weight-aw-0001', date: TODAY, grams: 80_000, createdAt: AT, updatedAt: AT}]});
  h = saveActivity(h, {id: WALK, date: TODAY, name: 'Walk', steps: 0, minutes: 40}, AT);
  h = saveActivity(h, {id: RUN, date: TODAY, name: 'Run', steps: 0, minutes: 30}, AT);
  h = withHealthGroup(h, 'vitals', {version: 1, days: [TODAY, back(1)].map(date => vitalDaySchema.parse({id: `health_vital-apple-health-${date}`, date, source: 'apple-health', activeKcal: 450, updatedAt: AT}))}, false);
  return {...healthRecord(h), [ACTIVITY_EXTRAS_KEY]: {version: 1, items: {[RUN]: {distanceKm: 5, effort: 'moderate', kcal: 320}}}};
}
const row = (page: Page, name: string) => page.locator('article.health-library-row').filter({has: page.getByRole('heading', {name, exact: true})});
const ESTIMATE = /kcal used|an estimate|estimated|burned about|about \d[\d,]* kcal/i;

for (const theme of THEMES) test(`${theme}: Health → Activity has no estimate; typed calories say “you entered”`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, records(), '/app/health?view=activity');
  const overview = page.locator('.health-activity-overview'), form = page.getByRole('form', {name: 'Manual activity'});

  // The walk has minutes and a weight is logged (the old estimate's inputs): no calorie figure at all.
  await expect(row(page, 'Walk')).toContainText('40 minutes');
  await expect(row(page, 'Walk')).not.toContainText('kcal');
  // The run shows its minutes, distance and effort, and the calories as typed, with their source.
  await expect(row(page, 'Run')).toContainText('30 minutes · 5 km · Moderate effort');
  await expect(row(page, 'Run')).toContainText('320 kcal · you entered');
  await expect(overview).not.toContainText(ESTIMATE);
  await expect(form).not.toContainText(/kcal used|labelled estimate/i);
  await expect(form).toContainText('ZIGoals never works out the calories an activity burned');

  // A new activity with its distance, effort and calories.
  await form.getByLabel('Activity name').fill('Cycling');
  await form.getByLabel('Minutes').fill('50');
  await form.getByLabel('Distance (km, optional)').fill('18,5');
  await form.getByLabel('Effort (optional)').selectOption('hard');
  await form.getByLabel('Calories (you entered, optional)').fill('540');
  await form.getByRole('button', {name: 'Save activity'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Activity saved'})).toContainText('Activity saved');
  await expect(row(page, 'Cycling')).toContainText('50 minutes · 18.5 km · Hard effort');
  await expect(row(page, 'Cycling')).toContainText('540 kcal · you entered');
  const cyclingId = await row(page, 'Cycling').getAttribute('data-activity-id');
  await expect.poll(async () => (await stored<{items: Record<string, unknown>}>(page, ACTIVITY_EXTRAS_KEY)).items[cyclingId!]).toEqual({distanceKm: 18.5, effort: 'hard', kcal: 540});

  // A correction updates the extras (calories cleared), and removing the activity removes them.
  await row(page, 'Cycling').getByRole('button', {name: 'Edit activity Cycling'}).click();
  await expect(form.getByLabel('Calories (you entered, optional)')).toHaveValue('540');
  await form.getByLabel('Calories (you entered, optional)').fill('');
  await form.getByRole('button', {name: 'Save correction'}).click();
  await expect(row(page, 'Cycling')).not.toContainText('kcal');
  await expect.poll(async () => (await stored<{items: Record<string, unknown>}>(page, ACTIVITY_EXTRAS_KEY)).items[cyclingId!]).toEqual({distanceKm: 18.5, effort: 'hard'});
  await row(page, 'Cycling').getByRole('button', {name: 'Remove activity Cycling'}).click();
  await expect(row(page, 'Cycling')).toHaveCount(0);
  await expect.poll(async () => cyclingId! in (await stored<{items: Record<string, unknown>}>(page, ACTIVITY_EXTRAS_KEY)).items).toBe(false);

  // A typed distance or calorie that does not read is refused in words, with nothing saved.
  await form.getByLabel('Activity name').fill('Swim');
  await form.getByLabel('Minutes').fill('20');
  await form.getByLabel('Calories (you entered, optional)').fill('12.5');
  await form.getByRole('button', {name: 'Save activity'}).click();
  await expect(page.getByText('Enter calories as a whole number from 1 to 10,000, or leave it blank.')).toBeVisible();
  await expect(row(page, 'Swim')).toHaveCount(0);

  const findings = [...await axe(page, overview), ...await axe(page, page.locator('.health-fit-panel'))];
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('imported active energy says “from your file”; the maintenance estimate says it is an estimate, not medical advice', async ({page}) => {
  await openHealth(page, records(), '/app/health');
  if (await isPhone(page)) await openFold(page, 'Seven days of care');
  else { const fold = page.locator('summary').filter({hasText: /^Seven days of care/}); if (await fold.count()) await fold.click(); }
  await expect(page.getByRole('group', {name: 'Active energy · kcal, from your file, last 7 days'})).toContainText('450');
  await page.goto('/app/health?view=weight');
  await expect(page.locator('#health-energy')).toContainText('an estimate, not medical advice');
  await expect(page.locator('#health-energy')).not.toContainText(/kcal used|burned/i);
});
