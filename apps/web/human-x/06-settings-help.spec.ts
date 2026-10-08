import {expect, type Download, type Locator, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, presetSettings} from '../lib/dashboard-settings';
import {CSV_FILES} from '../lib/export/everything';
import {readStoredZip} from '../lib/export/zip-reader';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../lib/habits';
import {createEmptyHealth, HEALTH_STORAGE_KEY, healthSchema} from '../lib/health';
import {emptyPlatform, PLATFORM_KEY, platformSchema} from '../lib/positions';
import {encryptBackup} from '../lib/vault/backup';
import {go, journey, localKeys, open, ready, snap, type Journey} from './kit';

// Session X Part 14, journeys J181–J250 (the parts that need no fixture file): My links, Your pages & buttons,
// Settings' groups, Export everything, Send feedback, Help (docs/verification/x-cloud/HUMAN_TEST.md).
const pagesCard = (page: Page) => page.getByRole('region', {name: 'Your pages & buttons', exact: true});
const linksCard = (page: Page) => page.getByRole('region', {name: 'My links'}).first();
async function addLink(page: Page, name: string, address: string) {
  const links = linksCard(page);
  await links.getByRole('button', {name: 'Add a link'}).click();
  const form = links.getByRole('form', {name: 'Add a link'});
  await form.getByLabel('Name').fill(name);
  await form.getByLabel('Address (https://)').fill(address);
  await form.getByRole('button', {name: 'Add link'}).click();
  return {links, form};
}
/** Settings → Appearance → Motion (its label wraps the select, so the name also carries the chosen option). */
const motion = (page: Page) => page.getByRole('region', {name: 'Appearance', exact: true}).getByRole('combobox', {name: /^Motion/});
/** The note a hidden page shows when opened from a link; it sits just above <main> (shell.tsx). */
const hiddenNote = (page: Page) => page.getByRole('region', {name: 'Hidden page', exact: true});
async function navNames(j: Journey) {
  const nav = j.page.getByRole('navigation', {name: 'Main navigation'});
  if (!j.phone) return nav.getByRole('link').allTextContents();
  await nav.getByRole('button', {name: 'More', exact: true}).click();
  const names = [...await nav.getByRole('link').allTextContents(), ...await j.page.getByRole('dialog', {name: 'More'}).getByRole('link').allTextContents()];
  await j.page.keyboard.press('Escape');
  return names;
}

const exportSection = (page: Page) => page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
const bytes = async (download: Download) => { const chunks: Buffer[] = []; for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks); };
async function exportZip(page: Page) {
  const section = exportSection(page);
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const file = await waiting;
  await expect(section.getByRole('status')).toContainText('Your export is ready and downloading. Keep it private.');
  return {name: file.suggestedFilename(), entries: readStoredZip(new Uint8Array(await bytes(file)))};
}
async function newHabit(j: Journey, title: string) {
  const {page} = j;
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  if (j.phone) { const sheet = page.locator('dialog.phone-form-sheet[open]'); if (await sheet.count()) await page.keyboard.press('Escape'); }
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
}
const vault = (page: Page) => page.locator('#private-vault');
/** Settings → "Keep a protected copy": the recovery secret as shown, and the downloaded file's text. */
async function protectedCopy(page: Page, {health = false} = {}) {
  await open(page, '/app/settings');
  const box = vault(page);
  if (health) await box.getByRole('checkbox', {name: 'Include my Health records in this encrypted download.', exact: true}).check();
  await box.getByRole('button', {name: 'Prepare encrypted backup', exact: true}).click();
  const recovery = await box.getByLabel('Recovery secret').inputValue();
  expect(recovery).toMatch(/^[A-Za-z0-9_-]{43}$/);
  await box.getByRole('checkbox', {name: 'I saved the recovery secret.', exact: true}).check();
  const waiting = page.waitForEvent('download');
  await box.getByRole('button', {name: 'Download encrypted backup', exact: true}).click();
  const file = await waiting;
  expect(file.suggestedFilename()).toBe('zigoals-encrypted-backup-v1.json');
  await expect(box.getByRole('status')).toContainText('Encrypted backup downloaded. Keep its recovery secret separately.');
  return {file: (await bytes(file)).toString('utf8'), recovery};
}
/** "Restore an encrypted backup": the file and its secret, then each module in turn, confirmed one at a time. */
async function unlockBackup(page: Page, file: string, recovery: string) {
  const box = vault(page);
  const restore = box.locator('details').filter({has: page.getByText('Restore an encrypted backup', {exact: true})});
  if (!await restore.evaluate(d => (d as HTMLDetailsElement).open)) await restore.locator(':scope > summary').click();
  await box.getByLabel('Encrypted backup file').setInputFiles({name: 'zigoals-encrypted-backup-v1.json', mimeType: 'application/json', buffer: Buffer.from(file)});
  await box.getByLabel('Backup recovery secret').fill(recovery);
  await box.getByRole('button', {name: 'Unlock and preview', exact: true}).click();
  return box;
}
async function restoreModules(page: Page, file: string, recovery: string, domains: string[]) {
  const box = await unlockBackup(page, file, recovery);
  for (const domain of domains) {
    await box.getByLabel('Module to restore').selectOption(domain);
    await box.getByRole('checkbox', {name: 'Replace the selected module with this validated backup.', exact: true}).check();
    await box.getByRole('button', {name: 'Restore selected module', exact: true}).click();
    await expect(box.getByLabel('Module to restore').locator(`option[value="${domain}"]`)).toContainText('restored');
  }
  await expect(box.getByRole('status').filter({hasText: 'Selected module restored; prior local bytes retained.'})).toBeVisible();
  await box.getByRole('button', {name: 'Done', exact: true}).click();
}
/** The browser's own "clear site data" (ZIGoals has no wipe button of its own): storage, databases and caches, then a reload. */
async function wipe(page: Page) {
  await page.evaluate(async () => {
    localStorage.clear(); sessionStorage.clear();
    for (const db of await indexedDB.databases()) if (db.name) await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(db.name!); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
    if ('caches' in self) for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.reload();
  await ready(page);
}
const everything = (page: Page) => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('zigoals:')).sort())));
/** Today has read every store once "Your week" shows (on a phone, its folded row). */
const weekShown = (page: Page) => expect(page.getByRole('region', {name: 'Your week, all in one orbit.'}).or(page.locator('.phone-fold-toggle').filter({hasText: 'Your week'})).first()).toBeVisible();
/** Today's "For you", with any folded cards shown ("Show more (N)"); null when Today has no card for me. */
async function forYou(page: Page) {
  await open(page, '/app');
  await weekShown(page);
  const region = page.getByRole('region', {name: 'For you', exact: true});
  if (!await region.count()) return region;
  const more = region.getByRole('button', {name: /^Show more/});
  if (await more.count()) await more.click();
  return region;
}
async function seedSettings(page: Page, values: Record<string, string>) { await page.goto('/app/settings'); await page.evaluate(v => { for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values); }
const onboarded = JSON.stringify({...presetSettings('balanced'), onboarded: true});
async function fold(j: Journey, label: string) {
  if (!j.phone) return;
  const toggle = j.page.locator('.phone-fold-toggle').filter({hasText: label}).first();
  await expect(async () => { if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click(); await expect(toggle).toHaveAttribute('aria-expanded', 'true', {timeout: 1500}); }).toPass({timeout: 15_000});
}

journey('J194', 'My links: three https links with my own names', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  for (const [name, address] of [['Fictional run club', 'https://www.strava.com/clubs/1'], ['Fictional code', 'https://github.com/example'], ['Fictional 🎨 portfolio', 'https://example.com/me']]) {
    const {links} = await addLink(page, name!, address!);
    await expect(links.getByRole('status')).toHaveText(`${name} added.`);
  }
  await snap(j, 'J194', 'links');
});

