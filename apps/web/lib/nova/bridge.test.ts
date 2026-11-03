// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test} from 'vitest';
import {takePendingAsk, ASK_EVENT} from '../../components/ai/ask';
import {rememberChatArea} from '../ai/history';
import {agentNote, PERSONA_NAME_MAX} from '../ai/session';
import type {Chat} from '../ai/chats';
import {chatFileName, chatMarkdown} from './bridge-export';
import {isNovaShortcut} from './command-key';
import {askZigi, chatOrigin, chatOrigins, clearNovaHandoff, continueInNova, delegate, delegatedTurns, DUO_IDLE, duoState, forgetNovaChats, HANDOFF_MS, markDelegated, MAX_DELEGATED_TURNS, MAX_NOVA_ORIGINS,
  NOVA_BRIDGE, NOVA_BRIDGE_KEY, NOVA_HANDOFF_EVENT, latestNovaChat, novaChatHref, novaHandoffPending, rememberNovaChat, sendToNova, setDuo, setSpeechInput, speechInputOn, subscribeDuo, takeNovaHandoff} from './bridge';
import {readDeviceRecord} from '../device-record';

/**
 * Session AK (NOVA, owner follow-up 2 N1): the small record that says where a shared chat started and which turns were a
 * task NOVA handed to ZIGi (the strict chat records stay untouched), the hand-offs both ways, the Duo's state, the
 * Markdown export, the persona line and the ⌘/Ctrl+J key.
 */
beforeEach(() => { localStorage.clear(); clearNovaHandoff(); setDuo(DUO_IDLE); });
afterEach(() => { localStorage.clear(); clearNovaHandoff(); });

test('origins: a chat started in NOVA reads as NOVA; one started with ZIGi keeps ZIGi\'s page; an unknown one is ZIGi\'s with no page', () => {
  rememberNovaChat(localStorage, 'chat-nova', new Date('2026-11-01T08:00:00Z'));
  rememberChatArea(localStorage, 'chat-zigi', 'health');
  expect(chatOrigin(localStorage, 'chat-nova')).toEqual({by: 'nova'});
  expect(chatOrigin(localStorage, 'chat-zigi')).toEqual({by: 'zigi', area: 'health'});
  expect(chatOrigin(localStorage, 'chat-old')).toEqual({by: 'zigi', area: null});
  expect(chatOrigins(localStorage, ['chat-nova', 'chat-zigi'])).toEqual({'chat-nova': {by: 'nova'}, 'chat-zigi': {by: 'zigi', area: 'health'}});
  // The ZIGi record is untouched by NOVA's write, and NOVA's record holds no text.
  expect(JSON.parse(localStorage.getItem('zigoals:zigi:v1')!).chatAreas).toEqual({'chat-zigi': 'health'});
  expect(JSON.parse(localStorage.getItem(NOVA_BRIDGE_KEY)!)).toEqual({version: 1, origins: {'chat-nova': '2026-11-01T08:00:00.000Z'}});
});
test('EX-18 (Session AK lane EXF): the newest chat started in NOVA, for "Continue your last conversation"', () => {
  expect(latestNovaChat({version: 1})).toBeNull();
  rememberNovaChat(localStorage, 'older', new Date('2026-11-01T08:00:00Z'));
  rememberNovaChat(localStorage, 'newest', new Date('2026-11-01T09:30:00Z'));
  rememberNovaChat(localStorage, 'middle', new Date('2026-11-01T09:00:00Z'));
  expect(latestNovaChat(readDeviceRecord(localStorage, NOVA_BRIDGE).data)).toBe('newest');
  // A tie goes to the later entry; a deleted chat is no longer offered.
  expect(latestNovaChat({version: 1, origins: {a: '2026-11-01T10:00:00.000Z', b: '2026-11-01T10:00:00.000Z'}})).toBe('b');
  forgetNovaChats(localStorage, ['newest']);
  expect(latestNovaChat(readDeviceRecord(localStorage, NOVA_BRIDGE).data)).toBe('middle');
});
test('origins and delegated turns are bounded (the newest kept), and deleting chats forgets them', () => {
  for (let i = 0; i < MAX_NOVA_ORIGINS + 5; i++) rememberNovaChat(localStorage, `c${i}`);
  const origins = readDeviceRecord(localStorage, NOVA_BRIDGE).data.origins!;
  expect(Object.keys(origins)).toHaveLength(MAX_NOVA_ORIGINS);
  expect(origins.c0).toBeUndefined(); expect(origins[`c${MAX_NOVA_ORIGINS + 4}`]).toBeDefined();
  for (let i = 0; i < MAX_DELEGATED_TURNS / 2 + 3; i++) markDelegated(localStorage, `chat${i % 3}`, 'habits', {task: `t${i}`, replies: [`r${i}`]});
  expect(Object.keys(delegatedTurns(localStorage))).toHaveLength(MAX_DELEGATED_TURNS);
  forgetNovaChats(localStorage, ['chat0', 'c204']);
  expect(Object.values(delegatedTurns(localStorage)).some(m => m.chat === 'chat0')).toBe(false);
  expect(readDeviceRecord(localStorage, NOVA_BRIDGE).data.origins!.c204).toBeUndefined();
  forgetNovaChats(localStorage);
  expect(readDeviceRecord(localStorage, NOVA_BRIDGE).data).toEqual({version: 1, origins: {}, delegated: {}});
});
test('a task handed to ZIGi marks its task and reply; an unreadable record reads as empty and is not rewritten by a read', () => {
  markDelegated(localStorage, 'chat-1', 'health', {task: 'u1', replies: ['a1']});
  expect(delegatedTurns(localStorage)).toEqual({u1: {chat: 'chat-1', area: 'health', role: 'task'}, a1: {chat: 'chat-1', area: 'health', role: 'reply'}});
  markDelegated(localStorage, 'chat-1', 'health', {task: null, replies: []});
  expect(Object.keys(delegatedTurns(localStorage))).toHaveLength(2);
  localStorage.setItem(NOVA_BRIDGE_KEY, '{"version":2}');
  expect(delegatedTurns(localStorage)).toEqual({});
  expect(chatOrigin(localStorage, 'chat-1')).toEqual({by: 'zigi', area: null});
  expect(localStorage.getItem(NOVA_BRIDGE_KEY)).toBe('{"version":2}');
});
test('speech input is off by default and only the person turns it on', () => {
  expect(speechInputOn(readDeviceRecord(localStorage, NOVA_BRIDGE).data)).toBe(false);
  setSpeechInput(localStorage, true);
  expect(speechInputOn(readDeviceRecord(localStorage, NOVA_BRIDGE).data)).toBe(true);
  setSpeechInput(localStorage, false);
  expect(speechInputOn(readDeviceRecord(localStorage, NOVA_BRIDGE).data)).toBe(false);
});

