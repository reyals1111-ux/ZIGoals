import {expect, test} from '@playwright/test';
import {go, start} from './av2-polish-helpers';
import {axe, THEMES} from './p6-helpers';

/**
 * Session AV lane 2 (polish4, owner follow-up 6 step 4), Health:
 * - the lane-2 section titles on Workouts flow white → nebula (NebulaFlow, as Health's feature cards do), in Nebula,
 *   Light and Dark, axe-clean;
 * - "Plan a workout" keeps its fields at 16 px on a phone (it sat outside .health-page and kept Health's older 14 px:
 *   an iPhone zooms into a field under 16 px);
 * - Meditation's "Today's practice" in Dutch has Dutch buttons and a Dutch note (they stayed English).
 * The Showcase is fictional; /api answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const TITLES = ['Shoes', 'Races ahead', 'Distance goals and training load', 'Progress', 'Exercises and how-tos'];

for (const theme of THEMES) test(`${theme}: Workouts' lane-2 titles flow white → nebula`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/health?view=workouts');
  for (const name of TITLES) {
    const heading = page.getByRole('heading', {level: 2, name, exact: true});
    await expect(heading).toBeVisible({timeout: 15_000});
    const flow = heading.locator('> .nebula-flow');
    await expect(flow).toHaveCount(1);
    const look = await flow.evaluate(el => { const cs = getComputedStyle(el); return {image: cs.backgroundImage, fill: cs.webkitTextFillColor}; });
    expect(look.image, name).toContain('gradient');
    expect(look.fill, name).toBe('rgba(0, 0, 0, 0)');
  }
  const findings = await axe(page, page.locator('.workouts-shoes'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
});

for (const theme of THEMES) test(`${theme}: Plan a workout's fields are 16 px on a phone`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/health?view=workouts');
  const startCard = page.getByRole('region', {name: 'Start a workout'});
  await startCard.locator('details.workouts-plan-fold > summary').click();
  const form = startCard.getByRole('form', {name: 'Plan a workout'});
  await expect(form).toBeVisible({timeout: 15_000});
  const sizes = await form.locator('.field :is(input, select)').evaluateAll(els => els.filter(el => (el as HTMLElement).offsetParent).map(el => parseFloat(getComputedStyle(el).fontSize)));
  expect(sizes.length).toBeGreaterThan(0);
  for (const size of sizes) expect(size).toBeGreaterThanOrEqual(16);
});

for (const theme of THEMES) test(`${theme}: today's practice in Dutch has Dutch buttons`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/health?view=meditation');
  await page.getByText('Today’s practice, a short written guide', {exact: true}).click();
  const practice = page.locator('.meditation-today');
  await practice.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(practice).toHaveAttribute('lang', 'nl');
  await expect(practice.getByRole('button', {name: /^Begin · \d+ min met de bel$/})).toBeVisible();
  await expect(practice.getByRole('button', {name: 'Nog een', exact: true})).toBeVisible();
  await expect(practice).toContainText('Ontspanning, geen behandeling.');
  await expect(practice.locator('[lang="en"]')).toHaveCount(1); // only "In English" itself
  await practice.getByRole('button', {name: 'In English'}).click();
  await expect(practice.getByRole('button', {name: 'Another one', exact: true})).toBeVisible();
});
