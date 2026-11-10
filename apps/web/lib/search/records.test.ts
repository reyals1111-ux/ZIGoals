import {describe, expect, it} from 'vitest';
import type {Tasks} from '../tasks/schema';
import type {Checklist} from '../checklist/schema';
import {search, rankHits} from './engine';
import {ECOSYSTEM_SEARCH_ITEMS, checklistSearchItems, taskHits} from './records';

// Session AL (P-LS-05, P-PR-40; LS-005, LS-047, PR-102, PR-112): global search finds tasks (with operators), Checklist
// items and Ecosystem projects.
const TODAY = '2026-11-04';
const task = (id: string, title: string, extra: Record<string, unknown> = {}) => ({id, title, priority: 'normal', createdAt: '2026-11-01T08:00:00.000Z', ...extra});
const record = {version: 1, tasks: [
  task('a', 'Pay the electricity bill', {level: 1, due: TODAY, labels: ['bills']}),
  task('b', 'Book dentist', {due: '2026-11-01'}),
  task('c', 'Renew passport', {projectId: 'p-home'}),
  task('d', 'Old done thing', {doneAt: '2026-11-02T10:00:00.000Z'}),
], projects: [{id: 'p-home', name: 'Home'}]} as unknown as Tasks;

describe('tasks in global search', () => {
  it('plain words find a task by its title', () => {
    expect(taskHits(record, 'dentist', TODAY).map(h => h.title)).toEqual(['Book dentist']);
    expect(taskHits(record, 'dentist', TODAY)[0]).toMatchObject({kind: 'task', href: '/app/tasks?task=b'});
  });
  it('LS-047: operators work as on the Tasks page (p1 & today, overdue, #Home, @bills, done)', () => {
    expect(taskHits(record, 'p1 & today', TODAY).map(h => h.id)).toEqual(['task:a']);
    expect(taskHits(record, 'overdue', TODAY).map(h => h.id)).toEqual(['task:b']);
    expect(taskHits(record, '#Home', TODAY).map(h => h.id)).toEqual(['task:c']);
    expect(taskHits(record, '@bills', TODAY).map(h => h.id)).toEqual(['task:a']);
    expect(taskHits(record, 'done', TODAY).map(h => h.id)).toContain('task:d');
    expect(taskHits(record, 'thing', TODAY)).toEqual([]); // done tasks only when asked for
  });
  it('the row says when it is due and where it lives', () => {
    expect(taskHits(record, 'dentist', TODAY)[0]!.subtitle).toBe('Task · overdue · 2026-11-01 · Inbox');
    expect(taskHits(record, 'passport', TODAY)[0]!.subtitle).toBe('Task · no date · #Home');
  });
  it('an operator search puts tasks first among other results', () => {
    const page = {id: 'page:/app', kind: 'page' as const, title: 'Today', href: '/app', score: 30};
    expect(rankHits([page, ...taskHits(record, 'p1 & today', TODAY)])[0]!.kind).toBe('task');
    expect(taskHits(null, 'x', TODAY)).toEqual([]);
  });
});
describe('Checklist items and Ecosystem projects', () => {
  it('a custom Checklist item is found by its name, a habit item by its own path word', () => {
    const list = {version: 1, order: [], healthItems: [], items: [
      {id: 'i1', kind: 'custom', label: 'Stretch for 10 minutes', addedAt: '2026-11-01'},
      {id: 'i2', kind: 'habit', ref: {habitId: 'h'}, pathLabel: 'Read', addedAt: '2026-11-01'},
      {id: 'i3', kind: 'goal', ref: {goalId: 'g'}, addedAt: '2026-11-01'},
    ]} as unknown as Checklist;
    const items = checklistSearchItems(list);
    expect(items.map(i => i.title)).toEqual(['Stretch for 10 minutes', 'Read']);
    expect(search(items, 'stretch')[0]).toMatchObject({kind: 'checklist', href: '/app/checklist'});
  });
  it('PR-102/PR-112: "valdora" and "oroswap" find their Ecosystem cards', () => {
    expect(search(ECOSYSTEM_SEARCH_ITEMS, 'valdora')[0]).toMatchObject({kind: 'ecosystem', href: '/app/ecosystem#project-valdora'});
    expect(search(ECOSYSTEM_SEARCH_ITEMS, 'oroswap')[0]?.title).toBe('OroSwap');
  });
});
describe('a bare word that is also an operator', () => {
  it('"today" alone does not push tasks above the Today page', () => {
    const page = {id: 'page:/app', kind: 'page' as const, title: 'Today', href: '/app', score: 30};
    expect(rankHits([page, ...taskHits(record, 'today', TODAY)])[0]!.kind).toBe('page');
  });
});
