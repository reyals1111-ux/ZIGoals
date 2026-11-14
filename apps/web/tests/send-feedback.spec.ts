import {expect, test, type Page} from '@playwright/test';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {ZIGI_KEY} from '../lib/ai/store/keys';
import {openSettings} from './settings-open';

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
  // Session AF Gate C (CI on bdd09e65): the footer's finale marks itself seen for the visit (a display-only session key)
  // once its stage is well in view, and that once came inside the window below; it is decided first, as the wordmark is.
  await page.locator('footer.site-footer .site-footer-stage').scrollIntoViewIfNeeded();
  await expect(page.locator('footer.site-footer')).toHaveAttribute('data-intro', /play|done/, {timeout: 15_000});
  await page.waitForLoadState('networkidle');
  // Session AK (ADR-036, deliberate; BUILD list 2 #1): the details box carries the secret guard, whose code and style
  // load on first use (lazy, so Help's route weight is unchanged). They are brought in first, as the wordmark and the
  // finale are; ticking and unticking here stores nothing, and the window below still allows no request at all.
  const box = section.getByRole('checkbox', {name: 'Add details about this device to the email', exact: true});
  const untouched = await storage(page);
  await box.check();
  await page.waitForLoadState('networkidle');
  await box.uncheck();
  expect(await body(page, section)).toBe(plain);
  expect(await storage(page)).toBe(untouched);
  const before = await storage(page), requests: string[] = [];
  page.on('request', request => requests.push(request.url()));

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
  await openSettings(page);
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
  // Session AF, at the ZIGi and extras merges (deliberate): three more (was 18), each checked by its words and link below.
  // Session AJ (ADR-035, deliberate): five more (was 21), each checked by its words below.
  // Session AK (ADR-036, deliberate): seven more (was 26), each checked by its words and its link below.
  // Owner decision 6 (ADR-036, deliberate): Earn's first load, accepted with its measurement (was 33), checked by its words.
  // Session AK Part 13 (ADR-036, deliberate): Studio-4's three "to polish later" items (was 34), each checked by its words.
  // Owner decision 7 (ADR-036, deliberate): ZIGi's box on Safari at the moment it opens (was 37), checked by its words.
  await expect(items).toHaveCount(38);
  await expect(section).toContainText('On Safari, words typed into ZIGi’s box at the very moment it opens might be lost');
  for (const words of ['ZIGi’s hide move, when you dismiss its knock, always leaves to the right', 'In a browser that can’t play animated WebP, ZIGi’s moves use a fallback at 12 frames a second', 'A few of ZIGi’s new moves aren’t used yet: its glances (at the chat box, at you, at something on the page) and its hello without walking in']) await expect(section).toContainText(words);
  await expect(section).toContainText('Earn takes a few seconds to settle on a slower phone: on a mid-range phone profile its first load kept the phone busy for about 3.9 seconds');
  for (const [words, name, href] of [
    ['Notifications on this device are being switched on', 'How do notifications on this device work?', '#help-ak-notify'],
    ['Barcode lookups and US foods need the food service too', 'What changed in food logging?', '#help-ak-food'],
    ['Reading a label or estimating a meal from a photo needs your own AI', 'Photos and food', '#help-ak-food'],
    ['Grocery ticks stay on this device', 'The grocery list', '#help-ak-nutrition'],
    ['staking with Keplr Mobile over WalletConnect hasn’t been tried on a real phone yet', 'Can I link a wallet on my phone?', '#help-ak-wallets'],
    ['Garmin workouts come in only as FIT files', 'Bring your data', '#help-ak-switch'],
    // Session AL (L6 third pass d920143b, deliberate; lib/search/help-whats-new.test.ts): the limit is about starting a game,
    // and blitz and bullet ratings still show.
    ['A new Lichess game started from ZIGoals is rapid or classical only', 'Can I play Lichess inside ZIGoals?', '#help-ak-chess'],
  ] as const) { await expect(section).toContainText(words); await expect(section.getByRole('link', {name, exact: true})).toHaveAttribute('href', href); }
  await expect(section).toContainText('the Finnish Fineli table isn’t in it yet');
  await expect(section).toContainText('It can travel as an optional, encrypted part of your sync once the sync service is updated.');
  for (const words of ['Price alerts check only while ZIGoals is open', 'A watched Bitcoin wallet shows its confirmed balance', 'Focus Sessions can’t block other apps', 'a run you import gets its pace and kilometre splits', 'The food search waits for its service']) await expect(section).toContainText(words);
  // Session AP (Part 6, deliberate): GPX/TCX runs now keep pace and splits, so the limit says what is still true (older runs keep their summary).
  await expect(section).toContainText('runs imported before keep their summary');
  await expect(section).toContainText('ZIGi never stakes, signs or moves money');
  await expect(section).toContainText('Timeline times stay on this device');
  await expect(section).toContainText('Add money opens the providers’ plain sites');
  await expect(section.getByRole('link', {name: 'How do I add money?', exact: true})).toHaveAttribute('href', '#help-af-add-money');
  await expect(section).toContainText('The Checklist stays on this device: your path, your own items and the day history aren’t synced yet');
  await expect(section).toContainText('Ecosystem apps open in their own tab: ZIGoals shows their live numbers and steps but never frames their sites, and signs nothing for them');
  await expect(section.getByRole('link', {name: 'What is the Checklist?', exact: true})).toHaveAttribute('href', '#help-af-checklist');
  await expect(section.getByRole('link', {name: 'What is the Earn page?', exact: true})).toHaveAttribute('href', '#help-af-earn');
  await expect(section).toContainText('Safari on iPhone and iPad offers no Home Screen shortcuts and no Share sheet entry for ZIGoals');
  // Session AF Gate C (design critique; deliberate, as strict): Help's two push lines say what the app does (opt-in, a
  // signed-in account), and still that nothing reaches a phone while ZIGoals is closed on this Alpha.
  // Session AK (demo-tour check): the account path and the device path (no account; being switched on) are told apart.
  await expect(section).toContainText('Push notifications through an account are opt-in and need a signed-in account, so on this Alpha, where accounts aren’t open yet, they reach no phone; notifications on this device need no account and are being switched on (below). Until then nothing reaches your phone while ZIGoals is closed');
  await expect(section).toContainText('Reminders when ZIGoals is closed are opt-in, one device at a time (Settings → Reminders when closed), and need a signed-in account');
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
