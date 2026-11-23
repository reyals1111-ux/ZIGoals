import {expect, test, type Locator, type Page} from '@playwright/test';
import {hydrated, loadShowcase} from '../ah-helpers';
import {isPhone, openFold} from '../phone-nav';
import {TODAY as AGENDA_DAY, seeded, tasksRecord} from '../ap/ap-fixtures';
import {health, healthRecord, openHealth} from '../ap/ap-health-fixtures';
import {MONEY_LOG_KEY, entry, moneyLog, openInsight, seedDevice} from '../ap/ap-money-fixtures';
import {AGE_MEANING, AGE_WHAT} from '../../lib/money-insights/age-of-money';

/**
 * Session AT (ADR-040 D22, "Minor, carried"): Session AP's seven copy and visual minors, each checked where a person
 * meets it. The pure parts (the three-month rule, the Age of money order, Help's words, the Showcase's examples and
 * their privacy) are unit-checked in lib/showcase/ap-examples.test.ts.
 */
test.use({timezoneId: 'Europe/Brussels'});

/** Visually hidden (the sr-only pattern): in the accessibility tree, no visible box. */
async function visuallyHidden(heading: Locator) {
  await expect(heading).toHaveCount(1);
  const box = await heading.boundingBox();
  expect(box === null || (box.width <= 1 && box.height <= 1)).toBe(true);
}
/** WCAG contrast of the element's top border against the first opaque background behind it. */
const borderContrast = (box: Locator) => box.evaluate(el => {
  const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
  const lum = ([r, g, b]: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!); };
  let p: Element | null = el.parentElement, under = '';
  while (p && !under) { const c = getComputedStyle(p).backgroundColor, a = rgb(c); if (a.length === 3 || (a.length === 4 && a[3] === 1)) under = c; p = p.parentElement; }
  const [x, y] = [lum(rgb(getComputedStyle(el).borderTopColor)), lum(rgb(under || 'rgb(0, 0, 0)'))].sort((a, b) => b - a);
  return (x! + 0.05) / (y! + 0.05);
});

test('1 Health: a fold says its name once; the section heading under it is for screen readers only', async ({page}) => {
  await openHealth(page, healthRecord(health()));
  if (await isPhone(page)) await page.getByRole('button', {name: /^How (does today|did .+) feel\?/}).click();
  await page.getByText('Symptoms and factors (optional)', {exact: true}).click();
  await expect(page.getByRole('region', {name: 'Symptoms and factors'})).toBeVisible();
  await visuallyHidden(page.getByRole('heading', {name: 'Symptoms and factors', exact: true}));
  if (await isPhone(page)) return; // the other folds sit in the phone's sheets; the components are the same
  for (const [fold, heading] of [['Copy a meal to another day or meal', 'Copy a meal'], ['Estimate a meal from a photo', 'Estimate a meal from a photo'], ['Supplements and medication (optional)', 'Supplements and medication']] as const) {
    await page.locator('summary', {hasText: fold}).click();
    await visuallyHidden(page.getByRole('heading', {name: heading, exact: true}));
  }
});

test('2 Wealth: under three months with records no category line is drawn, and it says why', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-10-03', '20.00'), entry('2026-11-02', '30.00')])});
  let panel = await openInsight(page, 'Categories over a year');
  await expect(panel).toContainText('A line needs three months with records in EUR; there are 2 so far, so none is drawn yet. A month without records is unknown, not zero.');
  await expect(panel.locator('.money-insights-spark')).toHaveCount(0);
  await expect(panel.getByRole('table')).toContainText('No records');
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-09-03', '10.00'), entry('2026-10-03', '20.00'), entry('2026-11-02', '30.00')])});
  panel = await openInsight(page, 'Categories over a year');
  // Session AV lane 2 (CI run 2008; deliberate): round 4 (7fe1ab19, LEDGER #343) draws a line for all spending too, above
  // the one category's; both are counted, each in its own row (stricter than the total alone).
  await expect(panel.locator('.money-insights-spark')).toHaveCount(2);
  await expect(panel.locator('.money-avg-all').filter({hasText: 'All spending'}).locator('.money-insights-spark')).toHaveCount(1);
  await expect(panel.locator('.money-insights-trend > li:not(.money-avg-all) .money-insights-spark')).toHaveCount(1);
  await expect(panel).not.toContainText('A line needs three months');
});

