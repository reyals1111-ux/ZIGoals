import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_TASKS_R2} from '../evals/as/cases-av2-tasks-r2';
import {av2TasksR2Answer} from './av2-tasks-r2';
import type {LocalReply} from './engine';
import {addLocalDays} from '../../local-date';
import {addTask} from '../../tasks/engine';
import {emptyTaskPlan} from '../../tasks/plan-record';
import {pickForToday} from '../../tasks/my-day';
import type {Tasks} from '../../tasks/schema';

/** Session AV lane 2 (tasks-r2): the on-device answers to round 2's Tasks features, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const at = new Date(`${DAY}T08:00:00Z`);
function withTasks(change: (r: Tasks) => Tasks): ToolSources {
  const s = showcaseAll();
  s.nova = {...s.nova, tasks: change(s.nova!.tasks!)};
  return s;
}
describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AV2_TASKS_R2.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (_id, q, lang) => {
    const r = av2TasksR2Answer(q, novaEnv(showcaseAll()));
    expect(r).not.toBeNull();
    const t = text(r);
    expect(t.length).toBeGreaterThan(20);
    if (lang === 'nl') expect(t).not.toMatch(/\b(?:the|your|of)\b/);
  });
});
describe('My Day (LEDGER #223)', () => {
  test('today’s picks with their own day, and the open ones from the last day', () => {
    const s = withTasks(r => addTask(addTask(r, {title: 'Fictional tax letter', due: addLocalDays(DAY, 4)}, {id: 'md1', at, today: DAY}), {title: 'Fictional bike repair'}, {id: 'md2', at, today: DAY}));
    const plan = pickForToday(pickForToday(emptyTaskPlan(), ['md2'], addLocalDays(DAY, -1), true), ['md1'], DAY, true);
    const en = text(av2TasksR2Answer('what is in my day', zigiEnv(s), {plan}));
    expect(en).toMatch(/^1 task in My Day today:\n• Fictional tax letter \(its day: /);
    expect(en).toContain('1 task from yesterday is still open');
    const nl = text(av2TasksR2Answer('wat staat er in mijn dag', zigiEnv(s), {plan}));
    expect(nl).toMatch(/^1 taak in My Day vandaag:\n• Fictional tax letter \(eigen dag: /);
    expect(nl).toContain('1 taak van gisteren staat nog open');
  });
  test('nothing picked teaches where; "plan my day" and "is my day too full" are not this answer', () => {
    expect(text(av2TasksR2Answer('what is in my day', zigiEnv(freshAll())))).toMatch(/^Nothing is in My Day today\. Add a task to My Day/);
    expect(av2TasksR2Answer('plan my day', zigiEnv(showcaseAll()))).toBeNull();
    expect(av2TasksR2Answer('is my day too full', zigiEnv(showcaseAll()))).toBeNull();
  });
  test('note reminders of today and tomorrow (LEDGER #224), under the Notes scope', () => {
    const s = showcaseAll(), stamp = s.now!.toISOString();
    s.nova = {...s.nova, notes: {version: 1, voice: false, notes: [{id: 'nr', kind: 'topic', title: 'Fictional house', body: '@remind tomorrow 9:30 call the fictional plumber', createdAt: stamp, updatedAt: stamp}]} as never};
    expect(text(av2TasksR2Answer('what note reminders do I have tomorrow', zigiEnv(s)))).toMatch(/^1 reminder from your notes tomorrow:\n• call the fictional plumber: at 9:30/);
    expect(text(av2TasksR2Answer('welke herinneringen uit notities heb ik morgen', zigiEnv(s)))).toMatch(/^1 herinnering uit je notities morgen:\n• call the fictional plumber: om 09:30/);
    expect(text(av2TasksR2Answer('which reminders from my notes are today', zigiEnv(s)))).toMatch(/^No reminder from your notes today/);
  });
  test('the Today switch off refuses', () => {
    const env = zigiEnv(showcaseAll());
    expect(av2TasksR2Answer('what is in my day', {...env, areas: {...env.areas, today: false}})!.kind).toBe('refusal');
  });
});
