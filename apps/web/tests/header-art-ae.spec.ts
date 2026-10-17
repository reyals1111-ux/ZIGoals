import {expect, test, type Page} from '@playwright/test';

// Session AE (Part 4, ADR-027 G5): the page-header art family. Every page below has its own orbit art in its header (Habits'
// CSS orbit is the reference): decorative and hidden from assistive tech, in the header's top-right corner and inside its
// box, clear of the eyebrow, title, lede and every header control on computers and tablets; on phones small and faint at
// the top right (behind the words, as Habits'), clear of every control. Its entrance plays once (finite, one iteration) and
// not at all under reduced motion or Motion Off. Today's hero has none.
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toBeVisible();
}
/** The page with its header art at rest (every finite animation over). */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity));
}
const PAGES: [path: string, header: string][] = [
  ['/app/goals', '.pillar-hero'], ['/app/health', '.pillar-hero'], ['/app/wealth', '.pillar-hero'], ['/app/journey', '.pillar-hero'],
  ['/app/review', '.page-header'], ['/app/wealth/calculator', '.page-header'], ['/app/help', '.page-header'], ['/app/settings/data', '.page-header'],
  ['/app/goals/average/new', '.page-header'], ['/app/share', '.page-header'], ['/app/zigi', '.page-header'],
];
const HABITS: [path: string, header: string] = ['/app/habits', '.pillar-hero'];
// Each part of the entrance, by any of its names (on phones Habits' planets only fade in: its disc is resized there).
const ENTRANCE = {orbit: [['ha-ring-in'], ['ha-dot-in'], ['ha-bloom'], ['ha-glyph-in']], habits: [['ha-habit-in'], ['ha-habit-dot', 'ha-fade'], ['ha-habit-glyph']]};

/** The art's disc (the orbit's rings; Habits' disc is turned, so its box is wider than the disc), the header's box, the words
 * and controls it holds, and the art's accessibility, opacity and animations. */
function measure(header: string) {
  const host = document.querySelector(`main ${header}`)!, art = host?.querySelector<HTMLElement | SVGElement>('.orbit-art, .habit-constellation');
  if (!host || !art) return null;
  const box = (e: Element) => { const b = e.getBoundingClientRect(); return {left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height}; };
  const m = new DOMMatrix(getComputedStyle(art).transform === 'none' ? undefined : getComputedStyle(art).transform), turn = Math.atan2(m.b, m.a);
  const a = box(art), r = a.width / (2 * (Math.abs(Math.cos(turn)) + Math.abs(Math.sin(turn))));
  let opacity = 1; for (let e: Element | null = art; e && e !== host; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
  const named = (selector: string) => [...host.querySelectorAll(selector)].filter(e => !e.closest('.pillar-hero-art, .header-art-slot') && e.getBoundingClientRect().width > 0).map(e => ({what: `${e.tagName.toLowerCase()} “${(e.textContent ?? '').trim().slice(0, 30)}”`, ...box(e)}));
  return {
    kind: art.classList.contains('orbit-art') ? 'orbit' as const : 'habits' as const,
    hidden: !!art.closest('[aria-hidden="true"]') && (art.tagName.toLowerCase() !== 'svg' || art.getAttribute('aria-hidden') === 'true'),
    shown: getComputedStyle(art).display !== 'none' && a.width > 0, opacity, events: getComputedStyle(art).pointerEvents,
    disc: {x: a.left + a.width / 2, y: a.top + a.height / 2, r}, host: box(host),
    words: named('.eyebrow, h1, .page-lede, .pillar-hero-lede'), controls: named('a, button, input, select, [role=button]'),
    animations: (art.getAnimations({subtree: true}) as CSSAnimation[]).filter(x => 'animationName' in x).map(x => ({name: x.animationName, state: x.playState, iterations: x.effect?.getTiming().iterations, end: Number(x.effect?.getComputedTiming().endTime)})),
    names: [art, ...art.querySelectorAll('*')].map(e => getComputedStyle(e).animationName).concat(art.classList.contains('habit-constellation') ? [getComputedStyle(art, '::before').animationName, getComputedStyle(art, '::after').animationName] : []),
    overflow: document.documentElement.scrollWidth - innerWidth,
  };
}
type Box = {left: number; top: number; right: number; bottom: number};
const touches = (d: {x: number; y: number; r: number}, b: Box) => { const x = Math.max(b.left, Math.min(d.x, b.right)), y = Math.max(b.top, Math.min(d.y, b.bottom)); return (x - d.x) ** 2 + (y - d.y) ** 2 < (d.r - 1) ** 2; };

for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]] as const) {
  test(`${width} px: each page's header art sits in its header's top-right corner, clear of the words and controls`, async ({page, isMobile}) => {
    test.skip(isMobile !== (width === 390), 'computers and tablets on the desktop project, the phone on the mobile one');
    test.setTimeout(180_000);
    await page.setViewportSize({width, height});
    await showcase(page);
    // Habits' orbit is the reference; its placement is checked where it is the reference (1440), its motion everywhere below.
    for (const [path, header] of width === 1440 ? [...PAGES, HABITS] : PAGES) {
      await open(page, path);
      const m = await page.evaluate(measure, header);
      expect(m, `${path}: header art`).not.toBeNull();
      const {disc, host} = m!;
      expect.soft(m!.hidden, `${path}: hidden from assistive tech`).toBe(true);
      expect.soft(m!.shown, `${path}: shown`).toBe(true);
      expect.soft(m!.events, `${path}: never takes a tap`).toBe('none');
      expect.soft(m!.overflow, `${path}: no sideways scroll`).toBeLessThanOrEqual(0);
      // Inside the header's box, at its right edge and in its upper part.
      expect.soft(disc.x - disc.r, `${path}: left edge inside`).toBeGreaterThanOrEqual(host.left - 2);
      expect.soft(disc.x + disc.r, `${path}: right edge inside`).toBeLessThanOrEqual(host.right + 2);
      expect.soft(disc.y - disc.r, `${path}: top inside`).toBeGreaterThanOrEqual(host.top - 2);
      expect.soft(disc.y + disc.r, `${path}: bottom inside`).toBeLessThanOrEqual(host.bottom + 2);
      expect.soft(host.right - (disc.x + disc.r), `${path}: at the right`).toBeLessThanOrEqual(24);
      expect.soft(disc.y - disc.r - host.top, `${path}: at the top`).toBeLessThanOrEqual(Math.max(24, (host.bottom - host.top) * .3));
      for (const control of m!.controls) expect.soft(touches(disc, control), `${path}: clear of ${control.what}`).toBe(false);
      if (width === 390) {
        // Phones: small and faint behind the words, as Habits' orbit.
        expect.soft(disc.r * 2, `${path}: small on a phone`).toBeLessThanOrEqual(140);
        expect.soft(m!.opacity, `${path}: faint on a phone`).toBeLessThanOrEqual(.4);
      } else for (const word of m!.words) expect.soft(touches(disc, word), `${path}: clear of ${word.what}`).toBe(false);
    }
  });
}