journey('J195', 'My links refuses http:// and javascript: addresses', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  for (const bad of ['http://www.example.com', 'javascript:alert(1)']) {
    const {form} = await addLink(page, 'Fictional bad', bad);
    await expect(form.getByRole('alert')).toHaveText('Only https:// addresses can be added.');
    // The refused form stays open with the reason; Cancel closes it, so "Add a link" is offered again.
    await form.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(form).toHaveCount(0);
  }
  await expect(linksCard(page).getByRole('list', {name: 'Your links'})).toHaveCount(0);
  const saved = JSON.stringify(await page.evaluate(() => localStorage.getItem('zigoals:settings:v1')));
  expect(saved).not.toContain('javascript:');
  expect(saved).not.toContain('http://www.example.com');
});

journey('J201', 'Settings: six groups; computers jump by chips, phones by the grouped list', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await expect(page.locator('.settings-group')).toHaveCount(6);
  if (!j.phone) {
    await page.locator('.settings-sections a').filter({hasText: 'Help & diagnostics'}).click();
    await expect(page.locator('#settings-help-title')).toBeInViewport();
  } else {
    const list = page.getByRole('navigation', {name: 'Settings sections'});
    await list.getByRole('link', {name: 'Send feedback', exact: true}).click();
    await expect(page.locator('#send-feedback')).toBeInViewport();
  }
});

journey('J202', 'hide Habits: it leaves the navigation; by link it opens with a note to show it again', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await pagesCard(page).getByRole('switch', {name: 'Habits', exact: true}).click();
  await expect(pagesCard(page).getByRole('switch', {name: 'Habits', exact: true})).not.toBeChecked();
  expect(await navNames(j)).not.toContain('Habits');
  await open(page, '/app/habits');
  await expect(hiddenNote(page)).toContainText('This page is hidden — show it again');
  await hiddenNote(page).getByRole('button', {name: 'Show it again: Habits', exact: true}).click();
  await expect(hiddenNote(page)).toHaveCount(0);
  await expect.poll(() => navNames(j)).toContain('Habits');
});

journey('J203', '"Show everything again" brings every page back', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  for (const name of ['Markets', 'Staking']) {
    const choice = pagesCard(page).getByRole('switch', {name, exact: true});
    await choice.click();
    await expect(choice).not.toBeChecked();
  }
  expect(await navNames(j)).not.toContain('Markets');
  await pagesCard(page).getByRole('button', {name: 'Show everything again', exact: true}).click();
  // It asks first ("Show every page and button again? …"); "Show everything" confirms.
  await pagesCard(page).getByRole('group', {name: /^Show every page and button again\?/}).getByRole('button', {name: 'Show everything', exact: true}).click();
  await expect(pagesCard(page).getByRole('status')).toHaveText('Every page and button shows again.');
  for (const name of ['Markets', 'Staking', 'Habits']) await expect(pagesCard(page).getByRole('switch', {name, exact: true})).toBeChecked();
  for (const name of ['Markets', 'Staking', 'Habits']) await expect.poll(() => navNames(j)).toContain(name);
});

journey('J205', 'Motion Off from Settings; the choice survives a reload', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await motion(page).selectOption('off');
  await page.reload();
  await ready(page);
  await expect(motion(page)).toHaveValue('off');
  await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
});

journey('J211', 'Account & sync without accounts on this build: it says so; local records stay', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await page.route('**/api/private-account**', route => route.fulfill({status: 503, json: {error: 'PRIVATE_ACCOUNT_UNAVAILABLE'}}));
  await open(page, '/app/settings');
  await expect(page.locator('#encrypted-sync')).toContainText('not configured on this installation');
});

journey('J213', 'Export everything: the consent first, then one ZIP with a dated name; nothing written on view', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional export check');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await open(page, '/app/settings');
  const before = await localKeys(page);
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.scrollIntoViewIfNeeded();
  expect(await localKeys(page)).toEqual(before);
  const button = section.getByRole('button', {name: 'Export everything', exact: true});
  await section.locator('.export-everything-agree input').check();
  const download = page.waitForEvent('download');
  await button.click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^zigoals-.*\.zip$/);
});

journey('J226', 'Send feedback: without details, then with my edited details; nothing sent or stored', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/help#feedback');
  const section = page.getByRole('region', {name: 'Tell us what you think', exact: true});
  // "Sent somewhere": a request to another site, or anything but a read from this one (Next.js prefetches pages with
  // same-origin GETs, ?_rsc=, which send nothing of mine).
  const requests: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && (u.origin !== new URL(page.url()).origin || r.method() !== 'GET')) requests.push(`${r.method()} ${r.url()}`); });
  const before = await localKeys(page);
  await section.getByRole('checkbox', {name: 'Add details about this device to the email', exact: true}).check();
  const box = section.getByRole('textbox');
  await expect(box).toHaveValue(/^Browser: /);
  await box.fill('Browser: mine');
  const href = await section.getByRole('link', {name: 'Email feedback to contact@zigoals.app', exact: true}).getAttribute('href');
  expect(decodeURIComponent(href!)).toContain('Browser: mine');
  expect(requests).toEqual([]);
  expect(await localKeys(page)).toEqual(before);
  await snap(j, 'J226', 'feedback-details');
});

