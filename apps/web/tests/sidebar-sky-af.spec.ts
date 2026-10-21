import {expect, test, type Page} from '@playwright/test';

/**
 * Session AF (L5a, Part 10.1, ADR-028 H28): the sidebar's sky scrolls with a parallax. As the sidebar scrolls, its stars
 * layer moves at 45 % of the content's speed (its background position gives back 55 % of every scrolled pixel); the page
 * mark, the planet with its words and the theme bar scroll exactly with the content; AE's artwork stays the artwork; at
 * rest no animation keeps running; reduced motion and Motion Off show AE's pinned sky, still. Measured at two scroll
 * positions in each theme, in a window short enough for the sidebar to scroll.
 */
const KEY = 'zigoals:ui-prefs:v1';
type Theme = 'nebula' | 'light' | 'dark';

async function open(page: Page, theme: Theme, motion?: 'off') {
  await page.setViewportSize({width: 1280, height: 640});
  await page.addInitScript(([key, t, m]) => {
    localStorage.setItem(key!, JSON.stringify(t === 'nebula' ? {version: 1} : {version: 1, theme: t}));
    if (m) localStorage.setItem('zigoals:motion:v1', m);
  }, [KEY, theme, motion ?? ''] as const);
  await page.goto('/app');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-loading', /.*/);
  if (theme !== 'nebula') await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('aside.app-sidebar .theme-switch')).toBeVisible();
}

/** Scrolls the sidebar to `top`, lets the scroll settle, and reads where the stars layer and the content are. */
async function at(page: Page, top: number) {
  return page.locator('aside.app-sidebar').evaluate(async (s, y) => {
    s.scrollTop = y;
    const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await frame(); await new Promise(r => setTimeout(r, 250)); await frame();
    const split = (v: string) => { const out: string[] = []; let depth = 0, from = 0; for (let i = 0; i < v.length; i++) { if (v[i] === '(') depth++; else if (v[i] === ')') depth--; else if (v[i] === ',' && !depth) { out.push(v.slice(from, i).trim()); from = i + 1; } } out.push(v.slice(from).trim()); return out; };
    const cs = getComputedStyle(s), layers = split(cs.backgroundImage), positions = split(cs.backgroundPositionY);
    const stars = layers.findIndex(l => /sidebar-stars(-dawn)?\.svg/.test(l)), position = positions[stars]?.trim() ?? '';
    // The layer's drift below its pinned place (`100%` = AE's pinned sky; `calc(100% + Npx)` = drifted by N px).
    const drift = position === '100%' ? 0 : Number(/^calc\(100% \+ (-?[\d.]+)px\)$/.exec(position)?.[1] ?? Number.NaN);
    return {scrollTop: s.scrollTop, drift, position, image: layers[stars] ?? '', sky: s.dataset.sky ?? null, running: s.getAnimations().length,
      mark: s.querySelector('.sidebar-mark')!.getBoundingClientRect().top, planet: s.querySelector('.sidebar-destination')!.getBoundingClientRect().top, bar: s.querySelector('.theme-switch')!.getBoundingClientRect().top};
  }, top);
}

test.describe('the sidebar sky parallax', () => {
  test.beforeEach(async ({browserName}, info) => { test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'The sidebar is the computer’s (phones have the tab bar); Chrome'); });

  for (const theme of ['nebula', 'light', 'dark'] as const) {
    test(`${theme}: the stars move at 45 % of the content’s speed; the mark, the planet and the theme bar move with it`, async ({page}) => {
      await open(page, theme);
      const first = await at(page, 120), second = await at(page, 420);
      expect(second.scrollTop - first.scrollTop, 'the sidebar scrolls in this window').toBe(300);
      expect(first.image).toMatch(theme === 'light' ? /\/art\/v24\/sidebar-stars-dawn\.svg/ : /\/art\/v24\/sidebar-stars\.svg/);
      // The layer gives back 55 % of the scroll, so on screen it moved −45 % of it: between 0 and the content's own move.
      expect(Math.abs(first.drift - 66), first.position).toBeLessThanOrEqual(.6);
      expect(Math.abs(second.drift - 231), second.position).toBeLessThanOrEqual(.6);
      const onScreen = (second.drift - second.scrollTop) - (first.drift - first.scrollTop);
      expect(onScreen).toBeLessThan(0);
      expect(onScreen).toBeGreaterThan(-300);
      expect(Math.abs(onScreen + 135)).toBeLessThanOrEqual(1);
      // The page mark, the planet with its words and the theme bar are content: they move exactly with the scroll.
      for (const part of ['mark', 'planet', 'bar'] as const) expect(Math.abs(second[part] - first[part] + 300), part).toBeLessThanOrEqual(.5);
      // At rest nothing keeps running on the sidebar (the scroll-driven animation is detached once the scroll settles).
      expect(second.sky).toBe('rest');
      expect(second.running).toBe(0);
      // Back at the top the sky is AE's pinned sky exactly.
      expect((await at(page, 0)).position).toBe('100%');
    });
  }

  test('while it scrolls, the scroll-driven animation gives the same drift as the resting value (where the engine has it)', async ({page}) => {
    await open(page, 'nebula');
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
    test.skip(!supported, 'this engine uses the scroll listener (covered above)');
    const read = await page.locator('aside.app-sidebar').evaluate(async s => {
      const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      s.scrollTop = 300; await frame(); await new Promise(r => setTimeout(r, 250));
      const rest = parseFloat(getComputedStyle(s).getPropertyValue('--sky-y'));
      s.dataset.sky = 'timeline'; await frame();
      const animation = s.getAnimations()[0] as CSSAnimation | undefined;
      return {rest, driven: parseFloat(getComputedStyle(s).getPropertyValue('--sky-y')), name: animation?.animationName, timeline: animation?.timeline?.constructor.name};
    });
    expect(read.name).toBe('sidebar-sky-drift');
    expect(read.timeline).toBe('ScrollTimeline');
    expect(Math.abs(read.driven - read.rest)).toBeLessThanOrEqual(.6);
    expect(read.rest).toBeCloseTo(165, 0);
  });

  for (const mode of ['reduced motion', 'Motion Off'] as const) {
    test(`${mode}: the sky stays AE's pinned sky, still, wherever the sidebar is scrolled`, async ({page}) => {
      if (mode === 'reduced motion') await page.emulateMedia({reducedMotion: 'reduce'});
      await open(page, 'nebula', mode === 'Motion Off' ? 'off' : undefined);
      if (mode === 'Motion Off') await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
      const first = await at(page, 120), second = await at(page, 420);
      for (const read of [first, second]) { expect(read.position).toBe('100%'); expect(read.sky).toBeNull(); expect(read.running).toBe(0); }
      // The whole sky moves with the content (AE's behaviour): the planet and the stars keep their distance.
      expect(Math.abs(second.planet - first.planet + 300)).toBeLessThanOrEqual(.5);
    });
  }
});
