import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R4_PLAN} from '../evals/as/cases-av2-r4-plan';
import {av2R4PlanAnswer} from './av2-r4-plan';
import type {LocalReply} from './engine';
import {addLocalDays} from '../../local-date';
import {addTask, editTask} from '../../tasks/engine';
import {emptyTaskPlan} from '../../tasks/plan-record';
import {flexRule} from '../../tasks/recurrence';
import type {Tasks} from '../../tasks/schema';
import {setAfterHours, setWeekdayHours} from '../../tasks/work-hours';

/** Session AV lane 2 (r4-plan): the on-device answers to round 4's planned week, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const at = new Date(`${DAY}T08:00:00Z`), WED = addLocalDays(DAY, 1);
function withTasks(change: (r: Tasks) => Tasks, base = freshAll()): ToolSources {
  base.nova = {...base.nova, tasks: change(base.nova!.tasks!)};
  return base;
}
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: DAY, allowPast: true});

describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AV2_R4_PLAN.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (id, q, lang) => {
    const r = av2R4PlanAnswer(q, novaEnv(showcaseAll()));
    expect(r).not.toBeNull();
    const t = text(r);
    expect(t.length).toBeGreaterThan(20);
    for (const never of AV2_R4_PLAN.find(c => c.id === id)!.never ?? []) expect(t.toLowerCase()).not.toContain(never.toLowerCase());
    if (lang === 'nl') expect(t.replace(/“[^”]*”/g, '')).not.toMatch(/\b(?:the|your|and|with)\b/);
  });
  test('other questions are left to the other answers', () => {
    for (const q of ['plan my day', 'what is on my timeline tomorrow', 'how much energy does my day take', 'add a task to plan my week']) expect(av2R4PlanAnswer(q, zigiEnv(showcaseAll()))).toBeNull();
  });
});
describe('Plan my week (LEDGER #300)', () => {
  test('where the tasks would go, and what finds no room; nothing is moved', () => {
    const s = withTasks(r => add(add(add(r, 'a', {title: 'Fictional report', minutes: 120, deadline: addLocalDays(DAY, 3)}), 'b', {title: 'Fictional slides', minutes: 60}), 'c', {title: 'Fictional marathon', minutes: 600, deadline: WED}));
    const en = text(av2R4PlanAnswer('how would you plan my week', zigiEnv(s)));
    expect(en).toMatch(/^A plan for the next 7 days would place 2 tasks: .+ 2\. Not placed: “Fictional marathon” \(not before its deadline\)\. Nothing moves until you keep it: Tasks → This week \(or Today\) → Plan my week, with Undo\.$/);
    expect(s.nova!.tasks!.tasks.every(t => !t.time)).toBe(true);
    expect(text(av2R4PlanAnswer('hoe zou je mijn week plannen', zigiEnv(s)))).toMatch(/^Een plan voor de komende 7 dagen zet 2 taken neer: .+ Niet ingepland: “Fictional marathon” \(niet vóór de deadline\)\. Er verschuift niets/);
    expect(text(av2R4PlanAnswer('how would you plan my week', zigiEnv(freshAll())))).toMatch(/^Nothing to place this week: Plan my week places open tasks that have minutes and no time yet\./);
  });
});
describe('working hours (LEDGER #301)', () => {
  test('each weekday and the evening hours; not set says the usual', () => {
    const plan = setAfterHours(setWeekdayHours(setWeekdayHours(emptyTaskPlan(), [1, 2, 3, 4, 5], [{from: '08:30', to: '12:30'}, {from: '13:30', to: '17:00'}]), [0, 6], []), {from: '21:00', to: '23:00'});
    const en = text(av2R4PlanAnswer('what are my working hours', zigiEnv(freshAll()), {plan}));
    expect(en.split('\n')).toEqual(['Your working hours, where Plan my day and Plan my week place tasks:', '• Monday: 8:30 AM–12:30 PM and 1:30 PM–5:00 PM', '• Tuesday: 8:30 AM–12:30 PM and 1:30 PM–5:00 PM', '• Wednesday: 8:30 AM–12:30 PM and 1:30 PM–5:00 PM', '• Thursday: 8:30 AM–12:30 PM and 1:30 PM–5:00 PM', '• Friday: 8:30 AM–12:30 PM and 1:30 PM–5:00 PM', '• Saturday: a day off', '• Sunday: a day off', 'Evening hours for “after hours” tasks: 9:00 PM–11:00 PM. Change them in Tasks → This week → Working hours.']);
    const nl = text(av2R4PlanAnswer('wat zijn mijn werkuren', zigiEnv(freshAll()), {plan}));
    expect(nl.split('\n')[1]).toBe('• maandag: 08:30–12:30 en 13:30–17:00');
    expect(nl.split('\n')[6]).toBe('• zaterdag: vrij');
    expect(text(av2R4PlanAnswer('what are my working hours', zigiEnv(freshAll())))).toMatch(/^You have not set working hours yet, so tasks are placed in the usual 9:00 AM–6:00 PM every day:\n• Monday: 9:00 AM–6:00 PM/);
  });
});
describe('a deadline at risk (LEDGER #302)', () => {
  test('said as a fact, with the tasks; that they fit; none teaches where', () => {
    const plan = setWeekdayHours(emptyTaskPlan(), [0, 1, 2, 3, 4, 5, 6], [{from: '09:00', to: '10:00'}]);
    const s = withTasks(r => add(add(r, 'a', {title: 'Fictional report', minutes: 90, deadline: WED}), 'b', {title: 'Fictional slides', minutes: 30, deadline: WED}));
    expect(text(av2R4PlanAnswer('can I make my deadlines', zigiEnv(s), {plan}))).toBe(`About 2 h of tasks are due by Wed, Nov 18 (“Fictional report”, “Fictional slides”), and about 1 h of your working hours are free before then. Moving the deadline, more hours, or letting one go would make room; Plan my week places what fits.`);
    expect(text(av2R4PlanAnswer('kan ik mijn deadlines halen', zigiEnv(s), {plan}))).toMatch(/^Ongeveer 2 uur aan taken moet af op \S+ 18 nov \(“Fictional report”, “Fictional slides”\), en ongeveer 1 uur van je werkuren is daarvoor vrij\./);
    expect(text(av2R4PlanAnswer('can I make my deadlines', zigiEnv(s)))).toMatch(/^Your 2 tasks with a deadline in the next two weeks fit in your free working hours before them/);
    expect(text(av2R4PlanAnswer('can I make my deadlines', zigiEnv(freshAll())))).toMatch(/^No open task has a deadline ahead\./);
  });
});
describe('waiting, pieces and floating repeats (LEDGER #304, #303, #305)', () => {
  test('the tasks that wait, with what they wait for', () => {
    const s = withTasks(r => editTask(add(add(r, 'v', {title: 'Fictional venue'}), 'i', {title: 'Fictional invitations'}), 'i', {after: ['v']}, DAY));
    expect(text(av2R4PlanAnswer('which tasks are waiting for another task', zigiEnv(s)))).toBe('1 task is waiting (not in Today, not placed):\n• Fictional invitations waits for “Fictional venue”');
    expect(text(av2R4PlanAnswer('welke taken wachten op een andere taak', zigiEnv(s)))).toBe('1 taak wacht (niet in Today, niet ingepland):\n• Fictional invitations wacht op “Fictional venue”');
    expect(text(av2R4PlanAnswer('which tasks are waiting for another task', zigiEnv(freshAll())))).toMatch(/^No task is waiting for another\./);
  });
  test('the tasks in pieces, with what is left; none teaches how', () => {
    const s = withTasks(r => editTask(add(r, 't', {title: 'Fictional thesis', minutes: 240}), 't', {chunk: 60, spent: 60}, DAY));
    expect(text(av2R4PlanAnswer('which tasks are in pieces', zigiEnv(s)))).toBe('1 task goes in pieces:\n• Fictional thesis: 3 pieces left of 1 h (1 done)');
    expect(text(av2R4PlanAnswer('welke taken zijn in stukken verdeeld', zigiEnv(s)))).toBe('1 taak gaat in stukken:\n• Fictional thesis: nog 3 stukken van 1 uur (1 gedaan)');
    expect(text(av2R4PlanAnswer('how do I split a long task', zigiEnv(freshAll())))).toMatch(/^No task is in pieces yet\. In a task’s editor, give it its minutes/);
  });
  test('the floating repeats, by their window’s last day', () => {
    const sunday = addLocalDays(DAY, 5);
    const s = withTasks(r => add(r, 'p', {title: 'Fictional plants', due: sunday, recur: flexRule('week', 'once a week')}));
    expect(text(av2R4PlanAnswer('which tasks are once a week', zigiEnv(s)))).toMatch(/^1 task floats in its week or month:\n• Fictional plants: once a week, by /);
    expect(text(av2R4PlanAnswer('welke taken zijn een keer per week', zigiEnv(s)))).toMatch(/^1 taak zweeft binnen de week of maand:\n• Fictional plants: een keer per week, uiterlijk /);
    expect(text(av2R4PlanAnswer('which tasks are once a week', zigiEnv(freshAll())))).toMatch(/^No task repeats once a week or a month, any day\./);
  });
});
