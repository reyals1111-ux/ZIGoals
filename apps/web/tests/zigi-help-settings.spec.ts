import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {ZIGI_REMINDERS_KEY} from '../lib/ai/store/keys';
import {PLATFORM_KEY} from '../lib/positions';

/**
 * Session V Part 18: Help's ZIGi topic answers the v2 questions (each linkable), What's new links the first of them,
 * and Settings → ZIGi · your AI sits in five labelled groups, with "ZIGi's reminders" listing ZIGi's weekly reminders,
 * each removable. Nothing is written on view; only Remove writes.
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const connected: AiSettings = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234'};
const goal = (JSON.parse(buildShowcase(DAY).records[PLATFORM_KEY]!) as {goals: {id: string; name: string; status: string}[]}).goals.find(g => g.status !== 'closed')!;
async function seed(page: Page, extra: Record<string, string> = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), ...extra});
}
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

const QUESTIONS: [string, string, string][] = [
  ['your-ai-data', 'Can I ask ZIGi about my records, like “How many minutes did I meditate this month?”', 'Answered on your device · no AI used'],
  ['your-ai-tools', 'How does my AI get the records it needs?', 'ZIGi looked at:'],
  ['your-ai-act', 'What can ZIGi log or plan for me?', 'Estimated by your AI from a photo'],
  ['your-ai-notes', 'What does ZIGi know about me?', 'Use my notes'],
  ['your-ai-pack', 'What is the context pack?', 'It is not encrypted:'],
  ['your-ai-suggestions', 'Where do ZIGi’s chips, brief and patterns come from?', 'a pattern, not proof'],
  ['your-ai-commands', 'Which slash commands and shortcuts does ZIGi know?', '/remember'],
  ['your-ai-mini-window', 'What is ZIGi’s mini window?', 'Back to tab'],
  ['your-ai-knock', 'Can ZIGi knock when a reminder is due?', 'never between 22:00 and 08:00'],
  ['your-ai-agents', 'Can an AI agent in my browser use ZIGoals?', 'chrome://flags/#enable-webmcp-testing'],
  ['your-ai-which-setup', 'Which setup fits me?', 'nothing is sent'],
  ['your-ai-on-device', 'What is Chrome’s on-device model?', 'Answered by Chrome’s on-device model'],
  ['your-ai-hosted', 'What is ZIGoals hosted?', 'not available yet'],
  ['your-ai-look', 'Can I change how ZIGi looks?', 'Meet ZIGi'],
];

test('Help: the ZIGi topic answers the v2 questions, each linkable, closed until asked', async ({page}) => {
  await page.goto('/app/help');
  const section = page.getByRole('region', {name: 'Your own AI, page by page'});
  for (const [id, question] of QUESTIONS) { await expect(section.locator(`#help-${id} > summary`)).toHaveText(question); await expect(section.locator(`#help-${id} > summary`)).toBeVisible(); }
  await expect(section.locator('details[open]')).toHaveCount(0);
  // A new page load each time: a fragment-only navigation before hydration can lose its hash (Part 12's finding).
  for (const [id, , answer] of QUESTIONS.slice(0, 3)) {
    await page.goto('/app');
    await page.goto(`/app/help#help-${id}`);
    await expect(page.locator(`#help-${id}`)).toHaveAttribute('open', '');
    await expect(page.locator(`#help-${id}`)).toContainText(answer);
  }
  await page.goto('/app');
  await page.goto('/app/help#help-your-ai-agents');
  await expect(page.locator('#help-your-ai-agents')).toContainText(QUESTIONS[9]![2]);
});

test('What\'s new: the new release shows the card again, its last link opens "Ask ZIGi about your records"', async ({page}) => {
  // A device that dismissed Session T's card sees this release's card once.
  await seed(page, {[WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: ['2026-10-session-t']})});
  // Session W Part 24 (deliberate): this release is Session W's; Session V's links fold under "Earlier updates".
  // Session X-Local bumped the release (ZIGi comes alive); the card shows once more for every device.
  // Session Y bumped it again (ADR-018 Y40); X-Local's links now wait under "Earlier updates" with this one.
  expect(WHATS_NEW_RELEASE).toBe('2026-10-session-y');
  await page.goto('/app');
  const card = page.getByRole('region', {name: 'A few new things.'});
  await expect(card).toBeVisible();
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'Ask ZIGi about your records, and more from ZIGi'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-your-ai-data$/);
  await expect(page.locator('#help-your-ai-data')).toHaveAttribute('open', '');
});

test('Settings: ZIGi · your AI in five groups; ZIGi\'s reminders listed and removable; nothing written on view', async ({page}) => {
  const reminders = {version: 1, goalCheckIns: {[`private:${goal.id}`]: {weekday: 0, time: '18:00'}}, wealthLook: {weekday: 1, time: '09:30'}};
  await seed(page, {[WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(connected), [ZIGI_REMINDERS_KEY]: JSON.stringify(reminders)});
  await page.goto('/app');
  await page.goto('/app/settings#zigi-reminders');
  const body = page.locator('.ai-settings-body');
  for (const name of ['Connection', 'Privacy & data', 'ZIGi’s look and feel', 'Reminders', 'Advanced']) {
    await expect(body.getByRole('region', {name, exact: true})).toBeVisible();
    await expect(body.getByRole('heading', {name, exact: true, level: 3})).toBeVisible();
  }
  // Each control sits in its group.
  await expect(body.getByRole('region', {name: 'Privacy & data'}).getByRole('switch', {name: 'Include Health'})).toBeVisible();
  await expect(body.getByRole('region', {name: 'ZIGi’s look and feel'}).getByRole('switch', {name: 'Show the ZIGi button'})).toBeVisible();
  await expect(body.getByRole('region', {name: 'Advanced'}).getByRole('button', {name: 'Turn off ZIGi'})).toBeVisible();
  await expect(body.getByRole('region', {name: 'Connection'}).getByRole('button', {name: 'Disconnect'})).toBeVisible();
  const card = page.locator('details#zigi-reminders');
  await expect(card).toHaveAttribute('open', '');
  const list = card.getByRole('list', {name: 'ZIGi’s weekly reminders'});
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list).toContainText(`Weekly check-in: ${goal.name}`);
  await expect(list).toContainText('Sunday at 18:00');
  await expect(list).toContainText('A look at Wealth');
  await expect(list).toContainText('Monday at 09:30');
  await expect(card).toContainText('ZIGi does not knock when a reminder is due');
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), ZIGI_REMINDERS_KEY))!)).toEqual(reminders);
  await card.getByRole('button', {name: 'Remove A look at Wealth'}).click();
  await expect(card.getByRole('status')).toHaveText('Removed: A look at Wealth.');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), ZIGI_REMINDERS_KEY))!)).toEqual({...reminders, wealthLook: null});
  await card.getByRole('button', {name: `Remove Weekly check-in: ${goal.name}`}).click();
  await expect(card).toContainText('No weekly reminders from ZIGi on this device.');
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), ZIGI_REMINDERS_KEY))!)).toEqual({...reminders, goalCheckIns: {}, wealthLook: null});
});

test('Settings before ZIGi is set up: the groups that need no connection, and Advanced only once connected', async ({page}) => {
  await seed(page, {[WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})});
  await page.goto('/app');
  await page.goto('/app/settings#your-ai');
  const body = page.locator('.ai-settings-body');
  for (const name of ['Connection', 'Privacy & data', 'ZIGi’s look and feel', 'Reminders']) await expect(body.getByRole('region', {name, exact: true})).toBeVisible();
  await expect(body.getByRole('region', {name: 'Advanced', exact: true})).toHaveCount(0);
  await expect(body.getByRole('region', {name: 'Connection'}).locator('details#zigi-setup')).toBeAttached();
  await page.locator('details#zigi-reminders summary').click();
  await expect(page.locator('details#zigi-reminders')).toContainText('No weekly reminders from ZIGi on this device.');
  expect(await page.evaluate(k => localStorage.getItem(k), ZIGI_REMINDERS_KEY)).toBeNull();
  expect(await page.evaluate(k => localStorage.getItem(k), AI_SETTINGS_KEY)).toBeNull();
});
