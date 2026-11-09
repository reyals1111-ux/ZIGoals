import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from '../../ah-helpers';
import {applyTheme} from '../../p6-helpers';
import {goal, seedGoals} from '../goals/goal-fixtures';

/**
 * Session AL final fix pass, the shared shell (docs/review/session-al/GROK53_REPLAY_SHELL_3.md, STILL OPEN rows). Each test
 * names the ids it closes and replays them at the replay's width and theme; fresh profile unless named, /api answering 503.
 */
test.beforeEach(async ({page}) => { await offlineApi(page); });
const desktopOnly = (isMobile: boolean) => test.skip(isMobile, 'A computer window');

async function ready(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('main h1').first()).toBeVisible();
}
/** WCAG relative-luminance contrast of two rgb()/rgba() colours, the first composited over the second (installed on every
 *  page as `window.__contrast`; an init script, so the page's CSP never sees an eval). */
type Rgba = [number, number, number, number];
type ContrastKit = {parse(c: string): Rgba; over(a: Rgba, b: Rgba): Rgba; ratio(fg: Rgba, bg: Rgba): number; ground(el: Element | null): Rgba; colours(v: string): Rgba[]};
function installContrast() {
  const parse = (c: string): Rgba => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return [0, 0, 0, 0]; const p = m[1]!.split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0]!, p[1]!, p[2]!, p.length > 3 ? p[3]! : 1]; };
  const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c: Rgba) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const over = (a: Rgba, b: Rgba): Rgba => [a[0] * a[3] + b[0] * (1 - a[3]), a[1] * a[3] + b[1] * (1 - a[3]), a[2] * a[3] + b[2] * (1 - a[3]), 1];
  const ground = (el: Element | null): Rgba => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0.95) return c; } return [255, 255, 255, 1]; };
  const ratio = (fg: Rgba, bg: Rgba) => { const a = lum(over(fg, bg)), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const colours = (v: string) => (v.match(/rgba?\([^)]+\)/g) ?? []).map(parse);
  (window as unknown as {__contrast: ContrastKit}).__contrast = {parse, over, ratio, ground, colours};
}
test.beforeEach(async ({page}) => { await page.addInitScript(installContrast); });

// ---- AL-LAUNCHER-OVERLAP-001: D-064, D-161, D-157, D-158, D-138, D-137, D-162 ----
const LAUNCHERS = '[data-testid="ai-launcher"], .ai-edge-tab, .music-launcher-stack, .music-edge-tab, .checklist-launcher-stack, .checklist-edge-tab, .earn-dock-stack, .earn-dock-edge';
/** The replay's P1 sweep: the page scrolled in 0.6-window steps; at each step the centre and right edge of every button,
 *  link, field, select and summary in main is hit-tested; a hit counts when the topmost element is inside a launcher. */
function coveredControls(page: Page) {
  return page.evaluate(async launchers => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const hits = new Set<string>();
    const n = Math.min(40, Math.ceil(document.documentElement.scrollHeight / (innerHeight * 0.6)) + 1);
    for (let i = 0; i < n; i++) {
      scrollTo(0, i * innerHeight * 0.6); await sleep(90);
      for (const el of document.querySelectorAll('main button, main a[href], main input, main select, main textarea, main summary, main [role=tab]')) {
        const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.top < 0 || r.bottom > innerHeight) continue;
        for (const [x, y] of [[r.left + r.width / 2, r.top + r.height / 2], [r.right - 3, r.top + r.height / 2]]) {
          if (document.elementFromPoint(x!, y!)?.closest(launchers)) hits.add((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40));
        }
      }
    }
    scrollTo(0, 0);
    return {launchers: [...document.querySelectorAll(launchers)].filter(e => e.getBoundingClientRect().width > 0).length, hits: [...hits]};
  }, LAUNCHERS);
}
const LAUNCHER_PAGES = ['/app/health', '/app/health?view=weight', '/app/markets', '/app/ecosystem', '/app/chess', '/app/habits', '/app/settings'] as const;
for (const width of [960, 1097] as const)
  test(`D-064, D-161, D-157, D-158, D-138, D-137, D-162 (AL-LAUNCHER-OVERLAP-001, O3): at ${width} px no control is ever under a launcher, mid-scroll`, async ({page, isMobile}) => {
    desktopOnly(isMobile);
    test.setTimeout(180_000);
    await page.setViewportSize({width, height: 900});
    await freshDevice(page);
    for (const path of LAUNCHER_PAGES) {
      await ready(page, path);
      // O3: on a computer the launchers keep their places (ZIGi and the Checklist on a new device).
      await expect(page.getByTestId('ai-launcher')).toBeVisible();
      await expect(page.locator('.checklist-launcher-stack')).toBeVisible();
      const found = await coveredControls(page);
      expect(found.launchers, `${width} ${path}: the launchers are measured`).toBeGreaterThanOrEqual(2);
      expect(found.hits, `${width} ${path}: controls under a launcher`).toEqual([]);
    }
  });