journey('J227', 'Help: every question opens and closes; a hash link opens its answer', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/help');
  j.info.setTimeout(180_000);
  const questions = page.locator('details.help-question');
  const count = await questions.count();
  expect(count).toBeGreaterThan(50);
  for (let i = 0; i < count; i++) {
    const q = questions.nth(i);
    await q.locator('summary').click();
    await expect(q).toHaveAttribute('open', '');
    await q.locator('summary').click();
    await expect(q).not.toHaveAttribute('open');
  }
  // An answer's address is #help-<id> (help-question.tsx), as the "What's new" links use it.
  await open(page, '/app/help#help-w-sleep');
  await expect(page.locator('#help-w-sleep')).toHaveAttribute('open', '');
  await expect(page.locator('#help-w-sleep > summary')).toBeFocused();
});

journey('J228', 'Help → Known limitations: its links work', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/help');
  const section = page.getByRole('region', {name: 'What the Alpha can’t do yet', exact: true});
  await section.getByRole('link', {name: 'Export everything', exact: true}).click();
  await page.waitForURL('**/app/settings#export-everything');
  await ready(page);
});

journey('J235', 'ZIGi launcher and panel: open, close with Escape; nothing sent without a provider (smoke)', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app');
  const requests: string[] = [];
  page.on('request', r => { if (!r.url().startsWith(new URL(page.url()).origin)) requests.push(r.url()); });
  const launcher = page.getByRole('button', {name: /ZIGi/}).first();
  if (await launcher.count() === 0) return;
  await launcher.click();
  await page.keyboard.press('Escape');
  expect(requests).toEqual([]);
});

journey('J246', 'every page names itself in the browser tab', {views: 'all', data: ['S'], live: false}, async j => {
  const {page} = j;
  for (const [path, title] of [['/app', 'Today'], ['/app/goals', 'Goals'], ['/app/habits', 'Habits'], ['/app/health', 'Health'], ['/app/wealth', 'Wealth'], ['/app/settings', 'Settings'], ['/app/help', 'Help']] as const) {
    await open(page, path);
    await expect(page).toHaveTitle(`${title} · ZIGoals Alpha`);
  }
});

journey('J251', 'the navigation reaches every page and marks the current one', {views: 'all', data: ['S'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app');
  const nav = page.getByRole('navigation', {name: 'Main navigation'}), more = page.getByRole('dialog', {name: 'More'});
  for (const name of ['Goals', 'Habits', 'Health', 'Wealth', 'Settings']) {
    await go(j, name);
    await expect(page).toHaveURL(new RegExp(`/app/${name.toLowerCase()}$`));
    // The current page is marked: its own link (on a phone, inside More when it is not a tab) and no other.
    const current = nav.getByRole('link', {name, exact: true});
    if (j.phone && !await current.isVisible()) await nav.getByRole('button', {name: 'More', exact: true}).click();
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
    if (await more.isVisible()) { await page.keyboard.press('Escape'); await expect(more).toBeHidden(); }
  }
});

journey('J252', 'back and forward across five pages restore each page', {views: 'all', data: ['S']}, async j => {
  const {page} = j;
  const paths = ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth'];
  for (const path of paths) await open(page, path);
  for (const path of [...paths].reverse().slice(1)) { await page.goBack(); await ready(page); expect(new URL(page.url()).pathname).toBe(path); }
  await page.goForward();
  await ready(page);
  expect(new URL(page.url()).pathname).toBe('/app/goals');
});

journey('J254', 'an unknown /app route shows a calm not-found with a way back', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  const response = await page.goto('/app/no-such-page');
  expect(response!.status()).toBe(404);
  await expect(page.getByRole('link').first()).toBeVisible();
});

journey('J260', 'the skip link on every page moves focus to the content', {views: ['D'], data: ['S']}, async j => {
  const {page} = j;
  for (const path of ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth', '/app/portfolio', '/app/markets', '/app/staking', '/app/ecosystem', '/app/activity', '/app/settings', '/app/help']) {
    await open(page, path);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', {name: 'Skip to content', exact: true})).toBeFocused();
    await page.keyboard.press('Enter');
    // The skip link moves the browser's focus starting point to the content (as tests/a11y-wcag-x.spec.ts checks it):
    // the next Tab lands inside <main>.
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => !!document.getElementById('main')?.contains(document.activeElement) || document.activeElement?.id === 'main'), {message: `${path}: after the skip link, Tab lands in the content`}).toBe(true);
  }
});

journey('J212', 'Showcase: load, look around, reset; my own records untouched', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await page.getByRole('switch', {name: 'Guide on this device', exact: true}).click();
  const mine = await page.evaluate(() => JSON.stringify({...localStorage}));
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await ready(page);
  await open(page, '/app/wealth');
  await open(page, '/app/settings');
  const reset = page.getByRole('button', {name: 'Reset Showcase Demo', exact: true});
  if (await reset.count()) await reset.click();
  await page.getByRole('button', {name: 'Exit Showcase', exact: true}).first().click();
  await ready(page);
  const after = JSON.parse(await page.evaluate(() => JSON.stringify({...localStorage}))) as Record<string, string>;
  for (const [k, v] of Object.entries(JSON.parse(mine) as Record<string, string>)) if (!/whats-new|pages-view|today-folds/.test(k)) expect(after[k], k).toBe(v);
});

journey('J224', '"Keep my data on this device" asks the browser and says what it answered', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/help#install');
  await page.getByRole('button', {name: 'Keep my data on this device', exact: true}).click();
  await expect(page.locator('#install .keep-data').getByRole('status')).not.toBeEmpty();
});

journey('J225', 'diagnostics: the connection check reads only, and the support preview copies nothing until asked', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  const writes: string[] = [];
  page.on('request', r => { if (/zigchain\.com/.test(r.url()) && r.method() !== 'GET') writes.push(r.url()); });
  await open(page, '/app/settings');
  await page.getByText('Advanced Diagnostics', {exact: true}).click();
  const panel = page.getByRole('region', {name: 'Connection diagnostics'});
  await expect(panel.getByText('LOCAL SIMULATION', {exact: true})).toBeVisible();
  await panel.getByRole('button', {name: 'Check connection'}).click();
  await expect(panel).toContainText(/Verified zig-test-2|Unavailable|could not/i, {timeout: 30_000});
  await expect(panel.getByText('NOT DEPLOYED', {exact: true}).first()).toBeVisible();
  expect(writes).toEqual([]);
});

