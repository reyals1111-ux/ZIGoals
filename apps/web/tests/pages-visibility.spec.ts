import {expect, test, type Page} from '@playwright/test';
import {presetSettings} from '../lib/dashboard-settings';
import {AVAILABLE_BUTTONS, AVAILABLE_PAGES} from '../lib/pages/visibility';
import {isPhone, mainNav, openMore} from './phone-nav';

// Session W Part 2 (owner decision W4): Settings → "Your pages & buttons". Offline fixture; every network call answers 503.
const SETTINGS = 'zigoals:settings:v1', MIRROR = 'zigoals:pages-view:v1', AT = '2026-10-07T09:00:00.000Z';
const ALL = ['Today', 'Goals', 'Habits', 'Health', 'Wealth', 'Markets', 'Staking', 'Portfolio', 'Ecosystem', 'Activity', 'Settings'];
const pages = (hidden: string[], start?: string | null) => ({version: 1, items: Object.fromEntries(hidden.map(id => [id, {v: 'hidden', at: AT}])), ...(start !== undefined ? {start: {id: start, at: AT}} : {})});
const settingsWith = (p?: object) => ({...presetSettings('balanced'), onboarded: true, ...(p ? {schemaVersion: 3, pages: p} : {})});
async function seed(page: Page, records: Record<string, unknown>) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.addInitScript(values => {
    if (sessionStorage.getItem('pages-fixture')) return;
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem('zigoals:motion:v1', 'off');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('pages-fixture', '1');
  }, records);
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const navLabels = (page: Page) => mainNav(page).getByRole('link').allTextContents();
/** The sidebar on a larger screen; on a phone the tabs, then (opened) the More sheet's links after them. */
async function expectNav(page: Page, visible: string[]) {
  if (!await isPhone(page)) { await expect.poll(() => navLabels(page)).toEqual(visible); return; }
  const pagesOnly = visible.filter(label => label !== 'Settings');
  await expect.poll(() => navLabels(page)).toEqual(pagesOnly.slice(0, 4));
  await openMore(page);
  await expect.poll(() => navLabels(page)).toEqual([...pagesOnly.slice(0, 4), ...pagesOnly.slice(4), 'Settings']);
  await page.keyboard.press('Escape');
}
const section = (page: Page) => page.getByRole('region', {name: 'Your pages & buttons', exact: true});

test('hiding a page saves a stamped settings v3 choice; the navigation, preview and device mirror follow; showing it brings it back', async ({page}) => {
  await seed(page, {[SETTINGS]: settingsWith()});
  await page.goto('/app/settings');
  const card = section(page), goals = card.getByRole('switch', {name: 'Goals', exact: true});
  await expect(goals).toBeChecked();
  for (const name of ['Today', 'Habits', 'Health', 'Wealth', 'Markets', 'Staking', 'Portfolio', 'Ecosystem', 'Activity', 'Quick add', 'ZIGi button', 'Wealth shortcut on phones']) await expect(card.getByRole('switch', {name, exact: true})).toBeChecked();
  // Settings and Help have no switch (W4).
  await expect(card.getByRole('switch', {name: 'Settings'})).toHaveCount(0);
  expect(await page.evaluate(k => localStorage.getItem(k), MIRROR)).toBeNull();
  await goals.click();
  await expect(card.getByRole('status')).toHaveText('Goals is hidden. You can show it again here at any time.');
  await expect(goals).not.toBeChecked();
  const record = await stored(page, SETTINGS);
  expect(record.schemaVersion).toBe(3);
  expect(record.pages.items).toEqual({goals: {v: 'hidden', at: expect.stringMatching(/^20\d\d-\d\d-\d\dT/)}});
  await expectNav(page, ALL.filter(label => label !== 'Goals'));
  await expect(card.locator('.pages-preview .sr-only')).toContainText('Sidebar: Today, Habits, Health, Wealth, Markets');
  await expect(card.locator('.pages-preview .sr-only')).toContainText('Phone tab bar: Today, Habits, Health, Wealth, More');
  expect(await stored(page, MIRROR)).toEqual({version: 1, hidden: ['goals', 'chess', 'music']});
  await page.reload();
  await expectNav(page, ALL.filter(label => label !== 'Goals'));
  await section(page).getByRole('switch', {name: 'Goals', exact: true}).click();
  await expect(section(page).getByRole('status')).toHaveText('Goals shows again.');
  await expectNav(page, ALL);
  // Back at the defaults the mirror goes; the stamped choice stays so the newer choice wins between devices.
  expect(await page.evaluate(k => localStorage.getItem(k), MIRROR)).toBeNull();
  expect((await stored(page, SETTINGS)).pages.items.goals.v).toBe('shown');
});

test('only Habits and Health: the navigation, the phone tab bar and More rebuild, and a bare /app opens Habits', async ({page}) => {
  await seed(page, {[SETTINGS]: settingsWith(pages(['today', 'goals', 'wealth', 'markets', 'staking', 'portfolio', 'ecosystem', 'activity']))});
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/habits$/);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expectNav(page, ['Habits', 'Health', 'Settings']);
  if (await isPhone(page)) {
    await expect(page.locator('.phone-tabs')).toHaveAttribute('style', /--tab-count: 3/);
    // The Wealth shortcut follows the Wealth page.
    await expect(page.locator('.phone-wealth')).toHaveCount(0);
    await expect(page.locator('.phone-settings')).toBeVisible();
  }
  await expect(page.locator('a.brand')).toHaveAttribute('href', '/app/habits');
});

