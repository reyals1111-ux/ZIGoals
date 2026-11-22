import {describe, expect, it} from 'vitest';
import {reviewTaskChoices} from './review';
import {tasksSchema} from './schema';

/** Session AV (1c, q1 #12, fresh-agent review; Sunsama): the weekly review's Tasks step asks about the week's open tasks. */
describe('Session AV (1c): tasks to plan or let go in the weekly review', () => {
  const t = (id: string, due?: string, extra: object = {}) => ({id, title: `Fictional ${id}`, priority: 'normal', createdAt: '2026-11-20T08:00:00.000Z', ...(due ? {due} : {}), ...extra});
  const record = tasksSchema.parse({version: 1, tasks: [t('late', '2026-11-10'), t('week', '2026-11-26'), t('monday', '2026-11-30'), t('noday'), t('done', '2026-11-25', {doneAt: '2026-11-25T10:00:00.000Z'}), t('sub', '2026-11-24', {parentId: 'week'})]});
  it('open top-level tasks due before the Monday after the week, oldest first; done, subtasks, later and no-day ones left out', () => {
    expect(reviewTaskChoices(record, '2026-11-30')).toEqual({items: [expect.objectContaining({id: 'late'}), expect.objectContaining({id: 'week'})], more: 0});
    expect(reviewTaskChoices(record, '2026-11-30', 1).more).toBe(1);
  });
});
