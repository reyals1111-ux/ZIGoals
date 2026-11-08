// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {act, createElement as h, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {NovaComposer, pageOption} from '../../components/nova/chat/nova-composer';
import {PAGE_NOTES} from '../../components/ai/ai-settings';
import {ProposalCard, firstNoteLine, healthOffCardLine} from '../../components/ai/proposal-card';
import {addedLine} from '../../components/ai/proposal-list';
import {HEALTH_LINE, healthOffQuickAdd, noteQuickAdd} from '../../components/ai/quick-add-note';
import {savedRecordId} from '../../components/quick-add-line';
import type {ChatSession} from '../../components/ai/use-chat-session';
import type {Plan} from './actions/plan';
import type {Action} from './actions/schema';
import {ZIGI_PAGES} from '../nova/bridge';
import {checklistTodayTool} from './tools/af';
import {agendaTool} from './tools/f9-tools';
import {focusSessionsTool, tasksTool} from './tools/nova-tools';
import {AI_ACTIONS, aiActionsSchema} from './store/actions';
import {AI_ACTIONS_KEY} from './store/keys';
import {readDeviceRecord} from '../device-record';
import {defaultAiSettings} from './settings';
import {DEFAULT_NOVA_SCOPES} from './context-pack/nova';
import {beforeModel, beforeModelText, checkNovaScopes} from '../nova/setup-scopes';
import {CHECK_NOTE_MAX} from '../nova/setup';
import {keepsAsAsk} from '../../components/ai/ask-record';
import {glanceLines} from '../../components/nova/widgets/briefs';
import {recordAsk, type SuggestionsRecord} from '../zigi-suggestions';

/**
 * Session AL fifth pass (lane L7-5c; replay GROK53_REPLAY_L7_2.md on 37d2370c): copy, actions, privacy and the composer,
 * in ZIGi's panel and NOVA's chat. One block per finding id.
 */
let root: Root;
beforeEach(() => { (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; root = createRoot(document.body.appendChild(document.createElement('div'))); });
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; localStorage.clear(); });
const src = (path: string) => readFileSync(join(process.cwd().endsWith('apps/web') ? process.cwd() : join(process.cwd(), 'apps/web'), path), 'utf8');

describe('BN-045: Stop during a reply never sends the words typed meanwhile', () => {
  test('NOVA: typed text stays in the box, unsent, after Stop; Enter still sends it afterwards', async () => {
    const sent: string[] = [];
    let stops = 0;
    function Harness() {
      const [status, setStatus] = useState<ChatSession['status']>('streaming');
      const session = {status, chat: {turns: []}, stop: () => { stops++; setStatus('idle'); }} as unknown as ChatSession;
      return h(NovaComposer, {session, persona: 'NOVA', settings: defaultAiSettings(), sensitive: false, editing: null, onEditing: () => undefined, onSend: (text: string) => { sent.push(text); },
        onDelegate: () => undefined, onOpenZigi: () => undefined, speechOn: false, onSpeech: () => undefined, onListening: () => undefined, onSpoken: () => undefined});
    }
    await act(async () => { root.render(h(Harness)); });
    const box = document.querySelector('textarea')!;
    // Typed ahead while the reply runs (React's own value setter, then the input event it listens to).
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(box, 'and my water today?'); box.dispatchEvent(new Event('input', {bubbles: true})); });
    const stop = [...document.querySelectorAll('button')].find(b => b.textContent === 'Stop')!;
    expect(stop).toBeTruthy();
    await act(async () => { stop.click(); });
    expect(stops).toBe(1);
    expect(sent).toEqual([]); // before the fix the reused <button> became type="submit" inside its own click and submitted
    expect(document.querySelector('textarea')!.value).toBe('and my water today?');
    expect(document.querySelector('.nova-stop')).toBeNull();
    await act(async () => { document.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); });
    expect(sent).toEqual(['and my water today?']);
  });
  test('ZIGi\'s panel: Stop and Send are two elements (keys) and Stop prevents the click\'s default', () => {
    const chat = src('components/ai/ai-chat.tsx');
    expect(chat).toMatch(/<button key="stop" type="button" className="secondary" onClick=\{event => \{ event\.preventDefault\(\); session\.stop\(\); \}\}>Stop<\/button> : <button key="send" type="submit"/);
  });
});

