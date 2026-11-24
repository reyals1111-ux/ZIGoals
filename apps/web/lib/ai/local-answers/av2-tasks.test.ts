import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AV2_TASKS} from '../evals/as/cases-av2-tasks';
import {av2TasksAnswer} from './av2-tasks';
import type {LocalReply} from './engine';
import {addArea, addObjective, linkObjective, setProjectArea, setTaskExtras} from '../../tasks/layouts';
import {emptyTaskPlan, setPlanPrefs, startTimer} from '../../tasks/plan-record';
import {addTask} from '../../tasks/engine';
import type {Tasks} from '../../tasks/schema';

/** Session AV lane 2 (tasks): the on-device answers to lane 2's Tasks features, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const at = new Date(`${DAY}T08:00:00Z`);
function withTasks(change: (r: Tasks) => Tasks): ToolSources {
  const s = showcaseAll();
  s.nova = {...s.nova, tasks: change(s.nova!.tasks!)};
  return s;
}
describe('every corpus question gets an answer of its own, in its language', () => {
  test.each(AV2_TASKS.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]))('%s: %s', (_id, q, lang) => {
    const r = av2TasksAnswer(q, novaEnv(showcaseAll()));
    expect(r).not.toBeNull();
    const t = text(r);
    expect(t.length).toBeGreaterThan(20);
    if (lang === 'nl') expect(t).not.toMatch(/\b(?:the|your|of)\b/);
  });
});
describe('answers read the features', () => {
  test('week objectives with their tasks', () => {
    const s = withTasks(r => { const first = r.tasks.find(t => !t.doneAt)!; return linkObjective(addObjective(r, {week: DAY, title: 'Fictional report done'}, 'o1'), first.id, 'o1'); });
    expect(text(av2TasksAnswer('what are my objectives this week', zigiEnv(s)))).toMatch(/1 objective for this week, 0 reached:\n• Fictional report done — 0 of 1 tasks done/);
    expect(text(av2TasksAnswer('wat zijn mijn weekdoelen', zigiEnv(s)))).toContain('1 weekdoel voor deze week');
  });
  test('daily goal and streak, timers and the day limit from the planning record', () => {
    const s = withTasks(r => addTask(r, {title: 'Fictional long job', due: DAY, minutes: 600}, {id: 'long', at, today: DAY, allowPast: true}));
    const plan = setPlanPrefs(startTimer(emptyTaskPlan(), 'long', s.now!.getTime() - 25 * 60_000), {dailyGoal: 2, dayLimit: 240});
    expect(text(av2TasksAnswer('what is my task streak', zigiEnv(s), {plan}))).toMatch(/of your daily goal of 2 done today/);
    expect(text(av2TasksAnswer('which timers are running', zigiEnv(s), {plan}))).toContain('• Fictional long job: 25 min');
    expect(text(av2TasksAnswer('is my day too full', zigiEnv(s), {plan}))).toMatch(/^Yes: about/);
    expect(text(av2TasksAnswer('is mijn dag te vol', zigiEnv(s), {plan}))).toMatch(/^Ja: zo’n/);
    expect(text(av2TasksAnswer('what is my task streak', zigiEnv(s)))).toContain('No daily goal is set');
  });
  test('start early and areas', () => {
    const s = withTasks(r => {
      let x = addTask(r, {title: 'Fictional packing', due: '2026-11-25'}, {id: 'pk', at, today: DAY});
      x = setTaskExtras(x, 'pk', {early: 3}, at);
      const p = x.projects?.[0]?.id;
      x = addArea(x, 'Work', 'a1');
      return p ? setProjectArea(x, p, 'a1') : x;
    });
    expect(text(av2TasksAnswer('which tasks start early', zigiEnv(s)))).toContain('Fictional packing');
    expect(text(av2TasksAnswer('welke gebieden heb ik', zigiEnv(s)))).toContain('1 gebied');
  });
  test('the Today switch off refuses; a fresh profile teaches where each lives', () => {
    const env = zigiEnv(showcaseAll());
    expect(av2TasksAnswer('what are my objectives this week', {...env, areas: {...env.areas, today: false}})!.kind).toBe('refusal');
    expect(text(av2TasksAnswer('what are my areas', zigiEnv(freshAll())))).toContain('No areas yet');
    expect(text(av2TasksAnswer('which reminders are in my notes', zigiEnv(freshAll())))).toMatch(/Reminders in your notes|No reminder/);
  });
  test('leaves other questions to the other answers', () => {
    expect(av2TasksAnswer('which task reminders do I have', zigiEnv(showcaseAll()))).toBeNull();
    expect(av2TasksAnswer('add a task buy milk', zigiEnv(showcaseAll()))).toBeNull();
  });
});
