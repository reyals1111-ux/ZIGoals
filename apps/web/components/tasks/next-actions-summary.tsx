'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASKS} from '../../lib/tasks/schema';
import {nextActionsSummary} from '../../lib/tasks/engine';
import {tasksToday} from '../../lib/tasks/device';

/**
 * Session AL (P-LS-42, LS-021): the folded "Next actions" card's line on a goal page ("1 open task · Buy running
 * shoes"), so linked tasks are visible before the card opens. For components/platform/tracked-detail.tsx (goals lane).
 */
export default function NextActionsSummary({goalId, fallback}: {goalId: string; fallback: string}) {
  const tasks = useDeviceRecord(TASKS);
  if (!tasks.loaded || tasks.unreadable) return <>{fallback}</>;
  return <>{nextActionsSummary(tasks.data, goalId, tasksToday())}</>;
}