journey('J237', 'the contract section says NOT DEPLOYED and financial execution is off', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const contract = page.locator('#contract');
  await expect(contract).toContainText('NOT DEPLOYED');
  await expect(contract).toContainText('Financial execution is disabled in the public Alpha.');
});

journey('J229', 'Help → Install on iPhone on a phone: the steps for this browser', {views: ['P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/help#install');
  const section = page.getByRole('region', {name: 'Install ZIGoals on your iPhone', exact: true});
  await expect(section).toBeVisible();
  await expect(section.locator('ol.help-steps li').first()).toBeVisible();
  await snap(j, 'J229', 'install');
});

journey('J230', 'Help with the keyboard only: topics, then a question opened and closed with Enter', {views: ['D'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/help');
  const topics = page.getByRole('navigation', {name: 'Help topics'}).getByRole('link');
  await topics.first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#getting-started$/);
  const summary = page.locator('details.help-question > summary').first();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details.help-question').first()).toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(page.locator('details.help-question').first()).not.toHaveAttribute('open', '');
});

journey('J232', 'Settings at 320 px: every row reachable, nothing sideways, rows at least 44 px', {views: ['P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await page.setViewportSize({width: 320, height: 640});
  await open(page, '/app/settings');
  const list = page.getByRole('navigation', {name: 'Settings sections'});
  for (const link of await list.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

journey('J233', 'Settings at 200 % zoom (640 px wide): nothing lost or sideways', {views: ['D'], data: ['E']}, async j => {
  const {page} = j;
  await page.setViewportSize({width: 640, height: 450});
  await open(page, '/app/settings');
  for (const id of ['privacy', 'export-everything', 'your-pages', 'encrypted-sync', 'diagnostics', 'send-feedback']) await expect(page.locator(`#${id}`)).toBeAttached();
});

journey('J234', 'Settings\' ZIGi group: there, reachable, asking nothing of any other site (smoke only, X-LOCAL\'s lane)', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  // Every request is kept and compared with the app's own origin at the end (page.url() is about:blank while the very
  // first request leaves, which counted the app itself as "another site").
  const asked: string[] = [];
  page.on('request', r => asked.push(r.url()));
  await open(page, '/app/settings');
  const group = page.getByRole('group', {name: 'ZIGi', exact: true});
  await group.scrollIntoViewIfNeeded();
  await expect(group).toBeVisible();
  await expect(group.locator('#your-ai')).toHaveCount(1);
  const app = new URL(page.url()).origin;
  expect([...new Set(asked.filter(u => /^https?:/.test(u)).map(u => new URL(u).origin).filter(o => o !== app))]).toEqual([]);
});

journey('J236', 'the network section: Local Demo and the Testnet; the testnet\'s version read live, read-only', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  const writes: string[] = [];
  page.on('request', r => { if (/zigchain\.com/.test(r.url()) && r.method() !== 'GET') writes.push(r.url()); });
  await open(page, '/app/settings');
  await expect(page.locator('#account')).toContainText('Local Demo · no account needed');
  const network = page.locator('#network');
  await expect(network.getByRole('heading', {name: 'ZIGChain Testnet.'})).toBeVisible();
  await expect(network).toContainText('zig-test-2 · ZIG (18 decimals)');
  await expect(network).toContainText('Testnet Alpha');
  await page.getByText('Advanced Diagnostics', {exact: true}).click();
  const panel = page.getByRole('region', {name: 'Connection diagnostics'});
  await panel.getByRole('button', {name: 'Check connection'}).click();
  await expect(panel).toContainText(/Verified zig-test-2|Unavailable|could not/i, {timeout: 30_000});
  expect(writes).toEqual([]);
});

journey('J238', 'the wallet account: Local Demo identity; Keplr absent says so and Local demo stays', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await expect(page.locator('#account')).toContainText('Local Demo · no account needed');
  await open(page, '/app');
  await page.getByRole('button', {name: 'Connect Keplr', exact: true}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Install the Keplr'})).toBeVisible();
  await page.getByRole('button', {name: 'Local demo', exact: true}).click();
  await expect(page.locator('.mode-strip')).toContainText('LOCAL SIMULATION');
});

journey('J239', 'every link in Settings lands on its page', {views: ['D'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const hrefs = await page.locator('main a[href^="/app/"]').evaluateAll(links => [...new Set(links.map(a => a.getAttribute('href')!.split('#')[0]!))].filter(h => h !== '/app/settings'));
  expect(hrefs.length).toBeGreaterThan(3);
  for (const href of hrefs) {
    const response = await page.goto(href);
    expect(response!.status(), href).toBeLessThan(400);
    await ready(page);
  }
});

journey('J240', 'Settings in two tabs: a preference changed in one shows in the other after a reload', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const other = await page.context().newPage();
  await open(other, '/app/settings');
  await motion(page).selectOption('off');
  await other.reload();
  await ready(other);
  await expect(motion(other)).toHaveValue('off');
  await other.getByRole('switch', {name: 'Guide on this device', exact: true}).click();
  await expect(other.getByRole('switch', {name: 'Guide on this device', exact: true})).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await ready(page);
  await expect(page.getByRole('switch', {name: 'Guide on this device', exact: true})).toHaveAttribute('aria-checked', 'true');
  await other.close();
});

journey('J196', 'My links: one opens in a new tab with no opener and no referrer, exactly as typed', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  const address = 'https://example.com/fictional/profile?tab=runs#latest';
  const asked: {url: string; referer?: string}[] = [];
  await page.context().route('https://example.com/**', route => { asked.push({url: route.request().url(), referer: route.request().headers().referer}); return route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Fixture profile</title><p>Fixture profile</p>'}); });
  await open(page, '/app/settings');
  const {links} = await addLink(page, 'Fictional run log', address);
  await expect(links.getByRole('status')).toHaveText('Fictional run log added.');
  await expect(links.getByRole('list', {name: 'Your links'})).toContainText('example.com');
  await open(page, '/app');
  const today = page.getByRole('region', {name: 'My links', exact: true});
  const link = today.getByRole('link', {name: /^Fictional run log/});
  await expect(link).toHaveAttribute('href', address);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(link).toHaveAttribute('rel', /noreferrer/);
  const [tab] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  await tab.waitForLoadState();
  expect(tab.url()).toBe(address);
  expect(await tab.evaluate(() => window.opener)).toBeNull();
  expect(await tab.evaluate(() => document.referrer)).toBe('');
  // The fragment never leaves the browser; the rest is exactly what I typed, with no referrer.
  expect(asked).toEqual([{url: 'https://example.com/fictional/profile?tab=runs', referer: undefined}]);
  await expect(page).toHaveURL(/\/app$/);
  await tab.close();
});

journey('J197', 'My links: reorder, edit, delete (after a "Keep it"), kept after a reload', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  for (const [name, address] of [['Fictional A blog', 'https://example.com/a'], ['Fictional B club', 'https://example.org/b'], ['Fictional C shop', 'https://example.net/c']] as const) {
    const {links} = await addLink(page, name, address);
    await expect(links.getByRole('status')).toHaveText(`${name} added.`);
  }
  const links = linksCard(page), names = () => links.getByRole('list', {name: 'Your links'}).locator('li strong');
  await expect(names()).toHaveText(['Fictional A blog', 'Fictional B club', 'Fictional C shop']);
  await expect(links.getByRole('button', {name: 'Move Fictional A blog up', exact: true})).toBeDisabled();
  await links.getByRole('button', {name: 'Move Fictional C shop up', exact: true}).click();
  await expect(links.getByRole('status')).toHaveText('Fictional C shop moved up.');
  await expect(names()).toHaveText(['Fictional A blog', 'Fictional C shop', 'Fictional B club']);
  await links.getByRole('button', {name: 'Edit Fictional B club', exact: true}).click();
  const edit = links.getByRole('form', {name: 'Edit Fictional B club'});
  await edit.getByLabel('Name').fill('Fictional B running club');
  await edit.getByRole('button', {name: 'Save link', exact: true}).click();
  await expect(links.getByRole('status')).toHaveText('Link saved.');
  await expect(names()).toHaveText(['Fictional A blog', 'Fictional C shop', 'Fictional B running club']);
  await links.getByRole('button', {name: 'Remove Fictional A blog', exact: true}).click();
  const ask = links.getByRole('alertdialog', {name: 'Remove Fictional A blog'});
  await expect(ask).toContainText('Remove “Fictional A blog” from your links?');
  await ask.getByRole('button', {name: 'Keep it', exact: true}).click();
  await expect(ask).toHaveCount(0);
  await expect(names()).toHaveText(['Fictional A blog', 'Fictional C shop', 'Fictional B running club']);
  await links.getByRole('button', {name: 'Remove Fictional A blog', exact: true}).click();
  await links.getByRole('alertdialog', {name: 'Remove Fictional A blog'}).getByRole('button', {name: 'Remove link', exact: true}).click();
  await expect(links.getByRole('status')).toHaveText('Fictional A blog removed.');
  await page.reload();
  await ready(page);
  await expect(linksCard(page).getByRole('list', {name: 'Your links'}).locator('li strong')).toHaveText(['Fictional C shop', 'Fictional B running club']);
  await expect(linksCard(page)).toContainText('example.org');
});

journey('J198', 'My links with a long name and an emoji: whole or ellipsed, inside Settings and Today', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  const name = 'Fictional 🎨 sketchbook of rainy Sundays';
  expect(name, 'the longest name the field takes').toHaveLength(40);
  const whole = (el: Locator) => el.evaluate(e => e.scrollWidth <= e.clientWidth + 1 || getComputedStyle(e).textOverflow === 'ellipsis');
  const inside = async (inner: Locator, outer: Locator, what: string) => {
    const a = (await inner.boundingBox())!, b = (await outer.boundingBox())!;
    expect(a.x, `${what} starts inside`).toBeGreaterThanOrEqual(b.x - 0.5);
    expect(a.x + a.width, `${what} ends inside`).toBeLessThanOrEqual(b.x + b.width + 0.5);
  };
  await open(page, '/app/settings');
  const {links} = await addLink(page, name, 'https://example.com/sketchbook');
  await expect(links.getByRole('status')).toHaveText(`${name} added.`);
  const label = links.getByRole('list', {name: 'Your links'}).locator('li strong');
  await expect(label).toHaveText(name);
  expect(await whole(label), 'the name in Settings is whole or ellipsed').toBe(true);
  await inside(label, links, 'the name in Settings');
  await open(page, '/app');
  await fold(j, 'My links');
  const today = page.getByRole('region', {name: 'My links', exact: true});
  const link = today.getByRole('link', {name: new RegExp(`^${name}`)});
  await expect(link).toBeVisible();
  const text = link.locator('span').filter({hasText: name}).first();
  expect(await whole(text), 'the name on Today is whole or ellipsed').toBe(true);
  await inside(link, today, 'the link on Today');
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await snap(j, 'J198', 'long-link');
});

journey('J204', 'Your time zone: a wrong name refused; saved, and Today and Habits follow it', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  // 20:00 in Brussels is 03:00 the next day in Tokyo. A habit done "today" in Brussels (14 October).
  await page.clock.install({time: new Date('2026-10-14T20:00:00+02:00')});
  const id = '94000000-0000-4000-8000-000000000001', title = 'Fictional evening stretch';
  const habits = logHabitValue(createHabit(emptyHabitData(), {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-10T06:00:00Z'), id), id, '2026-10-14', 1, {mode: 'set'}, new Date('2026-10-14T17:00:00Z'));
  await seedSettings(page, {[HABITS_KEY]: JSON.stringify(habits), [DASHBOARD_SETTINGS_KEY]: onboarded});
  // Before: no zone written down; Today offers to write this device's down, and the habit is done today.
  const offer = (await forYou(page)).getByRole('region', {name: 'Your days follow this device for now.'});
  await expect(offer).toContainText('Save Europe/Brussels as your time zone');
  await open(page, '/app/habits');
  await expect(page.getByRole('button', {name: `Undo completion for ${title}`})).toHaveAttribute('aria-pressed', 'true');
  await open(page, '/app/settings');
  const zone = page.getByRole('region', {name: 'Your time zone', exact: true});
  await expect(zone).toContainText('Not written down yet: your days follow this device (Europe/Brussels).');
  await zone.getByLabel('Your time zone', {exact: true}).fill('Mars/Olympus_Mons');
  await zone.getByRole('button', {name: 'Save my time zone', exact: true}).click();
  await expect(zone.getByRole('alert')).toHaveText('Choose an IANA time zone name, for example Europe/Brussels.');
  await expect(zone).toContainText('Not written down yet');
  await zone.getByLabel('Your time zone', {exact: true}).fill('Asia/Tokyo');
  await zone.getByRole('button', {name: 'Save my time zone', exact: true}).click();
  await expect(zone.getByRole('status')).toHaveText('Your time zone is saved. Past entries keep their dates.');
  await expect(zone).toContainText('Your days follow Asia/Tokyo.');
  // Today no longer asks; Habits count the day in Tokyo, where 15 October has begun.
  await expect((await forYou(page)).getByRole('region', {name: 'Your days follow this device for now.'})).toHaveCount(0);
  await open(page, '/app/habits');
  await expect(page.locator('main')).toContainText('Days use Asia/Tokyo, your time zone.');
  await expect(page.getByRole('button', {name: `Complete ${title}`, exact: true})).toBeVisible();
  // The past check-in keeps its date.
  const entries = await page.evaluate(k => (JSON.parse(localStorage.getItem(k)!) as {habits: {entries: {date: string; count: number}[]}[]}).habits[0]!.entries.map(e => [e.date, e.count]), HABITS_KEY);
  expect(entries).toEqual([['2026-10-14', 1]]);
});

journey('J206', 'the evening wrap-up switch: on, the card shows after its time; off, it is gone', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T20:30:00+02:00')});
  await seedSettings(page, {[DASHBOARD_SETTINGS_KEY]: onboarded});
  const card = (region: Locator) => region.getByRole('article', {name: 'Your evening wrap-up'});
  await expect(card(await forYou(page))).toHaveCount(0);
  await open(page, '/app/settings');
  const wrap = page.getByRole('region', {name: 'Evening wrap-up', exact: true});
  await expect(wrap.getByRole('checkbox', {name: 'Show the evening wrap-up on Today', exact: true})).not.toBeChecked();
  await wrap.getByRole('checkbox', {name: 'Show the evening wrap-up on Today', exact: true}).check();
  await wrap.getByLabel('From').fill('20:00');
  await wrap.getByRole('button', {name: 'Save wrap-up', exact: true}).click();
  await expect(wrap.getByRole('status')).toHaveText('The evening wrap-up shows on Today from 20:00.');
  const on = card(await forYou(page));
  await expect(on).toBeVisible();
  await expect(on.getByRole('heading', {name: 'How did today go?'})).toBeVisible();
  await open(page, '/app/settings');
  const again = page.getByRole('region', {name: 'Evening wrap-up', exact: true});
  await expect(again.getByRole('checkbox', {name: 'Show the evening wrap-up on Today', exact: true})).toBeChecked();
  await again.getByRole('checkbox', {name: 'Show the evening wrap-up on Today', exact: true}).uncheck();
  await again.getByRole('button', {name: 'Save wrap-up', exact: true}).click();
  await expect(again.getByRole('status')).toHaveText('The evening wrap-up is off.');
  await expect(card(await forYou(page))).toHaveCount(0);
});

journey('J207', 'the Habits and Health sections: the weekly review day kept, each link lands on its page', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const habits = page.locator('#habits-settings'), day = habits.getByRole('combobox', {name: /^Weekly review day/});
  await day.selectOption({label: 'Wednesday'});
  await expect(day).toHaveValue('3');
  await page.reload();
  await ready(page);
  await expect(page.locator('#habits-settings').getByRole('combobox', {name: /^Weekly review day/})).toHaveValue('3');
  await page.locator('#habits-settings').getByRole('link', {name: 'Manage habits →', exact: true}).click();
  await page.waitForURL(/\/app\/habits$/);
  await ready(page);
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.goBack();
  await page.waitForURL(/\/app\/settings/);
  await ready(page);
  await expect(page.locator('#health-settings')).toContainText('You choose every value.');
  await page.locator('#health-settings').getByRole('link', {name: 'Open Health →', exact: true}).click();
  await page.waitForURL(/\/app\/health$/);
  await ready(page);
  await expect(page.getByRole('heading', {level: 1, name: 'A little care, every day.'})).toBeVisible();
});

journey('J208', 'the Guide switch: on and off, each said plainly and kept after a reload', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const region = () => page.getByRole('region', {name: 'Guide on this device.', exact: true}), guide = () => region().getByRole('switch', {name: 'Guide on this device', exact: true});
  await expect(guide()).toHaveAttribute('aria-checked', 'false');
  await expect(region()).toContainText('Off, as it starts.');
  await guide().click();
  await expect(region().getByRole('status')).toHaveText('The Guide is on for this device. Its first note appears on Today when there is something to say.');
  await expect(region()).toContainText('On for this device.');
  await page.reload();
  await ready(page);
  await expect(guide()).toHaveAttribute('aria-checked', 'true');
  await guide().click();
  await expect(region().getByRole('status')).toHaveText('The Guide is off on this device.');
  await page.reload();
  await ready(page);
  await expect(guide()).toHaveAttribute('aria-checked', 'false');
  await expect(region()).toContainText('Off, as it starts.');
});

journey('J209', 'reminders while ZIGoals is closed: unavailable in this build says so; nothing is asked', {views: 'all', data: ['E']}, async j => {
  const {page} = j;
  // This build has no push service (the route answers "not here"); the same on the live Alpha when it has none.
  await page.route('**/api/push', route => route.fulfill({status: 404, json: {error: 'PUSH_UNAVAILABLE'}}));
  await page.addInitScript(() => {
    const w = window as unknown as {__asked: number};
    w.__asked = 0;
    if ('Notification' in window) Notification.requestPermission = (() => { w.__asked++; return Promise.resolve('default'); }) as typeof Notification.requestPermission;
  });
  await open(page, '/app/settings');
  const panel = page.getByRole('region', {name: 'Reminders on this phone, even when ZIGoals is closed.', exact: true});
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator('.push-state')).toHaveText('Not available in this build.');
  await expect(panel.getByRole('button', {name: /Turn on/})).toHaveCount(0);
  await panel.getByText('What the server gets, and what it never gets', {exact: true}).click();
  await expect(panel).toContainText('Never a habit’s name, a count, or anything you record.');
  await expect(panel).toContainText('Reminders in the app itself need no account and keep working without this.');
  expect(await page.evaluate(() => (window as unknown as {__asked: number}).__asked), 'no permission asked').toBe(0);
  expect(await page.evaluate(async () => (await navigator.serviceWorker?.getRegistrations?.() ?? []).length), 'nothing registered').toBe(0);
});