test('the entrance plays once on each header art (Habits\' orbit too), and never under reduced motion or Motion Off; Today has none', async ({page}) => {
  test.setTimeout(240_000);
  await showcase(page);
  await page.goto('/app');
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('main .orbit-art, main .header-art-slot')).toHaveCount(0);
  await expect(page.locator('.today-hero .pillar-hero-art')).toHaveCount(0);
  for (const mode of ['default', 'reduced', 'off'] as const) {
    if (mode === 'reduced') await page.emulateMedia({reducedMotion: 'reduce'});
    if (mode === 'off') { await page.emulateMedia({reducedMotion: 'no-preference'}); await page.evaluate(() => { localStorage.setItem('zigoals:motion:v1', 'off'); window.dispatchEvent(new Event('zigoals-motion')); }); }
    for (const [path, header] of [...PAGES, HABITS]) {
      await page.goto(path);
      await expect(page.locator('main h1').first()).toBeVisible();
      if (mode === 'off') await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
      const m = await page.evaluate(measure, header);
      expect(m, `${path}: header art`).not.toBeNull();
      if (mode === 'default') {
        // Every part of the entrance is there, one iteration, done within about a second (running, or finished and held).
        const names = new Set(m!.animations.map(a => a.name));
        for (const part of ENTRANCE[m!.kind]) expect.soft(part.some(name => names.has(name)), `${path}: ${part.join(' or ')}`).toBe(true);
        for (const a of m!.animations.filter(x => x.name.startsWith('ha-'))) {
          expect.soft(a.iterations, `${path}: ${a.name} plays once`).toBe(1);
          expect.soft(a.end, `${path}: ${a.name} ends`).toBeLessThanOrEqual(1200);
          expect.soft(['running', 'finished'], `${path}: ${a.name}`).toContain(a.state);
        }
      } else {
        expect.soft(m!.animations.filter(a => a.name.startsWith('ha-')), `${path} (${mode}): no entrance`).toEqual([]);
        expect.soft(m!.names.filter(n => n !== 'none'), `${path} (${mode}): animation-name none`).toEqual([]);
      }
    }
  }
});
