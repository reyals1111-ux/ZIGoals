import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_R5_PLAN} from '../evals/as/cases-av2-r5-plan';
import {av2R5PlanAnswer} from './av2-r5-plan';
import type {LocalReply} from './engine';
import {addTask, editTask, finishTask} from '../../tasks/engine';
import {emptyTaskPlan} from '../../tasks/plan-record';
import {addBlock, dropIntoBlock} from '../../tasks/time-blocks';
import {cancelTask, startDoing} from '../../tasks/task-state';
import {planFor} from '../../tasks/plan-bucket';
import type {Tasks} from '../../tasks/schema';

/** Session AV lane 2 (r5-plan): the on-device answers to round 5's planned day, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const at = new Date(`${DAY}T08:00:00Z`);
function withTasks(change: (r: Tasks) => Tasks, base = freshAll()): ToolSources {
  base.nova = {...base.nova, tasks: change(base.nova!.tasks!)};
  return base;
}
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: DAY, allowPast: true});

describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AV2_R5_PLAN.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (id, q, lang) => {
    const r = av2R5PlanAnswer(q, novaEnv(showcaseAll()));
    expect(r).not.toBeNull();
    const t = text(r);
    expect(t.length).toBeGreaterThan(20);
    for (const never of AV2_R5_PLAN.find(c => c.id === id)!.never ?? []) expect(t.toLowerCase()).not.toContain(never.toLowerCase());
    if (lang === 'nl') expect(t.replace(/“[^”]*”/g, '')).not.toMatch(/\b(?:the|your|and|with)\b/);
  });
  test('other questions are left to the other answers', () => {
    for (const q of ['plan my day', 'how would you plan my week', 'what are my working hours', 'add a task to cancel the gym', 'which tasks are once a week']) expect(av2R5PlanAnswer(q, zigiEnv(showcaseAll()))).toBeNull();
  });
});
describe('Doing and Cancelled (LEDGER #350)', () => {
  test('the tasks being done, since when; the cancelled ones, never called done', () => {
    const s = withTasks(r => cancelTask(startDoing(add(add(r, 'a', {title: 'Fictional chapter'}), 'b', {title: 'Fictional tickets'}), 'a', at), 'b', at));
    expect(text(av2R5PlanAnswer('what am I doing right now', zigiEnv(s)))).toMatch(/^You are doing 1 task:\n• Fictional chapter \(since /);
    expect(text(av2R5PlanAnswer('waar ben ik nu mee bezig', zigiEnv(s)))).toMatch(/^Je bent bezig met 1 taak:\n• Fictional chapter \(sinds /);
    expect(text(av2R5PlanAnswer('which tasks did I cancel', zigiEnv(s)))).toMatch(/^1 task is cancelled \(not counted as done\):\n• Fictional tickets/);
    expect(text(av2R5PlanAnswer('welke taken heb ik geannuleerd', zigiEnv(s)))).toMatch(/^1 taak is geannuleerd/);
    expect(text(av2R5PlanAnswer('what am I doing right now', zigiEnv(freshAll())))).toMatch(/^No task is marked Doing\./);
  });
});
describe('a week or a month without a day (LEDGER #349)', () => {
  test('grouped by week and month; nothing is called missed', () => {
    const s = withTasks(r => editTask(editTask(add(add(r, 'a', {title: 'Fictional gutters'}), 'b', {title: 'Fictional tax letter'}), 'a', {plan: planFor('week', DAY)}, DAY), 'b', {plan: planFor('month', DAY)}, DAY));
    const en = text(av2R5PlanAnswer('what did I plan for this week without a day', zigiEnv(s)));
    expect(en.split('\n')[0]).toBe('Planned for a week or a month, any day:');
    expect(en).toMatch(/Week of .+:\n• Fictional gutters\nMonth from .+:\n• Fictional tax letter$/);
    expect(text(av2R5PlanAnswer('wat heb ik voor deze maand gepland', zigiEnv(s)))).toMatch(/^Gepland voor een week of maand, welke dag ook:\nWeek van /);
  });
});
describe('time blocks, leaving and places (LEDGER #348, #353, #354)', () => {
  test('today’s blocks with “2 of 4 done”; leave by from the typed travel; the written places', () => {
    const plan = addBlock(emptyTaskPlan(), {name: 'Deep work', colour: 'teal', from: '09:00', to: '11:00', on: DAY}, 'blk');
    const block = plan.blocks![0]!;
    const s = withTasks(r => {
      let x = add(add(add(r, 'a', {title: 'Fictional chapter'}), 'b', {title: 'Fictional outline'}), 'c', {title: 'Fictional dentist', due: DAY, time: '23:00'});
      x = dropIntoBlock(dropIntoBlock(x, 'a', block, DAY), 'b', block, DAY);
      x = finishTask(x, 'a', at, {today: DAY, doneDay: DAY});
      return editTask(x, 'c', {travel: 30, place: 'Fictional Street 1'}, DAY);
    });
    expect(text(av2R5PlanAnswer('what time blocks do I have today', zigiEnv(s), {plan}))).toBe('Today’s time blocks:\n• Deep work, 9:00 AM–11:00 AM: 1 of 2 done');
    expect(text(av2R5PlanAnswer('welke tijdblokken heb ik vandaag', zigiEnv(s), {plan}))).toBe('Je tijdblokken vandaag:\n• Deep work, 09:00–11:00: 1 van 2 gedaan');
    expect(text(av2R5PlanAnswer('what time blocks do I have today', zigiEnv(s)))).toMatch(/^You have no time blocks yet\./);
    expect(text(av2R5PlanAnswer('when do I need to leave', zigiEnv(s)))).toBe('• Leave by 10:30 PM for Fictional dentist (11:00 PM, 30 min, Fictional Street 1)');
    expect(text(av2R5PlanAnswer('hoe laat moet ik vertrekken', zigiEnv(s)))).toMatch(/^• Vertrek om 22:30 voor Fictional dentist \(23:00, 30 min/);
    expect(text(av2R5PlanAnswer('where do I need to be today', zigiEnv(s)))).toBe('Where today’s tasks are:\n• 11:00 PM Fictional dentist: Fictional Street 1');
    expect(text(av2R5PlanAnswer('when do I need to leave', zigiEnv(freshAll())))).toMatch(/Nothing is worked out from a route\.$/);
  });
});
describe('steps, earlier finishes, links and the second zone (LEDGER #351, #352, #356, #357)', () => {
  test('how-to answers name the tasks they apply to; the zone answer reads the chosen zone', () => {
    const s = withTasks(r => add(add(r, 'p', {title: 'Fictional move'}), 'k', {title: 'Fictional boxes', parentId: 'p', minutes: 20}));
    expect(text(av2R5PlanAnswer('how do I play the steps of a task', zigiEnv(s)))).toMatch(/Tasks with steps to play: “Fictional move”\.$/);
    expect(text(av2R5PlanAnswer('how do I undo a tick from last week', zigiEnv(s)))).toMatch(/^In Tasks → Completed, each earlier finish/);
    expect(text(av2R5PlanAnswer('how do I copy a task link', zigiEnv(s)))).toMatch(/“Copy link”/);
    expect(text(av2R5PlanAnswer('what time is it in my second time zone', zigiEnv(s), {zone: 'UTC'}))).toMatch(/^In UTC it is \d{1,2}:\d{2} (?:AM|PM)(?:, tomorrow|, yesterday)? \(/);
    expect(text(av2R5PlanAnswer('hoe laat is het in mijn tweede tijdzone', zigiEnv(s), {zone: 'UTC'}))).toMatch(/^In UTC is het \d{2}:\d{2}/);
    expect(text(av2R5PlanAnswer('show my second time zone', zigiEnv(s)))).toMatch(/^You have not chosen a second time zone\./);
  });
});
