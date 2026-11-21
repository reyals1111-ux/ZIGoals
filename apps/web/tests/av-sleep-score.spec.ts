import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-SLEEP-SCORE; Sleep Cycle's routine, quality and duration): Health → Sleep's score adds
 * the wake-time spread to regularity and the nights' own quality ratings as a fourth part — at 390 and 1440, in Nebula,
 * Light and Dark, axe-clean, no sideways scroll at 320. Fictional nights; every /api call answers 503.
 */
test.use({timezoneId: 'UTC'});
const AT = '2026-11-20T10:00:00.000Z', DAYS = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'];
const night = (day: string, quality: number) => { const prev = new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10); return {id: `health_sleep-fictional-${day}`, kind: 'night', source: 'manual', start: `${prev}T23:00:00.000Z`, end: `${day}T07:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT, quality}; };
for (const theme of THEMES) test(`${theme}: seven even nights rated 3 of 5 score 93, the quality part named`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T12:00:00Z')});
  const health = withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights: DAYS.map(d => night(d, 3)), goal: {minutes: 480, updatedAt: AT}} as Sleep, false);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const card = page.getByRole('region', {name: 'Sleep score'});
  await expect(card.getByRole('img', {name: 'Sleep score 93 of 100 over 7 nights'})).toBeVisible();
  const parts = card.locator('.sleep-score-parts > li');
  await expect(parts).toHaveText([/^Duration · .*40 \/ 40$/, /^Regularity · bedtime spread 0 min, wake-time spread 0 min\s*30 \/ 30$/, /^Debt · .*15 \/ 15$/, /^Quality · 3 of 5 on 7 nights you rated\s*8 \/ 15$/]);
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
