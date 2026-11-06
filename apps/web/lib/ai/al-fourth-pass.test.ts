import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner, planAction, type Stores} from './actions/plan';
import {actionSchema} from './actions/schema';
import {localReplyHandles, onDeviceCard} from './actions/local-handles';
import {quickAddOffered, quickAddUnder} from './actions/decline';
import {aiGates} from './gates';
import {pageArea} from './context/pages';
import {cleanLabel, pageName} from './context/page-view';
import {localAnswer} from './local-answers/engine';
import {checklistAnswer} from './local-answers/al-fourth';
import {habitDraft} from './local-answers/ai-session';
import {mealLine, noModelReply, otherLanguage} from './local-answers/no-model';
import {novaWording} from './local-answers/nova-env';
import {isBareFollowUp, previousQuestion} from './local-answers/followup';
import {quickCommand} from './quick-commands/commands';
import {buildNovaPack, DEFAULT_NOVA_SCOPES} from './context-pack/nova';
import {defaultAiSettings} from './settings';
import {settingsWith} from './tools/fixtures';
import {runTool} from './tools/registry';
import type {ToolOk} from './tools/types';
import {checkNovaScopes} from '../nova/setup-scopes';
import {emptyReminders} from '../reminders/schema';
import {presetSettings} from '../dashboard-settings';
import {denver, HID, lisbon, L_DAY, zigiEnv} from './evals/l7-fourth-fixtures';
beforeAll(() => loadAaPlanner());

/**
 * Session AL fourth pass (lane L7-4b): one test per cause the replay on c521574f found (docs/review/session-al/
 * GROK53_REPLAY_L7_1.md). The phrasing families themselves are lib/ai/evals/l7-fourth.ts.
 */
const textOf = (r: {kind: string; text?: string} | null) => r && 'text' in r ? r.text ?? '' : '';

describe('#001/#002 LA-017: the Checklist counter has one source', () => {
  test('the question and "Show my checklist" give the same count, in L1 and L2', () => {
    for (const [state, done] of [['L1', 0], ['L2', 1]] as const) {
      const env = zigiEnv(lisbon(state));
      expect(textOf(checklistAnswer('How many checklist items have I done today?', env, 'en'))).toContain(`Checklist today: ${done} of 4 done.`);
      expect(quickCommand('Show my checklist', env)?.text).toContain(`On your Checklist today: ${done} of 4 done.`);
      const tool = runTool('checklist_today', {}, env) as ToolOk;
      expect(tool.data).toMatchObject({total: 4, done});
    }
  });
  test('orbits, next, yesterday unknown (never zero), and Dutch', () => {
    const env = zigiEnv(lisbon('L2'));
    expect(textOf(checklistAnswer('Which checklist item is in the Evening orbit?', env, 'en'))).toBe('Evening orbit: Read 10 pages.');
    expect(textOf(checklistAnswer('What\'s next on my path?', env, 'en'))).toMatch(/^Next on your path: Stretch 5 min \(Afternoon orbit\)/);
    expect(textOf(checklistAnswer('Did I finish my checklist yesterday?', env, 'en'))).toContain('unknown, not zero');
    expect(textOf(checklistAnswer('Wat staat er op mijn checklist?', env, 'nl'))).toContain('Checklist vandaag: 1 van 4 gedaan.');
  });
});

describe('#038/#240 LA-005: the words of a question never name a habit', () => {
  test('a habit called "… delete all my habits" is not the answer to "How many habits are left today?"', () => {
    const env = zigiEnv(lisbon('L2'));
    for (const q of ['How many habits are left today?', 'Which habits are open?', 'What is my best habit?']) expect(textOf(localAnswer(q, env)), q).not.toMatch(/PWNED|Ignore all previous/);
    expect(textOf(noModelReply('How many habits are left today?', env))).toMatch(/^3 habits left today/);
    expect(textOf(noModelReply('What is my best habit?', env))).toContain('Drink water');
  });
});

describe('LA-004, Z060/Z061: a page switch turned off closes the area for on-device answers too', () => {
  test('Habits page data off: ZIGi reads no habit, its Checklist dots or its streak', () => {
    const off = {...settingsWith(false), pageShare: {...settingsWith(false).pageShare, habits: false}};
    const gates = aiGates({settings: off, area: 'today', pathname: '/app/tasks', layoutHasHealth: true, accountActive: false, accountHealthPermitted: null, sensitive: false});
    expect(gates.local.habits).toBe(false);
    expect(gates.local.wealth).toBe(true); // only Habits is off here; Wealth follows its own switch (Q14)
    const env = zigiEnv(lisbon('L2'), {habits: false});
    expect(localAnswer('Longest streak?', env).kind).toBe('refusal');
    expect(textOf(noModelReply('How many habits are left today?', env))).not.toContain('Stretch 5 min');
  });
  test('with every switch on (the default), every area answers on the device as before', () => {
    const gates = aiGates({settings: defaultAiSettings(), area: 'today', pathname: '/app', layoutHasHealth: true, accountActive: false, accountHealthPermitted: null, sensitive: false});
    expect(gates.local).toEqual({today: true, goals: true, habits: true, health: false, wealth: true, help: true});
  });
});

