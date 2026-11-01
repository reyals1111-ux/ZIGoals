// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {useChatSession, type ChatSession, type NovaSurface} from '../../components/ai/use-chat-session';
import type {AiContextState} from '../../components/ai/use-ai-context';
import {buildShowcase} from '../showcase-data';
import {habitDataSchema, type HabitData} from '../habits';
import {healthSchema, type HealthData} from '../health';
import {platformSchema, type Platform} from '../positions';
import {homeRecordsIn} from '../sync-homes-store';
import {dropMemoryKeys, holdKey} from '../ai/keys';
import {defaultAiSettings, type AiSettings} from '../ai/settings';
import {aiGates, type Gates} from '../ai/gates';
import {buildPageContext} from '../ai/context/builders';
import {consent} from '../ai/context/consent';
import {buildSystemPrompt, SPECIALISTS} from '../ai/context/specialists';
import {agentNote} from '../ai/session';
import {buildNovaPack, whatNovaCanSee} from '../ai/context-pack/nova';
import {buildNovaSystemParts, NOVA_SPECIALIST, novaOpening} from '../ai/context-pack/nova-prompt';
import {parseReply} from '../ai/actions/parse';
import {localDate} from '../local-date';
import type {ToolSources} from '../ai/tools/env';
import {chatOrigin, rememberNovaChat} from './bridge';
import {novaPackInput, packConsent, pagePack} from './bridge-pack';

/**
 * Session AK (NOVA, owner follow-up 2 N1): NOVA's chat is ZIGi's engine (components/ai/use-chat-session.ts) with a NOVA
 * surface. Proven here with a MOCK model (the Anthropic wire answered by a stubbed fetch) and the Showcase records:
 * - ZIGi's own panel sends exactly the prompt it sent before (no NOVA line, Today's prompt as buildSystemPrompt makes it);
 * - one shared history: a chat started with ZIGi opens and goes on in NOVA, and back; where it started is kept apart;
 * - a page task NOVA hands to ZIGi is a real engine call with that page's records and specialist, in ZIGi's own voice;
 *   Retry asks it the same way; editing the last message replaces it and its answer;
 * - nothing crosses a privacy boundary: Health only through its gate, a closed area sends nothing, a private screen
 *   sends no records, and with no model connected nothing leaves the device at all.
 */
const KEY = 'sk-ant-api03-FAKE-NOVA-BRIDGE-0000';
const DAY = '2026-10-31';
const {records} = buildShowcase(DAY);
const habits = habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)) as HabitData;
const health = healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData;
const platform = platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform;
const fasting = homeRecordsIn(records).fasting;
const sources: ToolSources = {now: new Date(`${DAY}T19:00:00Z`), habitDay: DAY, healthDay: DAY, habitZone: 'UTC', healthZone: 'UTC', habits, health, fasting, platform, localGoals: [], metadata: {}, quotes: [], portfolio: null, weekly: null, showcase: true};
const base = defaultAiSettings();
const connected = (over: Partial<AiSettings> = {}): AiSettings => ({...base, enabled: true, mode: 'api', provider: 'anthropic', model: 'claude-mock', ...over});
const healthOpen = connected({includeHealth: true, pageShare: {...base.pageShare, health: true}});
const gatesFor = (settings: AiSettings, {sensitive = false, layoutHasHealth = true} = {}): Gates => aiGates({settings, area: 'help', pathname: '/app/nova', layoutHasHealth, accountActive: false, accountHealthPermitted: null, sensitive});
/** NOVA's page: /app/nova (Help's area for ZIGi's own page context), the tools' sources at the moment of asking. */
const novaContext = (settings: AiSettings, opts: {sensitive?: boolean; layoutHasHealth?: boolean} = {}): AiContextState => {
  const gates = gatesFor(settings, opts);
  return {area: 'help', pathname: '/app/nova', attaches: true, consent: gates.page, context: {area: 'help', text: 'PAGE: Help notes', handles: [], included: ['Help'], omitted: [], estimatedTokens: 4}, preview: null, ready: true, gates, toolSources: () => opts.sensitive ? null : sources};
};
const zigiContext = {area: 'today', pathname: '/app', attaches: true, consent: {page: true, health: false, reasons: []}, context: {area: 'today', text: 'PAGE: Today', handles: [], included: ['Today'], omitted: [], estimatedTokens: 5},
  preview: null, ready: true, gates: {paused: false, health: false, areas: {}}, toolSources: () => null} as unknown as AiContextState;