describe('N-LA-06: NOVA\'s "Ask ZIGi about a page" names Tasks, Agenda and Checklist under Today', () => {
  test('the Today choice says so; the other pages keep their names', () => {
    expect(pageOption('today')).toBe('Today (Tasks, Agenda, Checklist)');
    expect(ZIGI_PAGES.filter(p => p !== 'today').map(pageOption)).toEqual(['Goals', 'Habits', 'Health', 'Wealth']);
  });
});

describe('LA-038: Settings → "What each page may share" says where Tasks, Agenda and Checklist are read', () => {
  test('Today names them; the note matches the tools\' own areas (tasks, agenda, focus: Today; the Checklist\'s dots: Habits)', () => {
    expect(PAGE_NOTES.today).toMatch(/Tasks, the Agenda, the Checklist and Focus come under Today/);
    expect(PAGE_NOTES.today).toMatch(/tasks, agenda and focus sessions are read with this switch/);
    expect([tasksTool.area, agendaTool.area, focusSessionsTool.area]).toEqual(['today', 'today', 'today']);
    expect(checklistTodayTool.area).toBe('habits');
    expect(PAGE_NOTES.habits).toMatch(/the Checklist’s dots|the Checklist's dots/);
    expect(PAGE_NOTES.help).toBe('the Help notes about how ZIGoals works; no records');
  });
});

const formPlan = (kind: string, title: string, extra: Partial<Plan> = {}): Plan => ({target: 'form', card: {kind, title, lines: ['Your own item, a dot you tick on the path'], where: 'Checklist', day: null, estimate: false},
  write: () => ({}), undo: null, device: {key: 'zigoals:checklist:v1', patch: {add: {text: 'Floss teeth'}}, label: 'On your Checklist: Floss teeth'}, ...extra} as unknown as Plan);
const buttons = () => [...document.querySelectorAll('button')].map(b => b.textContent);
const card = (plan: Plan, props: Record<string, unknown> = {}) => h(ProposalCard, {action: {kind: plan.card.kind} as unknown as Action, plan, refusal: null, status: 'proposed', error: null, onAdd: () => undefined, onDismiss: () => undefined, onEdit: () => undefined, ...props});

describe('N-LA-02: the Checklist card that adds an item says Add, as other adding cards do', () => {
  test('"Add to your Checklist: Floss teeth" → Add; a device change that adds nothing keeps Apply', async () => {
    await act(async () => { root.render(card(formPlan('checklist-add-custom', 'Add to your Checklist: Floss teeth'))); });
    expect(buttons()).toContain('Add');
    expect(buttons()).not.toContain('Apply');
    await act(async () => { root.render(card(formPlan('set-game-layer', 'Turn the game layer on'))); });
    expect(buttons()).toContain('Apply');
  });
});

describe('BN-047: NOVA\'s cards name NOVA', () => {
  test('the Health-off note and the first-note line, in NOVA and in ZIGi', async () => {
    expect(healthOffCardLine('NOVA')).toBe('Health isn’t shared with NOVA, but adding this card still saves it to Health on this device.');
    expect(healthOffCardLine()).toBe('Health isn’t shared with ZIGi, but adding this card still saves it to Health on this device.');
    expect(firstNoteLine('NOVA')).toMatch(/^Your first note for NOVA: it is kept only when you press Remember/);
    expect(firstNoteLine()).toMatch(/^Your first note for ZIGi:/);
    const water = {target: 'health', card: {kind: 'log-water', title: 'Add water', lines: ['500 mL'], where: 'Health', day: '2026-11-04', estimate: false}, write: () => ({}), undo: null} as unknown as Plan;
    await act(async () => { root.render(card(water, {assistant: 'NOVA', healthOff: true})); });
    expect(document.querySelector('.ai-card-health-off')!.textContent).toBe(healthOffCardLine('NOVA'));
    expect(document.body.textContent).not.toMatch(/shared with ZIGi/);
    await act(async () => { root.render(card(water, {assistant: 'NOVA', healthOff: false})); });
    expect(document.querySelector('.ai-card-health-off')).toBeNull();
    const note = {target: 'memory', card: {kind: 'remember', title: 'Remember this?', lines: ['I am vegetarian'], where: 'NOVA → Memory', day: null, estimate: false}, write: () => ({}), undo: null} as unknown as Plan;
    await act(async () => { root.render(card(note, {assistant: 'NOVA', firstNote: true})); });
    expect(document.querySelector('.ai-card-first-note')!.textContent).toMatch(/^Your first note for NOVA:/);
  });
});

describe('DVR:Z-065: the toast after Remember says what was kept', () => {
  test('a note names its words; other cards their title', () => {
    expect(addedLine({card: {kind: 'remember', title: 'Remember this?', lines: ['I am vegetarian, allergic to peanuts', 'Kept as: Diet style'], where: '', day: null, estimate: false}} as unknown as Plan)).toBe('Remembered: I am vegetarian, allergic to peanuts.');
    expect(addedLine({card: {kind: 'remember', title: 'Remember this?', lines: ['x'.repeat(120)], where: '', day: null, estimate: false}} as unknown as Plan)).toMatch(/^Remembered: x{79}….$/);
    expect(addedLine({card: {kind: 'log-water', title: 'Add water', lines: [], where: '', day: null, estimate: false}} as unknown as Plan)).toBe('Added: Add water.');
  });
});

describe('LA-032, #280–289d: NOVA\'s Quick add with Health off says Save still saves to Health', () => {
  test('the line names the assistant; NOVA\'s turn shows it under the same rule as ZIGi\'s', () => {
    expect(healthOffQuickAdd('NOVA')).toBe('Health isn’t shared with NOVA, but saving this line still saves it to Health.');
    expect(healthOffQuickAdd('ZIGi')).toBe('Health isn’t shared with ZIGi, but saving this line still saves it to Health.');
    for (const line of ['Drank 8 glasses of water', 'Ran 5 km in 30 min', 'I weigh 80.5 kg']) expect(HEALTH_LINE.test(line), line).toBe(true);
    expect(HEALTH_LINE.test('Mark Stretch 5 min as done')).toBe(false);
    const turns = src('components/nova/chat/nova-turns.tsx');
    expect(turns).toMatch(/\{cardShown && common\.healthOff && HEALTH_LINE\.test\(asked\) && <p className="ai-note">\{healthOffQuickAdd\('NOVA'\)\}<\/p>\}/);
    // NOVA's own reading: its Permissions switch AND this device's Health gate.
    expect(src('components/nova/chat/nova-chat.tsx')).toMatch(/const novaHealthOff = !\(scopesNow\.health && context\.gates\.localHealth\);/);
  });
});

describe('MO-065, LA-029: Quick add saves and NOVA\'s cards are in the actions log Activity reads, under their own source', () => {
  test('a saved water, weight or habit line is noted under its record\'s own id; NOVA\'s is marked by NOVA', () => {
    const at = '2026-11-06T07:00:00.000Z';
    expect(savedRecordId({kind: 'water'} as never, {}, at, 'health_w1')).toBe('health_w1');
    expect(savedRecordId({kind: 'weight'} as never, {health: {weights: [{id: 'old', updatedAt: '2026-11-01T00:00:00.000Z'}, {id: 'health_kept', updatedAt: at}]}} as never, at, 'health_new')).toBe('health_kept');
    expect(savedRecordId({kind: 'habit', habitId: 'h1'} as never, {habits: {habits: [{id: 'h1', entries: [{date: '2026-11-06', updatedAt: at}]}]}} as never, at, 'x')).toBe('habit:h1:2026-11-06');
    expect(savedRecordId({kind: 'sleep'} as never, {}, at, 'x')).toBeNull();
    expect(noteQuickAdd({kind: 'water', title: 'Water logged: 500 mL.', recordId: 'health_w1'}, 'ZIGi', localStorage, new Date(at))).toBe(true);
    expect(noteQuickAdd({kind: 'weight', title: 'Weight saved: 80.5 kg.', recordId: 'health_kept'}, 'NOVA', localStorage, new Date(at))).toBe(true);
    expect(noteQuickAdd({kind: 'sleep', title: 'Night saved.', recordId: null}, 'NOVA', localStorage, new Date(at))).toBe(false);
    const actions = readDeviceRecord(localStorage, AI_ACTIONS).data.actions ?? [];
    expect(actions).toEqual([
      {activityId: 'health_w1', kind: 'log-water', title: 'Water logged: 500 mL.', at, via: 'quick-add'},
      {activityId: 'health_kept', kind: 'log-weight', title: 'Weight saved: 80.5 kg.', at, via: 'quick-add', by: 'nova'},
    ]);
    // Additive and optional: a line without them (every line before) still reads, and the record round-trips.
    expect(aiActionsSchema.parse(JSON.parse(localStorage.getItem(AI_ACTIONS_KEY)!)).actions).toHaveLength(2);
    expect(aiActionsSchema.safeParse({version: 1, actions: [{activityId: 'a', kind: 'check-in', title: 't', at}]}).success).toBe(true);
  });
  test('NOVA\'s runner marks its cards by NOVA; Activity says "by NOVA" and never lists a Quick add line without its record', () => {
    expect(src('components/ai/use-proposals.ts')).toMatch(/const byNova = planSurface\?\.surface === 'nova';[\s\S]*\.\.\.\(byNova \? \{by: 'nova' as const\} : \{\}\)/);
    const feed = src('components/activity-feed.tsx');
    expect(feed).toMatch(/novaById\.has\(event\.id\.replace\(\/\^zigi:\/, ""\)\) \? " · by NOVA" : " · by ZIGi"/);
    expect(feed).toMatch(/a\.via !== "quick-add"/);
    expect(feed).toMatch(/a\.by === "nova" \? "Confirmed from a NOVA card"/);
  });
});

describe('LA-003, DV-062, MO-058, X3-11, X3-23: the preview before a model reads the same sharing state as the check', () => {
  test('defaults: Today, Goals, Habits, Wealth are read once a model is connected; only what is off is "not shared"', () => {
    const text = beforeModelText(DEFAULT_NOVA_SCOPES, true, false);
    expect(text).toMatch(/^- Nothing is sent yet: no model is connected\./);
    expect(text).toContain('- Once one is, NOVA reads: Today, agenda, tasks, focus, music and chess; Goals and their pace; Habits and streaks; Wealth; Earn and staking (only once you chose the chain).');
    const out = /Not shared with NOVA \(NOVA → Permissions\): (.*)\.$/m.exec(text)?.[1] ?? '';
    expect(out).toContain('Health');
    for (const on of ['Today', 'Goals', 'Habits', 'Wealth']) expect(out, on).not.toContain(on);
    // The check under it names the very same list.
    const {short} = beforeModel(DEFAULT_NOVA_SCOPES, true, false);
    expect(short).toEqual(['Today', 'Goals', 'Habits', 'Wealth', 'Earn']);
    const note = checkNovaScopes(DEFAULT_NOVA_SCOPES, {included: [], notShared: []}, true, false, false).note!;
    expect(note).toBe('No model is connected yet, so nothing is sent and the preview is empty. Once one is, NOVA reads Today, Goals, Habits, Wealth, Earn. Health: off.');
    expect(note.length).toBeLessThanOrEqual(CHECK_NOTE_MAX); // kept whole: the stored note is cut at 200 characters
    // Every area on, Health shared: still whole.
    const all = {...DEFAULT_NOVA_SCOPES, health: true, notes: true, journal: true};
    expect(checkNovaScopes(all, {included: [], notShared: []}, true, true, false).note!.length).toBeLessThanOrEqual(CHECK_NOTE_MAX);
    expect(src('components/nova/setup/what-nova-sees.tsx')).toMatch(/!sees\.connected && !pack\.included\.length \? <>[\s\S]*beforeModelText\(sees\.scopes, sees\.chainChosen, sees\.healthGate\)/);
  });
});

describe('Guarded words are never kept as a frequent ask (zigoals:zigi-suggestions:v1, found by L7-5a)', () => {
  const guarded = ['I want to hurt myself', 'I want to kill myself', 'Ik wil mezelf pijn doen', 'Ik wil er niet meer zijn', 'I want to hurt my brother', 'Ik wil mijn broer pijn doen',
    'What is the password of my bank account?', 'Wat is het wachtwoord van mijn bankrekening?'];
  test('a guarded message, EN and NL (distress, harm, a secret), is not recorded; an ordinary or advice question still is', () => {
    for (const text of guarded) expect(keepsAsAsk(text), text).toBe(false);
    for (const text of ['Which habits are still open today?', 'Welke gewoontes staan nog open vandaag?', 'Should I buy ETH now?']) expect(keepsAsAsk(text), text).toBe(true);
    // Through the panel's own path: the check comes before recordAsk, so three guarded asks leave the record empty.
    let record: SuggestionsRecord = {version: 1};
    for (let i = 0; i < 3; i++) for (const text of [...guarded, 'Which habits are still open today?']) if (keepsAsAsk(text)) record = recordAsk(record, text, 1_800_000_000_000 + i * 1000, {healthShared: false});
    expect(Object.values(record.questions ?? {}).map(q => q.text)).toEqual(['Which habits are still open today?']);
    expect(src('components/ai/ai-chat.tsx')).toMatch(/if \(sensitive \|\| !session\.kept\) return;[^\n]*\n\s*if \(!keepsAsAsk\(text\)\) return;[^\n]*\n\s*try \{[\s\S]{0,300}?recordAsk\(/);
  });
});

describe('N-045, DV-077: NOVA\'s briefs widget shows the brief\'s goal line', () => {
  const brief = ['Still open today: Exercise, Meditate and Drink water.', 'Done yesterday: Read.', 'Agenda: 2 tasks today.', 'Water: 0 of 2 liters.', 'Goal: Japan adventure can catch up with its plan (40% of the target so far); Goals shows the next step.'];
  test('the goal line takes the last place when it is not among the first lines; otherwise nothing changes', () => {
    expect(glanceLines(brief, 3)).toEqual([brief[0], brief[1], brief[4]]);
    expect(glanceLines(brief, 1)).toEqual([brief[0], brief[4]]);
    expect(glanceLines(brief, 6)).toEqual(brief);
    const week = ['Still open today: Read.', 'Agenda: nothing planned.', 'Water: 1 of 2 liters.', 'Goals with a step this week: Emergency fund.'];
    expect(glanceLines(week, 3)).toEqual([week[0], week[1], week[3]]);
    expect(glanceLines(brief.slice(0, 4), 3)).toEqual(brief.slice(0, 3)); // no goal line: as before
    expect(src('components/nova/widgets/briefs.tsx')).toMatch(/const lines = glanceLines\(novaBriefLines\(latest\), size === 'S' \? 1 : size === 'M' \? 3 : 6\);/);
  });
});
