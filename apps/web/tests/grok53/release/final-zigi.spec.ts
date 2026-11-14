import {expect, test, type Locator, type Page} from '@playwright/test';
import {openZigi, sendToZigi, zigiBox, zigiPanel} from '../../zigi-open';
import {buildShowcase} from '../../../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {AI_OPTIONS_KEY} from '../../../lib/ai/store/keys';
import {HABITS_KEY} from '../../../lib/habits';
import {TASKS_KEY} from '../../../lib/tasks/schema';
import {PLATFORM_KEY} from '../../../lib/positions';
import {NOVA_SETUP_KEY} from '../../../lib/nova/setup';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../../lib/af-checklist-keys';
import {denver, lisbon} from '../../../lib/ai/evals/l7-fourth-fixtures';
import {nova, sendInNova} from '../ai/helpers';
import {openSettings} from '../../settings-open';

/**
 * Session AL final fix pass (lane L7; docs/review/session-al/GROK53_REPLAY_ZIGI_3.md, _PILLARS_3.md Z-061/Z-021/Z-025,
 * _PRIMITIVES_3.md DV:Z-032): one test per group of the ZIGi and NOVA rows still open on 1a7b0163, typed as the bots typed
 * them, in their conditions (no model; Wed 4 Nov 2026 02:30 in Brussels; Lisbon, Denver or the Showcase). Fictional data;
 * every /api request answers 503 and the local servers are refused in the page, so nothing leaves the browser.
 */
const NIGHT = '2026-11-04T01:30:00.000Z', DAY = '2026-11-04';
const zigiTurn = (page: Page) => zigiPanel(page).locator('.ai-turn-local').last();
const novaTurn = (page: Page) => nova(page).locator('.nova-turn-local').last();
const base = {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})};
type Set = 'L1' | 'L2' | 'DV' | 'Sc' | 'fresh';
function records(set: Set): Record<string, string> {
  if (set === 'Sc') return {...buildShowcase(DAY).records, ...base};
  if (set === 'fresh') return {...base};
  const s = set === 'DV' ? denver() : lisbon(set);
  return {...base, [HABITS_KEY]: JSON.stringify(s.habits), [PLATFORM_KEY]: JSON.stringify(s.platform), ...(s.nova?.tasks ? {[TASKS_KEY]: JSON.stringify(s.nova.tasks)} : {}),
    ...(s.checklist ? {[CHECKLIST_KEY]: JSON.stringify(s.checklist.record), [CHECKLIST_DAYS_KEY]: JSON.stringify(s.checklist.days)} : {})};
}
async function seed(page: Page, set: Set, clock = true) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  if (clock) await page.clock.install({time: NIGHT});
  await openSettings(page);
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, records(set));
  await page.waitForLoadState('networkidle');
}
const text = async (turn: Locator) => (await turn.innerText()).replace(/\s+\n/g, '\n').trim();
/** One ZIGi chat on a page: each message in turn, the words of each reply. */
async function zigiChat(page: Page, path: string, asks: readonly string[]): Promise<string[]> {
  await page.goto(path); await openZigi(page);
  const out: string[] = [];
  for (const ask of asks) { const before = await zigiPanel(page).locator('.ai-turn-local').count(); await sendToZigi(page, ask); await expect(zigiPanel(page).locator('.ai-turn-local')).toHaveCount(before + 1); out.push(await text(zigiTurn(page))); }
  return out;
}
async function novaAsk(page: Page, ask: string): Promise<string> {
  await page.goto('/app/nova'); await sendInNova(page, ask);
  await expect(novaTurn(page)).toBeVisible();
  return text(novaTurn(page));
}

