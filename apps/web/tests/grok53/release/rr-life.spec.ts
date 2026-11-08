import {expect, test, type Page} from '@playwright/test';
import {emptyDevice, hydrated, logWaterOnHealth, open} from '../l3-helpers';
import {loadShowcase} from '../../ah-helpers';

/**
 * Session AL Part 16 release review "as if 1.0" (docs/review/session-al/RELEASE_REVIEW_AL.md), the Life areas: Habits,
 * Health, Today, Quick add, reminders and the welcome. One test per finding, at the width the review used; fictional data,
 * every /api request answered 503 and local-model ports refused (l3-helpers), so nothing leaves the browser.
 */
test.use({timezoneId: 'Europe/Brussels'});
const phone = {width: 390, height: 844}, desktop = {width: 1440, height: 900};

/** The welcome from its first step: the pillars and focuses named, the starters as they come, a goal amount if one is asked. */
async function welcome(page: Page, pillars: RegExp[], focuses: RegExp[], check?: (flow: ReturnType<Page['locator']>) => Promise<void>) {
  await open(page, '/app/welcome');
  const flow = page.locator('main');
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  for (const p of pillars) await flow.getByRole('checkbox', {name: p}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  for (const f of focuses) await flow.getByRole('checkbox', {name: f}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(flow.getByRole('heading', {level: 1, name: 'A few things to start with.'})).toBeVisible();
  if (check) await check(flow);
  for (const step of ['A few things to start with.', 'A quick look around.', 'Keep ZIGoals on your Home Screen.', 'Meet ZIGi.']) {
    await expect(flow.getByRole('heading', {level: 1, name: step})).toBeVisible();
    await flow.getByRole('button', {name: step === 'A quick look around.' ? 'Skip the tour' : 'Continue', exact: true}).click();
  }
  await flow.getByRole('button', {name: 'Finish setup', exact: true}).click();
  await page.waitForURL(/\/app(\/habits|\/health)?$/); await hydrated(page);
}
async function quickAdd(page: Page, text: string) {
  await open(page, '/app');
  await page.locator('.phone-topbar .quick-add-trigger, .today-hero .quick-add-trigger').filter({visible: true}).first().click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'});
  const field = dialog.getByRole('textbox', {name: 'Type a line'});
  await expect(field).toBeVisible();
  await field.fill(text);
  await page.keyboard.press('Enter');
  return dialog;
}

test('RR-1: the welcome\'s Drink water counts the water journal, and its Walk takes "walked 4000 steps" without asking twice', async ({page}) => {
  await page.setViewportSize(phone);
  await page.clock.install({time: new Date('2026-11-08T09:30:00Z')});
  await emptyDevice(page, {theme: 'nebula', welcomeSeen: false});
  await welcome(page, [/^Habits/, /^Health & food/], [/^Drink more water/, /^Move more/]);
  await logWaterOnHealth(page, 750);
  // One figure: the habit made by the welcome reads the 750 mL logged in Health, on Habits and on Today.
  await open(page, '/app/habits');
  const card = page.getByRole('article', {name: 'Drink water', exact: true});
  await expect(card.locator('.habit-count')).toContainText('0.75 / 2');
  await expect(card).toContainText('Counting from your water journal');
  await open(page, '/app');
  await expect(page.locator('li').filter({hasText: /^Drink water/}).locator('.habit-count').first()).toContainText('0.75 / 2');
  // The Walk habit is linked to steps: the line is the activity alone (the habit counts it from there).
  const dialog = await quickAdd(page, 'walked 4000 steps');
  await expect(dialog).toContainText('Will save: Walk · 4,000 steps');
  await expect(dialog.getByText(/Did you mean/)).toHaveCount(0);
  await expect(dialog.getByRole('button', {name: /\(habit\)/})).toHaveCount(0);
});

test('RR-3: the weekly review reminder\'s Open goes to the Life review', async ({page}) => {
  await page.setViewportSize(desktop);
  await page.clock.install({time: new Date('2026-11-08T18:30:00Z')}); // Sunday 19:30 in Brussels: the Showcase's review day, after 18:00
  await emptyDevice(page);
  await loadShowcase(page);
  const reminder = page.getByRole('article', {name: 'Reminder: Weekly review'});
  await expect(reminder).toContainText('Your weekly review is open.');
  const openLink = reminder.getByRole('link', {name: 'Open', exact: true});
  await expect(openLink).toHaveAttribute('href', '/app/review');
  await openLink.click();
  await page.waitForURL('**/app/review');
});

test('RR-5: with no model, a meal typed in Quick add is never labelled AI, and Today names it with no "Unknown"', async ({page}) => {
  await page.setViewportSize(phone);
  await page.clock.install({time: new Date('2026-11-08T07:30:00Z')});
  await emptyDevice(page, {theme: 'light'});
  const dialog = await quickAdd(page, 'oatmeal with blueberries for breakfast');
  const card = dialog.locator('.quick-log-cards .ai-card').first();
  await expect(card).toContainText('oatmeal with blueberries');
  await expect(card).not.toContainText(/AI estimate/i);
  await expect(card.locator('.ai-card-badge')).toHaveCount(0);
  await expect(card).toContainText('unknown (never 0)');
  await card.locator('.primary').click();
  await expect(dialog.locator('.quick-log-cards')).toContainText(/Added|Applied|Saved/);
  await page.keyboard.press('Escape');
  await open(page, '/app');
  const health = page.getByRole('region', {name: 'Today\'s health'});
  await expect(health).toContainText('Breakfast: oatmeal with blueberries');
  await expect(health).toContainText('Nutrition not given for this entry');
  await expect(health).not.toContainText('Unknown'); // sr-only text included: unknown is said once, in words, never as 0
  await expect(health).not.toContainText(/\b0 kcal/);
});

test('RR-6: after one weigh-in Health says it is the first reading, not a six-week smoothed trend', async ({page}) => {
  await page.setViewportSize(phone);
  await page.clock.install({time: new Date('2026-11-08T07:30:00Z')});
  await emptyDevice(page, {theme: 'light'});
  const dialog = await quickAdd(page, 'weight 78.4');
  await expect(dialog).toContainText('Will save: Weight · 78.4 kg');
  await dialog.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(dialog).toContainText('Saved: Weight · 78.4 kg');
  await page.keyboard.press('Escape');
  await open(page, '/app/health');
  const tile = page.locator('.health-hl-tile[data-tone="trend"]');
  await expect(tile).toContainText('78.4 kg');
  await expect(tile).toContainText('First reading. Two or three a week draw the line.');
  await expect(tile).not.toContainText('six weeks');
});

test('RR-12: a fresh Today\'s Recent activity empty state at 1440 never breaks a word', async ({page}) => {
  await page.setViewportSize(desktop);
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app');
  const empty = page.locator('.recent-panel .timeline-empty').first();
  await expect(empty).toContainText('Your next step belongs here.');
  // Every word of the heading and its line sits on one line box (a word split across lines has two rects). A compound
  // breaks at its own hyphen ("check-/ins"), as text does; the parts between hyphens never break.
  const split = await empty.evaluate(el => {
    const out: string[] = [];
    for (const block of el.querySelectorAll('.empty-state-copy > :is(h2, h3, p)')) {
      const text = block.firstChild;
      if (!text || text.nodeType !== Node.TEXT_NODE) continue;
      const value = text.textContent ?? '';
      for (const match of value.matchAll(/[^\s-]+/g)) {
        const range = document.createRange(); range.setStart(text, match.index!); range.setEnd(text, match.index! + match[0].length);
        const tops = new Set([...range.getClientRects()].map(r => Math.round(r.top)));
        if (tops.size > 1) out.push(match[0]);
      }
    }
    return out;
  });
  expect(split).toEqual([]);
});

test('RR-15: the welcome makes the habits its focus cards describe (Read 20 minutes, Meditate 10 minutes)', async ({page}) => {
  await page.setViewportSize(phone);
  await emptyDevice(page, {theme: 'nebula', welcomeSeen: false});
  await welcome(page, [/^Habits/], [/^Read more/, /^Meditate/], async flow => {
    await expect(flow.getByRole('checkbox', {name: /^Read\s*20 minutes a day/})).toBeChecked();
    await expect(flow.getByRole('checkbox', {name: /^Meditate\s*From your focus · 10 minutes a day/})).toBeChecked();
  });
  await open(page, '/app/habits');
  await expect(page.getByRole('article', {name: 'Read', exact: true}).locator('.habit-count')).toContainText('0 / 20 minutes');
  await expect(page.getByRole('article', {name: 'Meditate', exact: true}).locator('.habit-count')).toContainText('0 / 10 minutes');
});
