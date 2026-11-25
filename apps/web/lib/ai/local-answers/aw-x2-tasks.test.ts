import {describe, expect, test} from 'vitest';
import type {ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {AW_X2} from '../evals/as/cases-aw-x2';
import {CORPUS} from '../evals/as/cases';
import {awX2TasksAnswer} from './aw-x2-tasks';
import {localAnswer, type LocalReply} from './engine';
import {addTask, editTask, finishTask} from '../../tasks/engine';
import {addLocalDays} from '../../local-date';
import type {Tasks} from '../../tasks/schema';

/** Session AW (X2, LEDGER #432–#437, #448; Amazing Marvin): the on-device answers, English and Dutch, NOVA and ZIGi. */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const at = new Date(`${DAY}T08:00:00Z`);
function withTasks(change: (r: Tasks) => Tasks, base = freshAll()): ToolSources {
  base.nova = {...base.nova, tasks: change(base.nova!.tasks!)};
  return base;
}
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: DAY, allowPast: true});
const OWN = new Set(AW_X2.map(c => c.id));
const ENGLISH = /\b(?:the|your|and|with)\b/;

describe('every corpus question gets an answer of its own, in its language (Showcase and a fresh device)', () => {
  const all = AW_X2.flatMap(c => [...c.en.map(q => [c.id, q, 'en'] as const), ...c.nl.map(q => [c.id, q, 'nl'] as const)]);
  test.each(all)('%s: %s', (id, q, lang) => {
    for (const env of [novaEnv(showcaseAll()), zigiEnv(freshAll())]) {
      const r = awX2TasksAnswer(q, env);
      expect(r, q).not.toBeNull();
      const t = text(r);
      expect(t.length).toBeGreaterThan(20);
      for (const never of AW_X2.find(c => c.id === id)!.never ?? []) expect(t.toLowerCase()).not.toContain(never.toLowerCase());
      if (lang === 'nl') expect(t.replace(/“[^”]*”/g, '')).not.toMatch(ENGLISH);
    }
  });
  test('the engine gives these answers first (wired before round 6)', () => {
    expect(text(localAnswer('what am I dreading', novaEnv(showcaseAll())))).toContain('Sketch the garden bed');
  });
  test('other questions are left to the other answers', () => {
    for (const q of ['plan my day', 'which tasks are overdue', 'am I on track for my groceries target', 'am I on track with my debt plan', 'what are my labels', 'which projects are on hold', 'what is on my agenda today', 'how many tasks did I finish today'])
      expect(awX2TasksAnswer(q, zigiEnv(showcaseAll())), q).toBeNull();
  });
  test('no other question of today’s corpus is answered here (wiring it first moves nothing)', () => {
    const taken: string[] = [], n = novaEnv(showcaseAll()), z = zigiEnv(showcaseAll());
    for (const c of CORPUS) if (!OWN.has(c.id)) for (const q of [...c.en, ...c.nl]) if (awX2TasksAnswer(q, n) || awX2TasksAnswer(q, z)) taken.push(`${c.id}: ${q}`);
    expect(taken).toEqual([]);
  }, 120_000);
});

describe('what the answers say', () => {
  test('dreaded tasks, the most first; none says how to mark one', () => {
    const s = withTasks(r => add(add(add(r, 'a', {title: 'Fictional email', due: DAY}), 'b', {title: 'Fictional tax form'}), 'c', {title: 'Fictional dentist'}));
    s.nova!.tasks = editTask(editTask(s.nova!.tasks!, 'b', {dread: 3}, DAY), 'c', {dread: 1}, DAY);
    const t = text(awX2TasksAnswer('what am I dreading', novaEnv(s)));
    expect(t.indexOf('Fictional tax form')).toBeLessThan(t.indexOf('Fictional dentist'));
    expect(t).toContain('(a lot)');
    expect(t).not.toContain('Fictional email');
    expect(text(awX2TasksAnswer('waar zie ik tegenop', novaEnv(s)))).toContain('(erg)');
    expect(text(awX2TasksAnswer('what am I dreading', novaEnv(freshAll())))).toMatch(/No task is marked/);
  });
  test('put off most: a count, never a judgement', () => {
    const s = withTasks(r => add(r, 't', {title: 'Fictional shed', due: DAY}));
    for (const d of [1, 2, 3]) s.nova!.tasks = editTask(s.nova!.tasks!, 't', {due: addLocalDays(DAY, d)}, DAY);
    const t = text(awX2TasksAnswer('what have I put off most', novaEnv(s)));
    expect(t).toContain('“Fictional shed”: moved 3 times');
    expect(t).toMatch(/never counted against you/);
    expect(text(awX2TasksAnswer('wat heb ik het vaakst uitgesteld', novaEnv(s)))).toContain('3 keer verschoven');
  });
  test('today’s progress: two facts side by side, nothing before the first planned task', () => {
    const s = withTasks(r => finishTask(add(add(r, 'a', {title: 'A', due: DAY}), 'b', {title: 'B', due: DAY}), 'a', new Date(`${DAY}T09:00:00Z`)));
    const t = text(awX2TasksAnswer('how far am I with today\'s plan', novaEnv(s)));
    expect(t).toMatch(/^1 of 2 of today’s tasks are done, and /);
    expect(t).not.toMatch(/behind|late|should/i);
    expect(text(awX2TasksAnswer('how far am I with today\'s plan', novaEnv(freshAll())))).toMatch(/Nothing is planned for today yet/);
  });
  test('a time target by its name, or all of them; the Showcase’s @admin from its focus blocks', () => {
    const show = text(awX2TasksAnswer('how are my time targets', novaEnv(showcaseAll())));
    expect(show).toMatch(/“@admin”: .+ of 3 h this week/);
    expect(text(awX2TasksAnswer('am I on target for admin this week', novaEnv(showcaseAll())))).toMatch(/^• “@admin”/);
    expect(text(awX2TasksAnswer('am I on target for writing this week', novaEnv(showcaseAll())))).toMatch(/There is no time target for “writing”/);
    expect(text(awX2TasksAnswer('am I on target for writing this week', novaEnv(freshAll())))).toMatch(/You have no time targets yet/);
  });
  test('the Showcase’s photo folder has been open a long time; the stuck guide reads in both languages', () => {
    expect(text(awX2TasksAnswer('which tasks have been open the longest', novaEnv(showcaseAll())))).toContain('Sort the photo folder');
    const en = text(awX2TasksAnswer('how do I get started on a stuck task', zigiEnv(freshAll()))), nl = text(awX2TasksAnswer('hoe begin ik aan een taak waar ik op vastloop', zigiEnv(freshAll())));
    expect(en).toContain('Does it feel too big?');
    expect(nl).toContain('Voelt het te groot?');
  });
  test('with the Today switch off, the tasks are not read', () => {
    const s = showcaseAll(), env = zigiEnv(s);
    const shut = {...env, areas: {...env.areas, today: false}};
    const r = awX2TasksAnswer('what am I dreading', shut);
    expect(r?.kind).toBe('refusal');
  });
});