test.describe('desktop (1280, en-GB, Europe/Brussels)', () => {
  test.use({viewport: {width: 1280, height: 900}, timezoneId: 'Europe/Brussels', locale: 'en-GB'});

  test('1 (TK:14–16, Z12, C-TK-35, BUG-055, TK-051): money follow-ups keep the question', async ({page}) => {
    await seed(page, 'Sc');
    const [eth, eur, btc, again] = await zigiChat(page, '/app/wealth', ['how mch eth do i hav', 'and in EUR?', 'and BTC?', 'and for ETH?']);
    expect(eth).toContain('ETH in Wealth');
    expect(eur).toContain('ETH in Wealth'); expect(eur).toContain('No value in EUR');
    expect(btc).toContain('BTC in Wealth');
    expect(again).toContain('ETH in Wealth');
    for (const t of [eur, btc, again]) expect(t).not.toContain('That isn’t something I can answer');
  });

  test('2 (NB:P6, BUG-056, NB-107): a typo\'d coin question with nothing in Wealth says so, never 0', async ({page}) => {
    await seed(page, 'L1');
    const [zigi] = await zigiChat(page, '/app/journey', ['how mch eth do i hav']);
    const nv = await novaAsk(page, 'how mch eth do i hav');
    for (const t of [zigi, nv]) { expect(t).toContain('You have no ETH recorded in Wealth, so there is no amount to show.'); expect(t).toContain('Wealth → + Add asset → Crypto'); expect(t).not.toMatch(/\b0 ETH\b/); }
  });

  test('3 (BN-053, N-LA-01): Help\'s words for a page question; the closest answer for a near miss', async ({page}) => {
    await seed(page, 'L1');
    const [both, water, emoji] = await zigiChat(page, '/app/help', ['What is on the Ecosystem page, and what does Chess have to do with ZIGoals?', 'I didn\'t drink water today', '🙂🙂🙂']);
    expect(both).toContain('From Help, “What is the Ecosystem page?”: A directory of projects on ZIGChain');
    expect(both).toContain('From Help, “What does the Chess page do?”: Add your public Lichess or Chess.com username');
    expect(water).toContain('The closest question I can answer here is “Did I do Drink water today?”');
    expect(water).toContain('Drink water: 0 times today');
    expect(emoji).toContain('For example');
    const nv = await novaAsk(page, 'What is on the Ecosystem page, and what does Chess have to do with ZIGoals?');
    expect(nv).toContain('From Help, “What is the Ecosystem page?”');
  });

  test('4 (DV:Z-003, DV:N-004): one goal money format in the one-goal answer and the list', async ({page}) => {
    await seed(page, 'DV');
    const [one, list] = await zigiChat(page, '/app/goals', ['How far am I on my Holiday goal?', 'list my goals']);
    expect(one).toContain('US$500'); expect(list).toContain('US$500');
    expect(list).not.toContain('500.00 USD'); expect(list).not.toContain('0.00 USD');
  });

  test('5 (DV:N-007, DV:N-064, N-LA-08): real places for Auto-accept and the Health switches', async ({page}) => {
    await seed(page, 'DV');
    const nv = await novaAsk(page, 'What can you read about me?');
    expect(nv).toContain('Settings → ZIGi · Your Personal AI Companion → Auto-accept; that group shows once an AI is turned on there');
    expect(nv).not.toContain('Settings → ZIGi → Auto-accept');
    await seed(page, 'L1');
    const [water] = await zigiChat(page, '/app/tasks', ['how much water did i drink today']);
    expect(water).toContain('“Health page data” and “Include Health”');
    expect(water).toContain('They are the same two switches NOVA → Permissions shows.');
  });

  test('6 (LS:#382m, NB:T3, NB:H1, NB:H2): no card the reply refuses; "the first one" and "behind" read the records', async ({page}) => {
    await seed(page, 'L2');
    const [added, first] = await zigiChat(page, '/app/tasks', ['add stretch to my evening checklist', 'tick the first one']);
    expect(added).toContain('Stretch 5 min is already on your Checklist, in the Afternoon orbit, so there is nothing to add.');
    expect(added).not.toContain('Star Stretch 5 min');
    expect(first).toContain('The first one on your path is Stretch 5 min');
    await expect(zigiTurn(page).getByRole('button', {name: /^(?:Add|Apply)\b/})).toBeVisible();
    await seed(page, 'DV');
    const [, tick, behind] = await zigiChat(page, '/app/habits', ['which habits are open today?', 'tick the first one', 'which of these habits am I behind on']);
    expect(tick).toContain('The first one among today’s open habits is Drink water');
    expect(behind).toContain('Behind on schedule over the last 7 days');
    expect(behind).not.toContain('Habits still open');
  });

  test('7 (Z-061, Z-021, Z-025): the review line, the streak and the Walk goal agree with the records', async ({page}) => {
    await seed(page, 'Sc');
    await page.goto('/app'); await openZigi(page);
    await zigiBox(page).fill('/review'); await zigiBox(page).press('Enter');
    const week = zigiPanel(page).getByRole('region', {name: 'Your week with ZIGi'});
    await expect(week).toBeVisible();
    await expect(week).not.toContainText('Every day with a habit planned had a check-in.');
    await expect(week.locator('.ai-review-lines li').nth(2)).toHaveText(/^(?:Days with a habit planned and no check-in: \d+|Each day with a habit planned had at least one check-in, but not every habit did: |Every planned habit day had its check-in\.)/);
    await week.getByRole('button', {name: 'Back to the chat'}).click();
    const [streak, walk] = await zigiChat(page, '/app/habits', ['What is my longest Exercise streak?', 'What is my Walk goal progress?']);
    expect(streak).toMatch(/streak counts scheduled days in a row across months, and a skipped day keeps it going/);
    expect(walk).toMatch(/This is your habit “Walk”\. A Health goal \(Goals → Health goals\) is read only while Health is shared with ZIGi|Health goal “Walk more \(Showcase\)”/);
  });

  test('8 (N-BN-14, N-SL-02, N-BN-15, N-SL-04, BN-033, LA-012): the setup says what it checked and what to do', async ({page}) => {
    await seed(page, 'fresh', false);
    const knocks: string[] = [];
    for (const host of ['http://127.0.0.1:11434', 'http://localhost:1234', 'http://127.0.0.1:9931', 'http://127.0.0.1:8080']) await page.route(`${host}/**`, route => { knocks.push(route.request().url()); return route.abort('connectionrefused'); });
    await page.evaluate(k => localStorage.removeItem(k), NOVA_SETUP_KEY);
    await page.goto('/app/nova/setup');
    await page.getByRole('button', {name: /^Meet NOVA:/}).first().click();
    const meet = page.locator('[data-setup-panel="meet"]');
    await meet.getByRole('button', {name: /I understand/}).click();
    await expect(meet.getByRole('status').filter({hasText: /Checked on this device: the \d+ values? in this browser’s readable storage \(local and session storage\), and none looks like an API key in plain text\./})).toBeVisible();
    await page.getByRole('button', {name: /^Your brain, local first:/}).first().click();
    const brain = page.locator('[data-setup-panel="brain"]');
    await brain.getByRole('button', {name: /^A model on this computer/}).click();
    await brain.getByRole('button', {name: 'Linux'}).click();
    await expect(brain.getByText(/^If the download fails: check there is free disk space/)).toBeVisible();
    await expect(brain.getByText(/start it with ollama serve in another terminal/)).toBeVisible();
    await expect(brain.getByText(/^Check that port 11434 really is Ollama/)).toBeVisible();
    knocks.length = 0;
    await brain.getByRole('button', {name: 'Find models on this computer'}).click();
    await expect(brain.locator('.nova-scan')).toContainText('Ollama: nothing answered at http://127.0.0.1:11434 (not running)');
    expect(knocks).toHaveLength(4);
  });

  test('9 (LA-015, LZ-034, BN:ZIGi #9, ZIGi-F8): no microphone is named; a French ask gets the language note', async ({page}) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      class NoMicRecognition { lang = ''; interimResults = false; continuous = false; maxAlternatives = 1; onerror: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onresult: null = null;
        start() { setTimeout(() => { this.onerror?.({error: 'not-allowed'}); this.onend?.(); }, 60); } stop() { this.onend?.(); } abort() {} }
      w.SpeechRecognition = NoMicRecognition; w.webkitSpeechRecognition = NoMicRecognition;
      // A device with no microphone at all (headless Chrome's own case): no audio input listed, and none to open.
      const media = navigator.mediaDevices as unknown as Record<string, unknown> | undefined;
      if (media) { media.enumerateDevices = async () => []; media.getUserMedia = async () => { throw new DOMException('Requested device not found', 'NotFoundError'); }; }
    });
    await seed(page, 'L1');
    await page.goto('/app/tasks'); await openZigi(page);
    const mic = zigiPanel(page).getByRole('button', {name: /^(Talk to ZIGi|Stop listening)$/});
    await mic.focus(); await page.keyboard.press('Enter');
    // The first talk explains where the audio goes; "Talk now" starts listening.
    await zigiPanel(page).getByRole('button', {name: 'Talk now'}).click();
    await expect(zigiPanel(page).getByRole('alert').filter({hasText: 'No microphone was found.'})).toBeVisible();
    await expect(zigiPanel(page)).not.toContainText('Listening stopped unexpectedly');
    const [fr] = await zigiChat(page, '/app/help', ['Combien de temps dure la période de vote ?']);
    expect(fr).toMatch(/^Pour l’instant, je réponds en anglais \(et en néerlandais\)\./);
    expect(fr).toContain('Governance');
  });

  test('10 (DV:Z-032): ZIGi\'s Send says why it is off, beside it', async ({page}) => {
    await seed(page, 'DV');
    await page.goto('/app/goals'); await openZigi(page);
    const send = zigiPanel(page).getByRole('button', {name: 'Send', exact: true});
    await zigiBox(page).fill('   ');
    await expect(send).toBeDisabled();
    await expect(send).toHaveAccessibleDescription('Send is off until there is something to send: type a question first (spaces alone are not sent).');
    await zigiBox(page).press('Enter');
    await expect(zigiPanel(page).getByRole('status').filter({hasText: 'Send is off until there is something to send'})).toBeVisible();
    await zigiBox(page).fill('How far am I on my Holiday goal?');
    await expect(send).toBeEnabled();
    await expect(send).toHaveAccessibleDescription('');
  });
});