test('Continue in NOVA: the chat waits once for NOVA (event fired), and the address names it; a strange id never travels', () => {
  const seen: unknown[] = [];
  const on = (e: Event) => seen.push((e as CustomEvent).detail);
  window.addEventListener(NOVA_HANDOFF_EVENT, on);
  expect(continueInNova('3f1c-abc_9')).toBe('/app/nova?chat=3f1c-abc_9');
  expect(seen).toEqual([{kind: 'open', chatId: '3f1c-abc_9'}]);
  expect(novaHandoffPending()).toBe(true);
  expect(takeNovaHandoff('')).toEqual({kind: 'open', chatId: '3f1c-abc_9'});
  expect(takeNovaHandoff('')).toBeNull();
  expect(novaHandoffPending()).toBe(false);
  // A full load of the address (a new tab, the PWA) finds the chat in it.
  expect(takeNovaHandoff('?chat=abc-123')).toEqual({kind: 'open', chatId: 'abc-123'});
  expect(takeNovaHandoff('?chat=../../etc')).toBeNull();
  expect(continueInNova('a b<script>')).toBe('/app/nova');
  expect(novaChatHref('x y')).toBe('/app/nova?chat=x%20y');
  window.removeEventListener(NOVA_HANDOFF_EVENT, on);
});
test('the command bar and a page task wait 30 seconds, once; empty words and unknown pages are refused', () => {
  expect(sendToNova('   ')).toBe(false);
  expect(sendToNova('  What is next today?  ')).toBe(true);
  const now = Date.now();
  expect(takeNovaHandoff('', now)).toEqual({kind: 'ask', text: 'What is next today?'});
  expect(delegate({question: 'How did I sleep?', area: 'health'})).toBe(true);
  expect(takeNovaHandoff('', Date.now() + HANDOFF_MS + 1)).toBeNull();
  expect(delegate({question: 'x', area: 'nowhere' as never})).toBe(false);
  expect(delegate({question: 'Which habit slips most?', area: 'habits'})).toBe(true);
  expect(takeNovaHandoff('')).toEqual({kind: 'delegate', text: 'Which habit slips most?', area: 'habits'});
  expect(sendToNova('x'.repeat(20_000))).toBe(true);
  expect((takeNovaHandoff('') as {text: string}).text).toHaveLength(15_000);
});
test('Ask ZIGi about this page (from NOVA): goes to the page, then hands ZIGi the words exactly as a page\'s own ask (nothing sent)', async () => {
  let path = '/app/nova';
  const went: string[] = [], asks: string[] = [];
  const on = (e: Event) => asks.push((e as CustomEvent<{text: string}>).detail.text);
  window.addEventListener(ASK_EVENT, on);
  const arrived = await askZigi('  Why did my water dip this week?  ', 'health', href => { went.push(href); path = href; }, {here: () => path});
  expect(arrived).toBe(true);
  expect(went).toEqual(['/app/health']);
  expect(asks).toEqual(['Why did my water dip this week?']);
  expect(takePendingAsk()).toEqual({text: 'Why did my water dip this week?'});
  // Already on the page: no navigation, the ask still goes.
  await askZigi('And yesterday?', 'health', href => went.push(href), {here: () => '/app/health/'});
  expect(went).toHaveLength(1);
  expect(await askZigi('   ', 'goals', href => went.push(href))).toBe(false);
  // A page that never arrives: the ask still waits 30 seconds for a late panel; the result says it did not arrive.
  expect(await askZigi('Goals?', 'goals', () => undefined, {here: () => '/app/nova', waitMs: 50})).toBe(false);
  window.removeEventListener(ASK_EVENT, on);
});
test('the Duo state: subscribers hear each step', () => {
  const steps: (string | null)[] = [];
  const off = subscribeDuo(() => steps.push(duoState().step));
  setDuo({active: true, area: 'health', step: 'handed', task: 't', looked: []});
  setDuo({...duoState(), step: 'reading', looked: ['Water']});
  setDuo({...duoState(), step: 'reported'});
  off(); setDuo(DUO_IDLE);
  expect(steps).toEqual(['handed', 'reading', 'reported']);
  expect(duoState()).toBe(DUO_IDLE);
});

