import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from '../../ah-helpers';

/**
 * Session AL Part 15, lane P15-A (platform): fresh profile, desktop 1280, every /api request answered 503, fictional data.
 * - GAP-170 (C-DVG-95): a brain dump spoken into Quick add becomes one card per item. Headless Chrome has no microphone or
 *   speech service, so the browser's SpeechRecognition is a test double that "hears" one fixed line; what is checked is the
 *   app's own part: the words land in the line and are split into items, nothing is saved before Add.
 * - GAP-178 (C-DVG-90): Help's release history, newest first, each "Read more" a section on the same page.
 * - GAP-040 (C-TK-32): Today's wealth line says the change since yesterday, from the person's recorded values (Showcase).
 */
test.use({viewport: {width: 1280, height: 900}, timezoneId: 'UTC'});

async function fakeSpeech(page: Page, line: string) {
  await page.addInitScript(heard => {
    class FakeRecognition {
      lang = ''; interimResults = false; continuous = false; maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null; onerror: ((e: unknown) => void) | null = null; onend: (() => void) | null = null;
      start() { setTimeout(() => { this.onresult?.({results: [Object.assign([{transcript: heard}], {isFinal: true})]}); this.onend?.(); }, 50); }
      stop() { this.onend?.(); }
      abort() { /* nothing is listening */ }
    }
    (window as unknown as {SpeechRecognition: unknown}).SpeechRecognition = FakeRecognition;
  }, line);
}

test('GAP-170: a spoken brain dump lands in Quick add as one card per item; nothing is saved before Add', async ({page}) => {
  await offlineApi(page); await fakeSpeech(page, 'um two glasses of water and a banana and 30 push-ups');
  await freshDevice(page);
  await page.goto('/app'); await hydrated(page);
  await page.locator('.quick-add-trigger:visible').first().click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'});
  await dialog.getByRole('button', {name: 'Speak a line'}).click();
  const line = dialog.getByRole('textbox', {name: 'Type a line'});
  // The spoken way: the filler is gone and the numbers are digits ("a banana" reads as 1).
  await expect(line).toHaveValue(/^2 glasses of water and 1 banana and 30 push-ups$/);
  // One card per item, with "Add all" for the batch (components/ai/proposal-list.tsx).
  const cards = dialog.locator('.ai-proposals');
  await expect(cards.getByRole('button', {name: /^Add all [2-9]$/})).toBeVisible({timeout: 15_000});
  await expect(cards).toContainText(/water/i);
  await expect(cards).toContainText(/banana/i);
  const health = await page.evaluate(() => Object.keys(localStorage).filter(k => /health|water|food/i.test(k) && localStorage.getItem(k)!.includes('banana')));
  expect(health).toEqual([]);
});

test('GAP-178: Help lists every published version, newest first, each linked to its section', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/help#release-history'); await hydrated(page);
  const history = page.getByRole('region', {name: 'Every published version, newest first'});
  await expect(history).toBeVisible();
  await expect(history).toContainText('Help opens for anyone, with no account, so this list is public.');
  const items = history.locator('ol.help-releases > li');
  await expect(items.first()).toContainText('Alpha #53 · 4 Nov 2026');
  await expect(items.nth(1)).toContainText('Alpha #52 · 30 Oct 2026');
  expect(await items.count()).toBeGreaterThanOrEqual(8);
  for (const href of await history.getByRole('link', {name: 'Read more'}).evaluateAll(links => links.map(a => a.getAttribute('href')!))) {
    expect(await page.locator(`[id="${href.slice(1)}"]`).count(), href).toBe(1);
  }
  await expect(history).not.toContainText(/Session|ADR|Jarvis/);
});

test('GAP-040: Today’s wealth headline has a 30-day line and the change since yesterday, from recorded values', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  const trend = page.locator('.today-wealth-trend').first();
  await expect(trend).toBeVisible();
  await expect(trend.locator('small')).toHaveText(/^(Unchanged since yesterday|No reading yesterday to compare|[+−].+ since yesterday) · your recorded values, last 30 days$/);
  await expect(trend.locator('svg')).toHaveAttribute('aria-hidden', 'true');
});
