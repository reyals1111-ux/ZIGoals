import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {WORKOUT_PLACES_KEY} from '../lib/workouts/places-schema';
import {showcaseWorkouts} from '../lib/workouts/showcase';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #239, #240, #241, Fitbod): Health → Workouts → Start a workout → "Places and
 * equipment" adds Home (dumbbells, a bench, bands, a pull-up bar), the place for now; "Suggest a workout for today" at
 * Home for 30 minutes gives four exercises Home can do (never the barbell bench press), labelled a suggestion, from the
 * person's own sets; one is replaced before starting; started, one exercise is replaced in the running workout with its
 * sets kept; the exercise picker shows only what Home has — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: places and equipment, a suggested workout, Replace`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(showcaseWorkouts('2026-11-22'))] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});

  // Places and equipment.
  await start.locator('details.workouts-places-fold > summary').click();
  const places = start.locator('.av2-places');
  await expect(places).toContainText('The floor and your own body weight are always there.');
  await places.getByRole('textbox', {name: 'A new place'}).fill('Home');
  await places.getByRole('combobox', {name: 'Start from'}).selectOption('home');
  await places.getByRole('button', {name: 'Add the place'}).click();
  await expect(places.getByRole('status')).toHaveText('Home is added and is your place for now.');
  await expect(places.getByRole('checkbox', {name: 'Dumbbells'})).toBeChecked();
  await expect(places.getByRole('checkbox', {name: 'Barbell and plates'})).not.toBeChecked();
  await expect(places.getByRole('radio', {name: 'Home'})).toBeChecked();
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), WORKOUT_PLACES_KEY);
  expect(stored.places[0]).toMatchObject({name: 'Home', equipment: ['dumbbells', 'bench', 'bands', 'pull-up-bar']});
  expect(stored.current).toBe(stored.places[0].id);
  const placeFindings = await axe(page, places);
  expect(placeFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(placeFindings)).toEqual([]);

  // Suggest a workout for today, at Home, 30 minutes.
  await start.locator('details.workouts-suggest-fold > summary').click();
  const suggest = start.locator('.av2-suggest');
  await expect(suggest.getByRole('combobox', {name: 'Where'})).toHaveValue(stored.places[0].id);
  await suggest.getByRole('radio', {name: '30 minutes'}).check();
  await expect(suggest.locator('.av2-suggest-list > li')).toHaveCount(4);
  await expect(suggest.getByRole('status')).toContainText('Suggestion');
  await expect(suggest.getByRole('status')).toContainText('at Home');
  await expect(suggest.locator('.av2-suggest-list')).not.toContainText('Bench press');
  await expect(suggest).toContainText('not a programme');
  await expect(suggest).not.toContainText(/kcal|calorie/i);
  const firstName = (await suggest.locator('.av2-suggest-list > li strong').first().innerText()).trim();
  await suggest.getByRole('button', {name: `Replace ${firstName}`}).click();
  const swap = suggest.getByRole('group', {name: `Replace ${firstName}`});
  await expect(swap.getByRole('button').first()).toBeFocused();
  const other = (await swap.locator('.av2-replace-list strong').first().innerText()).trim();
  await swap.locator('.av2-replace-list button').first().click();
  await expect(suggest.locator('.av2-suggest-list > li strong').first()).toHaveText(other);
  await expect(suggest.getByRole('button', {name: `Replace ${other}`})).toBeFocused();
  const suggestFindings = await axe(page, suggest);
  expect(suggestFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(suggestFindings)).toEqual([]);
  expect(await suggest.evaluate(el => [...el.querySelectorAll<HTMLElement>('p, li, label, span, strong, legend')].filter(e => e.offsetParent && (e.textContent ?? '').trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length)).toBe(0);
  await suggest.getByRole('button', {name: 'Start this workout'}).click();

  // The running workout; the picker shows only what Home has.
  const now = page.locator('#workout-now');
  await expect(now.locator('article.workouts-exercise')).toHaveCount(4);
  await expect(now.locator('article.workouts-exercise').first().getByRole('heading')).toContainText(other);
  await now.getByRole('button', {name: '+ Add an exercise'}).click();
  const picker = now.getByRole('group', {name: 'Add an exercise'});
  await expect(picker.getByRole('combobox', {name: 'Place'})).toHaveValue(stored.places[0].id);
  await expect(picker).toContainText('Showing what Home has, and your own exercises.');
  await picker.getByRole('searchbox', {name: 'Find an exercise'}).fill('bench press');
  await expect(picker.getByRole('button', {name: /^Bench press/})).toHaveCount(0);
  await picker.getByRole('combobox', {name: 'Place'}).selectOption('');
  await expect(picker.getByRole('button', {name: /^Bench press/})).toHaveCount(1);
  await picker.getByRole('combobox', {name: 'Place'}).selectOption(stored.places[0].id);
  await picker.getByRole('searchbox', {name: 'Find an exercise'}).fill('incline');
  await picker.getByRole('button', {name: /^Incline dumbbell press/}).click();

  // Replace in the running workout keeps the sets typed so far.
  const block = now.locator('article.workouts-exercise').last();
  await expect(block.getByRole('heading')).toContainText('Incline dumbbell press');
  await block.getByRole('textbox', {name: /set 1: reps/}).fill('9');
  await block.getByRole('textbox', {name: /set 1: reps/}).blur();
  await block.getByRole('button', {name: 'Replace Incline dumbbell press'}).click();
  const inWorkout = block.getByRole('group', {name: 'Replace Incline dumbbell press'});
  await expect(inWorkout).toContainText('Your sets so far are kept.');
  await expect(inWorkout.locator('.av2-replace-list button').first()).toBeFocused();
  const third = (await inWorkout.locator('.av2-replace-list strong').first().innerText()).trim();
  await inWorkout.locator('.av2-replace-list button').first().click();
  await expect(page.locator('.workouts-note')).toHaveText(`Incline dumbbell press is replaced by ${third}; the sets you typed are kept.`);
  const swapped = now.locator('article.workouts-exercise').last();
  await expect(swapped.getByRole('heading')).toContainText(third);
  await expect(swapped.getByRole('textbox', {name: /set 1: reps/})).toHaveValue('9');
  await expect(swapped.getByRole('button', {name: `Replace ${third}`})).toBeFocused();
  const nowFindings = await axe(page, now);
  expect(nowFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(nowFindings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
