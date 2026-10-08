import {expect, test, type Page} from '@playwright/test';

// Session X Part 11: "Send feedback" in Help and in Settings → Help & diagnostics. The email opens in the person's own
// mail app; device details join it only when ticked, shown in full and editable; nothing is sent, stored or requested.
test.use({timezoneId: 'Europe/Brussels'});
const body = async (page: Page, scope = page.locator('body')) => decodeURIComponent(((await scope.getByRole('link', {name: 'Email feedback to contact@zigoals.app', exact: true}).getAttribute('href'))!).split('&body=')[1] ?? '');
const storage = (page: Page) => page.evaluate(() => JSON.stringify({local: {...localStorage}, session: {...sessionStorage}}));

test('Help: details only when ticked, shown in full, the person\'s to edit, and nothing sent, stored or requested', async ({page}) => {
  await page.goto('/app/help');
  const section = page.getByRole('region', {name: 'Tell us what you think', exact: true});
  await expect(section.getByRole('link', {name: 'Email feedback to contact@zigoals.app', exact: true})).toBeVisible();
  const plain = await body(page, section);
  expect(plain).toContain('Device and browser:\n\nApp version: ');
  expect(plain).not.toContain('Browser:');
  await expect(section.getByRole('textbox')).toHaveCount(0);
  const before = await storage(page), requests: string[] = [];
  page.on('request', request => requests.push(request.url()));

  const box = section.getByRole('checkbox', {name: 'Add details about this device to the email', exact: true});
  await expect(box).not.toBeChecked();
  await box.check();
  const details = section.getByRole('textbox', {name: 'Device details: edit or delete anything before you send', exact: true});
  await expect(details).toBeVisible();
  const text = await details.inputValue();
  for (const line of [/^Browser: \S.*$/m, /^System: \S.*$/m, /^Window: \d+ × \d+ px, pixel ratio [\d.]+$/m, /^Motion: follows the device; the device asks for reduced motion: (yes|no)$/m, /^Installed app: no, in a browser tab$/m, /^Time zone: Europe\/Brussels$/m]) expect(text).toMatch(line);
  expect(text.split('\n')).toHaveLength(6);
  expect(await body(page, section)).toContain(`Device and browser:\n${text}\n\nApp version: `);
  // Edited, the email carries exactly the person's words; unticked, none of them.
  await details.fill('Browser: mine\nTime zone: not saying');
  expect(await body(page, section)).toContain('Device and browser:\nBrowser: mine\nTime zone: not saying\n\nApp version: ');
  await box.uncheck();
  await expect(details).toHaveCount(0);
  expect(await body(page, section)).toBe(plain);
  expect(requests).toEqual([]);
  expect(await storage(page)).toBe(before);
});

test('Help: the controls are readable and easy to hit; the checkbox sits beside its sentence', async ({page}) => {
  await page.goto('/app/help#feedback');
  const section = page.getByRole('region', {name: 'Tell us what you think', exact: true});
  const row = section.locator('.send-feedback-add'), box = row.locator('input'), sentence = row.locator('span');
  await row.scrollIntoViewIfNeeded();
  const [r, b, t] = await Promise.all([row.boundingBox(), box.boundingBox(), sentence.boundingBox()]);
  expect(b!.x + b!.width).toBeLessThanOrEqual(t!.x);
  expect(Math.round(b!.width)).toBe(22);
  expect(r!.height).toBeGreaterThanOrEqual(44);
  expect(parseFloat(await sentence.evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
  await box.check();
  expect(parseFloat(await section.getByRole('textbox').evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
  expect((await section.getByRole('link', {name: 'Email feedback to contact@zigoals.app', exact: true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(section.getByRole('link', {name: 'hello@zigoals.app', exact: true})).toHaveAttribute('href', 'mailto:hello@zigoals.app');
});

test('Settings → Help & diagnostics: the same email; Motion Off is named when chosen', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off'));
  await page.reload();
  const panel = page.getByRole('group', {name: 'Help & diagnostics', exact: true}).locator('#send-feedback');
  await expect(panel.getByRole('heading', {name: 'Tell us what you think', exact: true})).toBeVisible();
  expect(await body(page, panel)).toMatch(/^What happened:\n\nWhat you expected:\n\nDevice and browser:\n\nApp version: .+\n\n\(Please leave out codes/);
  await panel.getByRole('checkbox', {name: 'Add details about this device to the email', exact: true}).check();
  await expect(panel.getByRole('textbox')).toHaveValue(/^Motion: Off in ZIGoals; the device asks for reduced motion: no$/m);
  expect(await body(page, panel)).toContain('Motion: Off in ZIGoals');
});

test('Help: Known limitations in plain words, with working links', async ({page}) => {
  await page.goto('/app/help');
  const section = page.getByRole('region', {name: 'What the Alpha can’t do yet', exact: true});
  const items = section.getByRole('listitem');
  await expect(items).toHaveCount(9);
  await expect(items.first()).toContainText('Accounts and sync aren’t open yet on alpha.zigoals.app.');
  await expect(section).toContainText('No real money moves.');
  await expect(section).toContainText('never zero');
  for (const [name, href] of [['install ZIGoals', '#install'], ['Export everything', '/app/settings#export-everything'], ['ZIGi · your AI', '#your-ai'], ['tell us', '#feedback']]) await expect(section.getByRole('link', {name, exact: true})).toHaveAttribute('href', href);
  await section.getByRole('link', {name: 'tell us', exact: true}).click();
  await expect(page).toHaveURL(/#feedback$/);
});
