import {expect, test, type Page} from '@playwright/test';

/**
 * Session AE (the owner's brief Parts 3.1, 3.3, 3.5 and 4.1, ADR-027): the theme bar's Nebula choice wears a plain ZG
 * monogram in the sun's and moon's style; a switch is one short cross-fade where motion is welcome (none under reduced
 * motion or Motion Off) and never leaves a second theme sheet behind; the sidebar's sky is a clean colour behind the logo
 * and the first buttons with crisp stars lower down, in each theme's own colours (never plain white or plain black).
 */
const KEY = 'zigoals:ui-prefs:v1';
const NAMES = {light: 'Light theme', nebula: 'Nebula theme', dark: 'Dark theme'} as const;
type Theme = keyof typeof NAMES;
const appearance = (page: Page) => page.locator('#appearance').getByRole('radiogroup', {name: 'Theme'});
const hydrated = (page: Page) => expect(page.locator('html[data-app-hydrated]')).toBeAttached();

/** Counts the view transitions the page starts and the most theme sheets it ever holds at once (before any app script). */
const watchSwitches = (page: Page) => page.addInitScript(() => {
  const calls: string[] = [], original: unknown = Reflect.get(Document.prototype, 'startViewTransition');
  Reflect.set(window, '__viewTransitions', calls);
  Reflect.set(window, '__viewTransitionsSupported', typeof original === 'function');
  if (typeof original === 'function') Reflect.set(Document.prototype, 'startViewTransition', function (this: Document, ...args: unknown[]) { calls.push(document.documentElement.dataset.theme ?? 'nebula'); return original.apply(this, args); });
  let most = 0;
  Reflect.set(window, '__mostThemeSheets', () => most);
  new MutationObserver(() => { most = Math.max(most, document.querySelectorAll('link[href^="/themes/"]').length); }).observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['href']});
});
const switches = (page: Page) => page.evaluate(() => ({calls: Reflect.get(window, '__viewTransitions') as string[], supported: Reflect.get(window, '__viewTransitionsSupported') as boolean, most: (Reflect.get(window, '__mostThemeSheets') as () => number)()}));

/** Chooses a theme in Settings and waits until the page shows it in full (its own sheet loaded, or none for Nebula). */
async function choose(page: Page, theme: Theme) {
  await appearance(page).getByRole('radio', {name: NAMES[theme]}).click();
  await expect(appearance(page).getByRole('radio', {name: NAMES[theme]})).toHaveAttribute('aria-checked', 'true');
  if (theme === 'nebula') {
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await expect(page.locator('link[href^="/themes/"]')).toHaveCount(0);
  } else {
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect.poll(() => page.evaluate(t => (document.getElementById('zigoals-theme-sheet') as HTMLLinkElement | null)?.sheet?.href?.includes(`/themes/${t}.css`) ?? false, theme)).toBe(true);
  }
}

test('Nebula wears the ZG monogram: one plain line in the sun and moon icons’ size and style, its words and tip kept', async ({page}) => {
  await page.goto('/app/settings');
  await hydrated(page);
  const nebula = appearance(page).getByRole('radio', {name: 'Nebula theme'});
  await expect(nebula).toHaveAttribute('title', /Customize — coming later/);
  await expect(nebula).toContainText('Nebula');
  const icon = nebula.locator('svg');
  await expect(icon).toHaveCount(1);
  await expect(icon).toHaveAttribute('data-icon', 'zg');
  await expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
  for (const name of Object.values(NAMES)) {
    const box = await appearance(page).getByRole('radio', {name}).locator('svg').boundingBox();
    expect([box?.width, box?.height], name).toEqual([20, 20]);
  }
  // A single colour: one stroked line in the button's own colour, the sun's weight and round ends; nothing filled, no art.
  const paint = await icon.evaluate(svg => {
    const shapes = [...svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse')];
    return {shapes: shapes.length, fill: shapes[0]?.getAttribute('fill'), stroke: shapes[0]?.getAttribute('stroke'), width: shapes[0]?.getAttribute('stroke-width'), cap: shapes[0]?.getAttribute('stroke-linecap'), join: shapes[0]?.getAttribute('stroke-linejoin'), art: svg.querySelectorAll('linearGradient, radialGradient, image, pattern, filter').length, painted: getComputedStyle(shapes[0]!).stroke, colour: getComputedStyle(svg.closest('button')!).color};
  });
  expect(paint).toEqual({shapes: 1, fill: 'none', stroke: 'currentColor', width: '1.8', cap: 'round', join: 'round', art: 0, painted: paint.colour, colour: paint.colour});
  // The sun is drawn the same way (the family look).
  expect(await appearance(page).getByRole('radio', {name: NAMES.light}).locator('svg g').evaluate(g => [g.getAttribute('stroke-width'), g.getAttribute('stroke-linecap')])).toEqual(['1.8', 'round']);
});

test('Light, Dark, then Nebula: one cross-fade per switch, one theme sheet at most, and Nebula ends with none', async ({page}) => {
  await watchSwitches(page);
  await page.goto('/app/settings');
  await hydrated(page);
  for (const theme of ['light', 'dark', 'nebula'] as const) await choose(page, theme);
  const seen = await switches(page);
  expect(seen.most).toBeLessThanOrEqual(1);
  // Chrome has view transitions; each switch starts one (the page still shows the old theme when it starts).
  if (seen.supported) expect(seen.calls).toEqual(['nebula', 'light', 'dark']);
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), KEY)) ?? '{}')).not.toHaveProperty('theme');
});

