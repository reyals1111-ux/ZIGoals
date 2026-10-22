import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist, type Checklist} from '../lib/checklist/schema';
import {seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish (ADR-030; owner Part 2): the phone layout. With twelve items and long names, at 320, 375, 390 and 430
 * px: nodes stand about 170 px apart (AG: 96), each name tab on one line wherever it fits (two only where it cannot,
 * check and words together), no tab overlapping any node, tab, banner or ZIGi, ZIGi touching no node, tab or banner,
 * every node at least 44 px, and nothing scrolling sideways.
 */
const NAMES: [string, string][] = [
  ['Take Vitamins & Creatine', 'morning'], ['Read ten pages', 'morning'], ['Drink water', 'morning'], ['Meditate ten minutes', 'morning'],
  ['Walk 8,000 steps', 'afternoon'], ['Play Piano', 'afternoon'], ['Cold shower', 'afternoon'],
  ['Journal three lines before bed', 'evening'], ['Stretch', 'evening'], ['No sugar today', 'evening'],
  ['Learn Spanish', 'anytime'], ['Save €10 for the trip', 'anytime'],
];
function longPath(): Checklist {
  let r = emptyChecklist(), n = 0;
  for (const [label, section] of NAMES) r = addCustom(r, {label, colour: 'cyan', section}, {id: `ck_phone-${++n}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, n))});
  return r;
}
const overlap = (a: DOMRect | {left: number; right: number; top: number; bottom: number}, b: typeof a, pad = 0) => a.left < b.right - pad && a.right > b.left + pad && a.top < b.bottom - pad && a.bottom > b.top + pad;
async function open(page: Page) {
  await seedChecklist(page, {path: longPath()});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
}

test('phones 320–430: an airy path — one-line tabs, nothing overlaps, ZIGi in its own room, 44 px nodes, no sideways scroll', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone layout');
  await open(page);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({width, height: 844});
    await expect(page.locator('.path-stage[data-lanes]'), `${width}: the lanes are in`).toHaveCount(1);
    await expect(page.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 10_000});
    await page.waitForTimeout(700);
    const m = await page.locator('.path-stage').evaluate(stage => {
      const box = (el: Element) => { const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width, h: r.height}; };
      const steps = [...stage.querySelectorAll('.path-step')].map(step => ({id: step.querySelector('.path-dot')!.getAttribute('data-step'), section: step.closest('.path-section')!.getAttribute('data-section'),
        dot: box(step.querySelector('.path-dot')!), tab: box(step.querySelector('.orbit-tab')!), wrap: step.querySelector('.orbit-tab')!.hasAttribute('data-wrap'),
        lineH: parseFloat(getComputedStyle(step.querySelector('.orbit-tab')!).lineHeight) || 18, cut: (() => { const t = step.querySelector('.path-label-text') as HTMLElement; return t.scrollWidth > t.clientWidth + 1; })()}));
      const banners = [...stage.querySelectorAll('.path-banner')].map(box), fig = stage.querySelector('.path-zigi[data-alive] .path-zigi-figure');
      const dialog = stage.closest('dialog')!;
      return {steps, banners, zigi: fig ? box(fig) : null, sideways: dialog.scrollWidth - dialog.clientWidth, vw: innerWidth};
    });
    expect(m.sideways, `${width}: no sideways scroll`).toBeLessThanOrEqual(0);
    expect(m.steps).toHaveLength(NAMES.length);
    m.steps.forEach((s, i) => {
      expect(s.dot.w, `${width}/${s.id}: a 44 px touch target`).toBeGreaterThanOrEqual(44);
      expect(s.tab.left, `${width}/${s.id}: tab on screen`).toBeGreaterThanOrEqual(0); expect(s.tab.right).toBeLessThanOrEqual(m.vw);
      if (!s.wrap) { expect(s.tab.h, `${width}/${s.id}: one line`).toBeLessThan(s.lineH * 2); expect(s.cut, `${width}/${s.id}: the whole name shows`).toBe(false); }
      m.steps.forEach((o, j) => {
        if (i === j) return;
        expect(overlap(s.tab, o.dot, -4), `${width}: ${s.id}'s tab clear of ${o.id}'s node`).toBe(false);
        if (j > i) expect(overlap(s.tab, o.tab, -2), `${width}: ${s.id}'s tab clear of ${o.id}'s tab`).toBe(false);
      });
      for (const b of m.banners) { expect(overlap(s.tab, b), `${width}: ${s.id}'s tab clear of a banner`).toBe(false); expect(overlap(s.dot, b), `${width}: ${s.id}'s node clear of a banner`).toBe(false); }
      // The pitch: within an orbit, at least 1.6 × AG's 96 px.
      const next = m.steps[i + 1];
      if (next && next.section === s.section) expect((next.dot.top + next.dot.bottom) / 2 - (s.dot.top + s.dot.bottom) / 2, `${width}: ${s.id} → ${next.id}`).toBeGreaterThanOrEqual(96 * 1.6);
    });
    // Long names stay whole on one line from 375 px; at 320 a wrap keeps the full name in two lines.
    if (width >= 375) expect(m.steps.filter(s => s.wrap).map(s => s.id), `${width}: no wrapped tab`).toEqual([]);
    // ZIGi beside the next node: touching no node, tab or banner.
    expect(m.zigi, `${width}: ZIGi on the path`).not.toBeNull();
    for (const s of m.steps) { expect(overlap(m.zigi!, s.dot), `${width}: ZIGi clear of ${s.id}'s node`).toBe(false); expect(overlap(m.zigi!, s.tab), `${width}: ZIGi clear of ${s.id}'s tab`).toBe(false); }
    for (const b of m.banners) expect(overlap(m.zigi!, b), `${width}: ZIGi clear of a banner`).toBe(false);
  }
});

test('phones: the timer dock is one slim row that never covers the path\'s end', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone layout');
  await open(page);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({width, height: 844});
    await page.waitForTimeout(300);
    const dock = await page.locator('.checklist-dock').boundingBox(), chips = await page.locator('.checklist-timers .checklist-timer').evaluateAll(els => els.map(e => e.getBoundingClientRect()).map(r => ({top: r.top, h: r.height})));
    expect(dock!.height, `${width}: slim`).toBeLessThanOrEqual(64);
    expect(new Set(chips.map(c => Math.round(c.top))).size, `${width}: one row`).toBe(1);
    for (const c of chips) expect(c.h).toBeGreaterThanOrEqual(44);
    // Scrolled to the end, the finale and its name sit above the dock.
    await page.locator('dialog.checklist-overlay').evaluate(d => d.scrollTo({top: d.scrollHeight}));
    await page.waitForTimeout(200);
    const finale = await page.locator('.path-finale').boundingBox();
    expect(finale!.y + finale!.height, `${width}: the finale clears the dock`).toBeLessThanOrEqual(dock!.y);
  }
});
