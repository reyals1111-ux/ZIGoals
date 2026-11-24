import {describe, expect, it} from 'vitest';
import {addProject, addSection, addTask, editTask, finishTask, moveTasks} from './engine';
import {emptyTasks, tasksSchema, TASKS, TASKS_KEY, type Tasks} from './schema';
import {hasRules, projectRules, ruleProblem, rulesSaid, runRules, setProjectRule} from './rules';
import {readDeviceRecord} from '../device-record';
import {readEverything} from '../export/everything';
import {undoOfChange} from './undo';

/** Session AV lane 2 (tasks-r2, LEDGER #228; Any.do's automations): rules on a project, run on the device with the change. */
const today = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
let n = 0;
const opts = {today, at, newId: () => `task_next${++n}`};
function base(): Tasks {
  let r = addSection(addSection(addProject(emptyTasks(), {name: 'Fictional kitchen'}, 'p'), 'p', 'Doing', 'doing'), 'p', 'Done', 'done');
  r = addTask(r, {title: 'Tiles', projectId: 'p'}, {id: 't1', at, today});
  return r;
}
const run = (before: Tasks, change: (r: Tasks) => Tasks) => runRules(before, change(before), opts);

describe('project rules (LEDGER #228)', () => {
  it('when a task is added: set its priority and add a label', () => {
    let r = setProjectRule(base(), 'p', {id: 'r1', when: 'added', then: 'level', level: 2});
    r = setProjectRule(r, 'p', {id: 'r2', when: 'added', then: 'label', label: 'kitchen'});
    const out = run(r, x => addTask(x, {title: 'Buy grout', projectId: 'p'}, {id: 't2', at, today}));
    expect(out.record.tasks.find(t => t.id === 't2')).toMatchObject({level: 2, priority: 'high', labels: ['kitchen']});
    expect(rulesSaid(out.ran, out.record)).toBe('Rules in “Fictional kitchen” set “Buy grout” to P2, added @kitchen to “Buy grout”.');
    // A task elsewhere (the Inbox) is not the project's.
    expect(run(r, x => addTask(x, {title: 'Inbox thing'}, {id: 't3', at, today})).ran).toEqual([]);
  });
  it('when a task enters a section: plan it for today, or mark it done', () => {
    let r = setProjectRule(base(), 'p', {id: 'r1', when: 'section', section: 'doing', then: 'today'});
    r = setProjectRule(r, 'p', {id: 'r2', when: 'section', section: 'done', then: 'done'});
    const moved = run(r, x => moveTasks(x, ['t1'], {projectId: 'p', sectionId: 'doing'}, at));
    expect(moved.record.tasks[0]).toMatchObject({sectionId: 'doing', due: today});
    const finished = run(moved.record, x => moveTasks(x, ['t1'], {projectId: 'p', sectionId: 'done'}, at));
    expect(finished.record.tasks[0]!.doneAt).toBe(at.toISOString());
    expect(rulesSaid(finished.ran, finished.record)).toBe('A rule in “Fictional kitchen” marked “Tiles” done.');
  });
  it('when a task is done: move it to a section and create the next one, due days later', () => {
    let r = setProjectRule(base(), 'p', {id: 'r1', when: 'done', then: 'move', to: 'done'});
    r = setProjectRule(r, 'p', {id: 'r2', when: 'done', then: 'next', title: 'Next tiles order', days: 7});
    const out = run(r, x => finishTask(x, 't1', at, {today}));
    expect(out.record.tasks.find(t => t.id === 't1')).toMatchObject({sectionId: 'done'});
    const made = out.record.tasks.find(t => t.id === out.ran.find(x => x.madeId)!.madeId)!;
    expect(made).toMatchObject({title: 'Next tiles order', projectId: 'p', due: '2026-11-30'});
    expect(made.doneAt).toBeUndefined();
    // One pass: the move into "Done" does not set off section rules, and nothing loops.
    const again = setProjectRule(r, 'p', {id: 'r3', when: 'section', section: 'done', then: 'label', label: 'x'});
    expect(run(again, x => finishTask(x, 't1', at, {today})).record.tasks.find(t => t.id === 't1')!.labels).toBeUndefined();
  });
  it('a repeating task finished sets off a done rule each time; "mark done" never ends a repeat', () => {
    let r = addTask(base(), {title: 'Water plants', projectId: 'p', due: today, recur: {every: 'day', interval: 1}}, {id: 'rep', at, today});
    r = setProjectRule(r, 'p', {id: 'r1', when: 'done', then: 'label', label: 'watered'});
    expect(run(r, x => finishTask(x, 'rep', at, {today})).record.tasks.find(t => t.id === 'rep')!.labels).toEqual(['watered']);
    const marks = setProjectRule(base(), 'p', {id: 'r2', when: 'added', then: 'done'});
    expect(run(marks, x => addTask(x, {title: 'Daily', projectId: 'p', due: today, recur: {every: 'day', interval: 1}}, {id: 'd', at, today})).record.tasks.find(t => t.id === 'd')!.doneAt).toBeUndefined();
  });
  it('rules that make no sense are refused in plain words; at most ten', () => {
    const r = base();
    expect(() => setProjectRule(r, 'p', {id: 'x', when: 'done', then: 'done'})).toThrow('A finished task is already done: choose another step.');
    expect(() => setProjectRule(r, 'p', {id: 'x', when: 'section', then: 'today'})).toThrow('Choose the section the rule watches.');
    expect(() => setProjectRule(r, 'p', {id: 'x', when: 'added', then: 'next'})).toThrow(/follows a finished task/);
    expect(() => setProjectRule(r, 'p', {id: 'x', when: 'added', then: 'label', label: 'two words'})).toThrow(/no spaces/);
    expect(ruleProblem({when: 'section', section: 'doing', then: 'move', to: 'doing'}, {id: 'p'}, r.sections)).toMatch(/cannot move into the section/);
    let many = r;
    for (let i = 0; i < 10; i++) many = setProjectRule(many, 'p', {id: `r${i}`, when: 'added', then: 'today'});
    expect(() => setProjectRule(many, 'p', {id: 'r10', when: 'added', then: 'today'})).toThrow(/keeps 10 rules/);
    expect(projectRules(setProjectRule(many, 'p', {id: 'r0', remove: true}), 'p')).toHaveLength(9);
  });
  it('a rule whose section was removed is skipped; no rules is the same record', () => {
    const r = setProjectRule(base(), 'p', {id: 'r1', when: 'section', section: 'doing', then: 'today'});
    const gone = tasksSchema.parse({...r, sections: r.sections!.filter(s => s.id !== 'doing')});
    expect(run(gone, x => editTask(x, 't1', {title: 'Tiles!'}, today)).ran).toEqual([]);
    const plain = base(), after = addTask(plain, {title: 'B', projectId: 'p'}, {id: 'b', at, today});
    expect(hasRules(after)).toBe(false);
    expect(runRules(plain, after, opts).record).toBe(after);
  });
  it('the change and what the rules did are one Undo', () => {
    const r = setProjectRule(base(), 'p', {id: 'r1', when: 'done', then: 'move', to: 'done'});
    const out = run(r, x => finishTask(x, 't1', at, {today}));
    const back = undoOfChange(r, out.record)(out.record);
    expect(back.tasks.find(t => t.id === 't1')!.doneAt).toBeUndefined();
    expect(back.tasks.find(t => t.id === 't1')!.sectionId).toBeUndefined();
  });
});
describe('Export, erase and restore keep the rules; a rule that cannot be read is dropped (TIER 3 stored formats)', () => {
  it('round-trips and reads tolerantly', async () => {
    const r = setProjectRule(setProjectRule(base(), 'p', {id: 'r1', when: 'done', then: 'next', days: 3}), 'p', {id: 'r2', when: 'added', then: 'level', level: 1});
    const m = new Map([[TASKS_KEY, JSON.stringify(r)]]);
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const {texts} = await readEverything(storage), exported = texts[TASKS_KEY]!;
    storage.clear();
    storage.setItem(TASKS_KEY, exported);
    expect(projectRules(readDeviceRecord(storage, TASKS).data, 'p')).toEqual([{id: 'r1', when: 'done', then: 'next', days: 3}, {id: 'r2', when: 'added', then: 'level', level: 1}]);
    const odd = tasksSchema.parse({...r, projects: [{...r.projects![0]!, rules: [{id: 'ok', when: 'added', then: 'today'}, {id: 'bad', when: 'someday', then: 'today'}, 'x']}]});
    expect(projectRules(odd, 'p').map(x => x.id)).toEqual(['ok']);
  });
});
