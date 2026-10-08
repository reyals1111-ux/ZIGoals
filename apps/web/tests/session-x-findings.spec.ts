import {expect, test, type Locator, type Page} from '@playwright/test';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema, type Platform} from '../lib/positions';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {createHabit, emptyHabitData, HABITS_KEY} from '../lib/habits';
import {NUDGES} from '../lib/coach/copy';
import {addWater, dailyData, saveHealthPreferences} from '../lib/health-daily';

// Session X Part 14: what the human-style test (docs/verification/x-cloud/HUMAN_TEST.md) found in the app, kept fixed.
// Each test names its journey. Fictional records, every /api answered by a fixture unless the test says otherwise.
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('J047: an unknown goal in the Local Demo says it is not here, not "connect the wallet", with a way back', async ({page}) => {
  await page.goto('/app/goals/999999');
  await expect(page.getByRole('heading', {name: 'Goal unavailable.', exact: true})).toBeVisible();
  await expect(page.locator('main')).toContainText('This goal isn’t here: it may have been removed, or it was made in another browser.');
  await expect(page.locator('main')).not.toContainText('Connect the wallet');
  await expect(page.getByRole('link', {name: 'Back to goals', exact: true})).toHaveAttribute('href', '/app/goals');
});

const stored = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k)!) as Platform).goals[0]!, PLATFORM_KEY);
test('J054: a goal edited in two tabs keeps both changes: the second tab never writes back the name the first changed', async ({page, isMobile}) => {
  test.skip(isMobile, 'Two tabs on a computer; the form is the same on a phone.');
  const goal = privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', targetDate: '2026-12-30', notes: '', createdAt: '2026-06-01T09:00:00.000Z', milestones: []});
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [PLATFORM_KEY, JSON.stringify({...emptyPlatform(), goals: [goal]})]);
  const other = await page.context().newPage();
  for (const tab of [page, other]) { await tab.goto('/app/goals/tracked/7'); await tab.locator('#edit-goal > summary').click(); }
  await page.getByLabel('Edit Goal name').fill('Fictional reserve, renamed');
  await page.getByRole('button', {name: 'Save Goal details', exact: true}).click();
  await expect(other.getByRole('heading', {level: 1})).toHaveText('Fictional reserve, renamed');
  // The second tab's untouched name follows; its own change (the target) is saved beside the first tab's.
  await expect(other.getByLabel('Edit Goal name')).toHaveValue('Fictional reserve, renamed');
  await other.getByLabel('Edit target').fill('5000');
  await other.getByRole('button', {name: 'Save Goal details', exact: true}).click();
  await expect.poll(async () => (await stored(other)).target).toBe('500000');
  expect((await stored(other)).name).toBe('Fictional reserve, renamed');
});

test('J108: the barcode lookup offline says so in plain words, never the browser\'s "Failed to fetch"', async ({page}) => {
  await page.route('**/api/food-lookup?*', route => route.abort('internetdisconnected'));
  await page.goto('/app/health');
  await page.getByText('Scan or look up a food barcode', {exact: true}).click();
  const area = page.getByRole('region', {name: 'Barcode food lookup'});
  await area.getByLabel('Product barcode', {exact: true}).fill('00001234');
  await area.getByRole('button', {name: 'Look up barcode', exact: true}).click();
  await expect(area).toContainText('Food lookup is unavailable: this device looks offline. Your private food library still works.');
  await expect(area).not.toContainText('Failed to fetch');
});

test('J247–J249: Chess in the Showcase hydrates without React\'s mismatch error', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/chess');
  await expect(page.locator('main h1').first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
  // Still the Showcase's Chess: nothing can be added there.
  await expect(page.getByRole('form', {name: 'Add a rating goal'})).toHaveCount(0);
});

async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}

