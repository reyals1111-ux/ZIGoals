'use client';
import {useEffect, useRef, type ReactNode} from 'react';
import {bucketGroups, bucketTitle, rollBuckets} from '../../lib/tasks/plan-bucket';
import type {Task, Tasks} from '../../lib/tasks/schema';
import {formatDate, formatMonth, formatNumber} from '../../lib/visual-format';
import './tasks-r5.css';

/**
 * Session AV lane 2 (r5-plan, LEDGER #349; Akiflow's This week and This month), at the top of Tasks → Upcoming, its own chunk:
 * the tasks with no day planned for a week or a month, under their week or month, until done or given a day. A task whose
 * week or month has passed is moved to the current one once, said in one line (never "missed"); the move is a plain write.
 */
type Quiet = (fn: (r: Tasks) => Tasks, text: string) => boolean;
const dayName = (d: string) => formatDate(d, {weekday: false, year: false});
export default function PlanBuckets({record, today, row, quiet}: {record: Tasks; today: string; row: (t: Task) => ReactNode; quiet: Quiet}) {
  const rolled = useRef('');
  useEffect(() => {
    if (rolled.current === today) return;
    const {moved} = rollBuckets(record, today);
    rolled.current = today;
    if (!moved.length) return;
    const names = moved.slice(0, 3).map(t => `“${t.title}”`).join(', ') + (moved.length > 3 ? ` and ${formatNumber(moved.length - 3)} more` : '');
    quiet(r => rollBuckets(r, today).record, `Moved on to this ${moved.every(t => t.plan?.kind === 'month') ? 'month' : moved.every(t => t.plan?.kind === 'week') ? 'week' : 'week or month'}: ${names}.`);
  }, [record, today, quiet]);
  const groups = bucketGroups(record, today);
  if (!groups.length) return null;
  return <section className="tasks-buckets" aria-label="Planned for a week or a month">
    {groups.map(g => <div key={`${g.kind}:${g.of}`} className="tasks-group">
      <h3>{bucketTitle(g.kind, g.of, today, of => formatMonth(of), dayName)} <small>{g.kind === 'week' ? `${dayName(g.of)}–${dayName(g.end)}, any day` : 'any day'} · {formatNumber(g.tasks.length)}</small></h3>
      <ul className="tasks-list">{g.tasks.map(t => row(t))}</ul>
    </div>)}
  </section>;
}
