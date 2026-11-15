import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';
import {applyTheme} from '../../p6-helpers';
import {afterGoto} from '../../settings-open';

/**
 * Session AL third pass (lanes L10a, L10b, L5). Fresh profile unless said; every /api request answers 503.
 * - DV-256 / DV-261 (P-DV-112): the phone's More sheet says "Backups, privacy, display and the demo tour" and "Answers and
 *   feedback" (no "the Alpha's facts" twice), names its theme switch, and Settings' phone row says "Encrypted backup and
 *   copies of each area" (not "module copies"). 388 px, Light (the bot's).
 * - LA-024 / N-LS-05 (P-LA-29): the phone's top bar is the banner landmark, so Back and the logo sit in a landmark; on a
 *   computer the Checklist button sits in the "Companion and extras" landmark (axe "region").
 * - L3's request (AL-LAYOUT-375-011): with the rocket gone from phones, the Apps & extras sheet has a "Game layer" row
 *   while the game layer is on (opens the Journey), and none while it is off or beside the tablet rail's rocket.
 * - NB-240 (P-NB-67; W4, ADR-015 S28): with Health hidden, Quick add has no "Health entry" shortcut; shown again, it is back.
 * - TK-6B-09 (P-TK-40): by day a secondary button ("Hide amounts") has a 3:1 edge (#717d94). Needs the regenerated theme
 *   sheets (themes/light.al-buttons.css).
 */
test.beforeEach(async ({page}) => { await offlineApi(page); });
async function ready(page: Page, path: string) {
  await page.goto(path); await afterGoto(page, path); await hydrated(page);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
}

test('DV-256 / DV-261: plain captions in More and on Settings, and a named theme switch (388, Light)', async ({page}) => {
  await page.setViewportSize({width: 388, height: 844});
  await applyTheme(page, 'light'); await freshDevice(page);
  await ready(page, '/app/settings');
  // Session AL (fix-up, spec): the phone's Settings rows are .phone-settings-list (components/phone/phone-settings.tsx).
  await expect(page.locator('.phone-settings-list')).toContainText('Encrypted backup and copies of each area');
  await expect(page.locator('.phone-settings-list')).not.toContainText('module copies');
  await page.getByRole('button', {name: 'More', exact: true}).click();
  const more = page.getByRole('dialog').filter({has: page.getByRole('link', {name: 'Help', exact: true})});
  await expect(more.locator('[data-note="Backups, privacy, display and the demo tour"]')).toHaveCount(1);
  await expect(more.locator('[data-note="Answers and feedback"]')).toHaveCount(1);
  await expect(more.locator('[data-note*="Alpha\'s facts"]')).toHaveCount(0);
  await expect(more.getByRole('heading', {name: 'Theme', exact: true})).toBeVisible();
  await expect(more.getByRole('radiogroup', {name: 'Theme'})).toBeVisible();
});

test('LA-024 / N-LS-05: the phone top bar is the banner; the Checklist button is inside a landmark on a computer', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await freshDevice(page);
  await ready(page, '/app/settings');
  const banner = page.getByRole('banner');
  await expect(banner).toHaveCount(1);
  await expect(banner.getByRole('link', {name: 'ZIGoals home'})).toBeVisible();
  // Session AL (D-159, sweep 4, deliberate; components/help/help-back.tsx): the top bar's back link on Help shows only when
  // Help was opened from Settings, so it is opened from Settings' own link, as a person does.
  await page.getByRole('main').getByRole('link', {name: 'Help & feedback →', exact: true}).click();
  await page.waitForURL('**/app/help');
  await expect(page.getByRole('banner').getByRole('link', {name: /^Back to /})).toBeVisible();
  await page.setViewportSize({width: 1280, height: 900});
  await ready(page, '/app/habits');
  const extras = page.getByRole('complementary', {name: 'Companion and extras'});
  await expect(extras.getByRole('link', {name: 'Open the Checklist: today’s path'})).toBeVisible();
  await expect(extras.getByRole('button', {name: /^Open ZIGi/})).toBeVisible();
  // The landmark draws no box: the launchers keep their fixed places.
  expect(await page.locator('.app-extras-landmark').evaluate(e => getComputedStyle(e).display)).toBe('contents');
  expect(await page.locator('.checklist-launcher-stack').evaluate(e => getComputedStyle(e).position)).toBe('fixed');
});

test('AL-LAYOUT-375-011 follow-up: a "Game layer" row in Apps & extras on phones, only while the game layer is on', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await freshDevice(page);
  await ready(page, '/app/habits');
  const button = page.getByTestId('apps-extras-button'), sheet = page.getByRole('dialog', {name: 'Apps & extras'});
  await button.click();
  await expect(sheet.getByRole('link', {name: /^Game layer/})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => localStorage.setItem('zigoals:game:v1', JSON.stringify({version: 1, enabled: true})));
  await ready(page, '/app/habits');
  await button.click();
  const row = sheet.getByRole('link', {name: /^Game layer/});
  await expect(row).toBeVisible();
  await expect(row).toContainText('On: your level, quests and badges. Switch it off on Journey.');
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await row.click();
  await page.waitForURL(url => url.pathname === '/app/journey');
  await expect(sheet).toBeHidden();
  // Beside the tablet rail the rocket still shows in the page's tools, so the sheet has no second entry.
  await page.setViewportSize({width: 820, height: 1000});
  await ready(page, '/app/habits');
  await button.click();
  await expect(sheet.getByRole('link', {name: /^Game layer/})).toHaveCount(0);
});

