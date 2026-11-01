import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {NOVA_KEY} from '../lib/nova/store';
import {isPhone} from './phone-nav';

/**
 * Session AK lane P1 (owner follow-up 2 M3 "live activity chips"; WIRING_AUDIT_2 row M3): NOVA's "Running now". A fresh
 * start shows no chip (nothing runs); a fast started on Health shows on NOVA with Health's own words and moves on with the
 * clock, links back to the fasting timer, and leaves when the fast is stopped; a Pomodoro started from NOVA's Focus widget
 * shows its time left and links to Focus Sessions. Every chip is a named link at least 44 px tall, still under reduced
 * motion, and the command field stays inside the window (EX-1). The clock is Playwright's; nothing leaves the browser.
 */
const running = (page: Page) => page.getByRole('list', {name: 'Running now'});
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}),
    [NOVA_KEY]: JSON.stringify({version: 1, openingSeen: true}),
  });
});
async function fastingTimer(page: Page) {
  await page.goto('/app/health');
  const region = page.getByRole('region', {name: 'Fasting timer', exact: true});
  // On a phone the module is folded until a fast runs (tests/fasting.spec.ts does the same).
  if (await isPhone(page)) await expect(async () => {
    if (await region.isVisible()) return;
    const toggle = page.locator('.phone-fold-toggle').filter({hasText: 'Fasting timer'}).first();
    if (await toggle.count()) await toggle.click();
    await expect(region).toBeVisible({timeout: 1500});
  }).toPass({timeout: 15000});
  await expect(region).toBeVisible();
  return region;
}
async function tallAndStill(page: Page) {
  const chips = running(page).getByRole('link');
  for (const chip of await chips.all()) {
    const box = await chip.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await chip.evaluate(el => [el, ...el.querySelectorAll('*')].every(n => { const s = getComputedStyle(n); return s.animationName === 'none'; }))).toBe(true);
  }
}

test('a fast started on Health runs on NOVA in Health\'s words, links back to the timer, and leaves when stopped', async ({page}) => {
  await page.goto('/app/nova');
  await expect(page.locator('.nova-orb-button')).toBeVisible();
  await expect(running(page)).toHaveCount(0);
  let timer = await fastingTimer(page);
  await timer.getByRole('group', {name: 'Fasting target'}).getByRole('button', {name: '16:8', exact: true}).click();
  await timer.getByRole('button', {name: 'Start fast', exact: true}).click();
  await expect(timer.locator('.fasting-clock')).toHaveText('Fasting · 0 h 00 min of 16 h');
  await page.goto('/app/nova');
  const chip = running(page).getByRole('link', {name: 'Fast: 0 h 00 min of 16 h. Open Health'});
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('href', '/app/health#fasting');
  await tallAndStill(page);
  await page.clock.fastForward(2 * 3_600_000 + 5 * 60_000);
  await expect(running(page).getByRole('link', {name: 'Fast: 2 h 05 min of 16 h. Open Health'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await running(page).getByRole('link', {name: /^Fast:/}).click();
  await expect(page).toHaveURL(/\/app\/health#fasting$/);
  timer = await fastingTimer(page);
  await timer.getByRole('button', {name: 'Stop fast', exact: true}).click();
  await expect(timer.getByRole('status')).toContainText('Stopped at');
  await page.goto('/app/nova');
  await expect(page.locator('.nova-orb-button')).toBeVisible();
  await expect(running(page)).toHaveCount(0);
});

test('a Pomodoro started from NOVA\'s Focus widget shows its time left, counts down, and opens Focus Sessions', async ({page, isMobile}) => {
  test.skip(isMobile, 'the Focus widget is on the computer stage');
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/nova');
  await page.getByRole('button', {name: /View controls/}).click();
  await page.getByRole('checkbox', {name: 'Focus'}).check();
  await page.keyboard.press('Escape');
  const focus = page.getByRole('article', {name: 'Focus'});
  await focus.getByRole('button', {name: /^Start a \d+-minute Pomodoro$/}).click();
  await expect(running(page).getByRole('link', {name: /^Focus: 25:00 left\. Open Focus Sessions$/})).toBeVisible();
  await page.clock.fastForward(6 * 60_000 + 18_000);
  const chip = running(page).getByRole('link', {name: 'Focus: 18:42 left. Open Focus Sessions'});
  await expect(chip).toBeVisible();
  await tallAndStill(page);
  // EX-1: with a chip showing, the command field is still inside the window.
  const field = await page.locator('.nova-command').boundingBox();
  expect(field!.y + field!.height).toBeLessThanOrEqual(900);
  await focus.getByRole('button', {name: 'End the run'}).click();
  await expect(running(page)).toHaveCount(0);
  await focus.getByRole('button', {name: 'OK'}).click();
  await focus.getByRole('button', {name: /^Start a \d+-minute Pomodoro$/}).click();
  await running(page).getByRole('link', {name: /^Focus: .* left\. Open Focus Sessions$/}).click();
  await expect(page).toHaveURL(/\/app\/journey\?focus=pomodoro#focus$/);
});
