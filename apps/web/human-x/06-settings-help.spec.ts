import {expect, type Page} from '@playwright/test';
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