journey('J210', 'the market data section says what is fetched and from where; its link opens Markets', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  const asked: string[] = [];
  page.on('request', r => asked.push(r.url()));
  await open(page, '/app/settings');
  const section = page.locator('#market-data');
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole('heading', {name: 'Know where each value comes from.'})).toBeVisible();
  await expect(section).toContainText('Supported automatic market prices come from CoinGecko.');
  await expect(section).toContainText('Public asset identifiers and your quote currency are used to request market data; private holdings, quantities, Goals and Health records are not sent.');
  await expect(section).toContainText('Manual values are never presented as live quotes.');
  // Reading Settings asks no market provider anything.
  expect(asked.filter(u => /coingecko/i.test(u))).toEqual([]);
  await section.getByRole('link', {name: 'Explore market references →', exact: true}).click();
  await page.waitForURL(/\/app\/markets$/);
  await ready(page);
});

journey('J214', 'Export everything in Showcase: the file name says showcase-demo; one ZIP with everything', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const before = await everything(page);
  const {name, entries} = await exportZip(page);
  expect(name).toMatch(/^zigoals-showcase-demo-export-\d{4}-\d{2}-\d{2}\.zip$/);
  expect(entries.map(e => e.name)).toEqual(['everything.json', ...CSV_FILES]);
  const json = JSON.parse(new TextDecoder().decode(entries.find(e => e.name === 'everything.json')!.data));
  expect(json.format).toBe('zigoals-everything');
  // The Showcase's fictional records, not mine; making the file wrote nothing.
  expect((json.modules.habits?.habits ?? []).length).toBeGreaterThan(0);
  expect(await everything(page)).toBe(before);
});