test('Today hidden: a bare /app replaces itself with the first visible page, the home link follows, and a deliberate link to Today offers to show it again', async ({page}) => {
  await seed(page, {[SETTINGS]: settingsWith(pages(['today'], null))});
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/goals$/);
  await expectNav(page, ALL.filter(label => label !== 'Today'));
  await expect(page.locator('a.brand')).toHaveAttribute('href', '/app/goals');
  if (await isPhone(page)) await expect(page.locator('a.phone-home')).toHaveAttribute('href', '/app/goals');
  // The move replaced /app in the history.
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
  // A link with a query is deliberate: Today shows, with the note.
  await page.goto('/app?from=link');
  await expect(page).toHaveURL(/\/app\?from=link$/);
  const note = page.getByRole('region', {name: 'Hidden page', exact: true});
  await expect(note).toContainText('This page is hidden — show it again');
  await note.getByRole('button', {name: 'Show it again: Today', exact: true}).click();
  await expect(note).toHaveCount(0);
  await expectNav(page, ALL);
  expect((await stored(page, SETTINGS)).pages.items.today).toEqual({v: 'shown', at: expect.any(String)});
});

test('every page hidden: ZIGoals opens on Settings; Settings and Help stay, and the phone keeps More', async ({page}) => {
  await seed(page, {[SETTINGS]: settingsWith(pages([...AVAILABLE_PAGES]))});
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expectNav(page, ['Settings']);
  if (await isPhone(page)) await expect(mainNav(page).getByRole('button', {name: 'More', exact: true})).toBeVisible();
  await page.goto('/app/help');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Hidden page'})).toHaveCount(0);
});

test('the start page: Health opens as a document load; choosing a page or "First visible page" saves a stamped choice', async ({page}) => {
  await seed(page, {[SETTINGS]: settingsWith(pages([], 'health'))});
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/health$/);
  // A document load, like every way into Health, so its camera permission holds (lib/health-navigation.ts).
  expect(await page.evaluate(() => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).name)).toMatch(/\/app\/health$/);
  await page.goto('/app/settings');
  const select = section(page).getByLabel('Start page', {exact: true});
  await expect(select).toHaveValue('health');
  await select.selectOption('goals');
  await expect(section(page).getByRole('status')).toHaveText('ZIGoals now opens on Goals.');
  expect((await stored(page, SETTINGS)).pages.start).toEqual({id: 'goals', at: expect.any(String)});
  await select.selectOption('');
  await expect(section(page).getByRole('status')).toHaveText('ZIGoals now opens on your first visible page.');
  expect((await stored(page, SETTINGS)).pages.start).toEqual({id: null, at: expect.any(String)});
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app$/);
});

test('"Show everything again" asks first: Cancel changes nothing; confirming shows every page and button', async ({page}) => {
  await seed(page, {[SETTINGS]: settingsWith(pages(['goals', 'markets', 'quick-add', 'zigi'], 'habits'))});
  await page.goto('/app/settings');
  const card = section(page), reset = card.getByRole('button', {name: 'Show everything again', exact: true});
  const before = await page.evaluate(k => localStorage.getItem(k), SETTINGS);
  await reset.click();
  const confirm = card.getByRole('group', {name: 'Show every page and button again? Your start page stays as it is.'});
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(reset).toBeFocused();
  expect(await page.evaluate(k => localStorage.getItem(k), SETTINGS)).toBe(before);
  await reset.click();
  await card.getByRole('button', {name: 'Show everything', exact: true}).click();
  await expect(card.getByRole('status')).toHaveText('Every page and button shows again.');
  const record = await stored(page, SETTINGS);
  for (const id of [...AVAILABLE_PAGES, ...AVAILABLE_BUTTONS]) expect(record.pages.items[id].v).toBe('shown');
  expect(record.pages.start.id).toBe('habits');
  await expectNav(page, ALL);
});

test('buttons: Quick add, the ZIGi button and the phone Wealth shortcut hide everywhere; switching ZIGi on brings it back', async ({page}) => {
  await seed(page, {[SETTINGS]: settingsWith(pages(['quick-add', 'zigi', 'wealth-shortcut']))});
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByRole('button', {name: '+ Quick add', exact: true})).toHaveCount(0);
  await expect(page.getByTestId('ai-launcher')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Show ZIGi', exact: true})).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog', {name: /ZIGi/})).toHaveCount(0);
  if (await isPhone(page)) { await expect(page.locator('.phone-wealth')).toHaveCount(0); await expect(page.locator('.phone-quick-add')).toHaveCount(0); }
  await page.goto('/app/settings');
  await section(page).getByRole('switch', {name: 'ZIGi button', exact: true}).click();
  await expect(section(page).getByRole('status')).toHaveText('ZIGi button shows again.');
  await section(page).getByRole('switch', {name: 'Quick add', exact: true}).click();
  // On a desktop the sidebar's Quick add is in the page but shown only at tablet width.
  await expect(page.locator('.quick-add-trigger').first()).toBeAttached();
  // Settings is one of ZIGi's sensitive screens (no button there by design); the next page shows it again.
  await page.goto('/app/goals');
  await expect(page.getByTestId('ai-launcher')).toBeVisible();
});

