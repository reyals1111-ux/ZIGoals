import {MAX_TRAVEL, PLACE_MAX, type Task} from './schema';
import {planFor} from './plan-bucket';

/**
 * Session AV lane 2 (r5-plan, LEDGER #348, #349, #353, #354): the task editor's "Where and when" values (components/tasks/
 * task-r5-fields.tsx draws them) and the patch they save: the place, the travel minutes (kept only with a day and a time),
 * a week or a month (only without a day; a day wins) and the time block (only with a day). Pure.
 */
export type R5Fields = {place: string; travel: string; bucket: '' | 'week' | 'next-week' | 'month' | 'next-month' | 'keep'; block: string};
export const r5FieldsOf = (task: Task): R5Fields => ({place: task.place ?? '', travel: task.travel ? String(task.travel) : '', bucket: task.plan ? 'keep' : '', block: task.block ?? ''});
/** The patch the editor saves, from the fields and the day and time it is about to keep. */
export function r5Patch(v: R5Fields, due: string, time: string, today: string, repeats = false): {place: string | null; travel: number | null; plan?: NonNullable<Task['plan']> | null; block: string | null} | 'invalid' {
  const travel = v.travel.trim() === '' ? null : /^\d{1,3}$/.test(v.travel.trim()) && Number(v.travel) >= 1 && Number(v.travel) <= MAX_TRAVEL ? Number(v.travel) : 'invalid' as const;
  if (travel === 'invalid') return 'invalid';
  const place = v.place.trim().slice(0, PLACE_MAX) || null;
  const plan = due ? null : v.bucket === 'keep' ? undefined : v.bucket ? planFor(v.bucket, today) : null;
  return {place, travel: due && time ? travel : null, ...(plan !== undefined ? {plan} : {}), block: due && v.block && !repeats ? v.block : null};
}