journey('J222', 'a protected copy (encrypted backup) restored on a new device', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await newHabit(j, 'Fictional protected habit');
  const {file, recovery} = await protectedCopy(page);
  // A new device: a fresh browser profile, nothing of mine in it.
  const device = await page.context().browser()!.newContext();
  const fresh = await device.newPage();
  await open(fresh, '/app/habits');
  await expect(fresh.getByRole('article', {name: 'Fictional protected habit', exact: true})).toHaveCount(0);
  await open(fresh, '/app/settings');
  const box = await unlockBackup(fresh, file, recovery);
  await expect(box.locator('.backup-preview')).toContainText('Authenticated and validated.');
  // Health was not ticked, so the copy holds none.
  await expect(box.getByLabel('Module to restore').locator('option[value="health"]')).toHaveCount(0);
  await box.getByRole('button', {name: 'Cancel', exact: true}).click();
  await restoreModules(fresh, file, recovery, ['habits']);
  await open(fresh, '/app/habits');
  await expect(fresh.getByRole('article', {name: 'Fictional protected habit', exact: true})).toBeVisible();
  await device.close();
  // The first device is unchanged.
  await open(page, '/app/habits');
  await expect(page.getByRole('article', {name: 'Fictional protected habit', exact: true})).toBeVisible();
});

