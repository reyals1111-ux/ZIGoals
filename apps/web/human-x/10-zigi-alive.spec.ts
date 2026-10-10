import {expect, type Page} from '@playwright/test';
import {ZIGI_KEY} from '../lib/ai/store/keys';
import manifest from '../components/zigi/manifest.json';
import {journey, open, snap, type Journey} from './kit';

// Session Y Part 11: X-Local's ZIGi without any provider (ADR-017), as a person meets it, for the live pass on #34. The
// launcher's Studio-2 art and its resting place, Meet ZIGi, the idle motion (Calm by default, Off, Motion Off) and the
// Showcase. No key, no model and no chat request: nothing here leaves the device.
const launcher = (page: Page) => page.getByTestId('ai-launcher');
const figure = (page: Page) => page.locator('.ai-launcher-button .zigi img');
const file = (page: Page) => figure(page).evaluate(el => (el as HTMLImageElement).currentSrc.split('/').pop() ?? '');
const playing = (page: Page) => figure(page).evaluate(el => el.getAttribute('data-playing') !== null);
async function stillPoster(page: Page) {
  await expect(figure(page)).not.toHaveAttribute('data-playing', '');
  expect(await file(page)).toMatch(/^F001-idle(-2x)?\.webp$/);
  expect(await figure(page).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
}
/** The launcher keeps clear of the page's first action (ADR-017 S81, the resting place). */
async function clearOf(j: Journey, action: ReturnType<Page['getByRole']>) {
  const [a, b] = [await launcher(j.page).boundingBox(), await action.boundingBox()];
  expect(a && b, 'both on screen').toBeTruthy();
  const overlap = !(a!.x + a!.width <= b!.x || b!.x + b!.width <= a!.x || a!.y + a!.height <= b!.y || b!.y + b!.height <= a!.y);
  expect(overlap, 'the launcher covers the page\'s first action').toBe(false);
}

journey('J501', 'ZIGi\'s launcher shows its art on every main page and rests clear of the first action', {views: 'all', data: ['E'], live: true}, async j => {
  for (const path of ['/app', '/app/habits', '/app/health', '/app/wealth', '/app/goals']) {
    await open(j.page, path);
    await expect(launcher(j.page)).toBeVisible();
    await expect.poll(() => file(j.page)).toMatch(/^F001-idle(\.anim)?(-2x)?\.webp$/);
  }
  await open(j.page, '/app/habits');
  await clearOf(j, j.page.getByRole('button', {name: '+ New habit', exact: true}));
  await snap(j, 'J501', 'habits');
});

journey('J502', 'Meet ZIGi from Settings: every state with its code, nothing written on view', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app');
  await j.page.goto('/app/settings#zigi-look');
  await j.page.locator('#zigi-look').getByRole('link', {name: /Meet ZIGi/}).click();
  await expect(j.page).toHaveURL(/\/app\/zigi$/);
  await expect(j.page.getByRole('heading', {level: 1, name: 'Meet ZIGi.'})).toBeVisible();
  const before = await j.page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const states = Object.values(manifest.states);
  await expect(j.page.locator('.meet-zigi-card')).toHaveCount(states.length);
  for (const state of states) await expect(j.page.getByRole('article', {name: state.label, exact: true})).toContainText(state.code);
  await snap(j, 'J502', 'meet');
  expect(await j.page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
});

journey('J503', 'ZIGi breathes while it waits (Calm), and holds still with its animation Off or Motion Off', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  await open(j.page, '/app');
  await expect.poll(() => playing(j.page), {timeout: 15_000}).toBe(true);
  // The swap sets src and drops the poster's srcset in one render; the browser reports the new file once it has selected it.
  await expect.poll(() => file(j.page)).toBe('F001-idle.anim.webp');
  await j.page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [ZIGI_KEY, JSON.stringify({version: 1, animation: 'off'})]);
  await open(j.page, '/app');
  await stillPoster(j.page);
  await j.page.evaluate(key => { localStorage.removeItem(key); localStorage.setItem('zigoals:motion:v1', 'off'); }, ZIGI_KEY);
  await open(j.page, '/app');
  await expect(j.page.locator('html')).toHaveAttribute('data-app-motion', 'off');
  await stillPoster(j.page);
  await snap(j, 'J503', 'motion-off');
});

journey('J504', 'in the Showcase ZIGi is the same and Meet ZIGi shows nothing personal', {views: ['D', 'P'], data: ['S'], live: true}, async j => {
  await expect(launcher(j.page)).toBeVisible();
  await j.page.goto('/app/zigi');
  await expect(j.page.getByRole('heading', {level: 1, name: 'Meet ZIGi.'})).toBeVisible();
  await expect(j.page.locator('.meet-zigi-card')).toHaveCount(Object.values(manifest.states).length);
  await expect(j.page.locator('main')).not.toContainText('@');
  await snap(j, 'J504', 'showcase');
});
