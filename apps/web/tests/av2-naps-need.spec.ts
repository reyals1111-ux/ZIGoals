import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #237, #238, Rise): Health → Sleep counts two naps in the 14-day balance (marked as
 * naps, beside the nights-only line), shows today's nap on the energy curve with its estimated lift, and offers a sleep
 * need from the person's own weekend nights (8 h 30 min) as a suggested goal; "Use 8 h 30 min as my goal" keeps it, with
 * Undo — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional nights; /api 503.
 */
test.use({timezoneId: 'UTC'});
const AT = '2026-11-01T10:00:00.000Z';
const day = (n: number) => new Date(Date.parse('2026-11-20T12:00:00Z') - n * 86_400_000).toISOString().slice(0, 10);
const weekend = (d: string) => [0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay());
const night = (i: number) => { const d = day(i), prev = day(i + 1);
  return {id: `health_sleep-fictional-${d}`, kind: 'night', source: 'manual', start: `${prev}T${weekend(d) ? '22:30' : '23:00'}:00.000Z`, end: `${d}T07:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT, latencyMin: 0, awakeMin: 0}; };
const nap = (d: string, from: string, to: string) => ({id: `health_sleep-fictional-nap-${d}`, kind: 'nap', source: 'manual', start: `${d}T${from}:00.000Z`, end: `${d}T${to}:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT});
const nights = [...Array.from({length: 28}, (_, i) => night(i)), nap(day(0), '13:00', '13:25'), nap(day(2), '14:00', '14:30')];

for (const theme of THEMES) test(`${theme}: naps in the balance and the curve, a sleep need from your own nights`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-20T15:00:00Z')});
  const health = withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights, goal: {minutes: 450, updatedAt: AT}} as Sleep, false);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);
  await page.goto('/app/health?view=sleep'); await hydrated(page);

  // Naps in the balance (marked), and the debt note says the debt is nights only.
  const week = page.getByRole('region', {name: 'Your last 7 days'});
  await expect(week.locator('.sleep-balance-naps')).toContainText('With your 2 naps counted (55 min, each on the day it ended, marked as naps)');
  await expect(week).toContainText('Nights only: naps are counted in the balance below, marked as naps.');

  // Today's nap on the energy curve.
  await page.locator('.energy-curve-fold > summary').click();
  const curve = page.locator('.energy-curve');
  // Session AV lane 2 (the curve's note also says “… your nap today”: the term itself, exactly, deliberate)
  await expect(curve.getByText('Your nap today', {exact: true})).toBeVisible();
  await expect(curve).toContainText('25 min');
  await expect(curve.getByRole('img')).toHaveAttribute('aria-label', /A small lift after today's nap, ending/);

  // The sleep need, an estimate, kept as the goal with Undo.
  // Session AW (X6, deliberate): Health → Sleep now also holds X6's region "Your sleep goal over 14 days"; this is the goal's own panel, by its exact name.
  const goal = page.getByRole('region', {name: 'Your sleep goal', exact: true});
  const need = goal.getByRole('group', {name: 'Your sleep need, an estimate'});
  await expect(need).toContainText('8 h 30 min');
  await expect(need).toContainText('the middle of your 8 weekend nights in the last 30 days');
  await expect(need).toContainText('not medical advice');
  const findings = await axe(page, goal);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await need.getByRole('button', {name: 'Use 8 h 30 min as my goal'}).click();
  await expect(page.locator('.sleep-note')).toHaveText('Your sleep goal is now 8 h 30 min, from the estimate.');
  await expect(need).toContainText('That is your goal already.');
  await expect(need.getByRole('button', {name: /as my goal/})).toHaveCount(0);
  expect(await goal.evaluate(el => [...el.querySelectorAll<HTMLElement>('p, span, strong')].filter(e => e.offsetParent && (e.textContent ?? '').trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length)).toBe(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