test('NB-240: with Health hidden, Quick add offers no Health shortcut; shown again, it is back (375)', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await freshDevice(page);
  await ready(page, '/app/settings');
  const pages = page.getByRole('region', {name: 'Your pages & buttons', exact: true});
  const health = pages.getByRole('switch', {name: 'Health', exact: true});
  await health.click();
  await expect(health).not.toBeChecked();
  await ready(page, '/app/habits');
  await page.getByRole('button', {name: '+ Quick add'}).first().click();
  const actions = page.getByRole('navigation', {name: 'Quick add actions'});
  await expect(actions.getByText('Habit', {exact: true})).toBeVisible();
  await expect(actions.getByText(/^Health entry/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  // Session AL (fix-up, spec): closing Quick add takes its Back entry out with history.back() (components/use-back-closes.ts);
  // a goto sent before that step lands is aborted (ERR_ABORTED), so wait for the sheet to close and the entry to go.
  await expect(page.locator('dialog.quick-add-dialog[open]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => !(history.state as Record<string, unknown> | null)?.__zigoalsLayer)).toBe(true);
  await ready(page, '/app/settings');
  await page.getByRole('region', {name: 'Your pages & buttons', exact: true}).getByRole('switch', {name: 'Health', exact: true}).click();
  await ready(page, '/app/habits');
  await page.getByRole('button', {name: '+ Quick add'}).first().click();
  await expect(page.getByRole('navigation', {name: 'Quick add actions'}).getByText('Health entry', {exact: true})).toBeVisible();
});

test('TK-6B-09: by day a secondary button has a 3:1 edge; in Nebula it is unchanged (Portfolio, 768)', async ({page}) => {
  await page.setViewportSize({width: 768, height: 1024});
  await applyTheme(page, 'light'); await freshDevice(page);
  await ready(page, '/app/portfolio');
  const toggle = page.getByRole('button', {name: /^(Hide|Show) amounts$/}).first();
  await expect(toggle).toBeVisible();
  await expect.poll(() => toggle.evaluate(e => getComputedStyle(e).borderTopColor)).toBe('rgb(113, 125, 148)');
  await applyTheme(page, 'nebula');
  await ready(page, '/app/portfolio');
  expect(await page.getByRole('button', {name: /^(Hide|Show) amounts$/}).first().evaluate(e => getComputedStyle(e).borderTopColor)).not.toBe('rgb(113, 125, 148)');
});

// NB-245 ("520 to 700px layout dead zone", Nairobi): the guard read 600 and 610 only. Every step across the window,
// both sides of the 541 px phone/rail switch, in a desktop browser: no sideways scroll, nothing floats over the page, the
// Habits lede reads as lines (not a word or two each), and every shell control is whole with a 44 px target.
for (const width of [520, 540, 541, 560, 600, 640, 680, 700] as const)
  test(`NB-245: a ${width} px window reads normally (no float, no sideways scroll, readable lede, 44 px controls)`, async ({page, isMobile}) => {
    test.skip(isMobile, 'A desktop browser window');
    await page.setViewportSize({width, height: 800});
    await freshDevice(page);
    await ready(page, '/app/habits');
    await expect(page.locator('main h1').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await page.waitForTimeout(600);
    await expect(page.locator('[data-testid="ai-launcher"], .ai-edge-tab, .checklist-launcher-stack, .checklist-edge-tab, .music-launcher-stack, .earn-dock-stack').filter({visible: true})).toHaveCount(0);
    const hero = page.locator('main .pillar-hero').first(), lede = hero.locator('.pillar-hero-lede').first();
    const [h, l] = await Promise.all([hero.boundingBox(), lede.boundingBox()]);
    expect(h && l, 'the Habits header and its lede').toBeTruthy();
    expect(l!.width, `lede ${Math.round(l!.width)} of ${Math.round(h!.width)} px`).toBeGreaterThanOrEqual(Math.min(260, h!.width * .6));
    const problems = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.phone-topbar :is(a, button), .phone-tabbar a, .app-sidebar .app-nav a, .apps-extras-rail button')].flatMap(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return [];
      const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24);
      return [...(r.left < -0.5 || r.right > innerWidth + 0.5 ? [`${name} cut`] : []), ...(r.width < 43.5 || r.height < 43.5 ? [`${name} ${Math.round(r.width)}×${Math.round(r.height)}`] : [])];
    }));
    expect(problems).toEqual([]);
  });
