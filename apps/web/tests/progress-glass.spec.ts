import {expect, test, type Page} from '@playwright/test';

// Session I, Part 3: every progress bar and ring is the shared liquid-glass primitive (components/progress).
async function showcase(page: Page) {
  await page.route('**/api/market-**', route => route.fulfill({status: 503, contentType: 'application/json', body: '{"error":"fixture offline"}'}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
/**
 * Counts entrance starts per glass element, and checks that a fill never moves layout: at the start and the end of each
 * entrance, the track keeps its height and whatever follows it keeps its distance. (Measured against the track itself,
 * so the page's own load-time shifts, which are not progress, do not count.)
 */
async function record(page: Page) {
  await page.addInitScript(() => {
    const starts = new Map<Element, number>(), shifts: string[] = [], before = new Map<Element, string>();
    Object.assign(window, {glassStarts: starts, glassShifts: shifts});
    const layout = (host: Element) => {
      const box = host.getBoundingClientRect(), next = host.nextElementSibling?.getBoundingClientRect();
      return [box.height, next ? next.top - box.bottom : 0].map(n => Math.round(n * 2) / 2).join(',');
    };
    const hostOf = (target: Element) => target.closest('.glass-track,.glass-ring');
    document.addEventListener('animationstart', event => {
      if (!/^glass-(fill|ring|segment)/.test(event.animationName) || !(event.target instanceof Element) || event.pseudoElement) return;
      starts.set(event.target, (starts.get(event.target) ?? 0) + 1);
      const host = hostOf(event.target);
      if (host && !before.has(host)) before.set(host, layout(host));
    }, true);
    document.addEventListener('animationend', event => {
      if (!/^glass-(fill|ring|segment)/.test(event.animationName) || !(event.target instanceof Element) || event.pseudoElement) return;
      const host = hostOf(event.target), start = host && before.get(host);
      if (host && start && start !== layout(host)) shifts.push(`${host.className}: ${start} → ${layout(host)}`);
    }, true);
  });
}
/** Scrolls the whole page once, so every indicator is seen, then waits until nothing moves. */
async function seeAll(page: Page) {
  await expect(page.locator('main h1')).toBeVisible();
  await page.waitForTimeout(600);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) { await page.evaluate(top => window.scrollTo(0, top), y); await page.waitForTimeout(60); }
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && (a.effect as KeyframeEffect | null)?.target instanceof Element && ((a.effect as KeyframeEffect).target as Element).closest('.glass-track,.glass-ring')).length)).toBe(0);
}
/** Every bar: where its fill ends, against where its value puts it; every ring arc: its drawn length against its own value. */
function shapes(page: Page) {
  return page.evaluate(() => {
    const bars = [...document.querySelectorAll<HTMLElement>('.glass-track:not(.glass-segmented)')].filter(t => t.getClientRects().length).map(track => {
      const value = Number(getComputedStyle(track).getPropertyValue('--glass-value')), box = track.querySelector('.glass-fill-clip')!.getBoundingClientRect(), fill = track.querySelector('.glass-fill')!.getBoundingClientRect();
      const vertical = track.dataset.axis === 'y';
      return {name: track.className, value, drawn: vertical ? (box.bottom - fill.top) / box.height : (fill.right - box.left) / box.width};
    });
    const arcs = [...document.querySelectorAll<SVGElement>('.glass-ring-arc')].map(arc => ({name: arc.closest('.glass-ring')!.className, drawn: parseFloat(getComputedStyle(arc).strokeDashoffset), value: parseFloat(arc.style.strokeDashoffset)}));
    return {bars, arcs, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth};
  });
}

for (const path of ['/app', '/app/goals', '/app/wealth', '/app/habits', '/app/health']) {
  test(`${path}: every bar and ring fills once and settles exactly on its value, without shifting layout or widening the page`, async ({page}) => {
    await record(page);
    await showcase(page);
    await page.goto(path);
    await seeAll(page);
    const {bars, arcs, overflow} = await shapes(page);
    expect(bars.length + arcs.length, 'progress indicators on the page').toBeGreaterThan(0);
    for (const bar of bars) expect(bar.drawn, bar.name).toBeCloseTo(bar.value, 2);
    for (const arc of arcs) expect(arc.drawn, arc.name).toBeCloseTo(arc.value, 2);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => (window as unknown as {glassShifts: string[]}).glassShifts)).toEqual([]);
    // Indicators fill in as they are seen, and each only once: no element started its entrance twice.
    const starts = await page.evaluate(() => [...(window as unknown as {glassStarts: Map<Element, number>}).glassStarts.values()]);
    expect(starts.length).toBeGreaterThan(0);
    expect(Math.max(...starts)).toBe(1);
  });
}

test('a new value glides from the old one and never replays the entrance', async ({page}) => {
  await record(page);
  await showcase(page);
  await page.goto('/app/habits');
  const overview = page.locator('.habit-overview-track');
  await overview.scrollIntoViewIfNeeded();
  await expect(overview).toHaveAttribute('data-entrance', 'once');
  await expect.poll(() => overview.evaluate(el => el.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
  const startsIn = () => overview.evaluate(el => [...(window as unknown as {glassStarts: Map<Element, number>}).glassStarts].filter(([node]) => el.contains(node)).reduce((n, [, count]) => n + count, 0));
  const before = await startsIn();
  expect(before).toBe(2);
  const transitions = overview.evaluate(el => new Promise<string>(resolve => el.addEventListener('transitionstart', event => resolve(`${(event.target as Element).className}:${(event as TransitionEvent).propertyName}`), {once: true})));
  await page.locator('.habits-workspace').getByRole('button', {name: /^Complete /}).first().click();
  expect(await transitions).toMatch(/^glass-fill.*:transform$/);
  await expect.poll(() => overview.evaluate(el => el.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
  expect(await startsIn()).toBe(before);
  // Role and values stay the caller's; the glass parts are decoration.
  await expect(overview).toHaveAttribute('role', 'progressbar');
  for (const part of await overview.locator('.glass-fill-clip,.glass-fill-glow').all()) await expect(part).toHaveAttribute('aria-hidden', 'true');
});

for (const mode of ['reduce', 'off'] as const) {
  test(`${mode === 'reduce' ? 'reduced motion' : 'Motion Off'}: every bar and ring shows its final value at once, with nothing moving`, async ({page}) => {
    if (mode === 'reduce') await page.emulateMedia({reducedMotion: 'reduce'});
    await record(page);
    await showcase(page);
    if (mode === 'off') { await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off')); await page.reload(); }
    for (const path of ['/app', '/app/wealth', '/app/health']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await page.waitForTimeout(500);
      const parts = page.locator('.glass-fill,.glass-fill-glow,.glass-segment,.glass-ring-arc');
      expect(await parts.count()).toBeGreaterThan(0);
      expect(await parts.evaluateAll(nodes => nodes.filter(n => getComputedStyle(n).animationName !== 'none' || getComputedStyle(n).transitionDuration !== '0s').length)).toBe(0);
      expect(await page.locator('.glass-track[data-entrance],.glass-ring[data-entrance]').count()).toBe(0);
      const {bars, arcs} = await shapes(page);
      for (const bar of bars) expect(bar.drawn, bar.name).toBeCloseTo(bar.value, 2);
      for (const arc of arcs) expect(arc.drawn, arc.name).toBeCloseTo(arc.value, 2);
    }
    expect(await page.evaluate(() => (window as unknown as {glassStarts: Map<Element, number>}).glassStarts.size)).toBe(0);
  });
}
