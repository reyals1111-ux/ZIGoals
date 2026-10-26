import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from './ah-helpers';

// Session AH Part 17 (owner addition, pre-approved; ADR-033 M51): the Journal date drives the whole Health page. A
// `?date=` link opens that day, the page logs to it ("Logging for Thu 22 Oct"), the future cannot be chosen, the trends
// mark the day, and the date bar moves by a day with its arrows, the ← / → keys and a swipe. Fictional Showcase data.
test.beforeEach(async ({page}) => { await offlineApi(page); });
const shift = (day: string, days: number) => new Date(Date.parse(`${day}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const dateField = (page: Page) => page.getByLabel('Journal date', {exact: true});

async function openHealth(page: Page, query = '') {
  await page.goto(`/app/health${query}`); await hydrated(page);
  await expect(dateField(page)).toBeVisible();
}

test('a ?date= link opens that day: the bar names it, every log goes to it, and Today brings the page back', async ({page}) => {
  await loadShowcase(page);
  await openHealth(page);
  const today = await dateField(page).inputValue(), past = shift(today, -3);
  await expect(page.getByRole('button', {name: 'Next day', exact: true})).toBeDisabled();
  await expect(page.locator('.health-date-today')).toHaveCount(0);
  await openHealth(page, `?date=${past}`);
  await expect(dateField(page)).toHaveValue(past);
  const bar = page.getByRole('group', {name: 'Journal day'});
  await expect(bar).toContainText('3 days ago');
  await expect(page.locator('.health-logging-for')).toContainText(/^Logging for [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}/);
  await expect(page.getByRole('button', {name: 'Next day', exact: true})).toBeEnabled();
  // The quick counters count on that day.
  const counters = page.locator('.exercise-counters');
  await expect(counters.locator('.exercise-counters-day')).not.toContainText('Today in your Health journal');
  const first = counters.locator('.exercise-counter').first(), count = first.locator('.exercise-count');
  const before = await count.innerText();
  await first.getByRole('button', {name: /^Increase /}).click();
  await expect(count).not.toHaveText(before);
  const onPast = await count.innerText();
  // The trends end on that day and mark it.
  await expect(page.locator('.bottom-rows li[aria-current="date"]').first()).toContainText(String(Number(past.slice(8))));
  // The day cards show that day and link to logging it.
  await expect(page.locator('.sleep-card .health-past-day a')).toHaveAttribute('href', `/app/health?view=sleep&date=${past}`);
  await expect(page.locator('.workouts-card .health-past-day a')).toHaveAttribute('href', `/app/health?view=workouts&date=${past}`);
  // Today brings the page back to today, where that count is not.
  await bar.getByRole('button', {name: 'Today', exact: true}).click();
  await expect(dateField(page)).toHaveValue(today);
  await expect(page.locator('.health-logging-for')).toHaveCount(0);
  await page.getByRole('button', {name: 'Previous day', exact: true}).click();
  await page.getByRole('button', {name: 'Previous day', exact: true}).click();
  await page.getByRole('button', {name: 'Previous day', exact: true}).click();
  await expect(dateField(page)).toHaveValue(past);
  await expect(count).toHaveText(onPast);
});

test('the future cannot be chosen: a future link opens today, the field stops at today, → stops at today', async ({page}) => {
  await loadShowcase(page);
  await openHealth(page);
  const today = await dateField(page).inputValue();
  await openHealth(page, `?date=${shift(today, 2)}`);
  await expect(dateField(page)).toHaveValue(today);
  await expect(dateField(page)).toHaveAttribute('max', today);
  await dateField(page).fill(shift(today, 1));
  await expect(dateField(page)).toHaveValue(today);
  await openHealth(page, '?date=2026-02-30');
  await expect(dateField(page)).toHaveValue(today);
});

test('the bar moves by a day with ← and → while it has focus, and its arrows and pill are 44 px', async ({page}) => {
  await loadShowcase(page);
  await openHealth(page);
  const today = await dateField(page).inputValue(), bar = page.getByRole('group', {name: 'Journal day'});
  await bar.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(dateField(page)).toHaveValue(shift(today, -1));
  await expect(bar).toContainText('Yesterday');
  await page.keyboard.press('ArrowRight');
  await expect(dateField(page)).toHaveValue(today);
  await page.keyboard.press('ArrowRight');
  await expect(dateField(page)).toHaveValue(today);
  await bar.getByRole('button', {name: 'Previous day', exact: true}).click();
  for (const control of [bar.getByRole('button', {name: 'Previous day', exact: true}), bar.getByRole('button', {name: 'Next day', exact: true}), bar.getByRole('button', {name: 'Today', exact: true})]) {
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('on a phone a swipe on the bar moves a day; with reduced motion the day name does not animate', async ({page, isMobile}) => {
  test.skip(!isMobile, 'A swipe needs a touch screen.');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await loadShowcase(page);
  await openHealth(page);
  const today = await dateField(page).inputValue(), bar = page.getByRole('group', {name: 'Journal day'});
  const swipe = (dx: number) => bar.evaluate((el, dx) => {
    const r = el.getBoundingClientRect(), y = r.top + r.height / 2, x = r.left + r.width / 2;
    const touch = (cx: number) => new Touch({identifier: 1, target: el, clientX: cx, clientY: y});
    el.dispatchEvent(new TouchEvent('touchstart', {bubbles: true, touches: [touch(x)], changedTouches: [touch(x)]}));
    el.dispatchEvent(new TouchEvent('touchend', {bubbles: true, touches: [], changedTouches: [touch(x + dx)]}));
  }, dx);
  await swipe(120);
  await expect(dateField(page)).toHaveValue(shift(today, -1));
  expect(await page.locator('.health-date-text').evaluate(el => el.getAnimations().length)).toBe(0);
  await swipe(-120);
  await expect(dateField(page)).toHaveValue(today);
});

test('a full view logs to the linked day: Sleep and Workouts say so, and Sleep\'s form starts on that night', async ({page}) => {
  await loadShowcase(page);
  await openHealth(page);
  const past = shift(await dateField(page).inputValue(), -2);
  await page.goto(`/app/health?view=sleep&date=${past}`); await hydrated(page);
  const form = page.getByRole('form', {name: 'Log a night or a nap'});
  await expect(form.locator('.health-logging-for')).toContainText('Logging for');
  await expect(form.locator('input[name="wakeDate"]')).toHaveValue(past);
  await expect(form.locator('input[name="bedDate"]')).toHaveValue(shift(past, -1));
  await page.goto(`/app/health?view=workouts&date=${past}`); await hydrated(page);
  await expect(page.locator('.workouts-view .health-logging-for')).toContainText('Logging for');
});