test('Showcase shows every page and keeps a choice in the tab, never in this device\'s storage', async ({page}) => {
  await seed(page, {});
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expectNav(page, ALL);
  await page.goto('/app/settings');
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  await section(page).getByRole('switch', {name: 'Activity', exact: true}).click();
  await expect(section(page)).toContainText('In Showcase these choices last for this tab only.');
  await expectNav(page, ALL.filter(label => label !== 'Activity'));
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
});

test('a focused navigation entry that disappears hands focus to the page', async ({page}) => {
  await seed(page, {[SETTINGS]: settingsWith()});
  await page.goto('/app/goals');
  test.skip(await isPhone(page), 'the sidebar is the larger screens\' navigation');
  const markets = mainNav(page).getByRole('link', {name: 'Markets', exact: true});
  await markets.focus();
  // Another device's choice arrives (written as account sync would, then announced like any module change).
  await page.evaluate(({key, value}) => { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new CustomEvent('zigoals:private-change', {detail: key})); }, {key: SETTINGS, value: settingsWith(pages(['markets']))});
  await expect(markets).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main');
});

// The settings that never finish opening (the private-read-delay fixture): the device mirror shapes the navigation from
// the first client render, so a hidden page does not show while the settings are still opening.
const VAULT = 'zigoals-private-vault-v1';
const MARKER = JSON.stringify({schemaVersion: 100, kind: 'zigoals-indexeddb-pointer', database: VAULT, protocol: 1});
test('while the settings are still opening, the device mirror already shapes the navigation', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.goto('/api/fixture-blank');
  await page.evaluate(async ({key, value, marker, vault, mirror}) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open(vault, 1); r.onupgradeneeded = () => { for (const s of ['headers', 'records', 'outbox', 'receipts', 'recovery']) r.result.createObjectStore(s); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const tx = db.transaction(['headers', 'records'], 'readwrite'), id = (...parts: string[]) => JSON.stringify(parts), fields: Record<string, unknown> = {}, arrays: Record<string, string[]> = {};
    for (const [field, item] of Object.entries(value)) {
      if (!Array.isArray(item)) { fields[field] = item; continue; }
      arrays[field] = item.map((row, index) => { const rowId = typeof row?.id === 'string' ? row.id : String(index); tx.objectStore('records').put(row, id('local', key, field, rowId)); return rowId; });
    }
    tx.objectStore('headers').put({revision: 1, fields, arrays}, id('local', key));
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close();
    localStorage.setItem(key, marker);
    localStorage.setItem('zigoals:pages-view:v1', JSON.stringify(mirror));
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
  }, {key: SETTINGS, value: settingsWith(pages(['goals'])), marker: MARKER, vault: VAULT, mirror: {version: 1, hidden: ['goals', 'chess', 'music']}});
  // Holds the vault's open requests until released, like a stalled browser request.
  await page.addInitScript(vault => {
    const open = IDBFactory.prototype.open, held: (() => void)[] = [];
    let hold = true;
    Object.assign(window, {__vault: {release() { hold = false; for (const next of held.splice(0)) next(); }}});
    IDBFactory.prototype.open = function (name: string, version?: number) {
      if (name !== vault || !hold) return open.call(this, name, version);
      const request: Record<string, unknown> = {onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null, result: undefined, transaction: null, error: null};
      const fire = (type: string, event: Event) => (request['on' + type] as ((e: Event) => void) | null)?.(event);
      held.push(() => { const real = open.call(indexedDB, name, version); real.onupgradeneeded = e => { request.result = real.result; request.transaction = real.transaction; fire('upgradeneeded', e); }; real.onsuccess = e => { request.result = real.result; fire('success', e); }; real.onerror = e => { request.error = real.error; fire('error', e); }; real.onblocked = e => fire('blocked', e); });
      return request as unknown as IDBOpenDBRequest;
    };
  }, VAULT);
  await page.goto('/app/habits');
  // Hydrated (the ZIGi button mounts on the client, inside the still hidden workspace), the settings still unopened.
  await expect(page.getByTestId('ai-launcher')).toBeAttached();
  await expect(page.locator('.workspace')).toHaveAttribute('aria-busy', 'true');
  const expected = ALL.filter(label => label !== 'Goals');
  if (await isPhone(page)) await expect.poll(() => navLabels(page)).toEqual(expected.slice(0, 4)); else await expect.poll(() => navLabels(page)).toEqual(expected);
  await page.evaluate(() => (window as unknown as {__vault: {release(): void}}).__vault.release());
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  if (await isPhone(page)) await expect.poll(() => navLabels(page)).toEqual(expected.slice(0, 4)); else await expect.poll(() => navLabels(page)).toEqual(expected);
});
