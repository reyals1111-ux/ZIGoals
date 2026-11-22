import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (body; LEDGER #123, #124; Sleep Cycle's statistics and weekly report, the benchmark from the person's
 * own nights): Health → Sleep shows "Your week beside your usual" (the median of the 20 nights before this week), "your
 * usual" as a dotted line on the time-asleep chart, time to fall asleep per night, and at 90 days the quality line and
 * time to fall asleep by week — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 * Fictional nights; every /api call 503.
 */
test.use({timezoneId: 'UTC'});
const AT = '2026-11-01T10:00:00.000Z';
const day = (n: number) => new Date(Date.parse('2026-11-20T12:00:00Z') - n * 86_400_000).toISOString().slice(0, 10);
const night = (d: string, startHour: number, latency: number, quality: number) => { const prev = new Date(Date.parse(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return {id: `health_sleep-fictional-${d}`, kind: 'night', source: 'manual', start: `${prev}T${startHour}:00:00.000Z`, end: `${d}T07:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT, latencyMin: latency, quality}; };
const nights = [...Array.from({length: 20}, (_, i) => night(day(8 + i), 23, 10, 3)), ...Array.from({length: 5}, (_, i) => night(day(i), 22, 20, 4))];
for (const theme of THEMES) test(`${theme}: the week beside your usual, time to fall asleep, quality by week`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-20T12:00:00Z')});
  const health = withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights, goal: {minutes: 480, updatedAt: AT}} as Sleep, false);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const usual = page.getByRole('region', {name: 'Your week beside your usual'});
  await expect(usual.locator('.sleep-usual-stats div').filter({hasText: 'Time to fall asleep'})).toContainText('20 min usual 10 min');
  await expect(usual.locator('.sleep-usual-stats div').filter({hasText: 'Time to fall asleep'})).toContainText('10 min longer than usual');
  await expect(usual).toContainText('Your usual is the middle value of your own 20 nights');
  const charts = page.getByRole('region', {name: 'Over time'});
  await expect(charts.getByRole('figure', {name: 'Time asleep · last 7 days'}).locator('.sleep-key')).toContainText('Your usual 7 h 50 min (your own nights)');
  await expect(charts.locator('.sleep-usual line')).toHaveCount(2);
  const latency = charts.getByRole('figure', {name: 'Time to fall asleep · last 7 days'});
  await expect(latency.locator('rect.sleep-bar.latency')).toHaveCount(5);
  const findings = await axe(page, charts);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const cardFindings = await axe(page, usual);
  expect(cardFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(cardFindings)).toEqual([]);
  await charts.getByRole('group', {name: 'Range'}).getByRole('button', {name: '90 days'}).click();
  await expect(charts.getByRole('figure', {name: 'Your quality ratings · last 90 days, by week'}).getByRole('img')).toHaveAttribute('aria-label', /^Your quality ratings, last 90 days, by week: \d+ weeks rated, from 3 to 4 of 5\.$/);
  await expect(charts.getByRole('figure', {name: 'Time to fall asleep · last 90 days, by week'})).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
