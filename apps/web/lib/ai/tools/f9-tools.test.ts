import {beforeAll, expect, test} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {Handles} from '../handles';
import {localAnswer} from '../local-answers/engine';
import {recordedSnapshot} from '../evals/fixtures-af';
import {toolEnv, type ToolSources} from './env';
import {gatesFor, showcaseSources} from './fixtures';
import {readAkToolSources} from './ak-sources';
import {runTool, TOOLS} from './registry';
import type {ToolOk, ToolResult} from './types';
import type {EarnSnapshot} from '../../earn/snapshot';

/**
 * Owner follow-up 1 (F9): ZIGi's read-only tools and on-device answers for the F4–F5 features, on the Showcase's own
 * records (its debts and planner figures, its supplements log, its challenges, its agenda) and the recorded validators
 * read. Nothing is written, nothing is fetched, nothing advises; the Health gate holds the supplements back.
 */
const DAY = '2026-10-31';
const data = (result: ToolResult) => { if (!result.ok) throw new Error(`refused: ${result.refusal}`); return (result as ToolOk).data as Record<string, any>; }; // eslint-disable-line @typescript-eslint/no-explicit-any
let snapshot: EarnSnapshot;
beforeAll(() => { snapshot = recordedSnapshot(); });
function sources(over: Partial<ToolSources> = {}): ToolSources {
  const {records} = buildShowcase(DAY, 'UTC');
  return {...showcaseSources(DAY), ak: readAkToolSources({getItem: k => records[k] ?? null}), earn: snapshot, ...over};
}
const env = (s = sources(), health = true, purpose: 'provider' | 'local' = 'local') => toolEnv(s, gatesFor(health, 'today'), purpose, new Handles());
const ask = (q: string, e = env()) => localAnswer(q, e);
const textOf = (r: ReturnType<typeof localAnswer>) => r.kind === 'none' ? '' : r.text;

test('the five tools are registered, read only, each behind its area\'s switch (the supplements behind the Health gate)', () => {
  const names = TOOLS.map(t => t.name);
  for (const name of ['debt_plan', 'supplements', 'agenda', 'validators', 'savings_challenges']) expect(names).toContain(name);
  expect(runTool('supplements', {}, env(sources(), false, 'provider'))).toMatchObject({ok: false, reason: 'gate'});
  const e = env(sources(), true, 'provider'), closed = {...e, areas: {...e.areas, wealth: false, goals: false, today: false}};
  for (const name of ['debt_plan', 'validators', 'savings_challenges', 'agenda']) expect(runTool(name, {}, closed), name).toMatchObject({ok: false, reason: 'area'});
});
test('debt_plan: per currency, the debt-free month of each order and the interest, labelled a model, never converted', () => {
  const d = data(runTool('debt_plan', {}, env()));
  expect(d.plans).toHaveLength(1); expect(d.plans[0].currency).toBe('USD');
  expect(d.plans[0].debts.map((x: {debt: string}) => x.debt).sort()).toEqual(['Car loan', 'Credit card']);
  expect(d.plans[0].avalanche.debtFreeIn).toMatch(/\d{4}/); expect(d.plans[0].snowball.months).toBeGreaterThan(0);
  expect(d.rule).toMatch(/A model, not advice/); expect(d.rule).toMatch(/never converted/);
  const missing = data(runTool('debt_plan', {}, env(sources({ak: {...sources().ak, debtPlanner: null}}))));
  expect(missing.plans[0].missing).toMatch(/minimum monthly payment/);
  expect(data(runTool('debt_plan', {}, env(sources({accounts: null})))).note).toMatch(/No debt with a balance/);
});
test('supplements: today\'s doses with their state (not logged is unknown) and the counts; the person\'s words stay data', () => {
  const d = data(runTool('supplements', {}, env()));
  expect(d.today).toContainEqual({item: 'Vitamin D (Showcase)', dose: '1 capsule', time: '08:00', status: 'taken'});
  expect(d.today).toContainEqual(expect.objectContaining({item: 'Magnesium (Showcase)', status: 'not logged'}));
  expect(d.summary.find((s: {item: string}) => s.item === 'Magnesium (Showcase)')).toMatchObject({skipped: 1});
  expect(d.rule).toMatch(/never missed/);
});
test('agenda: titles, days and states for a week; no amounts; meals and workouts only with the Health gate', () => {
  const d = data(runTool('agenda', {days: 7}, env()));
  expect(d.items.length).toBeGreaterThan(0); expect(JSON.stringify(d.items)).not.toMatch(/\$|USD|EUR|€/);
  const closed = data(runTool('agenda', {days: 7}, env(sources(), false)));
  expect(closed.items.some((i: {kind: string}) => i.kind === 'meal' || i.kind === 'workout')).toBe(false);
});
test('validators: status words, the rank by stake and the spread, from the recorded read; none read says so', () => {
  const d = data(runTool('validators', {}, env()));
  expect(d.active).toBe(14); expect(d.spread).toMatch(/more than a third/); expect(d.rule).toMatch(/never ranked by return/);
  expect(d.validators.some((v: {status: string}) => v.status === 'Jailed' || v.status === 'Inactive')).toBe(true);
  expect(data(runTool('validators', {}, env(sources({earn: null})))).note).toMatch(/has not read the validators/);
});
test('savings_challenges: each challenge beside its goal, by handle; nothing moves money', () => {
  const d = data(runTool('savings_challenges', {}, env()));
  expect(d.challenges.map((c: {challenge: string}) => c.challenge).sort()).toEqual(['52-week', 'no-spend']);
  expect(d.challenges[0].goal).toMatch(/^g\d+$/); expect(d.rule).toMatch(/nothing moves money/);
});

