import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi, showcaseState} from '../../ah-helpers';
import {openSettings} from '../../settings-open';

/**
 * Session AL sweep 2 (INT third pass, the Showcase owner's items). 1280 px, Brussels, a fixed clock at 05:30 local, so
 * the chess clamp is exercised (its sample's games were "played" at 07:00 and 08:00 UTC on the open day).
 * - P-NB-65 (NB-029): Settings' Showcase card in plain words: "The Showcase is a separate copy, in this tab only".
 * - P-PR-25 (PR-022): Goals' sleep goal says 8 hours, as Sleep's own goal (480 min).
 * - P-PR-38 (PR-079): the ZIG reward reserve is dated by the open day on Staking, as Wealth's manual value is.
 * - P-PR-09 (PR-009, PR-108, BUG-037): no Showcase chess record is later than now.
 */
test.use({viewport: {width: 1280, height: 900}, timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await offlineApi(page); await page.clock.install({time: new Date('2026-11-04T04:30:00Z')}); });

test('the Showcase card, the sleep goal, the staking date and chess times', async ({page}) => {
  await freshDevice(page);
  await openSettings(page); await hydrated(page);
  await expect(page.locator('#showcase')).toContainText('The Showcase is a separate copy, in this tab only; your own data and wallet records are untouched.');
  await expect(page.locator('#showcase')).not.toContainText('separate storage');
  await loadShowcase(page);
  const platform = await showcaseState(page);
  const zig = platform.positions.find(p => p.id === 'showcase-zig')!;
  expect(zig.observedAt).toBe(zig.valuation!.observedAt);
  await page.goto('/app/goals'); await hydrated(page);
  await expect(page.getByRole('article', {name: 'Sleep 8 hours a night'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'Sleep 7 hours a night'})).toHaveCount(0);
  const now = await page.evaluate(() => Date.now());
  const chess = await page.evaluate(() => { const marker = JSON.parse(sessionStorage.getItem('zigoals:showcase:active:v1')!); const raw = Object.keys(sessionStorage).find(k => k.startsWith(`zigoals:showcase:v1:${marker.generation}:`) && k.includes('chess') && sessionStorage.getItem(k)!.includes('"games"')); return raw ? JSON.parse(sessionStorage.getItem(raw)!) as {games: {endedAt: string}[]; snapshots: {at: string}[]} : null; });
  expect(chess).not.toBeNull();
  for (const at of [...chess!.games.map(g => g.endedAt), ...chess!.snapshots.map(s => s.at)]) expect(Date.parse(at)).toBeLessThanOrEqual(now);
});