describe('LA-003, DV-062, MO-058: "What NOVA can see" before a model is connected', () => {
  test('nothing is sent yet, so the preview is empty; the check says so and what NOVA will read, never blames switches that are on', () => {
    const settings = defaultAiSettings(), gates = aiGates({settings, area: 'today', pathname: '/app/nova/setup', layoutHasHealth: true, accountActive: false, accountHealthPermitted: null, sensitive: false});
    expect(gates.connected).toBe(false);
    const privacy = {mode: 'relaxed' as const, redactForSend: (t: string) => t};
    const pack = buildNovaPack({sources: lisbon('L2'), gates, scopes: DEFAULT_NOVA_SCOPES, chainChosen: true, privacy});
    expect(pack.included).toEqual([]); // the send's own input (security review Z1A-10): nothing goes before a model is connected
    const before = checkNovaScopes(DEFAULT_NOVA_SCOPES, pack, true, false); // the old reading: blamed the page switches
    expect(before.note).toMatch(/page switch .* is off/);
    const check = checkNovaScopes(DEFAULT_NOVA_SCOPES, pack, true, false, false);
    expect(check.ok).toBe(true);
    expect(check.note).toMatch(/^No model is connected yet, so nothing is sent/);
    expect(check.note).toContain('Habits');
    expect(check.note).not.toMatch(/page switch .* is off/);
  });
});

describe('#006 #008 #021, ZIGi-F9: one message, one write offer', () => {
  test('Quick add sits only under the examples list', () => {
    expect(quickAddUnder({kind: 'examples'})).toBe(true);
    for (const kind of ['answer', 'refusal', 'choices']) expect(quickAddUnder({kind})).toBe(false);
  });
  test('no Quick add for a suggestion, a habit edit, a foreign check-off or a walk with no distance', () => {
    for (const q of ['suggest a habit stack to sleep better', 'make Run three times a week', 'skip Run today, reason: sore knee', 'pause the habit Run for a week', 'hak Drink water ab', 'coche Drink water comme fait', 'marca Drink water como hecho', 'I walked 2 dogs'])
      expect(quickAddOffered(q), q).toBe(false);
    for (const q of ['drank 2 glasses of water', 'walked 3 km', 'I walked 4000 steps', 'ran 5 km in 30 min']) expect(quickAddOffered(q), q).toBe(true);
  });
});

describe('Z-008, Z-009, DV-079: a goal card made on the device resolves on Goals', () => {
  test('the device handles name the open goals, so the contribution and milestone cards plan', () => {
    const s = denver(), stores: Stores = {habits: s.habits, health: s.health, platform: s.platform, fasting: {version: 1} as never, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: null as never, memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}};
    const handles = localReplyHandles(stores);
    expect(handles.filter(h => h.kind === 'goal').map(h => h.label)).toEqual(['Holiday', 'DV Count books', '52-week savings challenge', 'Reach a chess rating', 'A goal', 'B goal']);
    const env = {stores, handles, now: new Date(`${L_DAY}T12:00:00Z`), habitDay: L_DAY, healthDay: L_DAY, timeZone: 'UTC'};
    for (const action of [{kind: 'prefill-contribution', goal: 'Holiday', amount: 50, asset: 'USD', day: 'today'}, {kind: 'add-milestone', goal: 'Holiday', title: 'Book flights'}, {kind: 'close-goal', goal: 'Holiday'}]) {
      const r = planAction(actionSchema.parse(action), env);
      expect(r.ok ? 'ok' : r.message, action.kind).toBe('ok');
    }
    const without = planAction(actionSchema.parse({kind: 'add-milestone', goal: 'Holiday', title: 'Book flights'}), {...env, handles: handles.filter(h => h.kind === 'habit')});
    expect(without.ok ? '' : without.message).toMatch(/not in this page's context/);
  });
  test('a repeating task card keeps its repeat (#008)', () => {
    const s = lisbon('L2'), stores: Stores = {habits: s.habits, health: s.health, platform: s.platform, fasting: {version: 1} as never, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: null as never, memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}};
    const reply = noModelReply('Add a task every Monday: take out the bins', zigiEnv(s)), block = JSON.parse(/```zigoals-action\n([\s\S]*?)\n```/.exec(textOf(reply))![1]!);
    expect(block).toMatchObject({kind: 'add-task', title: 'Take out the bins', due: '2026-11-09', repeat: {every: 'week', interval: 1, weekdays: [1]}});
    void stores;
    const parsed = actionSchema.safeParse({kind: 'add-task', title: 'X', repeat: {every: 'week'}});
    expect(parsed.success).toBe(false); // a repeat needs its first day
  });
});