/** NOVA's pack input exactly as NovaChat builds it (lib/nova/bridge-pack.ts `novaPackInput`), for the settings' own target. */
const inputFor = (ctx: AiContextState, settings: AiSettings) => novaPackInput({sources: ctx.toolSources(), gates: ctx.gates, storage: localStorage, target: {provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl}, chainChosen: false});
const surfaceFor = (ctx: AiContextState, settings: AiSettings = connected()): NovaSurface => ({persona: 'Rey', novaPack: () => { const input = inputFor(ctx, settings); return input ? buildNovaPack(input) : null; }, pack: area => pagePack({area, sources: ctx.toolSources(), gates: ctx.gates}), remember: chatId => rememberNovaChat(localStorage, chatId), agent: name => name === 'hermes' ? hermesAgent() : null});

const bodies: string[] = [];
/** The person's own Hermes Agent (MOCK): its OpenAI-compatible API server on this computer, answered by the stubbed fetch. */
const HERMES = 'http://127.0.0.1:8642';
const hermesCalls: {url: string; auth: string | null; body: string}[] = [];
let hermesReply = 'Plan: two focused blocks.';
const hermesAgent = () => ({name: 'Hermes Agent', baseUrl: HERMES, model: 'hermes-agent', key: async () => 'hermes-key-FAKE-0000'});
/** Lane NC's connection record: the gateway's address, and whether the person confirmed it runs a local model. */
const hermesRecord = (confirmed: boolean) => localStorage.setItem('zigoals:nova-hermes:v1', JSON.stringify({version: 1, baseUrl: HERMES, model: 'hermes-agent', localModelConfirmed: confirmed}));
const openAiSse = (text: string) => `data: ${JSON.stringify({choices: [{index: 0, delta: {role: 'assistant', content: text}, finish_reason: null}]})}\n\ndata: ${JSON.stringify({choices: [{index: 0, delta: {}, finish_reason: 'stop'}]})}\n\ndata: [DONE]\n\n`;
let replyText = 'Noted.';
const sse = (text: string) => ['event: message_start', 'data: {"type":"message_start","message":{"usage":{"input_tokens":5}}}', '',
  'event: content_block_delta', `data: ${JSON.stringify({type: 'content_block_delta', index: 0, delta: {type: 'text_delta', text}})}`, '',
  'event: message_stop', 'data: {"type":"message_stop"}', '', ''].join('\n');
