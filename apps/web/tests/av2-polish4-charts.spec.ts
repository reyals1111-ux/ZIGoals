import {expect, test, type Locator} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {openHabitDetails} from './ab-shell';
import {SCALES_KEY} from '../lib/scales/store';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (polish4, owner follow-up 6 step 4): a chart's axis words read at 14 px at every width. They were SVG
 * text that shrank with the chart (a habit's longer history: about 6 px on a phone; a scale's statistics: about 10 px);
 * now they are HTML beside and under the chart. Checked on the Showcase's Walk and on a fictional scale, at 390 and 1440,
 * in Nebula, Light and Dark: every axis word ≥ 14 px, the top label above the bottom one and both beside the chart, the
 * dates under it, axe-clean, no sideways scroll at 320.
 */
async function axisWords(plot: Locator, chartSel: string) {
  const m = await plot.evaluate((el, sel) => {
    const svg = el.querySelector(sel)!.getBoundingClientRect();
    const y = [...el.querySelectorAll(':scope > [class$="-y"] > span')].map(s => { const r = s.getBoundingClientRect(); return {size: parseFloat(getComputedStyle(s).fontSize), top: r.top, bottom: r.bottom, right: r.right}; });
    const x = [...el.querySelectorAll(':scope > [class$="-x"] > span')].map(s => { const r = s.getBoundingClientRect(); return {size: parseFloat(getComputedStyle(s).fontSize), top: r.top, left: r.left, right: r.right}; });
    return {svg: {top: svg.top, bottom: svg.bottom, left: svg.left, right: svg.right}, y, x, svgText: el.querySelectorAll('svg text').length};
  }, chartSel);
  expect(m.svgText).toBe(0);
  expect(m.y).toHaveLength(3);
  expect(m.x).toHaveLength(2);
  for (const w of [...m.y, ...m.x]) expect(w.size, JSON.stringify(m)).toBeGreaterThanOrEqual(14);
  expect(m.y[0]!.bottom, JSON.stringify(m)).toBeLessThanOrEqual(m.y[1]!.top + 1);
  expect(m.y[1]!.bottom, JSON.stringify(m)).toBeLessThanOrEqual(m.y[2]!.top + 1);
  for (const w of m.y) { expect(w.right, JSON.stringify(m)).toBeLessThanOrEqual(m.svg.left + 1); expect(w.top).toBeGreaterThanOrEqual(m.svg.top - 12); expect(w.bottom).toBeLessThanOrEqual(m.svg.bottom + 12); }
  for (const w of m.x) expect(w.top, JSON.stringify(m)).toBeGreaterThanOrEqual(m.svg.bottom - 1);
  expect(m.x[0]!.left).toBeLessThan(m.x[1]!.left);
}

for (const theme of THEMES) for (const width of [390, 1440]) test(`${theme} ${width}: a habit's strength chart has readable axis words`, async ({page}) => {
  await applyTheme(page, theme);
  await page.setViewportSize({width, height: 900});
  await loadShowcase(page);
  await page.goto('/app/habits'); await hydrated(page);
  const walk = page.getByRole('article', {name: 'Walk', exact: true});
  await openHabitDetails(walk);
  await walk.getByText('Consistency & trends', {exact: true}).click();
  await walk.locator('summary', {hasText: 'More history: strength over the year, months and weekdays'}).click();
  const plot = walk.locator('.habit-longer-plot');
  await expect(plot).toBeVisible({timeout: 15_000});
  await axisWords(plot, 'svg.habit-longer-chart');
  const findings = await axe(page, walk.locator('.habit-longer'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

const TODAY = '2026-11-04';
const record = {version: 1, scales: [{id: 'stress', name: 'Fictional stress', low: 'calm', high: 'very tense'}], days: {'2026-11-01': {stress: 2}, '2026-11-02': {stress: 4}, '2026-11-03': {stress: 2}}};
test.describe('scale statistics', () => {
  test.use({timezoneId: 'UTC'});
  for (const theme of THEMES) for (const width of [390, 1440]) test(`${theme} ${width}: a scale's chart has readable axis words`, async ({page}) => {
    await applyTheme(page, theme);
    await page.setViewportSize({width, height: 900});
    await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
    await offlineApi(page); await freshDevice(page);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SCALES_KEY, JSON.stringify(record)] as const);
    await page.goto('/app/journal'); await hydrated(page);
    const section = page.locator('#your-scales');
    await section.locator('summary', {hasText: 'How your scales went'}).click();
    const plot = section.locator('.scale-stats-plot');
    await expect(plot).toBeVisible({timeout: 15_000});
    await axisWords(plot, 'svg.scale-stats-chart');
    const findings = await axe(page, section.locator('.scale-stats'));
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  });
});
