import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R3_PLAN} from '../evals/as/cases-av2-r3-plan';
import {av2R3PlanAnswer} from './av2-r3-plan';
import type {LocalReply} from './engine';
import {addLocalDays} from '../../local-date';
import {addTask, editTask} from '../../tasks/engine';
import {emptyTaskPlan, setPlanPrefs} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';

/** Session AV lane 2 (r3-plan): the on-device answers to round 3's planning features, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const at = new Date(`${DAY}T08:00:00Z`);
function withTasks(change: (r: Tasks) => Tasks, base = showcaseAll()): ToolSources {
  base.nova = {...base.nova, tasks: change(base.nova!.tasks!)};
  return base;
}
describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AV2_R3_PLAN.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (_id, q, lang) => {
    const r = av2R3PlanAnswer(q, novaEnv(showcaseAll()));
    expect(r).not.toBeNull();
    const t = text(r);
    expect(t.length).toBeGreaterThan(20);
    if (lang === 'nl') expect(t.replace(/“[^”]*”/g, '')).not.toMatch(/\b(?:the|your|of)\b/); // a feature's own name (“Plan your day”) is quoted
  });
});
describe('Plan your day (LEDGER #256)', () => {
  test('the time it comes and the overdue count it carries; none set teaches where', () => {
    const s = withTasks(r => addTask(r, {title: 'Fictional late letter', due: addLocalDays(DAY, -2)}, {id: 'od1', at, today: DAY, allowPast: true}), freshAll());
    const plan = setPlanPrefs(emptyTaskPlan(), {planTime: '07:30'});
    expect(text(av2R3PlanAnswer('do I get a plan your day reminder', zigiEnv(s), {plan}))).toBe('“Plan your day” comes every day at 7:30 AM and opens Plan my day in Tasks → Today. Today it would say 1 task is overdue. Change or remove it in Tasks → This week.');
    expect(text(av2R3PlanAnswer('wanneer krijg ik een herinnering om mijn dag te plannen', zigiEnv(s), {plan}))).toBe('“Plan your day” komt elke dag om 07:30 en opent Plan my day in Tasks → Today. Vandaag zou hij zeggen dat 1 taak over tijd is. Wijzigen en weghalen kan in Tasks → This week.');
    expect(text(av2R3PlanAnswer('do I get a plan your day reminder', zigiEnv(freshAll())))).toMatch(/^No “Plan your day” reminder is set\. Choose its time in Tasks → This week/);
    expect(av2R3PlanAnswer('plan my day', zigiEnv(showcaseAll()))).toBeNull();
  });
});
describe('task symbols (LEDGER #257)', () => {
  test('open tasks with their symbol and colour; none teaches where', () => {
    const s = withTasks(r => editTask(addTask(r, {title: 'Fictional dentist'}, {id: 'lk1', at, today: DAY}), 'lk1', {look: {glyph: '✚', colour: 'red'}}, DAY), freshAll());
    expect(text(av2R3PlanAnswer('which tasks have a symbol', zigiEnv(s)))).toBe('1 open task has a symbol:\n• ✚ Fictional dentist (red)');
    expect(text(av2R3PlanAnswer('welke taken hebben een symbool', zigiEnv(s)))).toBe('1 open taak heeft een symbool:\n• ✚ Fictional dentist (rood)');
    expect(text(av2R3PlanAnswer('which tasks have a symbol', zigiEnv(freshAll())))).toMatch(/^No open task has a symbol yet\./);
    expect(av2R3PlanAnswer('which habits have a symbol', zigiEnv(s))).toBeNull();
  });
});
describe('the Day Timeline for tomorrow (LEDGER #258)', () => {
  test('tomorrow’s tasks by their time and the habits due; nothing teaches how to plan it', () => {
    const s = withTasks(r => addTask(r, {title: 'Fictional dentist', due: addLocalDays(DAY, 1), time: '10:00'}, {id: 'tm1', at, today: DAY}), freshAll());
    const en = text(av2R3PlanAnswer('what is on my timeline tomorrow', zigiEnv(s)));
    expect(en).toMatch(/^Tomorrow \(.+\): 1 task and 0 habits due\.\n• 10:00 AM Fictional dentist \(task\)\nThe Day Timeline/);
    const nl = text(av2R3PlanAnswer('wat staat er morgen op mijn tijdlijn', zigiEnv(s)));
    expect(nl).toMatch(/^Morgen \(.+\): 1 taak en 0 gewoontes\.\n• 10:00 Fictional dentist \(taak\)/);
    expect(text(av2R3PlanAnswer('what is on my timeline tomorrow', zigiEnv(freshAll())))).toMatch(/^Nothing is planned for tomorrow/);
    expect(text(av2R3PlanAnswer('what is on my timeline tomorrow', zigiEnv(showcaseAll())))).toMatch(/habits? due\.\n/);
  });
});
describe('the day’s energy (LEDGER #259)', () => {
  test('today’s tasks against the amount, in calm words; none rated teaches where', () => {
    const s = withTasks(r => editTask(addTask(r, {title: 'Fictional move', due: DAY, minutes: 120}, {id: 'en1', at, today: DAY}), 'en1', {energy: 'heavy'}, DAY), freshAll());
    expect(text(av2R3PlanAnswer('how much energy does my day take', zigiEnv(s)))).toBe('Today\'s tasks come to about 12 of your 20: room for more.');
    expect(text(av2R3PlanAnswer('hoeveel energie kost mijn dag', zigiEnv(s), {plan: setPlanPrefs(emptyTaskPlan(), {energyAmount: 12})}))).toBe('De taken van vandaag komen op ongeveer 12 van je 12: dicht bij je hoeveelheid.');
    expect(text(av2R3PlanAnswer('how much energy does my day take', zigiEnv(freshAll())))).toMatch(/^No task of today has an energy yet\./);
  });
});
describe('notes kept with focus sessions (LEDGER #260)', () => {
  test('the latest notes with their day and task; none teaches where', () => {
    const s = withTasks(r => addTask(r, {title: 'Fictional report'}, {id: 'fn1', at, today: DAY}), freshAll());
    s.nova = {...s.nova, focus: {version: 1, sessions: [{id: 'focus_fictional-1', startedAt: `${DAY}T09:00:00.000Z`, endedAt: `${DAY}T09:25:00.000Z`, day: DAY, plannedMinutes: 25, focusedSeconds: 1500, awaySeconds: 0, outcome: 'grown', taskId: 'fn1', note: 'Ask Noor about the figures'}]}};
    expect(text(av2R3PlanAnswer('what did I note in my focus sessions', zigiEnv(s)))).toMatch(/^1 focus session has a note; the latest:\n• .+ · Fictional report: Ask Noor about the figures$/);
    expect(text(av2R3PlanAnswer('wat heb ik genoteerd in mijn focussessies', zigiEnv(s)))).toMatch(/^1 focussessie heeft een notitie; de laatste:\n• .+ · Fictional report: Ask Noor/);
    expect(text(av2R3PlanAnswer('what did I note in my focus sessions', zigiEnv(freshAll())))).toMatch(/^No focus session has a note yet\./);
  });
});
describe('copy and clear a day (LEDGER #261)', () => {
  test('where to find each, with today’s count', () => {
    const s = withTasks(r => addTask(r, {title: 'Fictional groceries', due: DAY}, {id: 'cd1', at, today: DAY}), freshAll());
    expect(text(av2R3PlanAnswer('how do I copy a day to another day', zigiEnv(s)))).toMatch(/^Open the Agenda's Day view .+ then Copy: .+ Today holds 1 task\.$/);
    expect(text(av2R3PlanAnswer('can I clear my whole day', zigiEnv(s)))).toMatch(/“Clear this day”: its open tasks move to no day/);
    expect(text(av2R3PlanAnswer('hoe maak ik mijn dag leeg', zigiEnv(s)))).toMatch(/“Clear this day”: de open taken krijgen geen dag meer.+Vandaag heeft 1 taak\.$/);
  });
});
describe('the cycle day (LEDGER #262)', () => {
  test('under the Health gate and the log’s switch; days only, with the log’s line', () => {
    const s = freshAll();
    const days = Object.fromEntries([addLocalDays(DAY, -1), DAY].map(d => [d, {flow: 'light' as const}]));
    s.nova = {...s.nova, cycle: {version: 1, on: true, days}} as never;
    expect(text(av2R3PlanAnswer('what day of my cycle is it tomorrow', zigiEnv(s)))).toBe('Tomorrow is day 3 of your cycle. Information for you, not a contraceptive or a diagnosis.');
    expect(text(av2R3PlanAnswer('welke cyclusdag is het vandaag', zigiEnv(s)))).toBe('Vandaag is dag 2 van je cyclus, een genoteerde menstruatiedag. Informatie voor jou, geen anticonceptie en geen diagnose.');
    expect(av2R3PlanAnswer('which cycle day is it today', zigiEnv(s, false))?.kind).toBe('refusal');
    const off = freshAll(); off.nova = {...off.nova, cycle: {version: 1, days}} as never;
    expect(text(av2R3PlanAnswer('which cycle day is it today', zigiEnv(off)))).toMatch(/^The cycle log is off/);
  });
});
describe('the reading-friendly font (LEDGER #263)', () => {
  test('says where it is, in both languages', () => {
    expect(text(av2R3PlanAnswer('is there a dyslexia friendly font', zigiEnv(freshAll())))).toMatch(/^Yes: Settings → Appearance → Customize → Font → Reading-friendly\./);
    expect(text(av2R3PlanAnswer('is er een lettertype voor dyslexie', zigiEnv(freshAll())))).toMatch(/^Ja: Settings → Appearance → Customize → Font → Reading-friendly\./);
    expect(av2R3PlanAnswer('what font is this', zigiEnv(freshAll()))).toBeNull();
  });
});
