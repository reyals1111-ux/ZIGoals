import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_TASKS_R2} from '../evals/as/cases-av2-tasks-r2';
import {av2TasksR2Answer} from './av2-tasks-r2';
import type {LocalReply} from './engine';
import {addLocalDays} from '../../local-date';
import {addProject, addSection, addTask, editTask} from '../../tasks/engine';
import {setProjectField} from '../../tasks/custom-fields';
import {setProjectRule} from '../../tasks/rules';
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
    expect(text(av2TasksR2Answer('what note reminders do I have tomorrow', novaEnv(s)))).toMatch(/^1 reminder from your notes tomorrow:\n• call the fictional plumber: at 9:30/);
    expect(text(av2TasksR2Answer('welke herinneringen uit notities heb ik morgen', novaEnv(s)))).toMatch(/^1 herinnering uit je notities morgen:\n• call the fictional plumber: om 09:30/);
    expect(text(av2TasksR2Answer('which reminders from my notes are today', novaEnv(s)))).toMatch(/^No reminder from your notes today/);
  });
  test('the template gallery by group (LEDGER #226), and the older templates question stays the other answer', () => {
    expect(text(av2TasksR2Answer('which templates are there for home', zigiEnv(showcaseAll())))).toMatch(/\n• Home: Cleaning week, A party, A packing list and Spring clean\n/);
    expect(text(av2TasksR2Answer('welke sjablonen heb je voor het gezin', zigiEnv(showcaseAll())))).toContain('• Gezin: Start van het schooljaar, Een kinderverjaardag, Gezinsvakantie en Een weekmenu');
    expect(av2TasksR2Answer('which task templates do I have', zigiEnv(showcaseAll()))).toBeNull();
  });
  test('project rules (LEDGER #228)', () => {
    const s = withTasks(r => { const x = addSection(addProject(r, {name: 'Fictional garden'}, 'pg'), 'pg', 'Done', 'sd'); return setProjectRule(setProjectRule(x, 'pg', {id: 'r1', when: 'section', section: 'sd', then: 'done'}), 'pg', {id: 'r2', when: 'done', then: 'next', days: 7}); });
    expect(text(av2TasksR2Answer('which rules do my projects have', zigiEnv(s)))).toMatch(/^2 rules in 1 project:\n• Fictional garden: in “Done” → mark done; when done → make the next one in 7 days/);
    expect(text(av2TasksR2Answer('welke regels hebben mijn projecten', zigiEnv(s)))).toMatch(/^2 regels in 1 project:\n• Fictional garden: in “Done” → afvinken; als klaar → maak de volgende over 7 dagen/);
    expect(text(av2TasksR2Answer('which rules do my projects have', zigiEnv(freshAll())))).toMatch(/^No project has rules yet/);
  });
  test('custom fields (LEDGER #229)', () => {
    const s = withTasks(r => {
      let x = setProjectField(addProject(r, {name: 'Fictional redo'}, 'pf'), 'pf', {id: 'fb', name: 'Budget', kind: 'number'});
      x = addTask(addTask(x, {title: 'Fictional tiles', projectId: 'pf'}, {id: 'ft', at, today: DAY}), {title: 'Fictional paint', projectId: 'pf'}, {id: 'fp', at, today: DAY});
      return editTask(x, 'ft', {fields: {fb: 450}}, DAY);
    });
    expect(text(av2TasksR2Answer('which custom fields do my projects have', zigiEnv(s)))).toMatch(/^1 project has fields of its own:\n• Fictional redo: Budget \(1 of 2 open tasks filled in, 450 in all\)/);
    expect(text(av2TasksR2Answer('welke eigen velden hebben mijn projecten', zigiEnv(s)))).toMatch(/^1 project heeft eigen velden:\n• Fictional redo: Budget \(1 van 2 open taken ingevuld, 450 samen\)/);
    expect(text(av2TasksR2Answer('what project fields do I have', zigiEnv(freshAll())))).toMatch(/^No project has fields of its own yet/);
  });
  test('the Today switch off refuses', () => {
    const env = zigiEnv(showcaseAll());
    expect(av2TasksR2Answer('what is in my day', {...env, areas: {...env.areas, today: false}})!.kind).toBe('refusal');
  });
});
