import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY} from '../lib/ai/settings';
import {ZIGI_KEY} from '../lib/ai/store/keys';
import manifest from '../components/zigi/manifest.json';

/**
 * Session V Part 12, "ZIGi alive", end to end: the launcher as one control (circle, a "Hide ZIGi" chevron centred below
 * it, the pill on the circle's centre line), the "Show ZIGi" edge tab outside the launcher's test id, Customize (side,
 * size, animation, greeting, edge tab) in the panel and in Settings, the idle breath and its stops, the optical centre
 * at every size and density, Meet ZIGi, and ZIGi's states following real events. No provider is involved.
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
async function seed(page: Page, extra: Record<string, unknown> = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const values = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]))};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
const launcher = (page: Page) => page.getByTestId('ai-launcher');
const openButton = (page: Page) => page.getByRole('button', {name: /Open ZIGi/});
const chevron = (page: Page) => page.getByRole('button', {name: 'Hide ZIGi', exact: true});
const edgeTab = (page: Page) => page.getByRole('button', {name: 'Show ZIGi', exact: true});
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
const figure = (page: Page) => page.locator('.ai-launcher-button .zigi img');
const stored = async (page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null') as Record<string, unknown> | null;
async function openChat(page: Page) { await openButton(page).click(); await expect(panel(page)).toBeVisible(); }
async function closeChat(page: Page) { await panel(page).getByRole('button', {name: 'Close ZIGi', exact: true}).click(); await expect(panel(page)).toHaveCount(0); }
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('one control: the chevron sits centred below the circle in a 44 px target; it hides ZIGi, and the edge tab brings it back', async ({page, isMobile}) => {
  await seed(page);
  await page.goto('/app');
  await expect(launcher(page)).toBeVisible();
  await expect(launcher(page).getByRole('button', {name: 'Hide ZIGi', exact: true})).toHaveCount(1);
  const [c, v] = await Promise.all([openButton(page).boundingBox(), chevron(page).boundingBox()]);
  expect(Math.abs((c!.x + c!.width / 2) - (v!.x + v!.width / 2))).toBeLessThanOrEqual(1);
  expect(v!.y).toBeGreaterThanOrEqual(c!.y + c!.height - 0.5);
  expect(v!.width).toBeGreaterThanOrEqual(44); expect(v!.height).toBeGreaterThanOrEqual(44);
  expect(c!.width).toBe(56); expect(c!.height).toBe(56);
  if (isMobile) { const tabs = (await page.locator('.phone-tabbar').boundingBox())!; expect(v!.y + v!.height).toBeLessThanOrEqual(tabs.y + 1); }
  await chevron(page).click();
  await expect(launcher(page)).toHaveCount(0);
  await expect(page.getByRole('status').filter({hasText: 'ZIGi is hidden'})).toContainText('Show it again from the tab at the edge of the screen');
  await expect(edgeTab(page)).toBeVisible();
  const t = (await edgeTab(page).boundingBox())!, viewport = page.viewportSize()!;
  expect(t.x + t.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(t.width).toBeGreaterThanOrEqual(44); expect(t.height).toBeGreaterThanOrEqual(44);
  if (isMobile) { const tabs = (await page.locator('.phone-tabbar').boundingBox())!; expect(t.y + t.height).toBeLessThanOrEqual(tabs.y + 1); }
  expect((await stored(page, AI_SETTINGS_KEY))?.launcherHidden).toBe(true);
  // Hidden stays hidden on the next visit, with the tab there to bring ZIGi back; the focus lands on ZIGi.
  await page.reload();
  await expect(edgeTab(page)).toBeVisible();
  await expect(launcher(page)).toHaveCount(0);
  await edgeTab(page).click();
  await expect(launcher(page)).toBeVisible();
  await expect(edgeTab(page)).toHaveCount(0);
  await expect(openButton(page)).toBeFocused();
  expect((await stored(page, AI_SETTINGS_KEY))?.launcherHidden).toBe(false);
});

test('keyboard and pointer: the chevron says what it does, and the edge tab works from the keyboard', async ({page, isMobile}) => {
  test.skip(isMobile, 'hover tooltips and keyboard focus are desktop behaviours');
  await seed(page);
  await page.goto('/app');
  await chevron(page).hover();
  await expect.poll(() => chevron(page).evaluate(el => getComputedStyle(el, '::after').opacity)).toBe('1');
  expect(await chevron(page).evaluate(el => getComputedStyle(el, '::after').content)).toBe('"Hide ZIGi"');
  await chevron(page).focus();
  await page.keyboard.press('Enter');
  await expect(launcher(page)).toHaveCount(0);
  await edgeTab(page).focus();
  await page.keyboard.press('Enter');
  await expect(openButton(page)).toBeFocused();
  // Undo still works as before.
  await chevron(page).click();
  await page.locator('.ai-launcher-toast').getByRole('button', {name: 'Undo'}).click();
  await expect(launcher(page)).toBeVisible();
  await expect(edgeTab(page)).toHaveCount(0);
});

test('with the edge tab off, a hidden ZIGi leaves nothing at the edge; a sensitive screen hides the tab as it hides ZIGi', async ({page}) => {
  await seed(page, {[ZIGI_KEY]: {version: 1, edgeTab: false}});
  await page.goto('/app');
  await chevron(page).click();
  await expect(launcher(page)).toHaveCount(0);
  await expect(page.getByRole('status').filter({hasText: 'ZIGi is hidden'})).toContainText('Show it again from Settings');
  await expect(edgeTab(page)).toHaveCount(0);
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, edgeTab: true})), ZIGI_KEY);
  await page.goto('/app/wealth?add=asset');
  await expect(page.locator('dialog.wealth-sheet[open]')).toBeVisible();
  await expect(edgeTab(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.wealth-sheet[open]')).toHaveCount(0);
  await expect(edgeTab(page)).toBeVisible();
});

test('Customize in the panel: side, size and animation apply at once and stay after a reload; Settings shows the same choices', async ({page, isMobile}) => {
  await seed(page);
  await page.goto('/app');
  await openChat(page);
  await panel(page).getByRole('button', {name: 'Customize ZIGi'}).click();
  const view = panel(page).getByRole('region', {name: 'Customize ZIGi'});
  await expect(view.getByRole('radio', {name: /^Calm/})).toBeChecked();
  await expect(view.getByRole('radio', {name: 'Right', exact: true})).toBeChecked();
  await expect(view.getByRole('radio', {name: 'Medium', exact: true})).toBeChecked();
  await expect(view.getByRole('radio', {name: 'Original', exact: true})).toBeChecked();
  await expect(view.getByText('Coming soon')).toHaveCount(manifest.comingSoon);
  await view.getByRole('radio', {name: 'Left', exact: true}).check();
  await view.getByRole('radio', {name: 'Large', exact: true}).check();
  await view.getByRole('radio', {name: /^Full/}).check();
  await view.getByRole('radio', {name: /^Quiet/}).check();
  expect(await stored(page, ZIGI_KEY)).toMatchObject({version: 1, side: 'left', size: 'l', animation: 'full', greeting: 'quiet'});
  await expect(page.locator('html')).toHaveAttribute('data-zigi-motion', 'full');
  await closeChat(page);
  const check = async () => {
    await expect(launcher(page)).toHaveAttribute('data-side', 'left');
    await expect(launcher(page)).toHaveAttribute('data-size', 'l');
    const box = (await openButton(page).boundingBox())!;
    expect(box.width).toBe(64); expect(box.x + box.width / 2).toBeLessThan(page.viewportSize()!.width / 2);
    // ZIGi on the left stays clear of the computer's sidebar.
    if (!isMobile) { const sidebar = (await page.locator('.app-sidebar').boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(sidebar.x + sidebar.width); }
  };
  await check();
  await page.reload();
  await check();
  await expect(page.locator('html')).toHaveAttribute('data-zigi-motion', 'full');
  // The panel opens on ZIGi's side too (a computer: the left of the content).
  if (!isMobile) { await openChat(page); const box = (await panel(page).boundingBox())!; expect(box.x + box.width / 2).toBeLessThan(page.viewportSize()!.width / 2); await closeChat(page); }
  await page.goto('/app/settings#zigi-look');
  const card = page.locator('#zigi-look');
  await expect(card).toHaveAttribute('open', '');
  await expect(card.getByRole('radio', {name: 'Left', exact: true})).toBeChecked();
  await expect(card.getByRole('radio', {name: 'Large', exact: true})).toBeChecked();
  await card.getByRole('radio', {name: 'Small', exact: true}).check();
  expect((await stored(page, ZIGI_KEY))?.size).toBe('s');
  // Settings keeps ZIGi away while its sign-in form shows; on Today the launcher is small at once.
  await page.goto('/app');
  await expect(launcher(page)).toHaveAttribute('data-size', 's');
  expect((await openButton(page).boundingBox())!.width).toBe(48);
});

test('motion: the idle clip plays while ZIGi waits (Calm by default, the CSS breath until it can), Full too, and the poster holds still with Off, Motion Off or reduced motion', async ({page}) => {
  await seed(page);
  await page.goto('/app');
  await expect(launcher(page)).toBeVisible();
  // Session X-Local Part 1 (assertion changed, listed in ADR-017): the Studio-2 idle clip breathes by itself. Until it
  // has decoded, the CSS breath runs on the poster; once it plays, the CSS move rests so nothing is animated twice.
  const clipPlays = async (file: string) => {
    await expect.poll(() => figure(page).evaluate(el => el.getAttribute('data-playing') !== null), {timeout: 10_000}).toBe(true);
    expect((await figure(page).evaluate(el => (el as HTMLImageElement).currentSrc)).split('/').pop()).toBe(file);
    expect(await figure(page).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  };
  // The poster is the 1× or the 2× still, by the screen's density (the phone project runs at 3×).
  const posterHolds = async (file: RegExp) => {
    await expect(figure(page)).not.toHaveAttribute('data-playing', '');
    expect((await figure(page).evaluate(el => (el as HTMLImageElement).currentSrc)).split('/').pop()).toMatch(file);
    expect(await figure(page).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  };
  expect(await figure(page).evaluate(el => /^(zigi-breath|none)$/.test(getComputedStyle(el).animationName))).toBe(true);
  expect(await openButton(page).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await clipPlays('F001-idle.anim.webp');
  const visit = async (zigi: Record<string, unknown>, motion: string | null = null) => {
    await page.evaluate(([k, z, m]) => { localStorage.setItem(k, z); if (m) localStorage.setItem('zigoals:motion:v1', m); else localStorage.removeItem('zigoals:motion:v1'); }, [ZIGI_KEY, JSON.stringify(zigi), motion] as const);
    await page.goto('/app');
    await expect(launcher(page)).toBeVisible();
  };
  await visit({version: 1, animation: 'full'});
  await clipPlays('F001-idle.anim.webp');
  await openChat(page);
  // The panel's head: the greeting clip (its own), or the CSS wave on the poster until it plays.
  const head = panel(page).locator('.ai-chat-head .zigi img');
  await expect.poll(() => head.evaluate(el => el.getAttribute('data-playing') !== null || /^zigi-(breath-panel-full|wave)$/.test(getComputedStyle(el).animationName)), {timeout: 10_000}).toBe(true);
  await visit({version: 1, animation: 'off'});
  await posterHolds(/^F001-idle(-2x)?\.webp$/);
  await openChat(page);
  await expect(head).not.toHaveAttribute('data-playing', '');
  expect(await head.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await visit({version: 1}, 'off');
  await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
  await posterHolds(/^F001-idle(-2x)?\.webp$/);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await visit({version: 1, animation: 'full'});
  await posterHolds(/^F001-idle(-2x)?\.webp$/);
});

test('idle that feels alive: under Full a variation plays now and then (never twice the same, an accent rarely), Calm keeps the base idle, typing and a hidden tab stop it', async ({page}) => {
  // Session X-Local Part 3. A fixed random number (a test-only session key) makes the picks exact: the first variation
  // is the accent (insight), the next a glance; the gap is the upper bound (60 s). The mocked clock is advanced in
  // steps and the figure watched at each, since the alive chunk's own start is not in step with this test.
  await seed(page, {[ZIGI_KEY]: {version: 1, animation: 'full'}});
  await page.evaluate(() => sessionStorage.setItem('zigoals:zigi:test-random', '0.999'));
  await page.goto('/app');
  await expect(launcher(page)).toBeVisible();
  const zigi = page.locator('.ai-launcher-button .zigi');
  const variant = () => zigi.evaluate(el => el.hasAttribute('data-variant'));
  const src = () => figure(page).evaluate(el => (el as HTMLImageElement).currentSrc.split('/').pop());
  /**
   * Advances the clock a second at a time until the figure shows (or stops showing) a variation; returns the file then.
   * The variation swaps the poster (with its srcset) for the clip in one render, and the browser reports the new file
   * only once it has selected it (CI run 38016733216 read "" in between), so the file is read once it is reported.
   */
  const advanceUntil = async (want: boolean, maxMs: number) => { for (let t = 0; t < maxMs; t += 1000) { if ((await variant()) === want) { await expect.poll(src).not.toBe(''); return src(); } await page.clock.runFor(1000); } return null; };
  const never = async (ms: number) => { for (let t = 0; t < ms; t += 1000) { expect(await variant(), `at +${t} ms`).toBe(false); await page.clock.runFor(1000); } };
  await expect.poll(() => figure(page).evaluate(el => el.getAttribute('data-playing') !== null), {timeout: 10_000}).toBe(true);
  expect(await variant()).toBe(false);
  // The first variation: the accent (insight), within one gap.
  const first = await advanceUntil(true, 65_000);
  expect(first).toMatch(/^F003-insight/);
  // It ends after its clip's length and the base idle is back.
  expect(await advanceUntil(false, 5000)).toMatch(/^F001-idle/);
  // The next is a glance, never the accent again so soon.
  const second = await advanceUntil(true, 65_000);
  expect(second).toMatch(/^(T001-thinking|F004-listening)/);
  await advanceUntil(false, 6000);
  // Typing in a text field stops it at once and keeps it away.
  await openChat(page);
  await advanceUntil(true, 65_000);
  await panel(page).getByLabel('Ask ZIGi about your records').pressSequentially('hi');
  expect(await variant()).toBe(false);
  await never(20_000);
  await closeChat(page);
  // A hidden tab stops it too, and nothing plays while hidden.
  expect(await advanceUntil(true, 70_000)).toBeTruthy();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {get: () => 'hidden', configurable: true}); document.dispatchEvent(new Event('visibilitychange')); });
  expect(await variant()).toBe(false);
  await never(70_000);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {get: () => 'visible', configurable: true}); document.dispatchEvent(new Event('visibilitychange')); });
  expect(await advanceUntil(true, 65_000)).toBeTruthy();
  // Calm: the base idle only, however long ZIGi waits.
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, animation: 'calm'})), ZIGI_KEY);
  await page.goto('/app');
  await expect(launcher(page)).toBeVisible();
  await expect.poll(() => figure(page).evaluate(el => el.getAttribute('data-playing') !== null), {timeout: 10_000}).toBe(true);
  await never(200_000);
  expect(await src()).toBe('F001-idle.anim.webp');
});