test('D-158 (AL-LAUNCHER-OVERLAP-001): Chess with the Showcase ratings at 960 and 1097 px, nothing under the launchers', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  test.setTimeout(120_000);
  await page.setViewportSize({width: 960, height: 900});
  await loadShowcase(page);
  for (const width of [960, 1097]) {
    await page.setViewportSize({width, height: 900});
    await ready(page, '/app/chess');
    const found = await coveredControls(page);
    expect(found.launchers).toBeGreaterThanOrEqual(2);
    expect(found.hits, `${width}: controls under a launcher`).toEqual([]);
  }
});

// ---- N-NB-24 ----
test('N-NB-24 (AL-LAUNCHER-OVERLAP-001): Quick add’s Preview is drawn as the app’s secondary button, with an edge (300 px)', async ({page}) => {
  await page.setViewportSize({width: 300, height: 700});
  await freshDevice(page);
  await ready(page, '/app');
  await page.getByRole('button', {name: /quick add/i}).first().click();
  const field = page.getByRole('textbox', {name: 'Type a line'});
  await field.fill('drank 2 glasses of water');
  const preview = page.getByRole('button', {name: 'Preview', exact: true});
  await expect(preview).toBeEnabled();
  await expect(preview).toHaveClass(/\bsecondary\b/);
  const look = await preview.evaluate(el => { const s = getComputedStyle(el); return {width: parseFloat(s.borderTopWidth), edge: s.borderTopColor, style: s.borderTopStyle}; });
  expect(look.width).toBeGreaterThanOrEqual(1);
  expect(look.style).not.toBe('none');
  expect(look.edge).not.toMatch(/rgba\([^)]*,\s*0\)|transparent/);
});

