import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase} from './ah-helpers';

// Session AK M1–M4 (owner follow-up 2): Motion Full / Calm / Off. Full gets page transitions (React <ViewTransition>,
// app/app/template.tsx), counting figures and completion moments; Calm keeps short fades only and stops every loop; Off and
// the device's reduced motion leave nothing running and start no view transition at all (MotionRuntime's gate).

/** Counts document view transitions the page starts (the gate hides the browser's method under Off, so none are counted). */
const countTransitions = (page: Page) => page.addInitScript(() => {
  const proto = Document.prototype as unknown as {startViewTransition?: (...a: unknown[]) => unknown};
  const original = proto.startViewTransition;
  (window as unknown as {vtCount: number}).vtCount = 0;
  if (typeof original === 'function') proto.startViewTransition = function (this: Document, ...args: unknown[]) { (window as unknown as {vtCount: number}).vtCount++; return original.apply(this, args); };
});
const setMotion = (page: Page, value: 'system' | 'calm' | 'off') => page.addInitScript(v => { try { localStorage.setItem('zigoals:motion:v1', v); } catch { /* storage denied */ } }, value);
const vtCount = (page: Page) => page.evaluate(() => (window as unknown as {vtCount: number}).vtCount);
/** Client-side navigation by the app's own link (Habits is in every navigation). */
async function navigateToHabits(page: Page) {
  await page.locator('a[href="/app/habits"]:visible').first().click();
  await page.waitForURL('**/app/habits');
  await hydrated(page);
}
/** Animations still running once entrances have had time to end (finite ones), and endless ones. */
const running = (page: Page) => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => ({
  name: (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? a.id ?? 'web-animation',
  endless: a.effect?.getComputedTiming().iterations === Infinity,
})));

test('Settings offers Motion: Full, Calm and Off; Calm is saved, mirrored on <html> and survives a reload', async ({page}) => {
  await page.goto('/app/settings');
  await hydrated(page);
  const motion = page.getByRole('region', {name: 'Appearance', exact: true}).getByRole('combobox', {name: /^Motion/});
  await expect(motion.locator('option')).toHaveText(['Full', 'Calm (entrances only)', 'Off']);
  await expect(motion).toHaveValue('system');
  await motion.selectOption('calm');
  await expect(page.getByText('Saved. Motion is calm on this device', {exact: false})).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('zigoals:motion:v1'))).toBe('calm');
  await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'calm');
  await page.reload();
  await hydrated(page);
  await expect(motion).toHaveValue('calm');
  await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'calm');
});

test('Full: a page transition runs on navigation, its overlay never takes a tap, and the chrome is pinned', async ({page}) => {
  await countTransitions(page);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await loadShowcase(page);
  await expect(page.locator('html')).toHaveAttribute('data-zg-vt', 'on');
  await navigateToHabits(page);
  await expect.poll(() => vtCount(page)).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement, '::view-transition').pointerEvents)).toBe('none');
  // Outside a transition nothing carries a name: the protected chrome looks and stacks exactly as before.
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('.app-sidebar, .phone-tabbar, .phone-topbar')].every(el => getComputedStyle(el).viewTransitionName === 'none'))).toBe(true);
});

test('Calm: a crossfade still runs on navigation, and no animation loops', async ({page}) => {
  await countTransitions(page);
  await setMotion(page, 'calm');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await loadShowcase(page);
  await navigateToHabits(page);
  await expect.poll(() => vtCount(page)).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(2500);
  expect((await running(page)).filter(a => a.endless)).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('data-zg-ambient', 'still');
});

for (const mode of ['Motion Off', 'reduced motion'] as const) {
  test(`${mode}: no view transition on navigation, nothing running, no completion burst`, async ({page}) => {
    await countTransitions(page);
    if (mode === 'Motion Off') { await setMotion(page, 'off'); await page.emulateMedia({reducedMotion: 'no-preference'}); }
    else await page.emulateMedia({reducedMotion: 'reduce'});
    await loadShowcase(page);
    await expect(page.locator('html')).not.toHaveAttribute('data-zg-vt', 'on');
    await navigateToHabits(page);
    await page.waitForTimeout(2500);
    expect(await vtCount(page)).toBe(0);
    expect(await running(page)).toEqual([]);
    const complete = page.getByRole('button', {name: /^Complete /}).first();
    if (await complete.count()) { await complete.click(); await page.waitForTimeout(300); await expect(page.locator('.zg-burst')).toHaveCount(0); }
  });
}

test('Full: completing a habit on its Habits page card plays one completion moment that never takes a tap', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await loadShowcase(page);
  await page.goto('/app/habits');
  await hydrated(page);
  const complete = page.locator('.habit-card').getByRole('button', {name: /^Complete /}).first();
  await complete.scrollIntoViewIfNeeded();
  // The moment lives about 0.8 s by design: what it is made of is recorded the instant it is added, so a busy runner's
  // gap between two assertions cannot outlast it.
  await page.evaluate(() => {
    const seen: {ariaHidden: string | null; pointerEvents: string; sparks: number}[] = [];
    (window as unknown as {bursts: typeof seen}).bursts = seen;
    new MutationObserver(records => { for (const r of records) for (const n of r.addedNodes) if (n instanceof HTMLElement && n.classList.contains('zg-burst')) seen.push({ariaHidden: n.getAttribute('aria-hidden'), pointerEvents: getComputedStyle(n).pointerEvents, sparks: n.querySelectorAll('.zg-burst-spark').length}); }).observe(document.body, {childList: true});
  });
  await complete.click();
  const bursts = () => page.evaluate(() => (window as unknown as {bursts: {ariaHidden: string | null; pointerEvents: string; sparks: number}[]}).bursts);
  await expect.poll(async () => (await bursts()).length).toBe(1);
  const [burst] = await bursts();
  expect(burst!.ariaHidden).toBe('true');
  expect(burst!.pointerEvents).toBe('none');
  expect(burst!.sparks).toBe(8);
  await expect(page.locator('.zg-burst')).toHaveCount(0, {timeout: 3000});
  expect(await bursts()).toHaveLength(1);
});

test('Full: Wealth\'s total reads its final value at every moment, and settles on exactly that text', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await loadShowcase(page);
  await page.goto('/app/wealth');
  await hydrated(page);
  const total = page.locator('.wealth-total-headline').first();
  await expect(total).toBeVisible();
  // The total can mount after hydration (its records load later, as on phones), so it may count on this first visit too:
  // the reference is read once any count has ended (innerText would otherwise include the aria-hidden counting digits).
  await expect(page.locator('.wealth-total-headline .zg-ticker[data-running]')).toHaveCount(0, {timeout: 4000});
  const final = (await total.innerText()).trim();
  // Arrive by a client navigation, where the count runs: the accessible text never changes.
  await page.goto('/app/habits'); await hydrated(page);
  await page.locator('a[href="/app/wealth"]:visible').first().click();
  await page.waitForURL('**/app/wealth');
  const readable = () => page.locator('.wealth-total-headline .zg-ticker').first().evaluate(el => (el.querySelector('.sr-only') ?? el).textContent?.trim());
  for (let i = 0; i < 5; i++) { expect(await readable()).toBe(final); await page.waitForTimeout(120); }
  await expect(page.locator('.wealth-total-headline .zg-ticker[data-running]')).toHaveCount(0, {timeout: 4000});
  await expect(page.locator('.wealth-total-headline').first()).toHaveText(final);
});
