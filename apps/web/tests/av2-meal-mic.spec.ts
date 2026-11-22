import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #85; MyFitnessPal's Voice Log): a microphone on Health's "What did you eat?" field.
 * The browser's speech recognition is a FAKE here (it says the words the test gives); where the browser has none, no
 * button is shown. Speaking only fills the field; "Log in words" logs. At 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, by keyboard, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
async function fakeSpeech(page: Page, available: boolean) {
  await page.addInitScript(available => {
    const w = window as unknown as Record<string, unknown>;
    class FakeRecognition {
      lang = ''; interimResults = false; continuous = false; maxAlternatives = 1; onresult: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((e: unknown) => void) | null = null;
      constructor() { w.__mealMic = this; }
      start() { w.__mealMicLang = [...((w.__mealMicLang as string[] | undefined) ?? []), this.lang]; }
      stop() { this.onend?.(); }
      abort() {}
    }
    if (available) { w.SpeechRecognition = FakeRecognition; w.webkitSpeechRecognition = FakeRecognition; }
    else { delete w.SpeechRecognition; delete w.webkitSpeechRecognition; }
    w.__mealSay = (text: string) => { const r = w.__mealMic as FakeRecognition; r.onresult?.({resultIndex: 0, results: [Object.assign([{transcript: text}], {isFinal: true})]}); r.onend?.(); };
  }, available);
}
async function openWords(page: Page) {
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
  return page.getByRole('form', {name: 'Just describe it'}).first();
}
for (const theme of THEMES) test(`${theme}: "two eggs and a slice of toast" spoken into the meal field, then logged in words`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page); await fakeSpeech(page, true);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health'); await hydrated(page);
  const form = await openWords(page);
  const mic = form.getByRole('button', {name: 'Speak your meal'});
  await expect(mic).toHaveAttribute('aria-pressed', 'false');
  await mic.focus(); await page.keyboard.press('Enter');
  await expect(form.getByRole('button', {name: 'Stop listening'})).toHaveAttribute('aria-pressed', 'true');
  await expect(form.getByRole('status').filter({hasText: 'Listening'})).toBeVisible();
  const findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.evaluate(() => (window as unknown as {__mealSay: (t: string) => void}).__mealSay('um two eggs and a slice of toast'));
  const field = form.getByLabel('What did you eat?');
  await expect(field).toHaveValue('2 eggs and a slice of toast');
  // Nothing is logged by speaking.
  await expect(page.getByRole('region', {name: 'Breakfast diary'})).not.toContainText('2 eggs');
  await form.getByLabel('Meal').selectOption('Breakfast');
  await form.getByRole('button', {name: 'Log in words'}).click();
  await expect(form.getByRole('status').filter({hasText: 'Logged in words'})).toContainText('“2 eggs and a slice of toast”');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('no speech recognition in the browser: no microphone, the field works as before', async ({page}) => {
  await offlineApi(page); await freshDevice(page); await fakeSpeech(page, false);
  await page.goto('/app/health'); await hydrated(page);
  const form = await openWords(page);
  await expect(form.getByLabel('What did you eat?')).toBeVisible();
  await expect(form.getByRole('button', {name: /Speak your meal|Stop listening/})).toHaveCount(0);
  await expect(form).not.toContainText('Speech is handled by your browser');
});
