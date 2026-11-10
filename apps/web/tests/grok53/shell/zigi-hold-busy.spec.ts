import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../../../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {ZIGI_VOICE_KEY} from '../../../lib/z-device-keys';
import {GAME_KEY} from '../../../lib/aa-device-keys';
import {NOVA_SETUP_KEY, setPrivacyMode} from '../../../lib/nova/setup';
import {hydrated, offlineApi} from '../../ah-helpers';

/**
 * Session AL (docs/review/session-al/CI_INTERMITTENTS.md, Fix 2; zigi-voice-z:221 on WebKit): a hold on ZIGi's launcher
 * whose release reaches the page before the hold timer (a busy main thread) was read as a tap: the chat opened without
 * the hold's "Tap the mic to talk". The main thread is blocked for real between a real mouse down and up (no synthetic
 * events), so the timer and the release are queued together. Red before the fix, green after. Desktop only: below 901 px
 * the launcher does not float (owner decision O3). The recognition is a MOCK.
 */
const DAY = '2026-09-20';
test.use({viewport: {width: 1440, height: 900}});
test.beforeEach(async ({page, isMobile}) => {
  test.skip(isMobile, 'The floating launcher is a computer’s (O3)');
  await offlineApi(page);
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>, log = {starts: 0};
    w.__voiceLog = log;
    class FakeRecognition { lang = ''; onresult = null; onend: (() => void) | null = null; onerror = null; start() { log.starts++; } stop() { setTimeout(() => this.onend?.(), 30); } abort() {} }
    w.SpeechRecognition = FakeRecognition; w.webkitSpeechRecognition = FakeRecognition;
  });
});
async function seed(page: Page) {
  // No page.clock here: a fake performance.now() would stand still inside the busy loop below.
  await page.goto('/app/help');
  const values: Record<string, string> = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})};
  values[ZIGI_VOICE_KEY] = JSON.stringify({version: 1, disclosed: {chrome: '2026-09-01T00:00:00.000Z', safari: '2026-09-01T00:00:00.000Z', other: '2026-09-01T00:00:00.000Z'}});
  values[NOVA_SETUP_KEY] = JSON.stringify(setPrivacyMode(JSON.parse(values[NOVA_SETUP_KEY] ?? '{"version":1}'), 'guarded', DAY));
  // The Showcase is built for DAY but the page runs on the real date, so the game layer celebrated a badge earned since
  // ("Thirty days clear"); its full-screen card (z-index 70) took the press meant for the launcher. The layer is off here.
  values[GAME_KEY] = JSON.stringify({...JSON.parse(values[GAME_KEY] ?? '{"version":1}'), enabled: false});
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
  await page.waitForLoadState('networkidle');
}

test('Fix 2: a hold whose release arrives before the hold timer (busy main thread) is still a hold', async ({page}) => {
  await seed(page);
  await page.goto('/app'); await hydrated(page);
  const button = page.getByTestId('ai-launcher').getByRole('button', {name: /ZIGi, your personal AI companion/});
  await expect(button).toBeVisible();
  const b = (await button.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  // The page is busy for 600 ms (> the 350 ms hold): the hold timer cannot run before the release is queued.
  await page.evaluate(() => { const end = performance.now() + 600; while (performance.now() < end) { /* busy */ } });
  await page.mouse.up();
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible({timeout: 15_000});
  await expect(panel.locator('.ai-voice-hint')).toContainText('Tap the mic to talk');
  // Still a hold, never a listening session started by a tap.
  expect(await page.evaluate(() => (window as unknown as {__voiceLog: {starts: number}}).__voiceLog.starts)).toBe(0);
});