test('3 Wealth: Age of money says what it is, then the figure and its meaning, then how it is counted', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-10-01', '100.00', 'Salary', 'income'), entry('2026-11-01', '100.00', 'Salary', 'income'), entry('2026-11-11', '150.00')])});
  const panel = await openInsight(page, 'Age of money');
  await expect(panel).toContainText('on average 30.7 days old');
  const text = (await panel.textContent())!;
  const order = [AGE_WHAT, 'on average 30.7 days old', AGE_MEANING, 'How it is counted:', 'first in, first out'].map(s => text.indexOf(s));
  expect(order.every(i => i >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});

test('4 Agenda by the hour: the checkbox edge reads at 4.5:1 or more in Nebula, a 24 px box in a 44 px target', async ({page}) => {
  await seeded(page, {'zigoals:tasks:v1': tasksRecord([{id: 'at-call', title: 'Fictional call', due: AGENDA_DAY, time: '09:00'}])}, '/app/agenda?view=day');
  expect(await page.evaluate(() => document.documentElement.dataset.theme ?? 'nebula')).toBe('nebula');
  await page.getByRole('button', {name: 'By the hour', exact: true}).click();
  const box = page.locator('.agenda-hours .agenda-task-tick input[type="checkbox"]').first();
  await expect(box).toBeVisible();
  expect(await borderContrast(box)).toBeGreaterThanOrEqual(4.5);
  const [inner, target] = [await box.boundingBox(), await page.locator('.agenda-hours .agenda-task-tick').first().boundingBox()];
  expect([Math.round(inner!.width), Math.round(inner!.height)]).toEqual([24, 24]);
  expect(Math.min(target!.width, target!.height)).toBeGreaterThanOrEqual(44);
  // Ticking still works: the box is a real checkbox, named by its label.
  await page.getByRole('checkbox', {name: 'Mark “Fictional call” done'}).check();
  await expect(page.getByRole('checkbox', {name: 'Mark “Fictional call” not done'})).toBeChecked();
});

test('5 Settings: "Your app" is said once, with no "YOUR APP" eyebrow under it', async ({page}) => {
  await page.goto('/app/settings#your-pages'); await hydrated(page);
  test.skip(await isPhone(page), 'the phone lists Settings by rows; the section is the same component');
  await expect(page.locator('#your-pages')).toBeVisible({timeout: 15_000});
  await expect(page.locator('#your-pages .eyebrow')).toHaveCount(0);
  await expect(page.getByText('YOUR APP', {exact: true})).toHaveCount(0);
  await expect(page.locator('#your-pages').getByRole('heading', {name: 'Your pages & buttons'})).toBeVisible();
});

test('6 Help: What\'s new names the cards "Price changes" and "Trends", never "bill changes"', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const main = page.locator('main');
  await expect(main).toContainText('Money month by month, tags, Ready to assign, the age of your money and Price changes on bills');
  await expect(main).toContainText('Mood tags, symptoms, orbits, Trends, run splits and copying a meal');
  await expect(main).not.toContainText(/bill changes/i);
});

/** Opens a Health view in the Showcase tab (its storage lives in this tab's session). */
async function showcaseHealth(page: Page, view: string) { await page.goto(`/app/health?view=${view}`); await hydrated(page); }
// Session AU (ADR-044 D-SHOWCASE, deliberate): the mood tags and the bill price change are seeded now (ADR-043 D8 carried
// them); the test adds both, each by its own words, and keeps every earlier check.
test('7 Showcase: labelled examples of symptoms, run splits, mood tags and a bill price change', async ({page}) => {
  test.setTimeout(90_000);
  await loadShowcase(page);
  await showcaseHealth(page, 'workouts');
  await page.locator('summary', {hasText: 'Easy run'}).first().click();
  const splits = page.getByRole('table', {name: /^Splits of Easy run, per kilometre/}).first();
  await expect(splits).toBeVisible();
  await expect(splits.getByRole('row')).toHaveCount(7); // the header and six kilometres (the latest run, 6 km)
  await showcaseHealth(page, 'diary');
  if (await isPhone(page)) await page.getByRole('button', {name: /^How (does today|did .+) feel\?/}).click();
  await page.getByText('Symptoms and factors (optional)', {exact: true}).click();
  const symptoms = page.getByRole('region', {name: 'Symptoms and factors'});
  for (const name of ['Example · headache', 'Example · pollen', 'Example · stiff back']) await expect(symptoms.getByRole('heading', {name: new RegExp(`^${name}`)})).toBeVisible();
  // The mood tags, stored as labelled examples (never read by ZIGi or NOVA, pinned in lib/showcase/ap-examples.test.ts).
  const tags = await page.evaluate(() => { const marker = JSON.parse(sessionStorage.getItem('zigoals:showcase:active:v1')!); return JSON.parse(sessionStorage.getItem(`zigoals:showcase:v1:${marker.generation}:zigoals:mood-tags:v1`) ?? 'null'); });
  expect(JSON.stringify(tags)).toContain('Example · walk');
  // The bill price change, as Wealth → Bills says it.
  await page.goto('/app/wealth'); await hydrated(page);
  await openFold(page, 'Upcoming bills');
  await expect(page.getByText(/Streaming went up by €1\.00 since [A-Z][a-z]{2} \d{4} \(€12\.99 then, €13\.99 now\)/).first()).toBeVisible();
});
