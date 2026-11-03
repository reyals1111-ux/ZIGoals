import {expect, test} from 'vitest';
import {DEFAULT_NOVA_SCOPES, NOVA_SCOPES, type NovaScopes} from '../context-pack/nova';
import {novaLocalEnv} from '../../nova/local-env';
import {toolEnv, type ToolSources} from '../tools/env';
import {gatesFor, showcaseSources, withG1, withHandHealth, withPortfolios} from '../tools/fixtures';
import {HEALTH_CLOSED} from '../tools/format';
import {runTool} from '../tools/registry';
import {localAnswer} from './engine';
import {examplesFor} from './examples';
import {NOVA_EVALS, type NovaEvalCase} from './nova-evals';
import {novaEnvInfo, novaWording} from './nova-env';
import {TONE_FORBIDDEN} from './words';

/**
 * Release review 2 (R2-2): NOVA's on-device eval set on every CI run (the Showcase's fictional records through NOVA's own
 * environment), the questions NOVA's welcome offers, and ZIGi kept exactly as it was: the same questions on ZIGi's own
 * environment answer as before (the golden set's pins: a whole Dutch question and "How far am I on my goals?" with goals
 * stay the model's there).
 */
const sources = (): ToolSources => withG1(withPortfolios(withHandHealth(showcaseSources())));
const ALL = Object.fromEntries(NOVA_SCOPES.map(s => [s, true])) as NovaScopes;
const nova = (env: NovaEvalCase['env'] = 'open', s = sources()) => novaLocalEnv({sources: s, gates: gatesFor(env !== 'gate-off'), scopes: env === 'scope-off' ? DEFAULT_NOVA_SCOPES : ALL, chainChosen: true})!;
const textOf = (r: ReturnType<typeof localAnswer>) => 'text' in r ? r.text.replace(/ /g, ' ') : '';
function why(c: NovaEvalCase): string | null {
  const r = localAnswer(c.question, nova(c.env)), text = textOf(r);
  if (r.kind !== c.expect.reply) return `expected ${c.expect.reply}, got ${r.kind}: "${text.slice(0, 100)}"`;
  for (const w of c.expect.includes ?? []) if (!text.includes(w)) return `missing "${w}" in "${text.slice(0, 160)}"`;
  for (const w of c.expect.excludes ?? []) if (text.includes(w)) return `must not say "${w}"`;
  const tools = r.kind === 'none' ? [] : r.calls.map(x => x.tool);
  for (const t of c.expect.tools ?? []) if (!tools.includes(t)) return `expected the ${t} tool, used ${tools.join(', ') || 'none'}`;
  return null;
}

