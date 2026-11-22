import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R6_PLAN} from '../evals/as/cases-av2-r6-plan';
import {CORPUS} from '../evals/as/cases';
import {av2R6PlanAnswer} from './av2-r6-plan';
import type {LocalReply} from './engine';
import {addProject, addTask, editTask, finishTask} from '../../tasks/engine';
import {holdProject, setProjectInOrder, setReview} from '../../tasks/project-states';
import {setLabelGroup} from '../../tasks/label-groups';
import {addLocalDays} from '../../local-date';
import type {Tasks} from '../../tasks/schema';

/** Session AV lane 2 (r6-plan): the on-device answers to round 6's planning rows, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const at = new Date(`${DAY}T08:00:00Z`);
function withTasks(change: (r: Tasks) => Tasks, base = freshAll()): ToolSources {
  base.nova = {...base.nova, tasks: change(base.nova!.tasks!)};
  return base;
}
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: DAY, allowPast: true});
const OWN = new Set(AV2_R6_PLAN.map(c => c.id));

describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AV2_R6_PLAN.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (id, q, lang) => {
    const r = av2R6PlanAnswer(q, novaEnv(showcaseAll()));
    expect(r).not.toBeNull();
    const t = text(r);
    expect(t.length).toBeGreaterThan(20);
    for (const never of AV2_R6_PLAN.find(c => c.id === id)!.never ?? []) expect(t.toLowerCase()).not.toContain(never.toLowerCase());
    if (lang === 'nl') expect(t.replace(/“[^”]*”/g, '')).not.toMatch(/\b(?:the|your|and|with)\b/);
  });
  test('other questions are left to the other answers', () => {
    for (const q of ['plan my day', 'what am I doing right now', 'which tasks did I cancel', 'what are my labels', 'add a task to review the budget', 'which tasks are overdue']) expect(av2R6PlanAnswer(q, zigiEnv(showcaseAll()))).toBeNull();
  });
  // Session AV lane 2 (r6-plan): its own intents are left out, so the check holds once the lead adds them to the corpus.
  test('no other question of today’s corpus is answered here (wiring it first moves nothing)', () => {
    const taken: string[] = [], n = novaEnv(showcaseAll()), z = zigiEnv(showcaseAll());
    for (const c of CORPUS) if (!OWN.has(c.id)) for (const q of [...c.en, ...c.nl]) if (av2R6PlanAnswer(q, n) || av2R6PlanAnswer(q, z)) taken.push(`${c.id}: ${q}`);
    expect(taken).toEqual([]);
  }, 120_000);
});

describe('projects on hold, in order and up for review (LEDGER #392, #393, #395)', () => {
  const later = addLocalDays(DAY, 14);
  const s = withTasks(r => {
    let x = addProject(addProject(r, {name: 'Fictional house'}, 'p_house'), {name: 'Fictional party'}, 'p_party');
    x = add(add(add(x, 'v', {title: 'Fictional venue', projectId: 'p_party', order: 1}), 'i', {title: 'Fictional invitations', projectId: 'p_party', order: 2}), 'g', {title: 'Fictional gutters', projectId: 'p_house'});
    return setReview(setProjectInOrder(holdProject(x, 'p_house', DAY, later), 'p_party', true), 'p_party', 1, addLocalDays(DAY, -7));
  });
  test('named with their resume day, the next task, the review’s turn', () => {
    expect(text(av2R6PlanAnswer('which projects are on hold', zigiEnv(s)))).toMatch(/^1 project is on hold; their tasks are out of Today, Upcoming and the reminders:\n• Fictional house \(until .+\)$/);
    expect(text(av2R6PlanAnswer('welke projecten staan in de wacht', zigiEnv(s)))).toMatch(/^1 project staat in de wacht;.*\n• Fictional house \(tot .+\)$/);
    expect(text(av2R6PlanAnswer('what is next in my projects', zigiEnv(s)))).toBe('Projects done in order, one task at a time:\n• Fictional party: next is Fictional venue (1 waiting their turn)');
    expect(text(av2R6PlanAnswer('wat is de volgende taak in mijn project', zigiEnv(s)))).toBe('Projecten op volgorde, één taak tegelijk:\n• Fictional party: de volgende is Fictional venue (1 wachten op hun beurt)');
    expect(text(av2R6PlanAnswer('which projects need a review', zigiEnv(s)))).toBe('1 project is up for review in Tasks → Review:\n• Fictional party');
    expect(text(av2R6PlanAnswer('which projects are on hold', zigiEnv(freshAll())))).toMatch(/^No project is on hold\./);
  });
});

describe('the focus, a repeat’s record, label groups (LEDGER #394, #396, #397)', () => {
  test('the focus from the planning record; never a focus that is not there', () => {
    const s = withTasks(r => addProject(r, {name: 'Fictional work'}, 'p_work'));
    expect(text(av2R6PlanAnswer('what am I focused on', zigiEnv(s), {plan: {version: 1, focus: {projects: ['p_work']}}}))).toMatch(/^You are focused on Fictional work: /);
    expect(text(av2R6PlanAnswer('waar ben ik op gefocust', zigiEnv(s), {plan: {version: 1, focus: {projects: ['p_work']}}}))).toMatch(/^Je bent gefocust op Fictional work: /);
    expect(text(av2R6PlanAnswer('what am I focused on', zigiEnv(s), {plan: {version: 1, focus: {projects: ['p_gone']}}}))).toMatch(/^No focus is on/);
  });
  test('a repeat’s record: done, by its day and after it, the average days, as facts', () => {
    const s = withTasks(r => {
      let x = add(r, 'b', {title: 'Fictional bins', due: addLocalDays(DAY, -14), recur: {every: 'week', interval: 1}});
      x = finishTask(x, 'b', new Date(`${addLocalDays(DAY, -14)}T09:00:00Z`), {today: DAY, doneDay: addLocalDays(DAY, -14)});
      x = editTask(x, 'b', {due: addLocalDays(DAY, -7)}, DAY, {allowPast: true});
      return finishTask(x, 'b', new Date(`${addLocalDays(DAY, -5)}T09:00:00Z`), {today: DAY, doneDay: addLocalDays(DAY, -5)});
    });
    const en = text(av2R6PlanAnswer('how often did I do my repeating tasks', zigiEnv(s)));
    expect(en).toMatch(/^Your repeating tasks over the last 3 months:\n• Fictional bins \(every week\): done 2 times \(1 by its day, 1 after it\), on average every 9 days$/);
    expect(text(av2R6PlanAnswer('hoe vaak heb ik mijn herhalende taken gedaan', zigiEnv(s)))).toMatch(/2 keer gedaan \(1 op of voor de dag, 1 erna\), gemiddeld om de 9 dagen$/);
    expect(en).not.toMatch(/behind|late/i);
  });
  test('label groups listed; the how-to answers', () => {
    const s = withTasks(r => setLabelGroup(r, {id: 'g', name: 'Where', labels: ['home', 'office']}));
    expect(text(av2R6PlanAnswer('what label groups do I have', zigiEnv(s)))).toBe('Your label groups (a task carries one label of each):\n• Where: @home, @office');
    expect(text(av2R6PlanAnswer('how do I change several tasks at once', zigiEnv(s)))).toMatch(/^In Tasks, choose Select/);
    expect(text(av2R6PlanAnswer('can a task repeat on the second to last Friday', zigiEnv(s)))).toMatch(/^Yes\. Type “every second-to-last Friday”/);
  });
});