/** The system prompt as the provider received it (the Anthropic wire sends it as text blocks). */
const systemOf = (body: string) => { const parsed = JSON.parse(body) as {system: string | {text: string}[]}; return typeof parsed.system === 'string' ? parsed.system : parsed.system.map(b => b.text).join(''); };
let zigi: ChatSession | null = null, nova: ChatSession | null = null, root: Root;
function Zigi({settings}: {settings: AiSettings}) { const s = useChatSession({settings, scope: 'local', context: zigiContext}); useEffect(() => { zigi = s; }); return null; }
function Nova({settings, ctx, surface}: {settings: AiSettings; ctx: AiContextState; surface: NovaSurface}) { const s = useChatSession({settings, scope: 'local', context: ctx, nova: surface}); useEffect(() => { nova = s; }); return null; }
const settle = async () => { for (let i = 0; i < 25; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
const mount = async (settings: AiSettings, ctx = novaContext(settings)) => { const surface = surfaceFor(ctx, settings); await act(async () => { root.render(h('div', null, h(Zigi, {settings}), h(Nova, {settings, ctx, surface}))); }); await settle(); };
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; bodies.length = 0; replyText = 'Noted.';
  hermesCalls.length = 0; hermesReply = 'Plan: two focused blocks.';
  vi.stubGlobal('fetch', async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).startsWith(HERMES)) { hermesCalls.push({url: String(url), auth: new Headers(init?.headers).get('authorization'), body: String(init?.body ?? '')}); return new Response(openAiSse(hermesReply), {status: 200, headers: {'content-type': 'text/event-stream'}}); }
    bodies.push(String(init?.body ?? '')); return new Response(new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode(sse(replyText))); c.close(); }}), {status: 200, headers: {'content-type': 'text/event-stream'}}); });
  holdKey('local', 'anthropic', KEY);
  localStorage.setItem('zigoals:ai-options:v1', JSON.stringify({version: 1, toolMode: 'attach'}));
  root = createRoot(document.body.appendChild(document.createElement('div')));
});
afterEach(async () => { await act(async () => root.unmount()); await zigi?.removeAll(); dropMemoryKeys(); localStorage.clear(); vi.unstubAllGlobals(); zigi = null; nova = null; });

