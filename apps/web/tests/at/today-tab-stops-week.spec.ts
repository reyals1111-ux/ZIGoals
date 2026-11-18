import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../ah-helpers';

/**
 * Session AT (ADR-043 D3; the carried "Today ≤ 90 Tab stops on every day and time"). Session AO's spec counts Showcase Today
 * on one weekday morning (tests/ao/today-tab-stops.spec.ts); Session AQ saw 92 on a Sunday evening (the weekly review's
 * two buttons) and Session AR 91 on a dev server. Here the same count is taken on every day of one week, in the morning
 * and in the evening, and must be at most 90 each time. Counted as AO does: Tab from the top until the focus comes round.
 */
test.use({viewport: {width: 1440, height: 900}});
test.setTimeout(240_000);

const active = (page: Page) => page.evaluate(() => {
  const e = document.activeElement as HTMLElement | null;
  if (!e || e === document.body) return null;
  if (!e.dataset.tabStopKey) e.dataset.tabStopKey = String(Math.random());
  return {key: e.dataset.tabStopKey, name: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 60)};
});

async function countStops(page: Page) {
  await page.goto('/app'); await hydrated(page);
  await expect(page.locator('[data-roving]').first()).toBeAttached({timeout: 20_000});
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(1_500);
  await page.evaluate(() => { window.scrollTo(0, 0); (document.activeElement as HTMLElement | null)?.blur(); });
  const stops: string[] = [];
  let first: string | null = null;
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const now = await active(page);
    if (!now) continue;
    if (now.key === first) break;
    first ??= now.key;
    stops.push(now.name);
  }
  return stops;
}

// Mon 16 Nov 2026 … Sun 22 Nov 2026, at 07:30 and at 20:30 in the browser's zone (UTC here and on CI).
const DAYS = ['16', '17', '18', '19', '20', '21', '22'];
for (const day of DAYS) {
  test(`D3: Showcase Today on 2026-11-${day}, morning and evening, takes at most 90 Tab stops`, async ({page}, info) => {
    test.skip(info.project.name !== 'desktop', 'Counted at 1440 px as the replay did');
    await offlineApi(page);
    for (const time of ['07:30', '20:30']) {
      await page.clock.setFixedTime(new Date(`2026-11-${day}T${time}:00.000Z`));
      if (time === '07:30') await loadShowcase(page);
      const stops = await countStops(page);
      test.info().annotations.push({type: `Tab stops ${day} Nov ${time}`, description: `${stops.length}: ${stops.join(' | ')}`});
      expect.soft(stops.length, `${day} Nov ${time}: ${stops.join(' | ')}`).toBeLessThanOrEqual(90);
      expect(stops).toContain('Skip to Your goals');
    }
  });
}
