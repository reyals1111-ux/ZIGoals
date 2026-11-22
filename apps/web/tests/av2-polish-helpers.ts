import {expect, type Locator, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {applyTheme, type Theme} from './p6-helpers';

/**
 * Session AV lane 2 (polish, fresh-eyes review P-1 … P-40): shared steps for the polish specs. Every /api call answers
 * 503; the Showcase is fictional.
 */
export async function start(page: Page, {theme = 'nebula', width = 390, showcase = true}: {theme?: Theme; width?: number; showcase?: boolean} = {}) {
  await applyTheme(page, theme);
  await offlineApi(page);
  await page.setViewportSize({width, height: width < 768 ? 844 : 900});
  await freshDevice(page);
  if (showcase) await loadShowcase(page);
}
export async function go(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  await expect(page.locator('main').first()).toBeVisible();
}
/** No sideways page scroll at 320 px. */
export async function noSideways(page: Page) {
  const before = page.viewportSize();
  await page.setViewportSize({width: 320, height: 720});
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  if (before) await page.setViewportSize(before);
}
/**
 * A checkbox (or radio) and its words on one row: the box's vertical middle falls within the first line of the words,
 * and the words start to its right.
 */
export async function boxBesideWords(label: Locator) {
  const m = await label.evaluate(el => {
    const box = el.querySelector('input[type=checkbox], input[type=radio]')!.getBoundingClientRect();
    const range = document.createRange(), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null, first: DOMRect | null = null;
    while ((node = walker.nextNode())) { if (!node.textContent?.trim()) continue; range.selectNodeContents(node); const r = range.getClientRects()[0]; if (r && r.width) { first = r; break; } }
    return {boxMid: box.top + box.height / 2, boxRight: box.right, textTop: first?.top ?? -1, textBottom: first?.bottom ?? -1, textLeft: first?.left ?? -1, direction: getComputedStyle(el).flexDirection};
  });
  expect(m.textTop, 'the label has words').toBeGreaterThanOrEqual(0);
  expect(m.boxMid, JSON.stringify(m)).toBeGreaterThanOrEqual(m.textTop - 6);
  expect(m.boxMid, JSON.stringify(m)).toBeLessThanOrEqual(m.textBottom + 6);
  expect(m.textLeft, JSON.stringify(m)).toBeGreaterThanOrEqual(m.boxRight);
}
/** The fold's own marker: ▸ folded, ▾ open, and still (no transition, no animation). */
export async function foldMarker(summary: Locator, open = false) {
  const m = await summary.evaluate(el => {
    const cs = getComputedStyle(el), before = getComputedStyle(el, '::before');
    return {display: cs.display, listStyle: cs.listStyleType, content: before.content, transition: before.transitionDuration, animation: before.animationName};
  });
  const native = m.display === 'list-item' && m.listStyle !== 'none';
  if (!native) {
    expect(m.content, JSON.stringify(m)).toContain(open ? '▾' : '▸');
    expect(m.transition.split(',').every(d => parseFloat(d) === 0), JSON.stringify(m)).toBe(true);
    expect(m.animation).toBe('none');
  }
}
