'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useTaskClock} from '../tasks/use-task-list';
import {SectionHeading} from '../ui/section-heading';
import {TASKS} from '../../lib/tasks/schema';
import {deviceDay} from '../../lib/tasks/device';
import {tasksReview} from '../../lib/tasks/review';
import {LIFE_REVIEW} from '../../lib/life-review/store';
import {reviewPeriod} from '../../lib/life-review/engine';
import {formatNumber} from '../../lib/visual-format';

const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/**
 * Session AL fourth pass (N-PR-08): the Life review's Tasks chapter — what you finished in the review's week or month
 * (the period chosen above, kept in the review's record), what you added, and what is open now, from this device's to-do
 * list. Unknown is not zero: a list this device cannot read says so.
 */
export function ReviewTasks() {
  const tasks = useDeviceRecord(TASKS), review = useDeviceRecord(LIFE_REVIEW), {today} = useTaskClock();
  const period = review.loaded && !review.unreadable && review.data.period === 'month' ? 'month' : 'week';
  const window = useMemo(() => reviewPeriod(period, today), [period, today]);
  const read = useMemo(() => tasks.loaded && !tasks.unreadable ? tasksReview(tasks.data, window, today, deviceDay) : null, [tasks.loaded, tasks.unreadable, tasks.data, window, today]);
  if (!tasks.loaded) return null;
  return <section className="panel life-chapter review-tasks" data-pillar="goals" aria-labelledby="life-review-tasks">
    <SectionHeading id="life-review-tasks" eyebrow={`Tasks · this ${period}`} title="Things you got done" level={3} />
    {!read ? <p className="life-none">Your tasks on this device could not be read, so this {period}’s count is not known.</p>
      : !tasks.data.tasks.length ? <p className="life-none">No tasks on this device yet. <Link href="/app/tasks">Open Tasks →</Link></p>
      : <>
        <ul className="life-list">
          <li><strong>{read.finished ? `${plural(read.finished, 'task')} finished` : 'No task finished'}</strong><span>{read.before ? `${formatNumber(read.before)} the ${period} before` : `none the ${period} before`}</span></li>
          <li><strong>{plural(read.added, 'task')} added</strong><span>in the same {period}</span></li>
          <li><strong>{read.open ? `${plural(read.open, 'task')} open now` : 'Nothing open now'}</strong><span>{read.overdue ? `${formatNumber(read.overdue)} overdue` : 'none overdue'}</span></li>
        </ul>
        {read.titles.length > 0 && <p className="fine">Finished: {read.titles.map((t, i) => <span key={t} dir="auto">{i ? ', ' : ''}{t}</span>)}{read.finished > read.titles.length ? ' …' : ''}</p>}
        <p><Link className="text-link" href="/app/tasks?view=completed">Open Tasks, Completed →</Link></p>
      </>}
  </section>;
}
export default ReviewTasks;