test('ZIGi sits on its optical centre at every size, at 1× and 2× pixel density', async ({browser, baseURL, isMobile}) => {
  test.skip(isMobile, 'the same CSS on a phone; measured once on the desktop project at both densities');
  const offset = manifest.skins['origami-nebula'].opticalOffset;
  for (const deviceScaleFactor of [1, 2]) for (const [size, circle] of [['s', 48], ['m', 56], ['l', 64]] as const) {
    const context = await browser.newContext({baseURL, deviceScaleFactor, reducedMotion: 'reduce', viewport: {width: 1280, height: 800}});
    const page = await context.newPage();
    await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
    await page.goto('/app/settings');
    await page.evaluate(([k, s]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, JSON.stringify({version: 1, size: s})); }, [ZIGI_KEY, size] as const);
    await page.goto('/app');
    await expect(launcher(page)).toBeVisible();
    // The figure's alpha-weighted centre, measured from the very file the browser chose for this density.
    const found = await page.evaluate(async () => {
      const button = document.querySelector('.ai-launcher-button')!, img = button.querySelector('img')!;
      await img.decode();
      const file = new Image(); file.src = img.currentSrc; await file.decode();
      const canvas = document.createElement('canvas'); canvas.width = file.naturalWidth; canvas.height = file.naturalHeight;
      const g = canvas.getContext('2d')!; g.drawImage(file, 0, 0);
      const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
      let sx = 0, sy = 0, sa = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) { const a = data[(y * canvas.width + x) * 4 + 3]!; sx += (x + 0.5) * a; sy += (y + 0.5) * a; sa += a; }
      const fx = sx / sa / canvas.width, fy = sy / sa / canvas.height, i = img.getBoundingClientRect(), b = button.getBoundingClientRect();
      return {file: img.currentSrc.split('/').pop(), fx, fy, width: b.width, dx: i.left + fx * i.width - (b.left + b.width / 2), dy: i.top + fy * i.height - (b.top + b.height / 2)};
    });
    const label = `${size} at ${deviceScaleFactor}×`;
    // Session X-Local Part 1 (assertion changed, listed in ADR-017): the idle art replaced the placeholder; under reduced
    // motion the poster shows, never the clip.
    expect(found.file, label).toBe(deviceScaleFactor === 1 ? 'F001-idle.webp' : 'F001-idle-2x.webp');
    expect(found.width, label).toBe(circle);
    expect(Math.abs(found.dx), `${label}: horizontal`).toBeLessThanOrEqual(0.75);
    expect(Math.abs(found.dy), `${label}: vertical`).toBeLessThanOrEqual(0.75);
    // The manifest's offset is the measured one (to a hundredth of the figure's box).
    expect(Math.abs(0.5 - found.fx - offset.x), label).toBeLessThanOrEqual(0.01);
    expect(Math.abs(0.5 - found.fy - offset.y), label).toBeLessThanOrEqual(0.01);
    await context.close();
  }
});