// ---- AL-NAV-012 / AL-THEME-004 / AL-THEME-005 / AL-MOTION-002 / AL-LAYOUT-DESKTOP-017 ----
test('DV-029b, DV-051b: the sidebar\u2019s theme switch has words, and each choice applies (1280 px)', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  // Session AL final pass: the bar's place (D-063, LS-H34, D-179, NB-075, DV-029a: below the fold at 800 px) is carried as an
  // owner call; a sticky bar would sit over the O4 Apps group.
  await page.setViewportSize({width: 1280, height: 800});
  await freshDevice(page);
  await ready(page, '/app');
  const group = page.locator('aside.app-sidebar').getByRole('radiogroup', {name: 'Theme'});
  for (const [name, word] of [['Light theme', 'Light'], ['Nebula theme', 'Nebula'], ['Dark theme', 'Dark']] as const) await expect(group.getByRole('radio', {name, exact: true})).toHaveText(word);
  await expect(group.getByRole('radio', {name: 'Nebula theme'})).toHaveAttribute('aria-checked', 'true');
  await group.getByRole('radio', {name: 'Light theme'}).scrollIntoViewIfNeeded();
  await group.getByRole('radio', {name: 'Light theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(group.getByRole('radio', {name: 'Light theme'})).toHaveAttribute('aria-checked', 'true');
});

// ---- Light non-text contrast: BN-137, NB-031, N-MO-08, MO-090 / BUG-046 ----
test('BN-137 (AL-THEME-004): by day the Game layer rocket is 3:1 or more on its tile (768 px, Governance)', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await applyTheme(page, 'light');
  await page.setViewportSize({width: 768, height: 900});
  await freshDevice(page);
  await ready(page, '/app/governance');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const trigger = page.locator('.gamify-trigger');
  await expect(trigger).toBeVisible();
  const worst = await trigger.evaluate(el => {
    const C = (window as unknown as {__contrast: ContrastKit}).__contrast, page = C.ground(el.parentElement);
    // Each of the tile's colours as painted: over its own fill, then over the page (a translucent glass shows the page).
    const fill = C.over(C.parse(getComputedStyle(el).backgroundColor), page);
    const tile = C.colours(getComputedStyle(el).backgroundImage).map(t => C.over(t, fill));
    const stops = [...el.querySelectorAll('stop')].map(s => C.parse(getComputedStyle(s).stopColor));
    let min = Infinity; for (const s of stops) for (const t of tile.length ? tile : [fill]) min = Math.min(min, C.ratio(s, t));
    return {min, stops: stops.length};
  });
  expect(worst.stops).toBe(3);
  expect(worst.min).toBeGreaterThanOrEqual(3);
});
test('NB-031 (AL-THEME-006): by day a switch that is off shows its track (3:1 on the card) and its knob (3:1 on the track)', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await applyTheme(page, 'light');
  await page.setViewportSize({width: 1280, height: 900});
  await freshDevice(page);
  await ready(page, '/app/settings');
  const cycle = page.locator('#your-pages').getByRole('switch', {name: 'Cycle log'});
  await cycle.scrollIntoViewIfNeeded();
  await expect(cycle).not.toBeChecked();
  const r = await cycle.evaluate(el => {
    const C = (window as unknown as {__contrast: ContrastKit}).__contrast, track = C.parse(getComputedStyle(el).backgroundColor), knob = C.parse(getComputedStyle(el, '::before').backgroundColor), card = C.ground(el.parentElement);
    return {track: C.ratio(track, card), knob: C.ratio(knob, track)};
  });
  expect(r.track).toBeGreaterThanOrEqual(3);
  expect(r.knob).toBeGreaterThanOrEqual(3);
});
test('N-MO-08, MO-090, BUG-046 (AL-THEME-007): by day the water ring’s track is 3:1 on its card; Insights’ links stay underlined and 3:1 on the page (Showcase, 1280)', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  test.setTimeout(90_000);
  await applyTheme(page, 'light');
  await page.setViewportSize({width: 1280, height: 900});
  await loadShowcase(page);
  await ready(page, '/app/health');
  // Every ring's empty track on the page (the water ring's among them), as painted on the ground under it.
  await expect(page.locator('.glass-ring-track').first()).toBeAttached();
  const rings = await page.evaluate(() => {
    const C = (window as unknown as {__contrast: ContrastKit}).__contrast;
    return [...document.querySelectorAll('main .glass-ring-track')].filter(t => !t.closest('.today-hero, .stake-hero, .checklist-timer-ring')).map(t => C.ratio(C.parse(getComputedStyle(t).stroke), C.ground(t.parentElement)));
  });
  expect(rings.length).toBeGreaterThan(0);
  for (const ring of rings) expect(ring, 'a ring track on its ground').toBeGreaterThanOrEqual(3);
  await ready(page, '/app/health?view=insights');
  const links = page.locator('main a.text-link').filter({hasText: /Backup|Devices|Settings/});
  await expect(links.first()).toBeVisible();
  for (const link of await links.all()) {
    const l = await link.evaluate(el => { const C = (window as unknown as {__contrast: ContrastKit}).__contrast, s = getComputedStyle(el); return {line: s.textDecorationLine, ratio: C.ratio(C.parse(s.color), C.ground(el))}; });
    expect(l.line).toContain('underline');
    expect(l.ratio).toBeGreaterThanOrEqual(3);
  }
});

