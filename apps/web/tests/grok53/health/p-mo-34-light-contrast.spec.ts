import {expect, test, type Page} from '@playwright/test';
import {createEmptyHealth, saveWeight, setHealthTargets} from '../../../lib/health';
import {freshHealth, openHealth} from './al-health-helpers';

// Session AL lane L2, third pass (P-MO-34): Moscow MO-035, N-MO-08, N-MO-21 in Light: the weight journal's line and goal
// dash, and the water ring's track, are at least 3:1 on the panel behind them. Desktop Light, fresh profile with readings.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});
const AT = '2026-11-04T08:00:00.000Z';
const lum = (rgb: string) => { const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
async function panelColour(page: Page, selector: string) {
  return page.locator(selector).first().evaluate(el => { let n: Element | null = el; while (n) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; n = n.parentElement; } return 'rgb(255, 255, 255)'; });
}

test('MO-035 / N-MO-08: Light weight line, goal dash and water ring track are ≥ 3:1', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  let d = setHealthTargets(createEmptyHealth(), {kcal: null, proteinMg: null, carbsMg: null, fatMg: null, weightGrams: 75_000, steps: null});
  for (const [i, day] of ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'].entries()) d = saveWeight(d, {id: `health_00000000-0000-4000-8000-00000000020${i}`, date: day, grams: 80_000 - i * 300}, AT);
  await freshHealth(page, d);
  await page.evaluate(() => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: 'light'})));
  await openHealth(page, '?view=weight');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const bg = await panelColour(page, '.health-page .evidence-line');
  for (const stroke of await page.locator('.health-page .evidence-line').evaluateAll(els => els.map(el => getComputedStyle(el).stroke))) expect(ratio(stroke, bg)).toBeGreaterThanOrEqual(3);
  await openHealth(page, '?view=diary');
  const track = page.locator('.water-ring .glass-ring-track').first();
  const trackBg = await panelColour(page, '.water-ring');
  expect(ratio(await track.evaluate(el => getComputedStyle(el).stroke), trackBg)).toBeGreaterThanOrEqual(3);
});
