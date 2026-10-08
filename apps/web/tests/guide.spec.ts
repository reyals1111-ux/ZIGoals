import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {GUIDE_KEY} from '../lib/coach/schema';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

// The Guide (ADR-011, phase 1): off by default, one labelled note a day on Today, "Not today", the switch, the review's paragraph.
const LABEL = 'Guide · on this device, no AI service';
// Monday 2026-09-21 at 19:00 (the browser's clock is UTC here and in CI): an evening with open Showcase habits.
const MONDAY_EVENING = '2026-09-21T19:00:00.000Z', SUNDAY_EVENING = '2026-09-20T19:00:00.000Z';
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
/** The Showcase records as a seeded Local Demo (onboarded, the "What's new" card already dismissed), with the clock fixed. */
async function seed(page: Page, time: string) {
  await page.clock.install({time});
  const {records} = buildShowcase('2026-09-20');
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [GUIDE_KEY]: ''});
  await page.evaluate(key => localStorage.removeItem(key), GUIDE_KEY);
}
const card = (page: Page) => page.getByRole('article', {name: 'Guide', exact: true});
/** On a phone one "For you" card is open; the Guide may wait behind Show more. */
async function reveal(page: Page) {
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const area = page.getByRole('region', {name: 'For you', exact: true});
  if (await area.count() && !(await card(page).isVisible().catch(() => false))) { const fold = area.getByRole('button', {name: /^Show more/}); if (await fold.count()) await fold.click(); }
}
const toggle = (page: Page) => page.getByRole('switch', {name: 'Guide on this device', exact: true});
const stored = (page: Page) => page.evaluate(key => localStorage.getItem(key), GUIDE_KEY);

test('off by default: no card, no request, and the switch in Settings says so', async ({page}) => {
  await seed(page, MONDAY_EVENING);
  // Session U Part 4: leave the seeding page (Settings) first, so a request it starts late is never counted as Today's.
  await page.goto('about:blank');
  const requests: string[] = []; page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.goto('/app'); await reveal(page);
  await expect(card(page)).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.goto('/app/settings');
  const section = page.getByRole('region', {name: 'Guide on this device.', exact: true});
  await expect(section).toContainText('Reads only what you record here, on this device. Nothing is sent anywhere. Turn it off any time.');
  await expect(toggle(page)).toHaveAttribute('aria-checked', 'false');
  await expect(section).toContainText('Off, as it starts.');
  expect(await stored(page)).toBeNull();
});

test('turning it on shows one labelled note; "Not today" hides that note until the next day; "Turn off the Guide" removes it and resets the switch', async ({page}) => {
  await seed(page, MONDAY_EVENING);
  await page.goto('/app/settings');
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('status').filter({hasText: 'The Guide is on for this device.'})).toBeVisible();
  expect(JSON.parse((await stored(page))!)).toMatchObject({version: 1, enabled: true, enabledOn: '2026-09-21', dismissed: {}});
  await page.goto('/app'); await reveal(page);
  await expect(card(page)).toBeVisible();
  await expect(card(page).locator('.eyebrow')).toHaveText(LABEL);
  const heading = card(page).getByRole('heading', {level: 2});
  await expect(heading).toHaveText(/^\d+ of your habits (is|are) still open today: .+\.$/);
  await expect(card(page)).toContainText('A small step counts.');
  await expect(card(page).getByRole('link', {name: 'Open habits', exact: true})).toHaveAttribute('href', '/app/habits');
  // Read once the card has settled: during its arrival (a translate) the box can read 43.99997 for a 44 px control.
  for (const name of ['Open habits', 'Not today', 'Turn off the Guide']) await expect.poll(async () => (await card(page).getByRole('link', {name, exact: true}).or(card(page).getByRole('button', {name, exact: true})).boundingBox())!.height, name).toBeGreaterThanOrEqual(44);
  const before = await heading.textContent();
  await card(page).getByRole('button', {name: 'Not today', exact: true}).click();
  await expect(heading).not.toHaveText(before!);
  expect(JSON.parse((await stored(page))!).dismissed).toEqual({'habits-open': '2026-09-21'});
  await page.reload(); await reveal(page);
  if (await card(page).count()) await expect(heading).not.toHaveText(before!);
  // The next evening the same kind of note may return.
  await page.clock.setFixedTime('2026-09-22T19:00:00.000Z');
  await page.reload(); await reveal(page);
  await expect(heading).toHaveText(/of your habits (is|are) still open today/);
  await card(page).getByRole('link', {name: 'Turn off the Guide', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/settings#guide$/);
  await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('status').filter({hasText: 'The Guide is off on this device.'})).toBeVisible();
  await page.goto('/app'); await reveal(page);
  await expect(card(page)).toHaveCount(0);
});