test('ZIGi\'s own panel is unchanged: its Today prompt is buildSystemPrompt\'s, with no NOVA line', async () => {
  await mount(connected());
  await act(async () => { await zigi!.send('How is my day going?'); }); await settle();
  expect(bodies).toHaveLength(1);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  expect(systemOf(bodies[0]!)).toBe(buildSystemPrompt({area: 'today', context: 'PAGE: Today', customInstructions: '', providerName: 'Anthropic', today: localDate(), personality: 'calm', timeZone}));
  expect(bodies[0]).not.toContain('NOVA');
});
test('one shared history: a chat started with ZIGi opens in NOVA and goes on there, and ZIGi sees the new turns; origins kept apart', async () => {
  await mount(connected());
  await act(async () => { await zigi!.send('Which habit slipped this week?'); }); await settle();
  const id = zigi!.chat.id;
  expect((await nova!.list()).map(c => c.id)).toContain(id);
  await act(async () => { await nova!.open(id); }); await settle();
  expect(nova!.chat.turns.map(t => t.text)).toEqual(['Which habit slipped this week?', 'Noted.']);
  replyText = 'Reading slipped twice.';
  await act(async () => { await nova!.send('And what can I do about it?', {area: 'today'}); }); await settle();
  // NOVA's request carries the whole shared conversation.
  expect(bodies[1]).toContain('Which habit slipped this week?');
  const fromZigi = await zigi!.list();
  expect(fromZigi.find(c => c.id === id)?.turnCount).toBe(4);
  await act(async () => { await zigi!.open(id); }); await settle();
  expect(zigi!.chat.turns.at(-1)?.text).toBe('Reading slipped twice.');
  expect(chatOrigin(localStorage, id)).toEqual({by: 'zigi', area: 'today'});
  // A chat started in NOVA is NOVA's, and ZIGi's own page index does not claim it.
  await act(async () => { nova!.startNew(); }); await settle();
  await act(async () => { await nova!.send('Plan my evening', {area: 'today'}); }); await settle();
  const novaId = nova!.chat.id;
  expect(chatOrigin(localStorage, novaId)).toEqual({by: 'nova'});
  expect(JSON.parse(localStorage.getItem('zigoals:zigi:v1') ?? '{}').chatAreas?.[novaId]).toBeUndefined();
  expect((await zigi!.list()).map(c => c.id)).toContain(novaId);
});
test('NOVA\'s own messages (lane NE): NOVA\'s pack and prompt exactly, the same text "What NOVA can see" shows; Health out by its scope', async () => {
  await mount(healthOpen);
  await act(async () => { await nova!.send('How is my day?', {area: 'today'}); }); await settle();
  const system = systemOf(bodies[0]!), ctx = novaContext(healthOpen), input = inputFor(ctx, healthOpen)!, pack = buildNovaPack(input);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  expect(system).toBe(buildNovaSystemParts({persona: 'Rey', pack: pack.text, customInstructions: '', providerName: 'Anthropic', tools: false, today: localDate(), timeZone, healthShared: true, personality: 'calm'}).prompt);
  expect(system.startsWith(novaOpening('Rey'))).toBe(true);
  expect(system).toContain(NOVA_SPECIALIST);
  expect(system).toContain(whatNovaCanSee(input));
  expect(system).not.toContain(SPECIALISTS.today.prompt);
  expect(system).not.toContain('PAGE: Help notes');
  // Health's own gate is open here, but NOVA's Health scope is off by default: no Health line goes.
  expect(pack.notShared).toContain('health');
  expect(pack.included).not.toContain('health');
  expect(nova!.chat.turns.at(-1)?.records?.length).toBeGreaterThan(0);
  // With the person's Health scope on (NOVA → Permissions), Health joins.
  localStorage.setItem('zigoals:nova-setup:v1', JSON.stringify({version: 1, scopes: {health: true}}));
  expect(buildNovaPack(inputFor(ctx, healthOpen)!).included).toContain('health');
  expect(buildNovaPack(inputFor(novaContext(connected()), connected())!).included).not.toContain('health');
});
test('NOVA\'s tool loop reads with the pack\'s own environment: no Health tool while NOVA\'s Health scope is off (ZIGi\'s page would offer them)', async () => {
  localStorage.setItem('zigoals:ai-options:v1', JSON.stringify({version: 1, toolMode: 'tools'}));
  await mount(healthOpen);
  await act(async () => { await nova!.send('How is my day?', {area: 'today'}); }); await settle();
  await act(async () => { await zigi!.send('How is my day?'); }); await settle();
  const toolsOf = (body: string) => ((JSON.parse(body) as {tools?: {name: string}[]}).tools ?? []).map(t => t.name);
  expect(toolsOf(bodies[0]!).length).toBeGreaterThan(3);
  expect(toolsOf(bodies[0]!)).not.toContain('nutrient_totals');
  expect(toolsOf(bodies[0]!)).not.toContain('water');
});
test('N9: a NOVA reply to a pasted message is never auto-accepted; a typed one may be (the person\'s own switch decides)', async () => {
  await mount(connected());
  await act(async () => { await nova!.send('Plan my evening', {area: 'today', pasted: true}); }); await settle();
  expect(nova!.claimFresh(nova!.chat.turns.at(-1)!.id)).toBe(false);
  await act(async () => { await nova!.send('Plan my morning', {area: 'today'}); }); await settle();
  expect(nova!.claimFresh(nova!.chat.turns.at(-1)!.id)).toBe(true);
});
test('delegation (MOCK model): ZIGi runs the page task with that page\'s records and specialist, in its own voice; Retry asks it the same way; Edit replaces it', async () => {
  await mount(healthOpen);
  replyText = 'Your water was steady.';
  // The same call NOVA's chat makes: the local answers first (this one is not a lookup), then the person's AI.
  await act(async () => { await nova!.ask('Write me a short, kind note about how my water went, as ZIGi on Health.', {area: 'health', zigi: true}); }); await settle();
  expect(bodies).toHaveLength(1);
  const system = systemOf(bodies[0]!), healthPack = pagePack({area: 'health', sources, gates: gatesFor(healthOpen)})!;
  expect(system).toContain(SPECIALISTS.health.prompt);
  expect(system).not.toContain(SPECIALISTS.today.prompt);
  expect(healthPack.text).toContain('## Health');
  expect(system).toContain(healthPack.text.split('\n').slice(0, 3).join('\n'));
  expect(system).not.toContain(novaOpening('Rey'));
  expect(nova!.chat.turns.map(t => t.role)).toEqual(['user', 'assistant']);
  await act(async () => { await nova!.regenerate(); }); await settle();
  expect(bodies).toHaveLength(2);
  expect(systemOf(bodies[1]!)).toContain(SPECIALISTS.health.prompt);
  expect(systemOf(bodies[1]!)).not.toContain(novaOpening('Rey'));
  expect(nova!.chat.turns).toHaveLength(2);
  // Edit the last message: it and its answer make way for the new words.
  const asked = nova!.chat.turns[0]!.id;
  replyText = 'Steps were steady too.';
  await act(async () => { await nova!.send('And my steps?', {area: 'health', zigi: true, replace: asked}); }); await settle();
  expect(nova!.chat.turns.map(t => t.text)).toEqual(['And my steps?', 'Steps were steady too.']);
  expect(systemOf(bodies[2]!)).toContain(SPECIALISTS.health.prompt);
});
test('Retry of NOVA\'s own message keeps NOVA\'s prompt and pack', async () => {
  await mount(connected());
  await act(async () => { await nova!.send('What is next today?', {area: 'today'}); }); await settle();
  await act(async () => { await nova!.regenerate(); }); await settle();
  expect(bodies).toHaveLength(2);
  expect(systemOf(bodies[1]!).startsWith(novaOpening('Rey'))).toBe(true);
  expect(systemOf(bodies[1]!)).toBe(systemOf(bodies[0]!));
});

