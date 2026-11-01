import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';

/**
 * Session AK, owner follow-up 2 (N1/N2/N8, lane NB): NOVA's chat on ZIGi's engine. Every reply here is a MOCK: the spec
 * answers the local OpenAI-compatible server on 127.0.0.1:1234 itself (as tests/zigi-send-focus.spec.ts does), and the
 * records are the Showcase's, written as the person's own.
 * Contracts this spec relies on (lead / lane NA): the shell binds ⌘/Ctrl + J to components/nova/command-bar.tsx; NOVA's
 * page (/app/nova) opens its chat (components/nova/chat/nova-chat.tsx) when a hand-off waits (lib/nova/bridge.ts
 * `novaHandoffPending()` on mount, and `NOVA_HANDOFF_EVENT`).
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const HEALTH_KEY = 'zigoals:health:v1';
type Body = {messages: {role: string; content: unknown}[]};
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
/** The reply in several chunks, so the answer streams in. */
const stream = (text: string) => [chunk({role: 'assistant', content: ''}), ...(text.match(/.{1,12}/gs) ?? []).map(part => chunk({content: part})), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `Here it is.\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
const systemOf = (body: Body) => body.messages.filter(m => m.role === 'system').map(m => String(m.content)).join('\n');
async function server(page: Page, replies: readonly ((body: Body) => string)[], seen: Body[] = []) {
  let n = 0;
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; seen.push(body); const reply = replies[Math.min(n++, replies.length - 1)]!; return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(body))}); }
    return route.fulfill({status: 404, body: ''});
  });
  return seen;
}
async function seed(page: Page, {model = true}: {model?: boolean} = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, includeHealth: true, pageShare: {...base.pageShare, health: true}};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'}), ...(model ? {[AI_SETTINGS_KEY]: JSON.stringify(ai)} : {})});
  await page.waitForLoadState('networkidle');
}
const chat = (page: Page) => page.locator('section.nova-chat');
/** ⌘/Ctrl + J from any page: the command bar sends the words to NOVA, whose page opens with its chat. */
async function askThroughBar(page: Page, text: string) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+j' : 'Control+j');
  const bar = page.locator('dialog.nova-bar[open]');
  await expect(bar).toBeVisible();
  await bar.getByRole('textbox').fill(text);
  await bar.getByRole('textbox').press('Enter');
  await expect(page).toHaveURL(/\/app\/nova(\?|$)/);
  await expect(chat(page)).toBeVisible();
}
async function sendInNova(page: Page, text: string) {
  const box = chat(page).getByRole('textbox', {name: /^Message /});
  await expect(async () => { await box.fill(text); await expect(chat(page).getByRole('button', {name: 'Send', exact: true})).toBeEnabled({timeout: 1_000}); }).toPass({timeout: 15_000});
  await box.press('Enter');
}

test('streaming: a message from the command bar reaches NOVA, the answer streams in with who answered; Retry and Edit work', async ({page}) => {
  // Words that are no lookup, so ZIGi's on-device answers leave them to the person's AI (the same engine as ZIGi's panel),
  // and no plan or log either: "plan" is a planning intent, and a reply without a card then gets the engine's one automatic
  // card retry (lib/ai/intent.ts, ZIGi's own rule), which spent the second MOCK reply before Retry (lane NV).
  const seen = await server(page, [() => 'Your evening looks calm. Two habits are still open: Read and Stretch.', () => 'Read and Stretch are still open tonight.', () => 'Stretch first, it is short.']);
  await seed(page);
  await page.goto('/app/habits');
  await askThroughBar(page, 'Write me one calm sentence for this evening.');
  const reply = chat(page).locator('.nova-turn-assistant').last();
  await expect(reply).toContainText('Two habits are still open', {timeout: 20_000});
  await expect(reply.locator('.ai-turn-source')).toContainText('From your AI');
  await expect(chat(page).locator('.nova-chat-status')).toContainText('via your local server · mock-chat');
  // NOVA's own messages carry NOVA's prompt (lane NE) under the persona's name; never ZIGoals hosted.
  expect(systemOf(seen[0]!).startsWith('You are NOVA, the person\'s own command center')).toBe(true);
  // Retry asks the same question again.
  await reply.getByRole('button', {name: 'Retry'}).click();
  await expect(chat(page).locator('.nova-turn-assistant').last()).toContainText('still open tonight', {timeout: 20_000});
  expect(seen).toHaveLength(2);
  // ↑ in the empty box puts the last message back; sending replaces it and its answer.
  const box = chat(page).getByRole('textbox', {name: /^Message /});
  await box.focus(); await page.keyboard.press('ArrowUp');
  await expect(chat(page).getByText('Editing your last message')).toBeVisible();
  await expect(box).toHaveValue('Write me one calm sentence for this evening.');
  await box.fill('Write it again, shorter.'); await box.press('Enter');
  await expect(chat(page).locator('.nova-turn-assistant').last()).toContainText('Stretch first', {timeout: 20_000});
  await expect(chat(page).locator('.nova-turn-user')).toHaveCount(1);
  await expect(chat(page).locator('.nova-turn-user')).toContainText('Write it again, shorter.');
});

test('a confirm card in NOVA adds the record, and Undo puts it back exactly', async ({page}) => {
  await server(page, [() => block({kind: 'log-water', millilitres: 300})]);
  await seed(page);
  await page.goto('/app');
  await askThroughBar(page, 'Log 300 ml of water');
  const card = chat(page).locator('.ai-card').last();
  await expect(card).toBeVisible({timeout: 20_000});
  const before = await page.evaluate(key => localStorage.getItem(key), HEALTH_KEY);
  await card.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(card).toHaveClass(/ai-card-added/);
  expect(await page.evaluate(key => localStorage.getItem(key), HEALTH_KEY)).not.toBe(before);
  await chat(page).locator('.nova-turn-assistant').last().getByRole('button', {name: /^Undo/}).click();
  await expect(card).toHaveClass(/ai-card-undone/);
  const strip = (raw: string | null) => JSON.parse(raw ?? '{}', (key, value: unknown) => key === 'updatedAt' || key === 'waterOperations' ? undefined : value);
  expect(strip(await page.evaluate(key => localStorage.getItem(key), HEALTH_KEY))).toEqual(strip(before));
});

test('Continue in NOVA: ZIGi\'s conversation opens in NOVA with every turn (one shared history), and goes on there', async ({page}) => {
  const seen = await server(page, [() => 'Read slipped twice this week.', () => 'Try reading right after dinner.']);
  const asked = 'Write me one kind sentence about my week.';
  await seed(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  const panel = page.locator('dialog.ai-chat[open]');
  await panel.getByLabel('Message to your AI').fill(asked);
  await panel.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel.locator('.ai-turn-assistant').last()).toContainText('Read slipped twice', {timeout: 20_000});
  await panel.getByRole('button', {name: 'More: history, customize, settings and help'}).click();
  await panel.getByRole('link', {name: 'Continue this chat in NOVA'}).click();
  await expect(page).toHaveURL(/\/app\/nova$/);
  await expect(chat(page)).toBeVisible();
  await expect(chat(page).locator('.nova-turn-user')).toContainText(asked);
  await expect(chat(page).locator('.nova-turn-assistant')).toContainText('Read slipped twice');
  await sendInNova(page, 'Now write one for next week.');
  await expect(chat(page).locator('.nova-turn-assistant').last()).toContainText('after dinner', {timeout: 20_000});
  // The whole conversation went with NOVA's question.
  expect(JSON.stringify(seen[1]!.messages)).toContain(asked);
  // And the conversation list shows where it started.
  await chat(page).getByRole('button', {name: 'Conversations'}).click();
  await expect(chat(page).getByRole('region', {name: 'Conversations'})).toContainText('Started with ZIGi on Habits');
});

test('delegation (MOCK model): NOVA hands a Health task to ZIGi, which answers with the Health page\'s records in two voices', async ({page}) => {
  const zigiReply = 'Water was steady at about 1.6 L a day; one card below.\n\n```zigoals-action\n{"kind":"log-water","millilitres":250}\n```';
  const seen = await server(page, [body => systemOf(body).includes('You are on Health:') ? zigiReply : 'Hello.']);
  await seed(page);
  await page.goto('/app');
  await askThroughBar(page, 'Write me a calm plan for this evening.');
  await expect(chat(page).locator('.nova-turn-assistant').last()).toContainText('Hello.', {timeout: 20_000});
  const box = chat(page).getByRole('textbox', {name: /^Message /});
  await box.fill('Write me a kind note about my water this week.');
  await chat(page).getByRole('button', {name: 'Ask ZIGi about a page'}).click();
  // Exactly "Page": the group around it is "Ask ZIGi about a page" (lane NV).
  await chat(page).getByLabel('Page', {exact: true}).selectOption('health');
  await chat(page).getByRole('button', {name: 'Let ZIGi answer here'}).click();
  await expect(chat(page).getByRole('note', {name: /hands this to ZIGi/})).toContainText('handed this to ZIGi on the Health page');
  const zigi = chat(page).locator('.nova-turn-zigi').last();
  await expect(zigi).toContainText('Water was steady', {timeout: 20_000});
  await expect(zigi.locator('.nova-turn-who')).toHaveText('ZIGi · Health page');
  await expect(chat(page).locator('.nova-voice-close').last()).toContainText('ZIGi reported back from Health');
  // A real engine call with Health's specialist, in ZIGi's own voice; every write still a card.
  const task = seen.find(body => JSON.stringify(body.messages).includes('kind note about my water'));
  expect(task, 'the task reached the model').toBeDefined();
  const system = systemOf(task!);
  expect(system).toContain('You are on Health:');
  expect(system).not.toContain('You are NOVA, the person');
  await expect(zigi.locator('.ai-card')).toHaveCount(1);
  await expect(zigi.locator('.ai-card').getByRole('button', {name: 'Add', exact: true})).toBeVisible();
});

test('no model connected: NOVA answers on the device, says so, and invites building its brain; a chat saves as Markdown', async ({page}) => {
  const seen = await server(page, [() => 'never']);
  await seed(page, {model: false});
  await page.goto('/app');
  await askThroughBar(page, 'How many habits do I have?');
  await expect(chat(page).locator('.nova-chat-status')).toContainText('On-device answers');
  const reply = chat(page).locator('.nova-turn-assistant').last();
  await expect(reply.locator('.ai-turn-source')).toContainText('On-device answers · no AI used');
  await chat(page).getByRole('button', {name: 'New chat'}).click();
  await expect(chat(page).getByRole('link', {name: 'Build NOVA’s brain'})).toHaveAttribute('href', '/app/nova/setup');
  await chat(page).getByRole('button', {name: 'Conversations'}).click();
  await chat(page).getByRole('button', {name: /How many habits/}).first().click();
  const download = page.waitForEvent('download');
  await chat(page).getByRole('button', {name: 'More chat actions'}).click(); // Session AK P3 (ND-7): Save as Markdown waits in "More"
  await chat(page).getByRole('button', {name: 'Save as Markdown'}).click();
  expect((await download).suggestedFilename()).toMatch(/^zigoals-chat-\d{4}-\d{2}-\d{2}-how-many-habits-do-i-have\.md$/);
  expect(seen).toHaveLength(0);
});

test('R2-2 (release review 2): with no model, NOVA answers the natural questions from the records, and Health waits for NOVA → Permissions', async ({page}) => {
  const seen = await server(page, [() => 'never']);
  await seed(page, {model: false});
  // Health is shared on this device (ZIGi's gate open), but NOVA's own Health permission is off by default.
  await page.evaluate(({key, value}) => localStorage.setItem(key, value), {key: AI_SETTINGS_KEY, value: JSON.stringify({...defaultAiSettings(), includeHealth: true, pageShare: {...defaultAiSettings().pageShare, health: true}})});
  await page.goto('/app');
  await askThroughBar(page, 'How far am I on my goals?');
  const last = () => chat(page).locator('.nova-turn-assistant').last();
  await expect(last()).toContainText('active goals, from your own records:');
  await expect(last()).toContainText('Emergency fund: ');
  await expect(last().locator('.ai-turn-source')).toContainText('On-device answers · no AI used');
  await sendInNova(page, 'What is due today?');
  await expect(last()).toContainText('Today (');
  await expect(last()).toContainText('Habits still open');
  await sendInNova(page, 'How did I sleep?');
  await expect(last()).toContainText('Health is off for NOVA, so nothing from Health is read here. Turn on Health in NOVA → Permissions.');
  await expect(last()).not.toContainText('Settings → ZIGi');
  // One tap to the switch the answer names; turned on there, the same question is answered from the logged nights.
  await last().getByRole('button', {name: 'Open NOVA → Permissions'}).click();
  const panels = page.getByRole('dialog', {name: 'NOVA’s panels'});
  await expect(panels).toBeVisible();
  await panels.getByRole('switch', {name: /^Health: food/}).click();
  await expect(panels.getByRole('switch', {name: /^Health: food/})).toHaveAttribute('aria-checked', 'true');
  await panels.getByRole('button', {name: 'Close NOVA’s panels'}).click();
  await page.getByRole('textbox', {name: 'Message NOVA'}).fill('How did I sleep?');
  await page.getByRole('textbox', {name: 'Message NOVA'}).press('Enter');
  await expect(last()).toContainText('nights logged', {timeout: 15_000});
  await sendInNova(page, 'How many habits are left today?');
  await expect(last()).toContainText('left today');
  expect(seen).toHaveLength(0); // all on this device
});
