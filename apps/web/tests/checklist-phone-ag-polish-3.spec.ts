import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist, type Checklist} from '../lib/checklist/schema';
import {seedChecklist, settled} from './checklist-fixtures';
import {COMPUTER, phoneTransform} from '../lib/path/phone-scale';

/**
 * Session AG Polish 3 (ADR-032 L20; owner amendment 8, "phone = computer × scale", and amendments 2 and 4): the phone's
 * path on 390 × 844 and 360 × 780 phones with sample paths (thirteen items over four orbits with long names; six short
 * ones in one orbit; two orbits of three and two):
 * - the drawn line equals the computer's own line — read from the real computer at 1440 × 900 — × the phone's scale,
 *   point by point, with the computer's stroke widths and glow; every tab inside the column and over no part of the line;
 *   every name whole;
 * - nothing jumps on the first open: the path shows only once it is laid out, and every node stands where it first
 *   showed a second later;
 * - ZIGi's box overlaps no point of the line, no node, no name tab and no NEXT badge;
 * - the current node, once the path has moved to it, stands clear of the timer row.
 */
const LONG: [string, string][] = [
  ['Take Vitamins & Creatine', 'morning'], ['Water', 'morning'], ['Read ten pages', 'morning'], ['Meditate ten minutes', 'morning'], ['Exercise', 'morning'],
  ['Walk 8,000 steps', 'afternoon'], ['Play Piano', 'afternoon'], ['Cold shower', 'afternoon'],
  ['Journal three lines before bed', 'evening'], ['Stretch', 'evening'], ['No sugar today', 'evening'],
  ['Learn Spanish', 'anytime'], ['Save €10 for the trip', 'anytime'],
];
const SHORT: [string, string][] = [['Water', 'morning'], ['Weigh in', 'morning'], ['Log breakfast', 'morning'], ['Read', 'morning'], ['Walk', 'morning'], ['Stretch', 'morning']];
const TWO: [string, string][] = [['Fictional sunrise', 'morning'], ['Fictional dawn', 'morning'], ['Fictional tea', 'morning'], ['Fictional dusk', 'evening'], ['Fictional moon', 'evening']];
const PATHS = {long: LONG, short: SHORT, two: TWO} as const;
function pathOf(items: readonly [string, string][]): Checklist {
  let r = emptyChecklist(), n = 0;
  for (const [label, section] of items) r = addCustom(r, {label, colour: 'cyan', section}, {id: `ck_river-${++n}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, n))});
  return r;
}
async function open(page: Page, items: readonly [string, string][]) {
  await seedChecklist(page, {path: pathOf(items)});
  // (From the very first frame: whether the path shows, and where each node stands the first frame it does, then a second later.)
  await page.addInitScript(() => {
    const w = window as unknown as {__river: {hiddenBefore: boolean; first: number[][] | null; later: number[][] | null}};
    w.__river = {hiddenBefore: true, first: null, later: null};
    const read = () => [...document.querySelectorAll('.path-stage .path-dot')].map(d => { const r = d.getBoundingClientRect(), s = d.closest('.path-stage')!.getBoundingClientRect(); return [Math.round((r.left - s.left) * 10) / 10, Math.round((r.top - s.top) * 10) / 10]; });
    const tick = () => {
      const stage = document.querySelector<HTMLElement>('.path-stage[data-variant=orbit]');
      if (stage && stage.querySelector('.path-dot')) {
        const shown = getComputedStyle(stage).visibility !== 'hidden';
        if (shown && !w.__river.first) { w.__river.first = read(); window.setTimeout(() => { w.__river.later = read(); }, 1000); }
        if (!shown && w.__river.first) w.__river.hiddenBefore = false;
      }
      if (!w.__river.later) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  await expect(page.locator('.path-stage[data-ready][data-lanes]')).toHaveCount(1, {timeout: 15_000});
  await expect(page.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 15_000});
}

for (const [width, height] of [[390, 844], [360, 780]] as const) test.describe(`a ${width} × ${height} phone`, () => {
  test.beforeEach(async ({page}, info) => {
    test.skip(info.project.name !== 'mobile', 'the phone layout');
    await page.setViewportSize({width, height});
  });

  for (const name of ['long', 'short'] as const) test(`nothing jumps on opening (${name})`, async ({page}) => {
    await open(page, PATHS[name]);
    // Owner amendment 2: hidden until laid out, then never moving.
    await expect.poll(() => page.evaluate(() => (window as unknown as {__river: {later: unknown}}).__river.later !== null), {timeout: 5000}).toBe(true);
    const river = await page.evaluate(() => (window as unknown as {__river: {hiddenBefore: boolean; first: number[][]; later: number[][]}}).__river);
    expect(river.hiddenBefore, 'never hidden again once shown').toBe(true);
    expect(river.first.length).toBe(PATHS[name].length);
    river.first.forEach((p, i) => { expect(Math.abs(p[0]! - river.later[i]![0]!), `node ${i} across`).toBeLessThanOrEqual(1); expect(Math.abs(p[1]! - river.later[i]![1]!), `node ${i} down`).toBeLessThanOrEqual(1); });
  });

  for (const name of ['long', 'short'] as const) test(`the line is the computer's own line × scale, at the computer's stroke; tabs inside the column and off the line; names whole (${name}; owner amendment 8)`, async ({page, browser}) => {
    const readLine = () => {
      const stage = document.querySelector<HTMLElement>('.path-stage[data-variant=orbit]')!, o = stage.getBoundingClientRect();
      const segments = [...stage.querySelectorAll('.orbit-flow-segment')].map(g => ({id: g.getAttribute('data-segment')!, d: g.querySelector('.orbit-flow-core')!.getAttribute('d')!}));
      const stroke = (sel: string) => getComputedStyle(stage.querySelector(sel)!).strokeWidth;
      const planet = stage.querySelector<HTMLElement>('[data-path-point^="planet:"]')!, p = planet.getBoundingClientRect();
      // (The line's points, every 2 px, and each tab's box, on the screen.)
      const pts = [...stage.querySelectorAll<SVGPathElement>('.orbit-flow-core')].flatMap(path => { const n = path.getTotalLength(), m = path.getScreenCTM()!, out: {x: number; y: number}[] = []; for (let l = 0; l <= n; l += 2) { const q = path.getPointAtLength(l); out.push({x: q.x * m.a + m.e, y: q.y * m.d + m.f}); } return out; });
      const tabs = [...stage.querySelectorAll<HTMLElement>('.orbit-tab')].map(t => { const r = t.getBoundingClientRect(), text = t.querySelector<HTMLElement>('.path-label-text')!; return {label: t.title, shown: text.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom, cut: text.scrollWidth > text.clientWidth + 1}; });
      return {w: o.width, segments, strokes: [stroke('.orbit-flow-core'), stroke('.orbit-flow-halo'), stroke('.orbit-flow-glow path')], blur: stage.querySelector('feGaussianBlur')!.getAttribute('stdDeviation'),
        planetR: planet.offsetWidth / 2, planetY: p.top + p.height / 2 - o.top, pts, tabs, vw: innerWidth};
    };
    // The computer's own path: the real page at 1440 × 900 (its stage is the virtual column).
    const desk = await browser.newContext({viewport: {width: 1440, height: 900}}), dp = await desk.newPage();
    await seedChecklist(dp, {path: pathOf(PATHS[name])}); await dp.goto('/app/checklist'); await settled(dp);
    await expect(dp.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 15_000});
    const computer = await dp.evaluate(readLine); await desk.close();
    expect(computer.w, 'the virtual column is the computer\'s stage').toBe(COMPUTER.w);
    await open(page, PATHS[name]);
    const phone = await page.evaluate(readLine);
    const {s, dx, dy} = phoneTransform(phone.w, computer.planetY, 2 * phone.planetR + 10);
    expect(phone.segments.map(q => q.id), 'the same stretches').toEqual(computer.segments.map(q => q.id));
    const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), off: string[] = [];
    computer.segments.forEach((q, i) => { const a = nums(q.d), b = nums(phone.segments[i]!.d); if (a.length !== b.length) off.push(`${q.id}: ${a.length} vs ${b.length} numbers`); else a.forEach((v, k) => { const want = v * s + (k % 2 ? dy : dx); if (Math.abs(b[k]! - want) > .5) off.push(`${q.id}[${k}]: ${b[k]} vs ${want.toFixed(2)}`); }); });
    expect(off, `the computer's line × ${s.toFixed(3)}`).toEqual([]);
    expect(phone.strokes, 'the computer\'s stroke widths, never scaled down').toEqual(computer.strokes);
    expect(phone.blur, 'the computer\'s glow').toBe(computer.blur);
    for (const t of phone.tabs) {
      expect(t.shown, `${t.label}: the whole name`).toBe(t.label); expect(t.cut, `${t.label}: nothing cut`).toBe(false);
      expect(t.left, `${t.label}: inside the column`).toBeGreaterThanOrEqual(0); expect(t.right).toBeLessThanOrEqual(phone.vw);
    }
    const under = phone.tabs.filter(t => phone.pts.some(q => q.x > t.left + 1 && q.x < t.right - 1 && q.y > t.top + 1 && q.y < t.bottom - 1)).map(t => t.label);
    expect(under, 'no tab over the line').toEqual([]);
  });

  test('ZIGi stands clear of the line, every node, every name tab and the NEXT badge (three sample paths)', async ({page}) => {
    for (const name of ['long', 'short', 'two'] as const) {
      await open(page, PATHS[name]);
      await expect(page.locator('[data-next] .path-zigi[data-alive] .path-zigi-figure')).toHaveCount(1);
      await page.waitForTimeout(700);
      const hits = await page.evaluate(() => {
        const box = (el: Element) => { const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom}; };
        const z = box(document.querySelector('[data-next] .path-zigi[data-alive] .path-zigi-figure')!), out: string[] = [];
        const hit = (b: {left: number; right: number; top: number; bottom: number}) => z.left < b.right && z.right > b.left && z.top < b.bottom && z.bottom > b.top;
        for (const d of document.querySelectorAll('.path-stage .path-dot')) if (hit(box(d))) out.push(`node ${d.getAttribute('data-step')}`);
        for (const t of document.querySelectorAll('.path-stage .orbit-tab')) if (hit(box(t))) out.push(`tab ${t.textContent}`);
        for (const t of document.querySelectorAll('.path-stage .path-next-tag')) if (hit(box(t))) out.push('the NEXT badge');
        const svg = document.querySelector('.path-stage svg.orbit-flow')!, o = svg.getBoundingClientRect();
        for (const p of svg.querySelectorAll<SVGPathElement>('.orbit-flow-core')) {
          const len = p.getTotalLength();
          for (let l = 0; l <= len; l += 2) { const q = p.getPointAtLength(l), x = o.left + q.x, y = o.top + q.y; if (x > z.left && x < z.right && y > z.top && y < z.bottom) { out.push(`the line (${p.parentElement!.getAttribute('data-segment')})`); break; } }
        }
        return out;
      });
      expect(hits, `${name}: ZIGi's box`).toEqual([]);
    }
  });

  test('the current node, once the path moves to it, stands clear of the timer row', async ({page}) => {
    await open(page, LONG);
    const stage = page.locator('.path-stage');
    // Tick the morning: the path glides on to the next orbit, whose first node is then the current one.
    for (const [label] of LONG.slice(0, 5)) await stage.getByRole('button', {name: `${label}: not done yet`, exact: true}).click();
    await expect(page.locator('[data-next] .path-dot')).toHaveAttribute('data-step', 'ck_river-6');
    await page.waitForTimeout(2600);
    const at = await page.evaluate(() => ({node: document.querySelector('[data-next] .path-dot')!.getBoundingClientRect().bottom, dock: document.querySelector('.checklist-dock')!.getBoundingClientRect().top, head: document.querySelector('.checklist-topbar')!.getBoundingClientRect().bottom}));
    expect(at.node, 'above the timer row').toBeLessThanOrEqual(at.dock);
    expect(at.node - 62, 'below the top bar').toBeGreaterThanOrEqual(at.head);
  });
});