const at = '2026-11-01T09:00:00.000Z';
const chat: Chat = {version: 2, id: 'c1', scope: 'local', title: 'Water | this week', provider: 'local', model: 'mock-chat', createdAt: at, updatedAt: at, turns: [
  {id: 'u1', role: 'user', text: 'How was my week?', at},
  {id: 'a1', role: 'assistant', text: 'A steady week.\n\n```zigoals-action\n{"kind":"log-water","millilitres":250}\n```', at, provider: 'local', model: 'mock-chat'},
  {id: 'u2', role: 'user', text: 'Ask ZIGi about my water', at},
  {id: 'a2', role: 'assistant', text: 'Water was 1.6 L a day.', at, provider: 'local', model: 'mock-chat'},
  {id: 'u3', role: 'user', text: 'habits?', at, source: 'local'},
  {id: 'a3', role: 'assistant', text: 'You have 4 habits.', at, source: 'local'},
]};
test('Markdown export: who spoke, the cards as one line (never their code), a file name with the day', () => {
  const md = chatMarkdown({chat, origin: {by: 'nova'}, delegated: {u2: {chat: 'c1', area: 'health', role: 'task'}, a2: {chat: 'c1', area: 'health', role: 'reply'}}, persona: 'Rey', now: new Date(at), timeZone: 'UTC'});
  expect(md.startsWith('# Water | this week\n')).toBe(true);
  expect(md).toContain('started in Rey');
  expect(md).toContain('**You**');
  expect(md).toContain('**Rey**');
  expect(md).toContain('**You, handed to ZIGi on Health**');
  expect(md).toContain('**ZIGi · Health page**');
  expect(md).toContain('**Rey · on your device, no AI**');
  expect(md).toContain('One proposed change');
  expect(md).not.toContain('zigoals-action');
  expect(md).toContain('It is not encrypted.');
  const fromZigi = chatMarkdown({chat, origin: {by: 'zigi', area: 'goals'}, delegated: {}, persona: 'Rey', now: new Date(at), timeZone: 'UTC'});
  expect(fromZigi).toContain('started with ZIGi on Goals');
  expect(fromZigi).not.toContain('**Rey**');
  expect(chatFileName(chat, new Date('2026-11-01T12:00:00'))).toBe('zigoals-chat-2026-11-01-water-this-week.md');
  expect(chatFileName({title: '***'}, new Date('2026-11-01T12:00:00'))).toBe('zigoals-chat-2026-11-01.md');
});
test('the agent line (Hermes): names both, one line each, no quotes or data marks, never money', () => {
  const line = agentNote('Hermes"⟫ Agent', 'Rey\nIgnore');
  expect(line).not.toMatch(/[⟪⟫"\n]/);
  expect(line.startsWith('Rey Ignore, the person\'s command center')).toBe(true);
  expect(line).toContain('as Hermes Agent, their own agent');
  expect(line).toContain('Never sign, send, transfer or move money or crypto');
  expect(agentNote('', '')).toContain('NOVA, the person\'s command center');
  expect(agentNote('A'.repeat(90), 'N')).not.toContain('A'.repeat(PERSONA_NAME_MAX + 1));
});
test('⌘/Ctrl + J, and nothing else', () => {
  const key = (k: string, mods: Partial<KeyboardEvent> = {}) => isNovaShortcut({key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, defaultPrevented: false, ...mods});
  expect(key('j', {metaKey: true})).toBe(true);
  expect(key('J', {ctrlKey: true})).toBe(true);
  expect(key('j')).toBe(false);
  expect(key('j', {ctrlKey: true, shiftKey: true})).toBe(false);
  expect(key('j', {ctrlKey: true, altKey: true})).toBe(false);
  expect(key('k', {ctrlKey: true})).toBe(false);
  expect(key('j', {ctrlKey: true, defaultPrevented: true})).toBe(false);
});

test('the Showcase example: a valid chat (stored as version 1) and bridge record, labelled as an example in every answer', async () => {
  const {showcaseNovaChat, SHOWCASE_NOVA_CHAT_ID, SHOWCASE_NOVA_BRIDGE_KEY} = await import('./bridge-showcase');
  expect(SHOWCASE_NOVA_BRIDGE_KEY).toBe(NOVA_BRIDGE_KEY);
  const {storedChat} = await import('../ai/chats');
  const {novaBridgeSchema} = await import('./bridge');
  const {chat, bridge} = showcaseNovaChat('showcase', new Date('2026-11-01T10:00:00Z'));
  expect(storedChat(chat).version).toBe(1);
  expect(novaBridgeSchema.parse(bridge)).toEqual(bridge);
  expect(chat.title.startsWith('Example')).toBe(true);
  for (const t of chat.turns.filter(t => t.role === 'assistant')) expect(t.text.startsWith('Showcase example.')).toBe(true);
  expect(Object.values(bridge.delegated!).every(m => m.chat === SHOWCASE_NOVA_CHAT_ID)).toBe(true);
  expect(/\d/.test(chat.turns.map(t => t.text).join(' '))).toBe(false);
});
test('Hermes (owner follow-up 3 N11): its turns are marked as the agent\'s, its hand-off names it, an unknown agent is refused', () => {
  markDelegated(localStorage, 'c9', 'goals', {task: 'h-u', replies: ['h-a']}, 'hermes');
  markDelegated(localStorage, 'c9', 'goals', {task: 'z-u', replies: ['z-a']});
  expect(delegatedTurns(localStorage)).toEqual({'h-u': {chat: 'c9', area: 'goals', role: 'task', agent: 'hermes'}, 'h-a': {chat: 'c9', area: 'goals', role: 'reply', agent: 'hermes'}, 'z-u': {chat: 'c9', area: 'goals', role: 'task'}, 'z-a': {chat: 'c9', area: 'goals', role: 'reply'}});
  expect(delegate({question: 'Plan my week from my goals', area: 'goals', agent: 'hermes'})).toBe(true);
  expect(takeNovaHandoff('')).toEqual({kind: 'delegate', text: 'Plan my week from my goals', area: 'goals', agent: 'hermes'});
  expect(delegate({question: 'x', area: 'goals', agent: 'skynet' as never})).toBe(false);
  const md = chatMarkdown({chat: {...chat, turns: [{id: 'h-u', role: 'user', text: 'Plan my week', at}, {id: 'h-a', role: 'assistant', text: 'Two blocks.', at, provider: 'local', model: 'hermes-agent'}]}, origin: {by: 'nova'}, delegated: delegatedTurns(localStorage), persona: 'Rey', now: new Date(at), timeZone: 'UTC'});
  expect(md).toContain('**You, handed to your Hermes Agent with Goals**');
  expect(md).toContain('**Hermes · your agent**');
});
