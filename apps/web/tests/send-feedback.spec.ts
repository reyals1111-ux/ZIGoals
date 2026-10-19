import {expect, test, type Page} from '@playwright/test';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {ZIGI_KEY} from '../lib/ai/store/keys';

// Session X Part 11: "Send feedback" in Help and in Settings → Help & diagnostics. The email opens in the person's own
// mail app; device details join it only when ticked, shown in full and editable; nothing is sent, stored or requested.
test.use({timezoneId: 'Europe/Brussels'});
const body = async (page: Page, scope = page.locator('body')) => decodeURIComponent(((await scope.getByRole('link', {name: 'Email feedback to contact@zigoals.app', exact: true}).getAttribute('href'))!).split('&body=')[1] ?? '');
const storage = (page: Page) => page.evaluate(() => JSON.stringify({local: {...localStorage}, session: {...sessionStorage}}));

test('Help: details only when ticked, shown in full, the person\'s to edit, and nothing sent, stored or requested', async ({page}) => {
  // Session Z-Cloud Gate C: ZIGi's launcher is hidden here, so its own figure files (which load on their own schedule and
  // twice arrived inside the window below under two-worker load) are not in the page; nothing at all may be requested.
  await page.addInitScript(([aiKey, ai, zigiKey]) => { if (!localStorage.getItem(aiKey)) { localStorage.setItem(aiKey, ai); localStorage.setItem(zigiKey, JSON.stringify({version: 1, edgeTab: false})); } }, [AI_SETTINGS_KEY, JSON.stringify({...defaultAiSettings(), launcherHidden: true}), ZIGI_KEY] as const);
  await page.goto('/app/help');
  await expect(page.getByRole('button', {name: /^Open ZIGi/})).toHaveCount(0);
  const section = page.getByRole('region', {name: 'Tell us what you think', exact: true});
  await expect(section.getByRole('link', {name: 'Email feedback to contact@zigoals.app', exact: true})).toBeVisible();
  const plain = await body(page, section);
  expect(plain).toContain('Device and browser:\n\nApp version: ');
  expect(plain).not.toContain('Browser:');
  await expect(section.getByRole('textbox')).toHaveCount(0);
  // Session AB-Design Phase 2 (ADR-024): the page's own route prefetches (its guide links to Goals, Habits and the welcome)
  // finish first, so the window below starts quiet; nothing at all may still be requested inside it.
  await page.waitForLoadState('networkidle');
  // Session AD (ADR-026 F8): the footer's wordmark is a lazy image, fetched when the page nears it; the checkbox sits near
  // the page's end, so the image is brought in first: the window below belongs to Send feedback alone.
  const wordmark = page.locator('footer.site-footer img').first();
  await wordmark.scrollIntoViewIfNeeded();
  await expect.poll(() => wordmark.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.waitForLoadState('networkidle');
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
  // Session AD (deliberate, ADR-026 F7): the footer's "Private security contact" lives here by that name. As strict: the same private address.
  await expect(section.getByRole('link', {name: 'Private security contact: hello@zigoals.app', exact: true})).toHaveAttribute('href', 'mailto:hello@zigoals.app');
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
  // Session AB-Cloud Part 10 (ADR-023 C31): three more, each checked by its words below (was 10).
  // Session AC (friends pack): three more again (was 13), each checked by its words and its link below.
  // Session AF (ADR-028, deliberate): two more (was 16), each checked by its words and its link below.
  await expect(items).toHaveCount(18);
  await expect(section).toContainText('The Checklist stays on this device: your path, your own items and the day history aren’t synced yet');
  await expect(section).toContainText('Ecosystem apps open in their own tab: ZIGoals shows their live numbers and steps but never frames their sites, and signs nothing for them');
  await expect(section.getByRole('link', {name: 'What is the Checklist?', exact: true})).toHaveAttribute('href', '#help-af-checklist');
  await expect(section.getByRole('link', {name: 'What is the Earn page?', exact: true})).toHaveAttribute('href', '#help-af-earn');
  await expect(section).toContainText('Safari on iPhone and iPad offers no Home Screen shortcuts and no Share sheet entry for ZIGoals');
  await expect(section).toContainText('Push notifications are switched off in this Alpha: nothing reaches your phone while ZIGoals is closed');
  await expect(section).toContainText('Your last backup isn’t recorded: Settings → Your data says “Not recorded”');
  await expect(section).toContainText('Goals count in US dollars or euros.');
  await expect(items.first()).toContainText('Accounts and sync aren’t open yet on alpha.zigoals.app.');
  // Session AF (ADR-028 H19): the bullet changed with native-staking signing (it was "No real money moves.").
  await expect(section).toContainText('Only staking moves ZIG, and only in your own wallet.');
  await expect(section).toContainText('ZIGoals never holds keys');
  await expect(section).toContainText('never zero');
  await expect(section).toContainText('Photos stay on the device where you added them; another device shows the goal’s colours.');
  await expect(section).toContainText('After a new vault key, your extras wait until the device that synced them last syncs once; nothing is lost meanwhile.');
  await expect(section).toContainText('Restore from a backup brings back your records and photos, not ZIGi’s chats or settings, notifications or a timer in progress.');
  for (const [name, href] of [['install ZIGoals', '#install'], ['Export everything', '/app/settings#export-everything'], ['ZIGi · Your Personal AI Companion', '#your-ai'], ['tell us', '#feedback'], ['Do my photos sync?', '#help-ab-photos'], ['Home Screen shortcuts and sharing', '#help-aa-home-screen'], ['Where are my reminders?', '#help-aa-reminders'], ['Your data', '#help-aa-data']] as const) await expect(section.getByRole('link', {name, exact: true})).toHaveAttribute('href', href);
  await section.getByRole('link', {name: 'tell us', exact: true}).click();
  await expect(page).toHaveURL(/#feedback$/);
});