// ---- DV-031b ----
test('DV-031b (AL-THEME-003): a leading 🎯 in a goal’s name keeps its own colours by day, not a black disc (1280, Light)', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await applyTheme(page, 'light');
  await page.setViewportSize({width: 1280, height: 900});
  await seedGoals(page, [goal('81', {name: '🎯 Replay trip', target: '137800'})], '/app/goals/tracked/81');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const title = page.locator('main h1').first();
  await expect(title).toContainText('Replay trip');
  const emoji = title.locator('.nebula-flow-emoji');
  await expect(emoji).toHaveText('🎯');
  expect(await emoji.evaluate(el => getComputedStyle(el).webkitTextFillColor)).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  // The painted glyph has the target's own red (a black disc has none).
  const shot = await emoji.screenshot();
  const red = await page.evaluate(async b64 => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d')!; x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i]! > 170 && d[i + 1]! < 110 && d[i + 2]! < 110) n++;
    return n;
  }, shot.toString('base64'));
  expect(red, 'red pixels in the 🎯').toBeGreaterThan(10);
});

// ---- NB-028 ----
test.describe('NB-028 (AL-NAV-010): the Checklist entry is in the sidebar from the first paint', () => {
  test.use({javaScriptEnabled: false});
  test('the server’s HTML lists it before Settings, so nothing moves when the page hydrates (1280)', async ({page, isMobile}) => {
    desktopOnly(isMobile);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/app');
    const nav = page.getByRole('navigation', {name: 'Main navigation'});
    const names = await nav.getByRole('link').allTextContents();
    expect(names.map(n => n.trim()).slice(-3)).toEqual(['Checklist', 'Settings', 'Help']);
  });
});
test('NB-028 (AL-NAV-010): Settings and Help keep their place from the first paint to after hydration (1280)', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 1280, height: 900});
  await freshDevice(page);
  await page.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const a = [...document.querySelectorAll('aside.app-sidebar nav a')].find(x => x.textContent?.trim() === 'Settings'); (window as unknown as {firstSettings?: number}).firstSettings = a?.getBoundingClientRect().top; }); });
  await ready(page, '/app');
  await page.waitForTimeout(1500);
  const [first, now] = await page.evaluate(() => [(window as unknown as {firstSettings?: number}).firstSettings, [...document.querySelectorAll('aside.app-sidebar nav a')].find(x => x.textContent?.trim() === 'Settings')!.getBoundingClientRect().top]);
  expect(first).toBeDefined();
  expect(Math.abs(now! - first!)).toBeLessThanOrEqual(1);
});

// ---- Copy: N-MO-02, N-MO-01, T-069 ----
test('N-MO-02, N-MO-01 (AL-PRICING-001): Plans says what is known about Alpha users later; Help names Spotify Premium as Spotify’s', async ({page}) => {
  await ready(page, '/app/plans');
  await expect(page.locator('main')).toContainText('Whether people who used the Alpha keep any features once paid plans begin is not decided yet either.');
  await ready(page, '/app/help');
  await expect(page.locator('main')).toContainText('Spotify needs a Spotify Premium account (Spotify’s own plan, not ZIGoals Premium)');
  await expect(page.locator('main')).not.toContainText('Spotify needs Premium');
});
for (const width of [375, 394] as const)
  test(`T-069 (AL-LAUNCHER-OVERLAP-001): at ${width} px the notice’s “Saved in this browser only” wraps whole, never cut`, async ({page}) => {
    await page.setViewportSize({width, height: 800});
    await freshDevice(page);
    await ready(page, '/app');
    const short = page.locator('.alpha-notice .alpha-notice-short');
    await expect(short).toBeVisible();
    await expect(short).toHaveText('Saved in this browser only');
    const s = await short.evaluate(el => ({over: el.scrollWidth - el.clientWidth, overflow: getComputedStyle(el).textOverflow, right: el.getBoundingClientRect().right, notice: el.closest('.alpha-notice')!.getBoundingClientRect().right}));
    expect(s.over).toBeLessThanOrEqual(0);
    expect(s.overflow).not.toBe('ellipsis');
    expect(s.right).toBeLessThanOrEqual(s.notice);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
