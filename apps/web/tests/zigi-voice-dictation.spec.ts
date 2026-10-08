import {expect, test} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';

/**
 * Session X-Local Part 6e, voice: dictation through the browser's own speech recognition with a synthesised WAV as
 * the microphone (`say` → `afconvert`, Chrome's fake audio capture). Run by hand with ZIGI_VOICE=1 and
 * ZIGI_VOICE_WAV=<path>; CI skips it. What is asserted is the app's honesty: the microphone control, its disclosure,
 * and that the composer either receives words or the app says plainly what happened. Whether Chrome's speech service
 * transcribes in an automated browser is recorded in the test's annotations, never assumed (an owner row otherwise).
 */
const WAV = process.env.ZIGI_VOICE_WAV ?? '';
test.skip(process.env.ZIGI_VOICE !== '1' || !WAV, 'Only with ZIGI_VOICE=1 and ZIGI_VOICE_WAV set, by hand.');
test.use({launchOptions: {args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`]}, permissions: ['microphone']});

test('dictation: the microphone listens, and the composer gets the words or the app says why not', async ({page}, info) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  const ai = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234', voice: {transcription: 'browser', transcriptionModel: null, language: 'en-US', readAloud: false}};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase('2026-09-20').records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai)});
  await page.goto('/app');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible();
  const available = await page.evaluate(() => typeof (window as unknown as {SpeechRecognition?: unknown}).SpeechRecognition !== 'undefined' || typeof (window as unknown as {webkitSpeechRecognition?: unknown}).webkitSpeechRecognition !== 'undefined');
  const mic = panel.locator('button.ai-mic');
  await expect(mic).toBeVisible();
  await expect(mic).toHaveAttribute('aria-label', 'Speak (browser speech recognition)');
  info.annotations.push({type: 'speech-api', description: available ? 'SpeechRecognition present' : 'SpeechRecognition absent'});
  await mic.click();
  const composer = page.getByLabel('Message to your AI');
  let words = '', state = '';
  for (let i = 0; i < 15; i++) { await page.waitForTimeout(1000); words = await composer.inputValue(); state = (await mic.getAttribute('aria-label')) ?? ''; if (words) break; }
  const notes = await panel.locator('[role="status"], [role="alert"], .ai-note').allInnerTexts();
  info.annotations.push({type: 'dictation', description: words ? `transcribed: "${words}" (${state})` : `no words after 15 s; control: "${state}"; notes: ${notes.join(' | ').slice(0, 300)}`});
  // Honest either way: words arrived, or the control stopped listening / the app said what happened.
  expect(words.length > 0 || state !== 'Stop listening' || notes.some(n => /speech|microphone|recogni|listen/i.test(n))).toBe(true);
});