test('viewing writes nothing; keyboard reaches every control by name', async ({page}) => {
  await seed(page, MONDAY_EVENING);
  await page.goto('/app/settings'); await toggle(page).click(); await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
  await page.goto('/app'); await reveal(page);
  await expect(card(page)).toBeVisible();
  const snapshot = async () => page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const first = await snapshot();
  await page.reload(); await reveal(page); await expect(card(page)).toBeVisible();
  expect(await snapshot()).toBe(first);
  await card(page).getByRole('link', {name: 'Open habits', exact: true}).focus();
  await expect(card(page).getByRole('link', {name: 'Open habits', exact: true})).toBeFocused();
  await page.keyboard.press('Tab'); await expect(card(page).getByRole('button', {name: 'Not today', exact: true})).toBeFocused();
  await page.keyboard.press('Tab'); await expect(card(page).getByRole('link', {name: 'Turn off the Guide', exact: true})).toBeFocused();
});

test('the weekly review\'s last step shows the Guide\'s paragraph only while the Guide is on', async ({page}) => {
  await seed(page, SUNDAY_EVENING);
  const review = page.getByRole('region', {name: /^(A short look back at your week\.|Continue your review\.)$/});
  const openReview = async () => {
    await page.goto('/app'); await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const area = page.getByRole('region', {name: 'For you', exact: true});
    if (!(await review.isVisible().catch(() => false))) { const fold = area.getByRole('button', {name: /^Show more/}); if (await fold.count()) await fold.click(); }
    await review.getByRole('button', {name: /^(Start review|Continue)$/}).click();
    const dialog = page.getByRole('dialog', {name: 'Your week'}); await expect(dialog).toBeVisible();
    // Next saves the words before the step changes (Session U Part 9: in Health and settings), so each click waits for it.
    const next = dialog.getByRole('button', {name: 'Next', exact: true}), step = dialog.getByText(/^Step \d+ of \d+$/);
    while (await next.count()) { const before = await step.textContent(); await next.click(); await expect(step).not.toHaveText(before!); }
    await expect(dialog.getByRole('heading', {name: 'One intention', exact: true})).toBeVisible();
    return dialog;
  };
  let dialog = await openReview();
  await expect(dialog.getByRole('note', {name: 'Guide', exact: true})).toHaveCount(0);
  await dialog.getByRole('button', {name: /^Close (the review|Your week)$/}).click(); // the desktop modal's button, or the phone sheet's ×
  await page.goto('/app/settings'); await toggle(page).click(); await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
  dialog = await openReview();
  const note = dialog.getByRole('note', {name: 'Guide', exact: true});
  await expect(note).toContainText(LABEL);
  await expect(note).toContainText(/This week: \d+ of \d+ habit days done, water logged on \d+ days?, (no weights recorded|\d+ weights? recorded)\./);
  await expect(note).not.toContainText(/!|should|must/);
});

test('Showcase: the Guide is on in the demo and its card says so; viewing writes nothing', async ({page}) => {
  await page.clock.install({time: MONDAY_EVENING});
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await reveal(page);
  await expect(card(page)).toBeVisible();
  await expect(card(page).locator('.eyebrow')).toHaveText(LABEL);
  await expect(card(page)).toContainText('Showcase example.');
  const keys = await page.evaluate(() => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes('zigoals')).sort()));
  await page.reload(); await reveal(page); await expect(card(page)).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes('zigoals')).sort()))).toBe(keys);
});