test('J154: in the Showcase, a coin it does not hold opens with the honest states, not a blank page', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await showcase(page);
  await page.goto('/app/portfolio/coin/usd-coin');
  await expect(page.getByRole('heading', {level: 1, name: 'USD Coin'})).toBeVisible();
  await expect(page.locator('main')).toContainText('Showcase: fixture prices and figures. These are not market data.');
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('J254: an address under /app with no page: a 404 inside the app, named in the tab, with the way back', async ({page}) => {
  const response = await page.goto('/app/no-such-page');
  expect(response!.status()).toBe(404);
  await expect(page.getByRole('heading', {level: 1, name: 'Page not found.'})).toBeVisible();
  await expect(page).toHaveTitle('Page not found · ZIGoals Alpha');
  await expect(page.getByRole('link', {name: 'Go to Today', exact: true})).toHaveAttribute('href', '/app');
  await expect(page.getByRole('link', {name: 'Open Help', exact: true})).toHaveAttribute('href', '/app/help');
  await expect(page.getByRole('navigation', {name: 'Main navigation'})).toBeAttached();
});

test('a page that fails while drawing shows the app\'s error page in the app, never a blank page', async ({page}) => {
  // The coin page is made to throw by replacing one of its strings in the served script (the test fails loudly if that
  // string ever moves). Before Session X, Next's own fallback wrote raw HTML, which Trusted Types refuses: a blank page.
  let patched = 0;
  await page.route('**/_next/static/chunks/*.js', async route => {
    const response = await route.fetch(), marker = '"Showcase: fixture prices and figures. These are not market data."';
    let body = await response.text();
    if (body.includes(marker)) { body = body.replace(marker, '(()=>{throw Error("a drawing failure for this test")})()'); patched++; }
    await route.fulfill({response, body});
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await showcase(page);
  await page.goto('/app/portfolio/coin/bitcoin');
  await expect(page.getByRole('heading', {level: 1, name: 'This page could not be shown.'})).toBeVisible();
  expect(patched).toBe(1);
  await expect(page.getByRole('alert', {name: 'This page could not be shown.'})).toContainText('Nothing was changed or lost');
  await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Go to Today', exact: true})).toHaveAttribute('href', '/app');
  expect(errors.filter(message => /TrustedHTML/.test(message))).toEqual([]);
});

test('J201: a Settings section link lands on its section and stays there while a section above loads', async ({page, isMobile}) => {
  test.skip(isMobile, 'The section links are the computer layout; phones use the grouped list (phone-pages).');
  await page.goto('/app/settings');
  await expect(page.locator('main h1').first()).toBeVisible();
  // At once, before ZIGi's settings (above Help & diagnostics) have loaded their body and grown.
  await page.getByRole('navigation', {name: 'Settings sections'}).getByRole('link', {name: 'Help & diagnostics', exact: true}).click();
  await expect(page).toHaveURL(/#settings-help$/);
  await expect(page.locator('#your-ai')).toContainText('Which setup fits me?');
  await page.waitForTimeout(1000);
  await expect(page.locator('#settings-help-title')).toBeInViewport();
});

test('J012: Customize Today at 1024 px: a hidden widget keeps a readable title and an Options button nothing covers', async ({page, isMobile}) => {
  test.skip(isMobile, 'A tablet-width computer layout.');
  await page.setViewportSize({width: 1024, height: 768});
  await showcase(page);
  await page.getByRole('button', {name: 'Customize Today', exact: true}).click();
  const widget = page.locator('.today-page .placed-module[data-kind="widget"]').first();
  await widget.getByRole('button', {name: /^Options for/}).click();
  await widget.getByRole('button', {name: 'Hide widget'}).click();
  await expect(widget).toHaveAttribute('data-hidden', 'true');
  const options = widget.getByRole('button', {name: /^Options for/});
  await options.evaluate(button => button.scrollIntoView({block: 'center'}));
  // What is under the middle of the Options button is the button itself, not the arrange controls.
  expect(await options.evaluate(button => { const r = button.getBoundingClientRect(); return button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); })).toBe(true);
  expect((await widget.locator('.dashboard-widget-heading h3').boundingBox())!.width).toBeGreaterThan(60);
  await options.click();
  await widget.getByRole('button', {name: 'Show widget'}).click();
  await expect(widget).not.toHaveAttribute('data-hidden', 'true');
});

// The words of an element's text that the browser drew across two lines (broken inside the word).
const brokenWords = (row: Locator) => row.evaluate(el => {
  const out: string[] = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) for (const word of node.textContent!.matchAll(/\S+/g)) {
    const range = document.createRange(); range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
    if (new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size > 1) out.push(word[0]);
  }
  return out;
});
test('first week, phone: a small widget\'s row on a new device\'s Today stays two across, its name never broken inside a word', async ({page, isMobile}) => {
  test.skip(!isMobile, 'The folded rows are the phone layout.');
  await page.goto('/app');
  const grid = page.getByRole('region', {name: 'Your Today widgets'}).locator('.dashboard-layout-grid');
  const compact = grid.locator('> .placed-module[data-kind="widget"][data-size="compact"]');
  await expect(compact.first().locator('.phone-fold-toggle')).toBeVisible();
  const width = (await grid.boundingBox())!.width, count = await compact.count();
  expect(count).toBeGreaterThan(1);
  for (let i = 0; i < count; i++) {
    const placed = compact.nth(i), row = placed.locator('.phone-fold-toggle');
    // Still two across (Today stays short), the chevron in view, and every word of the name on one line.
    expect((await placed.boundingBox())!.width).toBeLessThan(width * 0.6);
    await expect(row.locator('.phone-fold-hint svg')).toBeVisible();
    expect(await brokenWords(row)).toEqual([]);
  }
  // Opened, its row still breaks only between words.
  const first = compact.first(), row = first.locator('.phone-fold-toggle');
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(first.locator('article.dashboard-widget')).toBeVisible();
  expect(await brokenWords(row)).toEqual([]);
});

test('first week: Activity names its history in words, never a code like LOCAL_SIMULATION', async ({page}) => {
  await page.goto('/app/activity');
  await expect(page.locator('main')).toContainText('On this device · Local simulation history');
  await expect(page.locator('main')).not.toContainText(/LOCAL_SIMULATION|TESTNET_CHAIN/);
});

test('first week: Portfolio\'s favourites card on a new device is the styled card, not a bare grey button', async ({page}) => {
  await page.goto('/app/portfolio');
  const card = page.getByRole('region', {name: 'Favourite markets'}).getByRole('button', {name: /Your first favourite awaits/});
  await expect(card).toBeVisible();
  const style = await card.evaluate(el => { const s = getComputedStyle(el); return {border: s.borderTopStyle, image: s.backgroundImage, radius: s.borderTopLeftRadius}; });
  expect(style).toEqual({border: 'dashed', image: expect.stringContaining('linear-gradient'), radius: '22px'});
});

test('J055: a Goal created offline is saved, and the wizard says so instead of leaving for the browser\'s offline page', async ({page}) => {
  await page.goto('/app/goals/new');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.getByRole('alert').filter({hasText: 'You’re offline.'})).toBeVisible();
  await page.getByLabel('Goal name', {exact: true}).fill('Fictional offline plan');
  await page.getByRole('radio', {name: 'Value', exact: true}).check();
  await page.getByLabel('Target amount', {exact: true}).fill('640');
  await page.getByRole('radio', {name: /^USD · /}).check();
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  const saved = page.getByRole('status').filter({hasText: 'Your Goal is saved on this device. It opens when you’re back online'});
  await expect(saved).toBeVisible();
  expect(page.url()).toMatch(/\/app\/goals\/new$/);
  expect(await page.evaluate(k => (JSON.parse(localStorage.getItem(k)!) as Platform).goals.map(g => g.name), PLATFORM_KEY)).toEqual(['Fictional offline plan']);
  await page.context().setOffline(false);
  await saved.getByRole('link', {name: 'Open saved Goal →'}).click();
  await expect(page.getByRole('heading', {level: 1, name: 'Fictional offline plan'})).toBeVisible();
});

test('a link with a broken fragment (#%) still opens Settings, Ecosystem and Today, never the error page', async ({page}) => {
  // Session X P2.7 (security review, finding 4): decoding such a fragment threw inside an effect.
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/app/settings#%', '/app/ecosystem#%', '/app#%', '/app/wealth#%25%']) {
    await page.goto(path);
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.getByRole('alert').filter({hasText: 'This page could not be shown.'})).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('a traveller: Today\'s "Your week" ends on the day of the time zone their journal follows, as Habits and Health do', async ({page, isMobile}) => {
  test.skip(isMobile, 'The week strip counts the same on a phone; its days are folded there.');
  // The device is in Brussels at 23:30 on 7 October; the journal follows Asia/Tokyo, where it is already 06:30 on the 8th.
  await page.clock.install({time: new Date('2026-10-07T21:30:00Z')});
  await page.goto('/app/settings');
  const tokyo = saveHealthPreferences(createEmptyHealth(), {...dailyData(createEmptyHealth()).preferences, timezone: 'Asia/Tokyo'});
  const withWater = addWater(tokyo, {id: 'health_6b3c1a64-5f43-4f53-9d1e-7a0c2b9e1f10', date: '2026-10-08', amountMilli: 250_000, unit: 'ml'}, '2026-10-07T21:30:00.000Z');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [HEALTH_STORAGE_KEY, JSON.stringify(withWater)]);
  await page.goto('/app');
  const row = page.getByRole('group', {name: 'Health entries, last 7 days'});
  await expect(row.locator('li').last()).toContainText('8');
  await expect(row.locator('li').last()).toContainText('1');
  await expect(row.locator('li').last()).not.toContainText('—');
});

test('the Guide\'s "Open the review" lands on the weekly review card, opening "Show more" when it waits behind it', async ({page}) => {
  // Session X P2.6 (Help audit): the link pointed at an anchor that did not exist.
  await showcase(page);
  await page.goto('/app#for-you-weekly-review');
  const card = page.locator('#for-you-weekly-review');
  await expect(card).toBeVisible();
  await expect(card).toBeInViewport();
  expect(NUDGES.find(n => n.kind === 'review-ready')!.action!.href).toBe('/app#for-you-weekly-review');
});

test('the Guide\'s "Open habit" shows that habit even when today\'s filter would hide it, and scrolls to it', async ({page}) => {
  // Session X P2.6 (Help audit): a habit not due today was hidden by the "Today" filter, and nothing followed the link.
  await page.clock.install({time: new Date('2026-10-07T08:00:00Z')});
  const at = new Date('2026-10-01T08:00:00.000Z'), swimId = '5d9a6e2c-2b0f-4c41-9d6b-3e7a1f2c8b40';
  let habits = createHabit(emptyHabitData(), {title: 'Fictional daily walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, at);
  habits = createHabit(habits, {title: 'Fictional Sunday swim', category: 'Health', description: '', notes: '', schedule: {kind: 'weekdays', days: [0]}, measurement: {kind: 'boolean'}, target: 1}, at, swimId);
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [HABITS_KEY, JSON.stringify(habits)]);
  await page.goto(`/app/habits#habit-${swimId}`);
  const swim = page.locator(`#habit-${swimId}`);
  await expect(swim).toBeVisible();
  await expect(swim).toBeInViewport();
  await expect(page.getByRole('group', {name: 'Filter habits'}).getByRole('button', {name: 'All', exact: true})).toHaveAttribute('aria-pressed', 'true');
});

test('J249: Settings going offline right after it opens keeps working; a part that cannot load says so, never the error page', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await showcase(page);
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  // Offline before the parts that load on demand have arrived (ZIGi's settings load when the browser is idle).
  await page.context().setOffline(true);
  await expect(page.getByRole('alert').filter({hasText: 'You’re offline.'})).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.getByText('This page could not be shown.')).toHaveCount(0);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('#private-vault')).toBeVisible();
  const note = page.locator('.load-boundary');
  if (await note.count()) { await expect(note.first()).toContainText('needs a connection to open'); await expect(note.first().getByRole('button', {name: 'Reload'})).toBeDisabled(); }
  await page.context().setOffline(false);
  if (await note.count()) await expect(note.first().getByRole('button', {name: 'Reload'})).toBeEnabled();
  expect(errors.filter(e => !/ChunkLoadError|Failed to load chunk|Loading chunk/.test(e))).toEqual([]);
});