test('privacy: with Health closed, a task on Health and NOVA\'s Today send no Health record', async () => {
  const closed = connected(); // Health's switch and "Include Health" off: their defaults
  const openText = pagePack({area: 'health', sources, gates: gatesFor(healthOpen)})!.text;
  const healthLines = openText.split('\n').filter(l => l && !l.startsWith('#')).slice(0, 6);
  expect(healthLines.length).toBeGreaterThan(2);
  await mount(closed);
  await act(async () => { await nova!.send('How did I eat?', {area: 'health', zigi: true}); }); await settle();
  await act(async () => { await nova!.send('How is my day?', {area: 'today'}); }); await settle();
  expect(bodies).toHaveLength(2);
  for (const body of bodies) for (const line of healthLines) expect(body).not.toContain(line);
  expect(pagePack({area: 'health', sources, gates: gatesFor(closed)})!.text).toBe('');
  expect(pagePack({area: 'today', sources, gates: gatesFor(closed)})!.included).not.toContain('Health');
  // The layout gate is part of it too: Health shared, but not on this device's Today.
  expect(pagePack({area: 'health', sources, gates: gatesFor(healthOpen, {layoutHasHealth: false})})!.text).toBe('');
});
test('privacy: an area whose switch is off sends nothing; a private screen sends no records; the same gates as ZIGi\'s page', async () => {
  const wealthOff = connected({pageShare: {...base.pageShare, wealth: false}});
  expect(pagePack({area: 'wealth', sources, gates: gatesFor(wealthOff)})!.text).toBe('');
  expect(packConsent(gatesFor(wealthOff), 'wealth').reasons[0]).toMatch(/Sharing is off for Wealth/);
  expect(pagePack({area: 'habits', sources, gates: gatesFor(connected(), {sensitive: true})})).toBeNull();
  expect(packConsent(gatesFor(connected(), {sensitive: true}), 'habits').page).toBe(false);
  // The pack is exactly what ZIGi attaches on that page itself.
  for (const [area, pathname] of [['habits', '/app/habits'], ['goals', '/app/goals'], ['wealth', '/app/wealth'], ['health', '/app/health']] as const) {
    const own = buildPageContext({area, pathname, consent: consent({settings: healthOpen, area, pathname, layoutHasHealth: true, accountActive: false, accountHealthPermitted: null}), now: sources.now, habitDay: DAY, healthDay: DAY, habits, health, fasting, platform, localGoals: [], metadata: {}, quotes: [], portfolio: null, week: null});
    expect(pagePack({area, sources, gates: gatesFor(healthOpen)})!.text, area).toBe(own.text);
  }
  // Through the engine on a private screen: the message may go, its records do not.
  await mount(connected(), novaContext(connected(), {sensitive: true}));
  await act(async () => { await nova!.send('Which habit is strongest?', {area: 'habits', zigi: true}); }); await settle();
  expect(bodies).toHaveLength(1);
  const habitLine = pagePack({area: 'habits', sources, gates: gatesFor(connected())})!.text.split('\n')[1]!;
  expect(bodies[0]).not.toContain(habitLine);
  expect(systemOf(bodies[0]!)).toContain('No records are attached for this page');
});
test('privacy: with no model connected nothing leaves the device; NOVA answers on the device and the chat says so', async () => {
  await mount(defaultAiSettings());
  await act(async () => { await nova!.ask('How many habits do I have?', {area: 'today'}); }); await settle();
  await act(async () => { await nova!.ask('Write me a poem about my goals', {area: 'goals', zigi: true}); }); await settle();
  expect(bodies).toHaveLength(0);
  const answers = nova!.chat.turns.filter(t => t.role === 'assistant');
  expect(answers.length).toBe(2);
  for (const a of answers) expect(a.source).toBe('local');
  expect(chatOrigin(localStorage, nova!.chat.id)).toEqual({by: 'nova'});
});
test('privacy mode (lane NC\'s guard in the engine\'s one send path) holds for a task NOVA hands to ZIGi: Strict sends nothing to a cloud model; Guarded redacts', async () => {
  localStorage.setItem('zigoals:nova-setup:v1', JSON.stringify({version: 1, privacyMode: 'strict'}));
  await mount(healthOpen);
  await act(async () => { await nova!.send('Summarise my health week', {area: 'health', zigi: true}); }); await settle();
  await act(async () => { await nova!.send('And my day?', {area: 'today'}); }); await settle();
  expect(bodies).toHaveLength(0);
  expect(nova!.failure?.kind).toBe('blocked');
  localStorage.setItem('zigoals:nova-setup:v1', JSON.stringify({version: 1, privacyMode: 'guarded'}));
  await act(async () => { nova!.dismissFailure(); nova!.startNew(); }); await settle();
  await act(async () => { await nova!.send('My IBAN is NL91ABNA0417164300, which goal should it fund?', {area: 'goals', zigi: true}); }); await settle();
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).not.toContain('NL91ABNA0417164300');
  expect(systemOf(bodies[0]!)).toContain(SPECIALISTS.goals.prompt.slice(0, 40));
});

