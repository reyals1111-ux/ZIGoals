import {expect, test, type Locator, type Page} from '@playwright/test';
import {at, DAY1, freshWeek, hydrated, setup, ZONE} from './au-helpers';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Tom on his phone, in the Dark theme. Gym and food logging. The
 * rehearsal's Tom reviewer found at 390: a recent scan's "Use this barcode" over the product's name (T-8), and the workout
 * set table wider than its card ("Remove" cut to "Rem", the done button half outside, the set menu squeezed: T-7); and a
 * barcode answer that could not be read said only "Lookup failed." (T-5). Each is checked here as he meets it.
 * Phone only (the mobile project); named webkit-au-* so CI's WebKit job runs it on an iPhone profile too.
 */
test.skip(({isMobile}) => !isMobile, 'the phone part of Tom\'s week (his desktop part is tests/au/tom.spec.ts)');
test.use({timezoneId: ZONE, actionTimeout: 15_000});

const PRODUCT = {barcode: '8710400000006', name: 'Fictional protein yoghurt', brand: 'Fixture', basis: 'unverified-100g-or-100ml', nutrients: {kcal: 62, proteinMg: 10000, carbsMg: 4000, fatMg: 200}, source: 'Open Food Facts', apiVersion: '3.4', observedAt: '2026-11-23T06:00:00.000Z'};
const box = async (l: Locator) => (await l.boundingBox())!;
const inside = async (page: Page, l: Locator) => { const b = await box(l), w = page.viewportSize()!.width; expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(w); };
const noSideways = (page: Page) => expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

test('Tom on the phone: a barcode found and one that cannot be read, a recent scan that fits, a workout set row inside its card', async ({page}) => {
  test.setTimeout(150_000);
  await freshWeek(page, 'dark', at(DAY1, '07:00'));
  let malformed = false;
  await page.route('**/api/food-lookup?*', r => new URL(r.request().url()).searchParams.has('code')
    ? r.fulfill({json: malformed ? {...PRODUCT, apiVersion: 'v2'} : PRODUCT}) : r.fulfill({status: 503, json: {error: 'UNAVAILABLE'}}));
  await setup(page, [/^Health/, /^Habits/]);

  await page.goto('/app/health'); await hydrated(page);
  await page.getByText('Scan or look up a food barcode', {exact: true}).click();
  const lookup = page.getByRole('region', {name: 'Barcode food lookup'});
  await lookup.getByLabel('Product barcode', {exact: true}).fill(PRODUCT.barcode);
  await lookup.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(lookup.getByRole('heading', {name: PRODUCT.name})).toBeVisible();
  await lookup.getByLabel(/^I checked the package:/).check();
  await lookup.getByLabel('Grams eaten').fill('250');
  await lookup.getByRole('button', {name: 'Confirm and log food'}).click();
  await expect(lookup).toContainText('Added to your private diary');

  // T-8: the recent scan's buttons sit under its name, never on it.
  const scans = page.getByRole('group', {name: 'Recent scans'});
  const row = scans.getByRole('listitem').filter({hasText: PRODUCT.name});
  const name = row.locator('strong'), use = row.getByRole('button', {name: new RegExp(`(Use the barcode|Log ${PRODUCT.name})`)}).first();
  await expect(name).toBeVisible();
  const n = await box(name), u = await box(use);
  expect(n.y + n.height <= u.y + 0.5 || u.x >= n.x + n.width - 0.5, 'the button does not cover the name').toBe(true);
  await inside(page, use);

  // T-5: an answer that cannot be read names the way on.
  malformed = true;
  await lookup.getByLabel('Product barcode', {exact: true}).fill('8710400000013');
  await lookup.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(lookup).toContainText('This product’s details could not be read. Search foods by name, or add it in your own words.');
  await expect(lookup).not.toContainText('Lookup failed.');

  // T-7: a squat set at 390: every control inside the screen, the set menu shows its number, no sideways scroll.
  await page.goto('/app/health?view=workouts'); await hydrated(page);
  await page.getByRole('button', {name: 'Start an empty workout'}).click();
  const now = page.getByRole('region', {name: 'Workout in progress'});
  await now.getByLabel('Find an exercise').fill('squat');
  await now.getByRole('button', {name: /^(Back squat|Squat)/}).first().click();
  const exercise = now.getByRole('article').first();
  await inside(page, exercise.getByRole('button', {name: /^Remove (Back squat|Squat)$/}));
  const kind = exercise.getByRole('combobox', {name: /set 1: type$/});
  expect(await kind.evaluate(el => (el as HTMLSelectElement).scrollWidth <= (el as HTMLSelectElement).clientWidth + 1 && el.getBoundingClientRect().width >= 52)).toBe(true);
  await exercise.getByLabel(/set 1: weight in kg/).fill('80');
  await exercise.getByLabel(/set 1: reps/).fill('5');
  const done = exercise.getByRole('button', {name: /set 1 done/});
  await done.scrollIntoViewIfNeeded();
  await expect(done).toBeVisible();
  await done.click();
  await noSideways(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