describe('#363/364 LA-044 ZP-11: a food said with its meal', () => {
  test('the meal is not part of the name', () => {
    expect(mealLine('Log breakfast: oatmeal')).toBe('breakfast: oatmeal');
    expect(mealLine('add oatmeal to breakfast')).toBe('breakfast: oatmeal');
    expect(mealLine('I ate a banana')).toBe('I ate a banana');
  });
  test('a device food card with no values is never badged "AI estimate"; an AI\'s card with figures keeps it', () => {
    const card = (lines: string[]) => ({ok: true as const, plan: {card: {kind: 'log-food', title: 'Log a food with an AI estimate', lines, estimate: true}}});
    const none = onDeviceCard(card(['Breakfast: oatmeal × 1 serving', 'AI estimate per serving: kcal unknown, protein unknown, carbs unknown, fat unknown; unknown stays unknown, never 0', 'Serving weight not given: recorded as 100 g per serving (an AI estimate you can edit in Foods & recipes)', 'Added to Foods & recipes as "AI estimate" so you can correct it later']));
    expect(none.plan.card).toMatchObject({title: 'Log a food', estimate: false});
    expect(none.plan.card.lines.join(' ')).not.toMatch(/AI estimate/);
    const guessed = card(['Breakfast: oatmeal × 1 serving', 'AI estimate per serving: kcal 150, protein 5 g, carbs 27 g, fat 3 g; unknown stays unknown, never 0']);
    expect(onDeviceCard(guessed)).toBe(guessed);
  });
});

describe('P17, NOVA #16, #256a: a new habit said with its cadence, time or minutes', () => {
  test('they are its schedule, time of day and target, never its name', () => {
    expect(habitDraft('Read 20 pages daily 21:00')).toEqual({title: 'Read 20 pages', schedule: 'daily', timeOfDay: 'evening', at: '21:00'});
    expect(habitDraft('Test Stretch every day')).toEqual({title: 'Test Stretch', schedule: 'daily'});
    expect(habitDraft('Meditate 10 minutes')).toEqual({title: 'Meditate', measurement: 'minutes', target: 10});
    expect(habitDraft('Run 3 times a week')).toEqual({title: 'Run', schedule: {timesPerWeek: 3}});
    expect(habitDraft('Yoga')).toEqual({title: 'Yoga'});
  });
});

describe('BN-047 AL-COPY-060: NOVA speaks as NOVA; the places keep their names', () => {
  test('ZIGi becomes NOVA in a NOVA reply, except Actions by ZIGi, Settings → ZIGi and What ZIGi knows about me', () => {
    const info = {healthScope: false, healthGate: false};
    const r = novaWording({kind: 'answer', text: 'ZIGi checks off one item at a time. See Activity → Actions by ZIGi, Settings → ZIGi · Your Personal AI Companion and What ZIGi knows about me.', calls: []}, info);
    expect(textOf(r)).toBe('NOVA checks off one item at a time. See Activity → Actions by ZIGi, Settings → ZIGi · Your Personal AI Companion and What ZIGi knows about me.');
  });
});

describe('#026 #027 LZ-020: German and Japanese get the honest language note', () => {
  test('detected, and said in their language', () => {
    expect(otherLanguage('Wie viele Gewohnheiten habe ich heute erledigt?')).toBe('de');
    expect(otherLanguage('今日のチェックリストは？')).toBe('ja');
    expect(otherLanguage('How many habits did I do today?')).toBeNull();
    expect(textOf(noModelReply('Füge eine Aufgabe hinzu: Milch kaufen', zigiEnv(lisbon('L2'))))).toMatch(/^Im Moment antworte ich auf Englisch/);
  });
});

describe('TK #14–#16: a follow-up refers to the last real question', () => {
  test('earlier bare follow-ups are skipped', () => {
    expect(isBareFollowUp('and in EUR?')).toBe(true);
    expect(isBareFollowUp('How much ETH do I have?')).toBe(false);
    expect(previousQuestion(['and in EUR?', 'How much ETH do I have?'])).toBe('How much ETH do I have?');
  });
});

describe('LA-030 ctx-a: the page awareness map', () => {
  test('Tasks, the Agenda, the Checklist and Focus are Today\'s pages, named as such', () => {
    for (const path of ['/app/tasks', '/app/agenda', '/app/checklist', '/app/focus']) expect(pageArea(path), path).toBe('today');
    expect(pageName('/app/tasks')).toBe('Tasks');
    expect(pageName('/app/agenda')).toBe('Agenda');
    expect(pageArea('/app/help')).toBe('help');
  });
  test('a title loses its dates whole, and a title of only glue words is dropped', () => {
    expect(cleanLabel('Nov 4 – Nov 10 items')).toBe('');
    expect(cleanLabel('Your last 7 days.')).toBe('');
    expect(cleanLabel('Water · 1.2 L')).toBe('Water');
    expect(cleanLabel('Today’s habit progress')).toBe('Today’s habit progress');
  });
});

describe('#324/325 LA-040: an item already done says so', () => {
  test('the notice comes first; the card stays (adding it again changes nothing)', () => {
    const r = quickCommand('mark drink water done', zigiEnv(lisbon('L2')))!;
    expect(r.text).toMatch(/^Drink water is already done today/);
    const l1 = quickCommand('mark drink water done', zigiEnv(lisbon('L1')))!;
    expect(l1.text).toMatch(/^Check off · Drink water · today/);
    void HID;
  });
});