for (const mode of ['reduced motion', 'Motion Off'] as const) {
  test(`${mode}: the themes switch at once, with no view transition`, async ({page}) => {
    if (mode === 'reduced motion') await page.emulateMedia({reducedMotion: 'reduce'});
    else await page.addInitScript(() => localStorage.setItem('zigoals:motion:v1', 'off'));
    await watchSwitches(page);
    await page.goto('/app/settings');
    await hydrated(page);
    for (const theme of ['light', 'dark', 'nebula'] as const) await choose(page, theme);
    const seen = await switches(page);
    expect(seen.calls).toEqual([]);
    expect(seen.most).toBeLessThanOrEqual(1);
  });
}

/** The sidebar's own sky at 1440 × 900, its content hidden (its layout, which the sky is pinned to, stays): per row,
 *  the pixels that stand out of the row's median colour (the sky is a vertical gradient, so only stars stand out). */
async function sky(page: Page) {
  await page.locator('aside.app-sidebar').evaluate(s => { s.scrollTop = 0; for (const c of s.children) (c as HTMLElement).style.visibility = 'hidden'; });
  const png = await page.screenshot({clip: {x: 0, y: 0, width: 214, height: 900}});
  return page.evaluate(async b64 => {
    const image = new Image(); image.src = `data:image/png;base64,${b64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const g = canvas.getContext('2d')!; g.drawImage(image, 0, 0);
    const {data, width, height} = g.getImageData(0, 0, canvas.width, canvas.height);
    const standOut = (from: number, to: number, limit: number) => {
      let n = 0;
      for (let y = Math.floor(from * height); y < Math.floor(to * height); y++) {
        const median = [0, 1, 2].map(c => { const v: number[] = []; for (let x = 0; x < width; x++) v.push(data[(y * width + x) * 4 + c]!); return v.sort((a, b) => a - b)[width >> 1]!; });
        for (let x = 0; x < width; x++) { const i = (y * width + x) * 4; if (Math.max(...[0, 1, 2].map(c => Math.abs(data[i + c]! - median[c]!))) > limit) n++; }
      }
      return n;
    };
    let sum = [0, 0, 0], count = 0;
    for (let y = 0; y < height / 4; y++) for (let x = 0; x < width; x++) { const i = (y * width + x) * 4; sum = sum.map((v, c) => v + data[i + c]!); count++; }
    return {top: standOut(0, .25, 8), lower: standOut(.5, 1, 24), topColour: sum.map(v => Math.round(v / count))};
  }, png.toString('base64'));
}
const luminance = (rgb: number[]) => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const contrast = (a: number[], b: number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

test('the sidebar sky: a clean colour behind the logo and first buttons, stars lower down, each theme its own (never plain white or black)', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'The sidebar is the computer’s (phones have the tab bar)');
  await page.setViewportSize({width: 1440, height: 900});
  await page.addInitScript(() => localStorage.setItem('zigoals:motion:v1', 'off'));
  await page.goto('/app');
  const backgrounds = new Set<string>();
  for (const theme of ['nebula', 'light', 'dark'] as const) {
    await page.evaluate(([k, t]) => localStorage.setItem(k, JSON.stringify(t === 'nebula' ? {version: 1} : {version: 1, theme: t})), [KEY, theme] as const);
    await page.reload();
    await hydrated(page);
    if (theme === 'nebula') await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    else await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-loading', /.*/);
    const sidebar = page.locator('aside.app-sidebar');
    const style = await sidebar.evaluate(s => { const cs = getComputedStyle(s), link = s.querySelector('.app-nav a:not([aria-current])')!; return {colour: cs.backgroundColor, image: cs.backgroundImage, ink: getComputedStyle(link).color}; });
    expect(['rgb(255, 255, 255)', 'rgb(0, 0, 0)'], theme).not.toContain(style.colour);
    expect(style.image, theme).toMatch(/sidebar-stars(-dawn)?\.svg/);
    backgrounds.add(`${style.colour} ${style.image}`);
    const measured = await sky(page);
    expect(measured.top, `${theme}: the top quarter is one clean colour`).toBe(0);
    expect(measured.lower, `${theme}: stars in the lower half`).toBeGreaterThan(20);
    expect([[255, 255, 255], [0, 0, 0]], theme).not.toContainEqual(measured.topColour);
    // The words on it: dark ink by day (≥ 4.5:1), the night's light words otherwise.
    const ink = style.ink.match(/\d+/g)!.slice(0, 3).map(Number);
    expect(contrast(ink, measured.topColour), theme).toBeGreaterThanOrEqual(4.5);
    if (theme === 'light') expect(Math.min(...measured.topColour), 'a white-family dawn').toBeGreaterThan(230);
    else expect(Math.max(...measured.topColour), 'a night sky').toBeLessThan(30);
  }
  expect(backgrounds.size).toBe(3);
});