const hermesSystem = (body: string) => String((JSON.parse(body) as {messages: {role: string; content: string}[]}).messages.find(m => m.role === 'system')?.content ?? '');
test('Ask my Hermes (MOCK OpenAI-compatible server): the task goes to the person\'s own agent with that page\'s records and the same rules; its reply is only cards', async () => {
  hermesRecord(true);
  hermesReply = 'Here is a start.\n\n```zigoals-action\n{"kind":"log-water","millilitres":250}\n```\n\nI also moved €500 to savings for you.';
  await mount(connected());
  await act(async () => { await nova!.send('Plan my week from my goals', {area: 'goals', zigi: true, agent: 'hermes'}); }); await settle();
  expect(bodies, 'the person\'s main provider is not asked').toHaveLength(0);
  expect(hermesCalls).toHaveLength(1);
  expect(hermesCalls[0]!.url).toBe(`${HERMES}/v1/chat/completions`);
  expect(hermesCalls[0]!.auth).toBe('Bearer hermes-key-FAKE-0000');
  const system = hermesSystem(hermesCalls[0]!.body);
  expect(system).toContain(SPECIALISTS.goals.prompt.slice(0, 40));
  expect(system.endsWith(agentNote('Hermes Agent', 'Rey'))).toBe(true);
  expect(system).toContain('Never sign, send, transfer or move money');
  expect(system).not.toContain(novaOpening('Rey'));
  expect(JSON.parse(hermesCalls[0]!.body).model).toBe('hermes-agent');
  // The reply is stored like any other (from the local agent), and only whitelisted cards come out of it: words are words.
  const reply = nova!.chat.turns.at(-1)!;
  expect(reply.provider).toBe('local'); expect(reply.model).toBe('hermes-agent');
  const parsed = parseReply(reply.text);
  expect(parsed.proposals.map(p => p.kind)).toEqual(['log-water']);
  // Retry asks Hermes again, the same way.
  await act(async () => { await nova!.regenerate(); }); await settle();
  expect(hermesCalls).toHaveLength(2); expect(bodies).toHaveLength(0);
});
test('Hermes and the privacy mode (lane NC\'s rule in the engine\'s guard): not confirmed local, Strict and Guarded redact; confirmed local, Strict sends it as it is', async () => {
  hermesRecord(false);
  localStorage.setItem('zigoals:nova-setup:v1', JSON.stringify({version: 1, privacyMode: 'strict'}));
  await mount(healthOpen);
  await act(async () => { await nova!.send('My IBAN is NL91ABNA0417164300; which goal should it fund?', {area: 'goals', zigi: true, agent: 'hermes'}); }); await settle();
  expect(hermesCalls).toHaveLength(1);
  expect(hermesCalls[0]!.body).not.toContain('NL91ABNA0417164300');
  localStorage.setItem('zigoals:nova-setup:v1', JSON.stringify({version: 1, privacyMode: 'guarded'}));
  await act(async () => { nova!.startNew(); }); await settle();
  await act(async () => { await nova!.send('My IBAN is NL91ABNA0417164300; which goal should it fund?', {area: 'goals', zigi: true, agent: 'hermes'}); }); await settle();
  expect(hermesCalls).toHaveLength(2);
  expect(hermesCalls[1]!.body).not.toContain('NL91ABNA0417164300');
  hermesRecord(true);
  localStorage.setItem('zigoals:nova-setup:v1', JSON.stringify({version: 1, privacyMode: 'strict'}));
  await act(async () => { nova!.startNew(); }); await settle();
  await act(async () => { await nova!.send('How was my health week?', {area: 'health', zigi: true, agent: 'hermes'}); }); await settle();
  expect(hermesCalls).toHaveLength(3);
  // Health went only because its gate is open here; with it closed, Hermes gets no Health record (the same scopes as ZIGi).
  expect(hermesSystem(hermesCalls[2]!.body)).toContain(SPECIALISTS.health.prompt.slice(0, 40));
  expect(bodies).toHaveLength(0);
});
test('Hermes gets no Health record while Health is closed, and nothing at all when it is not connected', async () => {
  hermesRecord(true);
  const openLines = pagePack({area: 'health', sources, gates: gatesFor(healthOpen)})!.text.split('\n').filter(l => l && !l.startsWith('#')).slice(0, 6);
  await mount(connected());
  await act(async () => { await nova!.send('Summarise my health', {area: 'health', zigi: true, agent: 'hermes'}); }); await settle();
  expect(hermesCalls).toHaveLength(1);
  for (const line of openLines) expect(hermesCalls[0]!.body).not.toContain(line);
  // A surface with no agent connected: refused before anything is stored or sent.
  await act(async () => root.unmount());
  root = createRoot(document.body.appendChild(document.createElement('div')));
  const ctx = novaContext(connected()), surface: NovaSurface = {...surfaceFor(ctx, connected()), agent: () => null};
  await act(async () => { root.render(h(Nova, {settings: connected(), ctx, surface})); }); await settle();
  await act(async () => { await nova!.send('Plan my week', {area: 'goals', zigi: true, agent: 'hermes'}); }); await settle();
  expect(hermesCalls).toHaveLength(1); expect(bodies).toHaveLength(0);
  expect(nova!.failure?.title).toBe('Your Hermes Agent is not connected yet.');
  expect(nova!.chat.turns).toHaveLength(0);
});