// 53 cases over the Showcase records take about 4 s alone and more beside other files, so the two full passes have 30 s.
test('NOVA\'s eval set: every family in English, Dutch where the layer speaks it, every case passing', {timeout: 30_000}, () => {
  expect(new Set(NOVA_EVALS.map(c => c.id)).size).toBe(NOVA_EVALS.length);
  for (const family of ['goals', 'due-today', 'sleep', 'week', 'habits-left', 'water', 'tasks', 'day', 'not-here'] as const) expect(NOVA_EVALS.filter(c => c.family === family).length, family).toBeGreaterThanOrEqual(3);
  for (const family of ['goals', 'due-today', 'sleep', 'habits-left'] as const) expect(NOVA_EVALS.some(c => c.family === family && c.lang === 'nl'), family).toBe(true);
  expect(NOVA_EVALS.map(c => ({id: c.id, why: why(c)})).filter(r => r.why)).toEqual([]);
});
test('answers are facts, never advice or judgement words', {timeout: 30_000}, () => {
  for (const c of NOVA_EVALS.filter(x => x.expect.reply === 'answer' && x.lang === 'en' && x.family !== 'day')) expect(textOf(localAnswer(c.question, nova(c.env))), c.id).not.toMatch(TONE_FORBIDDEN);
});
test('unknown is not zero: no task list read, no water target, no night logged, no goal', () => {
  const s = sources();
  expect(textOf(localAnswer('What is due today?', nova('open', {...s, nova: {...s.nova, tasks: undefined}})))).toContain('Tasks: unknown here (the task list was not read).');
  const health = {...s.health, daily: {...s.health.daily!, preferences: {...s.health.daily!.preferences, waterTargetMl: null}}} as ToolSources['health'], noTarget: ToolSources = {...s, health};
  expect(runTool('water', {range: 'today'}, nova('open', noTarget))).toMatchObject({ok: true, data: {yourDailyTargetMl: 'none set'}});
  expect(textOf(localAnswer('How much water to go?', nova('open', noTarget)))).toMatch(/^No daily water target is set, so there is no amount to go \(it is unknown, not zero\)\. Today you logged /);
  const noGoals = {...s, platform: {...s.platform, goals: []}};
  expect(textOf(localAnswer('How far am I on my goals?', nova('open', noGoals)))).toContain('You have no active goals yet');
  const noHabits = {...s, habits: {...s.habits, habits: []}};
  expect(textOf(localAnswer('How many habits are left today?', nova('open', noHabits)))).toMatch(/^No habit is kept yet/);
});
test('NOVA → Permissions decides: a closed pillar is named with where to open it, and nothing of it is read', () => {
  const s = sources(), shut = (over: Partial<NovaScopes>) => novaLocalEnv({sources: s, gates: gatesFor(true), scopes: {...ALL, ...over}, chainChosen: true})!;
  const goals = localAnswer('How far am I on my goals?', shut({goals: false}));
  expect(goals).toMatchObject({kind: 'refusal', calls: []}); expect(textOf(goals)).toBe('Goals is off for NOVA, so it is not read here. Turn it on in NOVA → Permissions.');
  expect(textOf(localAnswer('How many habits are left today?', shut({habits: false})))).toBe('Habits is off for NOVA, so it is not read here. Turn it on in NOVA → Permissions.');
  const due = textOf(localAnswer('What is due today?', shut({today: false})));
  expect(due).toContain('Today is off for NOVA, so not read (NOVA → Permissions).'); expect(due).not.toContain('Book the dentist');
  expect(textOf(localAnswer('What\'s on my agenda this week?', shut({today: false})))).toContain('NOVA → Permissions');
  // Every Health question of the engine, on NOVA's environment, names NOVA's switch and sends nothing on with "Ask my AI for more".
  for (const q of ['How much water did I drink yesterday?', 'Average steps last week?', 'What is my sleep debt?', 'How many workouts did I do this week?']) {
    const r = localAnswer(q, nova('scope-off'));
    expect(r, q).toMatchObject({kind: 'refusal', calls: []}); expect(textOf(r), q).toContain('NOVA → Permissions'); expect(textOf(r), q).not.toContain('Settings → ZIGi');
  }
});
test('the welcome\'s questions are each answered on NOVA\'s environment, Health ones only with Health open', () => {
  for (const env of ['open', 'scope-off', 'gate-off'] as const) {
    const e = nova(env), examples = examplesFor(e, 6);
    expect(examples.slice(0, 2), env).toEqual(['What is due today?', 'How far am I on my goals?']);
    expect(examples.some(x => /sleep|water|steps|protein|eat/i.test(x)), env).toBe(env === 'open');
    for (const x of examples) expect(['answer', 'choices'], `${env}: ${x}`).toContain(localAnswer(x, e).kind);
  }
});
test('ZIGi stays exactly as it was: the same questions on ZIGi\'s environment, and the wording only on NOVA\'s', () => {
  const zigi = toolEnv(sources(), gatesFor(true), 'local'), closed = toolEnv(sources(), gatesFor(false), 'local');
  expect(novaEnvInfo(zigi)).toBeNull(); expect(novaEnvInfo(nova())).not.toBeNull();
  for (const q of ['How far am I on my goals?', 'What is due today?', 'Hoe gaat het met mijn doelen?', 'Hoe heb ik deze week geslapen?', 'Welke gewoontes zijn vandaag nog open?', 'How is my day?', 'What’s left for today?']) expect(localAnswer(q, zigi).kind, q).toBe('none');
  expect(localAnswer('How did I sleep last night?', closed)).toMatchObject({kind: 'refusal', text: HEALTH_CLOSED});
  // The wording itself: a reply that is not a refusal keeps its words, apart from who it is shared with.
  expect(novaWording({kind: 'answer', text: 'Steps 10. Health isn\'t shared with ZIGi.', calls: []}, {healthScope: false, healthGate: true})).toMatchObject({text: 'Steps 10. Health isn\'t shared with NOVA.'});
  expect(novaWording({kind: 'refusal', text: 'Paused on this private screen: ZIGi reads nothing here.', calls: []}, {healthScope: true, healthGate: true})).toMatchObject({text: 'Paused on this private screen: NOVA reads nothing here.'});
});
test('a private screen: NOVA reads nothing', () => {
  const paused = novaLocalEnv({sources: sources(), gates: gatesFor(true, 'today', '/app', {sensitive: true}), scopes: ALL, chainChosen: true})!;
  expect(localAnswer('How far am I on my goals?', paused).kind).toBe('refusal');
  expect(textOf(localAnswer('How many minutes did I meditate this month?', paused))).toBe('Paused on this private screen: NOVA reads nothing here.');
});
