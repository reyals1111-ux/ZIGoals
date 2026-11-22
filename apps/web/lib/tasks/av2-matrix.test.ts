import {describe, expect, it} from 'vitest';
import {DEFAULT_RULES, levelForMove, matrix, readRules, readSaved, ruleWords, sameRules} from './matrix';
import {addTask} from './engine';
import {emptyTasks} from './schema';

/** Session AV lane 2 (tasks, LEDGER #14, q1 Minor; TickTick): matrix rules by label, one project, several saved matrices. */
const at = new Date('2026-11-23T08:00:00Z'), today = '2026-11-23';
let r = addTask(emptyTasks(), {title: 'Fictional report', labels: ['work']}, {id: 'a', at, today});
r = addTask(r, {title: 'Fictional call', labels: ['today']}, {id: 'b', at, today});
r = addTask(r, {title: 'Fictional plan', level: 2}, {id: 'c', at, today});
describe('matrix rules by label and project', () => {
  it('a label makes a task important or urgent, whatever its priority or day', () => {
    const rules = readRules({...DEFAULT_RULES, importantLabels: ['work'], urgentLabels: ['Today']});
    const m = matrix(r.tasks, today, rules);
    expect([m.plan.map(t => t.id), m.quick.map(t => t.id)]).toEqual([['a', 'c'], ['b']]);
    expect(ruleWords(rules)).toContain('or labelled @work');
    expect(() => levelForMove(r.tasks[0]!, 'later', today, rules)).toThrow(/its label \(@work\)/);
  });
  it('reads only good labels and project ids; keeps the usual lines otherwise', () => {
    expect(readRules({urgentDays: 3, importantUpTo: 1, importantLabels: ['ok', 'bad label', 3], project: '../x'})).toEqual({urgentDays: 3, importantUpTo: 1, importantLabels: ['ok']});
    expect(sameRules(readRules(null), DEFAULT_RULES)).toBe(true);
  });
  it('keeps the matrix to one project', () => {
    expect(Object.values(matrix(r.tasks, today, {...DEFAULT_RULES, project: 'project_none'})).flat()).toEqual([]);
  });
  it('several saved matrices, bad ones left out', () => {
    expect(readSaved({saved: [{id: 'm1', name: 'Work week', rules: {urgentDays: 5, importantUpTo: 3}}, {id: 'm2', name: ' '}, 'x']})).toEqual([{id: 'm1', name: 'Work week', rules: {urgentDays: 5, importantUpTo: 3}}]);
  });
});
