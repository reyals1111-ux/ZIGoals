import {expect, test, type Locator, type Page} from '@playwright/test';
import {applyTheme, axe, loadShowcase, THEMES, type Theme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {seedDevice, spending} from './ap/ap-money-fixtures';
import {openPhoneRow} from './phone-length-folds';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {HEALTH_STORAGE_KEY, createEmptyHealth} from '../lib/health';
import {addWater} from '../lib/health-daily';
import {ONBOARDING_SETUP_KEY} from '../lib/aa-device-keys';

/**
 * Session AW Part 5 (p5-fixes): the Carried rows built now, at 390 (the mobile project) and 1440, in Nebula, Light and
 * Dark where a row draws something, axe-clean, no sideways scroll at 320. Fictional data; every /api request answers 503.
 * - CR-22: notice and chip labels at 14 px;
 * - QUALITY b1 #9: the Journal calendar's day buttons 44 × 44 at 320;
 * - FR-S-15 / FR-TJ-12: Health's "Log food" opens the Log a meal sheet on a phone at once;
 * - FR-TJ-20: Portions with nothing chosen is one teaching line;
 * - FR-L-14: an imported phone bill reads as Bills;
 * - FR-TJ-23 / FR-L-16: "Add money to this goal" in a goal's ⋯ opens Fund your goal;
 * - FR-L-17: the phone's Settings list has Erase everything and Notifications;
 * - FR-S-14 (Health, Today): the example counters and Today's coach wait for a use or a choice;
 * - D-CI2026: the Water card's own drinks are drawn with the card.
 * Nothing here moves except the phone sheet, which already follows Motion Off (checked once).
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const serious = async (page: Page, where: Locator) => { const f = await axe(page, where); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };
const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
const size = (el: Locator) => el.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
async function start(page: Page, theme: Theme, isMobile: boolean, records: Record<string, string> = {}) {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await offlineApi(page);
  await freshDevice(page);
  if (Object.keys(records).length) await page.evaluate(r => { for (const [k, v] of Object.entries(r)) localStorage.setItem(k, v); }, records);
}

test.describe('CR-22: notice and chip labels', () => {
  for (const theme of THEMES) test(`${theme}: the Showcase chip and the notice's label are at least 14 px`, async ({page, isMobile}) => {
    await applyTheme(page, theme);
    if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
    await offlineApi(page);
    await loadShowcase(page); await hydrated(page);
    const chip = page.locator('.showcase-chip-button').first();
    await expect(chip).toBeVisible();
    expect(await size(chip)).toBeGreaterThanOrEqual(14);
    const box = (await chip.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const label = page.getByRole('complementary', {name: 'Alpha notice'}).locator('strong');
    // A computer's notice label is 14 px; a phone keeps owner decision T-069's sizes (Carried, registry-p5-fixes.md).
    if (!isMobile && await label.count()) expect(await size(label)).toBeGreaterThanOrEqual(14);
    await chip.click();
    const panel = page.locator('.showcase-chip-panel');
    await expect(panel).toBeVisible();
    expect(await size(panel.locator('strong').first())).toBeGreaterThanOrEqual(14);
    await page.setViewportSize({width: 320, height: 720});
    await noSideways(page);
  });
});

test('b1 #9: the Journal calendar\'s day buttons are 44 × 44 at 320, 360 and 390 px', async ({page, isMobile}) => {
  test.skip(!isMobile, 'the phone widths');
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  const entries = ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'].map((date, i) => ({id: `aw-cal-${i}`, date, text: `A fictional note ${i + 1}.`, createdAt: `${date}T09:00:00.000Z`}));
  await start(page, 'nebula', isMobile, {[JOURNAL_KEY]: JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries})});
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({width, height: 760});
    await page.goto('/app/journal'); await hydrated(page);
    await page.locator('.journal-date-fold > summary').click();
    const days = page.locator('.journal-calendar-day');
    await expect(days).toHaveCount(7);
    for (const day of await days.all()) {
      const b = (await day.boundingBox())!;
      expect(Math.round(b.width), `${width} px`).toBeGreaterThanOrEqual(44); expect(Math.round(b.height), `${width} px`).toBeGreaterThanOrEqual(44);
      expect(b.x, `${width} px`).toBeGreaterThanOrEqual(0); expect(b.x + b.width, `${width} px`).toBeLessThanOrEqual(width);
    }
    await noSideways(page);
    if (width === 320) {
      await page.getByRole('button', {name: /Nov 5, 2026: 1 entry/}).click();
      await expect(page.locator('.journal-entries')).toContainText('A fictional note 3.');
      await serious(page, page.locator('.journal-calendar'));
    }
  }
});

test.describe('FR-S-15 and FR-TJ-20: Health\'s Log food and Portions', () => {
  for (const theme of THEMES) test(`${theme}: Log food opens the meal form in one tap; Portions is one line until chosen`, async ({page, isMobile}) => {
    await start(page, theme, isMobile);
    await page.goto('/app/health'); await hydrated(page);
    await page.locator('.health-heading').getByRole('button', {name: 'Log food', exact: true}).click();
    if (isMobile) {
      const sheet = page.getByRole('dialog', {name: 'Log a meal'});
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('form', {name: 'Just describe it'})).toBeVisible();
      await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('dialog.phone-form-sheet'))).toBe(true);
      await serious(page, sheet);
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
      await expect(page.locator('.health-heading').getByRole('button', {name: 'Log food', exact: true})).toBeFocused();
    } else {
      await expect(page.getByRole('dialog', {name: 'Log a meal'})).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('#health-entry-action'))).toBe(true);
    }
    // FR-TJ-20: no card, one line with its link; choosing opens the full card in place.
    await openPhoneRow(page, 'Portions');
    const portions = page.locator('section.r6-portions');
    await expect(portions).toHaveClass(/r6-portions-empty/);
    await expect(portions).not.toHaveClass(/\bpanel\b/);
    await expect(portions.locator('.r6-portions-teach')).toContainText('None is on until you choose it');
    expect((await portions.boundingBox())!.height).toBeLessThanOrEqual(isMobile ? 160 : 110);
    await serious(page, portions);
    await portions.getByRole('button', {name: 'Choose what to count'}).click();
    await expect(portions).toHaveClass(/\bpanel\b/);
    await expect(portions.getByRole('checkbox', {name: 'Vegetables'})).toBeVisible();
    await page.setViewportSize({width: 320, height: 720});
    await noSideways(page);
  });
  test('Motion Off: the sheet Log food opens is still', async ({page, isMobile}) => {
    test.skip(!isMobile, 'the phone sheet');
    await start(page, 'nebula', isMobile, {'zigoals:ui-prefs:v1': JSON.stringify({version: 1, motion: 'off'})});
    await page.goto('/app/health'); await hydrated(page);
    await page.locator('.health-heading').getByRole('button', {name: 'Log food', exact: true}).click();
    const sheet = page.getByRole('dialog', {name: 'Log a meal'});
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate(el => el.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
  });
});

test('FR-L-14: an imported phone bill reads as Bills', async ({page, isMobile}) => {
  test.skip(!isMobile, 'Lina\'s import is a phone walk (her desktop part is tests/au/lina.spec.ts)');
  test.setTimeout(90_000);
  await seedDevice(page);
  await page.goto('/app/wealth'); await hydrated(page);
  await spending(page).getByRole('button', {name: 'Import from your bank', exact: true}).click();
  const sheet = page.getByRole('region', {name: 'Import spending and income'});
  await sheet.getByRole('button', {name: 'CSV file', exact: true}).click();
  const csv = ['Date,Payee,Amount', '2026-10-04,Fictional Phone,-17.50', '2026-10-09,Fictional Broadband,-30.00', '2026-10-16,Fictional Grocer,-55.10'].join('\n');
  await sheet.getByLabel('CSV file', {exact: true}).setInputFiles({name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
  await sheet.getByRole('combobox', {name: 'Currency of this file', exact: true}).selectOption('EUR');
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  await sheet.getByRole('button', {name: 'Add 3 to my money log', exact: true}).click();
  await expect(sheet.getByRole('status').filter({hasText: '3 entries added to your money log'})).toBeVisible();
  const log = await page.evaluate(k => (JSON.parse(localStorage.getItem(k)!).entries as {note?: string; category: string}[]).map(e => [e.note, e.category]), MONEY_LOG_KEY);
  expect(log).toEqual([['Fictional Phone', 'Bills'], ['Fictional Broadband', 'Bills'], ['Fictional Grocer', 'Groceries']]);
});

test.describe('FR-TJ-23: Add money to this goal', () => {
  for (const theme of THEMES) test(`${theme}: the goal's ⋯ opens Fund your goal`, async ({page, isMobile}) => {
    await applyTheme(page, theme);
    if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
    await offlineApi(page);
    await loadShowcase(page);
    await page.goto('/app/goals/tracked/9201'); await hydrated(page);
    await expect(page.locator('main h1')).toContainText('Emergency fund');
    await page.getByLabel('Goal actions').click();
    const add = page.getByRole('link', {name: 'Add money to this goal', exact: true});
    await expect(add).toBeVisible();
    expect(Math.round((await add.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
    await serious(page, page.locator('.goal-actions'));
    await add.click();
    const fund = page.getByRole('dialog', {name: 'Fund your goal'});
    await expect(fund).toBeVisible();
    await expect(page).not.toHaveURL(/contribute=1/);
    await expect(page.locator('.goal-actions')).not.toHaveAttribute('open', '');
    await serious(page, fund);
  });
});

test('FR-L-17: the phone\'s Settings list goes to Erase everything and Notifications', async ({page, isMobile}) => {
  test.skip(!isMobile, 'the phone list');
  await start(page, 'nebula', isMobile);
  await page.goto('/app/settings'); await hydrated(page);
  const list = page.getByRole('navigation', {name: 'Settings sections'});
  for (const [name, id] of [['Erase everything', '#erase-everything'], ['Notifications', '#notifications']] as const) {
    const row = list.getByRole('link', {name, exact: true});
    await expect(row).toHaveAttribute('href', id);
    expect(Math.round((await row.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
    await row.click();
    await expect(page.locator(id)).toBeInViewport();
    await page.evaluate(() => scrollTo(0, 0));
  }
  await expect(page.locator('#erase-everything')).toContainText('Erase everything on this device');
  await serious(page, list);
});

test.describe('FR-S-14: the example counters and Today\'s coach wait for a use or a choice', () => {
  const SETUP = JSON.stringify({version: 1, at: '2026-11-20T09:00:00.000Z', habitIds: ['h-aw'], widgetIds: [], focuses: ['water', 'read']});
  for (const theme of THEMES) test(`${theme}: no "Move more" chosen: no counters on Health until Activity shows them`, async ({page, isMobile}) => {
    await start(page, theme, isMobile, {[ONBOARDING_SETUP_KEY]: SETUP});
    await page.goto('/app/health'); await hydrated(page);
    await expect(page.locator('.health-heading')).toBeVisible();
    await expect(page.locator('.health-toolbar, .health-views').first()).toBeVisible();
    await expect(page.locator('.exercise-counters')).toHaveCount(0);
    await expect(page.getByRole('article', {name: 'Push-ups', exact: true})).toHaveCount(0);
    await page.goto('/app/health?view=activity'); await hydrated(page);
    const off = page.locator('.health-counters-off');
    await expect(off).toContainText('Quick exercise counters (push-ups, pull-ups, squats or your own) are off');
    await serious(page, off);
    await off.getByRole('button', {name: 'Show quick counters', exact: true}).click();
    await expect(page.getByRole('article', {name: 'Push-ups', exact: true})).toBeVisible();
    await expect(off).toHaveCount(0);
    expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).exercise.counters.map((c: {name: string}) => c.name), HEALTH_STORAGE_KEY)).toEqual(['Push-ups', 'Pull-ups', 'Squats']);
  });
  // Session AW (integration with simplicity-a, deliberate): with no welcome choices the never-used counters wait behind
  // Health's one teaching line (owner brief Part 3, tests/aw-simplicity-a.spec.ts), so that half checks the line and its
  // one tap instead; "Move more" chosen still shows them at once, as before.
  test('"Move more" chosen: the counters are there; no choices: one teaching line shows them in one tap', async ({page, isMobile}) => {
    await start(page, 'nebula', isMobile, {[ONBOARDING_SETUP_KEY]: SETUP.replace('"read"', '"move"')});
    await page.goto('/app/health'); await hydrated(page);
    await expect(page.getByRole('article', {name: 'Push-ups', exact: true})).toBeVisible();
    await start(page, 'nebula', isMobile);
    await page.goto('/app/health'); await hydrated(page);
    await expect(page.getByRole('article', {name: 'Push-ups', exact: true})).toHaveCount(0);
    await page.locator('[data-teach="health-start"]').getByRole('button', {name: 'Show quick counters', exact: true}).click();
    await expect(page.getByRole('article', {name: 'Push-ups', exact: true})).toBeVisible();
  });
  test('Today: water alone brings no coach; a goal weight does', async ({page, isMobile}) => {
    const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Amsterdam'}).format(new Date());
    const water = addWater(createEmptyHealth(), {id: 'health_00000000-0000-4000-8000-00000000a0e5', date: today, amountMilli: 250_000, unit: 'ml'}, new Date().toISOString());
    await start(page, 'nebula', isMobile, {[HEALTH_STORAGE_KEY]: JSON.stringify(water)});
    await page.goto('/app'); await hydrated(page);
    await expect(page.locator('.today-focus')).toBeVisible();
    await expect(page.getByRole('region', {name: 'Your coach'})).toHaveCount(0);
    await start(page, 'nebula', isMobile, {[HEALTH_STORAGE_KEY]: JSON.stringify({...water, targets: {...water.targets, weightGrams: 70_000}})});
    await page.goto('/app'); await hydrated(page);
    await expect(page.getByRole('region', {name: 'Your coach'}).getByRole('link', {name: 'Log a weight →'})).toBeVisible();
  });
});

test('D-CI2026: the Water card\'s own drinks are drawn with the card, not after it', async ({page, isMobile}) => {
  await applyTheme(page, 'nebula');
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await offlineApi(page);
  await loadShowcase(page);
  // The first moment the card and the drinks row are in the page, measured as they arrive.
  await page.addInitScript(() => {
    const seen: Record<string, number> = {};
    new MutationObserver(() => {
      if (!seen.card && document.querySelector('#water')) seen.card = performance.now();
      if (!seen.row && document.querySelector('#water [aria-label="Your drinks, one tap each"]')) seen.row = performance.now();
      (window as unknown as {awSeen: Record<string, number>}).awSeen = seen;
    }).observe(document, {childList: true, subtree: true});
  });
  await page.goto('/app/health'); await hydrated(page);
  const row = page.getByRole('group', {name: 'Your drinks, one tap each'});
  await expect(row).toBeVisible();
  // Outside the card's lazy part, so it never waits for that part's script.
  expect(await row.evaluate(el => !!el.closest('.r3-water'))).toBe(false);
  const seen = await page.evaluate(() => (window as unknown as {awSeen: Record<string, number>}).awSeen);
  expect(seen.card).toBeGreaterThan(0);
  expect(seen.row! - seen.card!).toBeLessThanOrEqual(150);
  // The keyboard step of ui-design-pass:385 no longer waits for the row: Shift+Tab, Tab comes back to the amount.
  const field = page.getByLabel('Water amount', {exact: true});
  await field.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  await expect(field).toBeFocused();
  await serious(page, row);
});
