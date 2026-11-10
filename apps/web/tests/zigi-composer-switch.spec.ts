import {expect, test} from '@playwright/test';
import {openZigi, zigiBox, zigiPanel} from './zigi-open';
import {AI_SETTINGS_KEY} from '../lib/ai/settings';
import {connected, mockModel, seed} from './grok53/ai/helpers';

/**
 * AK's D7 / STATUS AK KL "Words typed into ZIGi's box during the switch to the person's AI are lost (Safari)": the composer's
 * words survive the switch from on-device answers to a connected model, which mounts a new composer (lib/ai/composer-draft.ts).
 * Session AL Part 14: moved here from tests/grok53/ai/al-stability.spec.ts so its `zigi-*.spec.ts` name puts it in CI's WebKit
 * job (playwright.webkit.config.ts testMatch) — WebKit was where D7 showed, and the old file was never run there. It still
 * runs in the desktop and mobile Chromium projects. The assertion is unchanged.
 */
test.use({timezoneId: 'UTC'});
test('D7: words typed before the AI connects are still in the box after it connects', async ({page}) => {
  await mockModel(page);
  await seed(page);
  await page.goto('/app');
  await openZigi(page);
  await zigiBox(page).fill('How was my week');
  // Connect in another tab's way: the settings record changes and this page hears it (the on-device composer is replaced).
  await page.evaluate(([key, value]) => { localStorage.setItem(key, value); window.dispatchEvent(new StorageEvent('storage', {key, newValue: value})); }, [AI_SETTINGS_KEY, JSON.stringify(connected())] as const);
  await expect(zigiPanel(page).getByRole('textbox', {name: 'Message to your AI'})).toHaveValue('How was my week', {timeout: 10_000});
});
