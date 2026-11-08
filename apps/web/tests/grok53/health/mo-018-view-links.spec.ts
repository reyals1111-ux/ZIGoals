import {expect, test} from '@playwright/test';
import {freshHealth, healthView, openHealth} from './al-health-helpers';
import {hydrated} from '../../ah-helpers';

// Session AL lane L2 (P-MO-21): Moscow MO-018/MO-083/MO-096, BUG-080. /app/health?view=weight opened the Diary, and after
// a save and a reload the page fell back to the Diary while the address still said weight. Desktop and 375, fresh profile.
test.use({timezoneId: 'Europe/Brussels'});

for (const width of [1280, 375]) test(`MO-018/MO-096 @${width}: every Health view opens from ?view= and stays after a reload`, async ({page}) => {
  await page.setViewportSize({width, height: width === 375 ? 667 : 900});
  await freshHealth(page);
  for (const [key, name] of [['weight', 'Weight'], ['targets', 'Targets'], ['planner', 'Planner'], ['measurements', 'Measurements'], ['activity', 'Activity'], ['insights', 'Insights'], ['import', 'Import'], ['diary', 'Diary']] as const) {
    await openHealth(page, `?view=${key}`);
    await expect(healthView(page, name)).toHaveAttribute('aria-selected', 'true');
  }
  await healthView(page, 'Targets').click();
  await expect(page).toHaveURL(/[?&]view=targets\b/);
  await page.reload(); await hydrated(page);
  await expect(healthView(page, 'Targets')).toHaveAttribute('aria-selected', 'true');
});