test('Meet ZIGi: every state with its code, reached from Customize and not from the navigation; nothing written on view', async ({page, isMobile}) => {
  await seed(page);
  // A new page load (seed leaves the browser on Settings, where a jump to the hash before the app has started can
  // lose the hash to the router's first write of the address).
  await page.goto('/app');
  await page.goto('/app/settings#zigi-look');
  await page.locator('#zigi-look').getByRole('link', {name: /Meet ZIGi/}).click();
  await expect(page).toHaveURL(/\/app\/zigi$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Meet ZIGi.'})).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const states = Object.values(manifest.states);
  await expect(page.locator('.meet-zigi-card')).toHaveCount(states.length);
  for (const state of states) await expect(page.getByRole('article', {name: state.label, exact: true})).toContainText(state.code);
  await expect(page.getByRole('button', {name: /^Play .* again$/})).toHaveCount(states.filter(s => s.kind === 'one-shot').length);
  await page.getByRole('button', {name: 'Play Celebrate again'}).click();
  await expect(page.getByRole('article', {name: 'Celebrate', exact: true}).locator('.zigi')).toHaveCount(3);
  await expect(page.locator('.app-nav a[href="/app/zigi"], .phone-tabbar a[href="/app/zigi"]')).toHaveCount(0);
  if (isMobile) {
    await expect(page.locator('.phone-topbar .phone-title')).toHaveText('Meet ZIGi');
    await expect(page.locator('.phone-topbar').getByRole('link', {name: 'Back to Settings'})).toBeVisible();
  }
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
});

test('Meet ZIGi in Showcase: the same page, nothing personal on it', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/zigi');
  await expect(page.getByRole('heading', {level: 1, name: 'Meet ZIGi.'})).toBeVisible();
  await expect(page.locator('.meet-zigi-card')).toHaveCount(Object.keys(manifest.states).length);
  await page.getByRole('radio', {name: /^Off/}).check();
  await expect(page.locator('html')).toHaveAttribute('data-zigi-motion', 'off');
  expect(await page.locator('.meet-zigi-card .zigi img').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  // Showcase choices stay in the tab: nothing of ZIGi's look lands in the device's own storage.
  expect(await page.evaluate(k => localStorage.getItem(k), ZIGI_KEY)).toBeNull();
});

test('ZIGi reacts to what happens: an answer on the device pleases it, a choice makes it curious, closing waves goodbye, then it rests', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  const state = page.locator('.ai-launcher-button');
  await expect(state).toHaveAttribute('data-state', 'idle');
  await openChat(page);
  await panel(page).getByLabel('Ask ZIGi about your records').fill('How many minutes did I meditate this month?');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  await expect(state).toHaveAttribute('data-state', 'success');
  await expect(panel(page).locator('.ai-chat-head .zigi')).toHaveAttribute('data-state', 'success');
  await expect(state).toHaveAttribute('data-state', 'idle', {timeout: 5000});
  // Session X-Local Part 4: reactions keep 8 s between them (the controller's rate limit); the clock is mocked.
  await page.clock.runFor(8500);
  await panel(page).getByLabel('Ask ZIGi about your records').fill('Help me plan a calmer week');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  await expect(state).toHaveAttribute('data-state', 'confused');
  await closeChat(page);
  await expect(state).toHaveAttribute('data-state', 'wave-goodbye');
  await expect(state).toHaveAttribute('data-state', 'idle', {timeout: 5000});
});
