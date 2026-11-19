'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASK_WHEN, eveningTasks, somedayTasks} from '../../lib/tasks/when';
import type {Tasks} from '../../lib/tasks/schema';
import {formatNumber} from '../../lib/visual-format';

/**
 * Session AT (ADR-043 D7; AP D16c "Someday counts in the menu"): the number beside "This evening" and "Someday" in the
 * Tasks menu, read from their device record (`zigoals:task-when:v1`). Its own chunk, loaded after the page shows, so the
 * record's code stays out of /app/tasks' first scripts (AP's reason for carrying it). Nothing while the record is unread,
 * unreadable or the list is empty (the menu's other views show no "0" either).
 */
export default function TasksWhenCount({kind, record, today}: {kind: 'evening' | 'someday'; record: Tasks; today: string}) {
  const when = useDeviceRecord(TASK_WHEN);
  if (!when.loaded || when.unreadable) return null;
  const n = (kind === 'evening' ? eveningTasks(when.data, record, today) : somedayTasks(when.data, record, today)).length;
  return n ? <small data-when-count={kind}>{formatNumber(n)}</small> : null;
}