// ---- the on-device answers (no AI request) ----
test('"When am I debt-free?" is answered on the device from the planner\'s own model', () => {
  const r = ask('When will I be debt-free?');
  expect(r.kind).toBe('answer'); expect(textOf(r)).toMatch(/^From your own figures/); expect(textOf(r)).toMatch(/debt-free in .+ with avalanche/); expect(textOf(r)).toMatch(/A model, not advice/);
  expect(r.kind !== 'none' && r.calls.map(c => c.tool)).toEqual(['debt_plan']);
  expect(textOf(ask('When is my debt-free month?'))).toMatch(/USD \(2 debts/);
  expect(ask('Should I pay off my car loan first to be debt-free?').kind).not.toBe('answer'); // advice stays the model's
});
test('"What\'s on my agenda this week?" lists the days\' items; tomorrow and today too; it offers the agenda itself', () => {
  const r = ask('What\'s on my agenda this week?');
  expect(r.kind).toBe('answer'); expect(textOf(r)).toMatch(/^On your agenda this week/); expect(textOf(r)).toContain('"kind":"open-agenda"');
  expect(textOf(ask('What is on my calendar tomorrow?'))).toMatch(/agenda tomorrow/);
});
test('supplements: what is left today and "did I take …" by the item\'s own name; refused with the Health gate closed', () => {
  expect(textOf(ask('Which supplements are left today?'))).toMatch(/Magnesium \(Showcase\) \(1 tablet\) at .+: not logged yet/);
  expect(textOf(ask('Did I take my vitamin d (showcase) today?'))).toMatch(/Vitamin D \(Showcase\).+: taken/);
  expect(ask('Which supplements are left today?', env(sources(), false)).kind).toBe('refusal');
});
test('validators in plain words: outside the 10 largest, the 10 largest, the spread, one validator\'s status', () => {
  const outside = textOf(ask('Which validators are outside the 10 largest?'));
  expect(outside).toMatch(/^Of the 14 active validators, 4 are outside the 10 largest by stake: /); expect(outside).toMatch(/never ranked by return/);
  expect(textOf(ask('Who are the 10 largest validators?'))).toMatch(/^The 10 largest active validators by stake:\n1\. /);
  expect(textOf(ask('How decentralised is the stake on ZIGChain?'))).toMatch(/more than a third/);
  const jailed = snapshot.validators.find(v => v.jailed);
  if (jailed) expect(textOf(ask(`Is ${jailed.moniker} jailed?`))).toMatch(/: Jailed\. Paused by the chain/);
  expect(textOf(ask('Which validators are outside the 10 largest?', env(sources({earn: null}))))).toMatch(/has not read the validators/);
});
test('"open my Wrapped" and "open my agenda" are navigation cards on any page, in English and Dutch', () => {
  for (const q of ['Open my Wrapped', 'show me my ZIGoals Wrapped please', 'mijn wrapped openen']) expect(textOf(ask(q)), q).toContain('"kind":"open-wrapped"');
  expect(textOf(ask('Open my agenda for this month'))).toContain('{"kind":"open-agenda","view":"month"}');
  expect(textOf(ask('open the calendar'))).toContain('{"kind":"open-agenda"}');
  expect(textOf(ask('open mijn agenda'))).toContain('"kind":"open-agenda"');
  // Not navigation: a question that names the words.
  expect(textOf(ask('What is ZIGoals Wrapped?'))).not.toContain('open-wrapped');
});

import {emptyTasks} from '../../tasks/schema';
import {addTask} from '../../tasks/engine';
import {addLocalDays} from '../../local-date';
import {NOVA_SCOPES, type NovaScopes} from '../context-pack/nova';
import {novaLocalEnv} from '../../nova/local-env';
import {agendaDays} from './f9-tools';
test('Session AL (L5, LA-022, LS:st2-h): the agenda\'s days carry the person\'s tasks, so ZIGi and NOVA both answer "agenda this week" with them', () => {
  const at = new Date(`${DAY}T08:00:00Z`), tomorrow = addLocalDays(DAY, 1);
  let tasks = addTask(emptyTasks(), {title: 'Pick up parcel', due: DAY, time: '18:00'}, {id: 'task_1', at, today: DAY});
  tasks = addTask(tasks, {title: 'Call the bank', due: tomorrow, priority: 'high'}, {id: 'task_2', at, today: DAY});
  const s = sources({nova: {tasks}});
  // agendaDays: each task on its day, in the Agenda page's order; a task list not read adds nothing.
  const days = agendaDays(env(s), DAY, 2);
  expect(days.map(d => d.date)).toEqual([DAY, tomorrow]);
  expect(days[0]!.items.filter(i => i.source === 'task').map(i => [i.title, i.time])).toEqual([['Pick up parcel', '18:00']]);
  expect(days[1]!.items.filter(i => i.source === 'task').map(i => [i.title, i.time])).toEqual([['Call the bank', null]]);
  expect(agendaDays(env(sources()), DAY, 2).flatMap(d => d.items).some(i => i.source === 'task')).toBe(false);
  // The agenda tool lists each task once, with its priority.
  const rows = data(runTool('agenda', {days: 2}, env(s))).items as {day: string; what: string; kind: string; time?: string}[];
  expect(rows.filter(r => r.kind.startsWith('task'))).toEqual([{day: DAY, time: '18:00', what: 'Pick up parcel', kind: 'task', state: 'open'}, {day: tomorrow, what: 'Call the bank', kind: 'task, high priority', state: 'open'}]);
  // ZIGi's on-device answer and NOVA's.
  expect(textOf(ask('What\'s on my agenda today?', env(s)))).toContain('Pick up parcel');
  expect(textOf(ask('What is on my calendar tomorrow?', env(s)))).toContain('Call the bank');
  const week = textOf(ask('What\'s on my agenda this week?', env(s)));
  expect(week).toMatch(/^On your agenda this week/); expect(week).toContain('Pick up parcel');
  const all = Object.fromEntries(NOVA_SCOPES.map(k => [k, true])) as NovaScopes, nova = novaLocalEnv({sources: s, gates: gatesFor(true, 'today'), scopes: all, chainChosen: true})!;
  const novaWeek = textOf(localAnswer('What\'s on this week?', nova));
  expect(novaWeek).toMatch(/^On your agenda this week/); expect(novaWeek).toContain('Pick up parcel');
  expect(textOf(localAnswer('What do I have tomorrow?', nova))).toContain('Call the bank');
});