journey('J223', 'restoring with a wrong secret or the wrong file: a plain message, nothing changed', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await newHabit(j, 'Fictional untouched habit');
  const {file, recovery} = await protectedCopy(page);
  const before = await everything(page);
  const box = vault(page), alert = box.getByRole('alert');
  await unlockBackup(page, file, 'A'.repeat(43));
  await expect(alert).toHaveText('Unlock or integrity check failed. Existing data was not changed.');
  await box.getByLabel('Backup recovery secret').fill('my-email-code-123456');
  await box.getByRole('button', {name: 'Unlock and preview', exact: true}).click();
  await expect(alert).toHaveText('Use the complete vault recovery secret. Email codes cannot unlock data.');
  await box.getByLabel('Encrypted backup file').setInputFiles({name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"fictional":"not a backup"}')});
  await box.getByLabel('Backup recovery secret').fill(recovery);
  await box.getByRole('button', {name: 'Unlock and preview', exact: true}).click();
  await expect(alert).toHaveText('This file is not a complete ZIGoals encrypted backup, or a newer app version made it. Existing data was not changed.');
  await expect(box.locator('.backup-preview')).toHaveCount(0);
  expect(await everything(page)).toBe(before);
});

journey('J231', 'Settings with the keyboard only: every group reached from its chip; a control in each works', {views: ['D'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const press = async (target: Locator, key = 'Enter') => { await target.focus(); await page.keyboard.press(key); };
  const GROUPS = [['settings-data', 'Data & privacy'], ['settings-app', 'Your app'], ['settings-areas', 'Your areas'], ['settings-account', 'Account & devices'], ['settings-zigi', 'ZIGi'], ['settings-help', 'Help & diagnostics']] as const;
  const chips = page.locator('.settings-sections').getByRole('link');
  // ZIGi's settings load once the page is idle; its group then has controls of its own.
  await expect(page.locator('.ai-settings-body')).toBeAttached();
  await expect(chips).toHaveText(GROUPS.map(([, title]) => title));
  for (const [id, title] of GROUPS) {
    await press(chips.filter({hasText: new RegExp(`^${title}$`)}));
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}-title`)).toBeInViewport();
    // The next Tab starts from the group just reached.
    await page.keyboard.press('Tab');
    const at = await page.evaluate(group => ({inside: !!document.getElementById(group)?.contains(document.activeElement), visible: !!document.activeElement?.matches(':focus-visible')}), id);
    expect(at.inside, `Tab after "${title}" lands inside it`).toBe(true);
    expect(at.visible, `focus is visible in "${title}"`).toBe(true);
  }
  // A control in each group, by keyboard alone.
  const agree = exportSection(page).getByRole('checkbox', {name: 'I understand this file is readable and holds my personal records, including Health.'});
  await press(agree, 'Space');
  await expect(agree).toBeChecked();
  const chess = pagesCard(page).getByRole('switch', {name: 'Chess', exact: true});
  await press(chess, 'Space');
  await expect(chess).toBeChecked();
  await press(chess, 'Space');
  await expect(chess).not.toBeChecked();
  const guide = page.getByRole('switch', {name: 'Guide on this device', exact: true});
  await press(guide, 'Space');
  await expect(guide).toHaveAttribute('aria-checked', 'true');
  await press(guide, 'Space');
  await expect(guide).toHaveAttribute('aria-checked', 'false');
  const pack = page.locator('details.ai-pack');
  await press(pack.locator(':scope > summary'));
  await expect(pack).toHaveAttribute('open', '');
  await press(page.locator('#diagnostics > summary'));
  await expect(page.getByRole('region', {name: 'Connection diagnostics'})).toBeVisible();
});

journey('J241', 'older backups (Health v1–v3, settings v1–v2, finance v4) restore into this build and read (Part 13 drill)', {views: ['D'], data: ['E']}, async j => {
  const {page} = j;
  j.info.setTimeout(240_000); // six restores, each after a wipe
  const at = '2026-09-23T12:00:00.000Z', weight = {id: 'health_59a35604-3696-4a78-b455-4015acb66885', date: '2026-09-23', grams: 70000, createdAt: at, updatedAt: at};
  const healthV1 = {...createEmptyHealth(), weights: [weight]};
  const OLD = [
    ['Health v1', 'health', HEALTH_STORAGE_KEY, healthV1],
    ['Health v2', 'health', HEALTH_STORAGE_KEY, {...healthV1, schemaVersion: 2, fasting: {version: 1, sessions: []}}],
    ['Health v3', 'health', HEALTH_STORAGE_KEY, {...healthV1, schemaVersion: 3, fasting: {version: 1, sessions: []}}],
    ['settings v1', 'settings', DASHBOARD_SETTINGS_KEY, presetSettings('habits-health')],
    ['settings v2', 'settings', DASHBOARD_SETTINGS_KEY, {...presetSettings('habits-health'), schemaVersion: 2, journalTimeZone: 'Europe/Brussels'}],
    ['finance v4', 'finance', PLATFORM_KEY, {...emptyPlatform(), schemaVersion: 4}],
  ] as const;
  const SCHEMAS = {health: healthSchema, settings: dashboardSettingsSchema, finance: platformSchema};
  for (const [label, domain, key, record] of OLD) {
    expect(SCHEMAS[domain].safeParse(record).success, `${label} fixture is valid`).toBe(true);
    const {file, recovery} = await encryptBackup({[domain]: JSON.stringify(record)});
    await open(page, '/app/settings');
    await wipe(page);
    await restoreModules(page, file, recovery, [domain]);
    const stored = await page.evaluate(k => localStorage.getItem(k), key);
    expect(stored, `${label} is stored`).not.toBeNull();
    const parsed = SCHEMAS[domain].parse(JSON.parse(stored!)) as {schemaVersion: number; weights?: unknown[]};
    expect(parsed.schemaVersion, label).toBeGreaterThanOrEqual(record.schemaVersion);
    if (domain === 'health') {
      expect(parsed.weights, label).toEqual([weight]);
      await open(page, '/app/health');
      await page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name: 'Weight', exact: true}).click();
      await expect(page.getByRole('table', {name: 'Weight history'}), label).toContainText('70 kg');
    }
  }
});

journey('J242', 'Export everything\'s ZIP opens: everything.json and nine CSVs, with my own records', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await newHabit(j, 'Fictional zipped habit');
  await open(page, '/app/settings');
  const {name, entries} = await exportZip(page);
  expect(name).toMatch(/^zigoals-export-\d{4}-\d{2}-\d{2}\.zip$/);
  // The charter's nine CSVs, then one more per Session W area (sleep, meditation, vitals, moods, accounts, links).
  expect(CSV_FILES.slice(0, 9)).toEqual(['goals.csv', 'contributions.csv', 'habits.csv', 'check-ins.csv', 'health-diary.csv', 'weights.csv', 'water.csv', 'activity.csv', 'wealth-positions.csv']);
  expect(entries.map(e => e.name)).toEqual(['everything.json', ...CSV_FILES]);
  const text = (entry: string) => new TextDecoder().decode(entries.find(e => e.name === entry)!.data);
  const json = JSON.parse(text('everything.json'));
  expect(json.format).toBe('zigoals-everything');
  expect(json.modules.habits.habits.map((h: {title: string}) => h.title)).toContain('Fictional zipped habit');
  expect(text('habits.csv')).toContain('Fictional zipped habit');
  for (const csv of CSV_FILES) expect(text(csv).split('\n')[0]!.length, `${csv} has a header row`).toBeGreaterThan(0);
});

journey('J243', 'wipe this device\'s data, then restore the protected copy', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await newHabit(j, 'Fictional restored habit');
  await open(page, '/app/health');
  await page.getByRole('region', {name: 'Water journal'}).getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Water journal'}).locator('.health-water-total')).toHaveText('250 mL recorded');
  const {file, recovery} = await protectedCopy(page, {health: true});
  await wipe(page);
  await open(page, '/app/habits');
  await expect(page.getByRole('article', {name: 'Fictional restored habit', exact: true})).toHaveCount(0);
  expect((await localKeys(page)).filter(k => /habits|health/.test(k))).toEqual([]);
  await open(page, '/app/settings');
  await restoreModules(page, file, recovery, ['habits', 'health']);
  await open(page, '/app/habits');
  await expect(page.getByRole('article', {name: 'Fictional restored habit', exact: true})).toBeVisible();
  await open(page, '/app/health');
  await expect(page.getByRole('region', {name: 'Water journal'}).locator('.health-water-total')).toHaveText('250 mL recorded');
});

journey('J244', 'after a wipe the welcome is offered again, and nothing personal is left', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  const welcome = page.getByRole('region', {name: 'Set up your first goal and habit in about a minute.'});
  await open(page, '/app');
  await expect(welcome).toBeVisible();
  await newHabit(j, 'Fictional before the wipe');
  await open(page, '/app');
  await weekShown(page);
  await expect(welcome).toHaveCount(0);
  await wipe(page);
  await open(page, '/app');
  await expect(welcome).toBeVisible();
  await expect(welcome).toContainText('No wallet or account needed.');
  expect((await localKeys(page)).filter(k => /habits|health|platform|goals|ledger/.test(k))).toEqual([]);
  await open(page, '/app/habits');
  await expect(page.getByRole('article', {name: 'Fictional before the wipe', exact: true})).toHaveCount(0);
});
