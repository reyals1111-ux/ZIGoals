import {describe, expect, it} from 'vitest';
import {addProject, addSection, addTask, finishTask, viewTasks} from './engine';
import {emptyTasks} from './schema';
import {printGroups} from './print-list';

/** Session AV lane 2 (tasks-r2, LEDGER #225; Google Tasks' print): the list as it prints. */
const today = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
let r = addSection(addProject(emptyTasks(), {name: 'Fictional move'}, 'p'), 'p', 'Packing', 's');
r = addTask(r, {title: 'Book the van', projectId: 'p', due: today, level: 1}, {id: 'a', at, today});
r = addTask(r, {title: 'Pack the kitchen', projectId: 'p', sectionId: 's', due: '2026-11-25', deadline: '2026-11-28', minutes: 90}, {id: 'b', at, today});
r = addTask(r, {title: 'Plates', parentId: 'b', projectId: 'p', sectionId: 's'}, {id: 'b1', at, today});
r = addTask(r, {title: 'Glasses', parentId: 'b', projectId: 'p', sectionId: 's'}, {id: 'b2', at, today});
r = addTask(r, {title: 'Wrap', parentId: 'b1', projectId: 'p', sectionId: 's'}, {id: 'b11', at, today});
r = finishTask(r, 'b2', at, {today});

describe('Print this list (LEDGER #225)', () => {
  it('a project prints by section, subtasks indented, finished ones left out of the subtasks', () => {
    const shown = viewTasks(r, {kind: 'project', id: 'p'}, today);
    const groups = printGroups(r, shown, {grouping: 'section', today, projectId: 'p'});
    expect(groups.map(g => [g.title, g.rows.map(x => [x.task.title, x.depth])])).toEqual([
      ['', [['Book the van', 0]]],
      ['Packing', [['Pack the kitchen', 0], ['Plates', 1], ['Wrap', 2]]],
    ]);
    expect(groups[0]!.rows[0]!.meta).toBe('Today · P1 · High');
    expect(groups[1]!.rows[0]!.meta).toMatch(/^Wed, Nov 25 · deadline Nov 28 · 90 min$/);
  });
  it('Upcoming prints by day; any other view as one list; a subtask shown with its parent prints once', () => {
    const shown = r.tasks.filter(t => !t.doneAt);
    const byDay = printGroups(r, shown, {grouping: 'day', today});
    expect(byDay.map(g => g.title)).toEqual(['Today', 'Wed, Nov 25']);
    const flat = printGroups(r, shown, {grouping: 'none', today});
    expect(flat).toHaveLength(1);
    expect(flat[0]!.rows.map(x => x.task.id)).toEqual(['a', 'b', 'b1', 'b11']);
    expect(printGroups(r, [], {grouping: 'none', today})).toEqual([]);
  });
});
