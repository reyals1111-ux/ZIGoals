import {inQuietHours} from '../habits-extras/bell';

/**
 * Gentle in-app nudges (Session AF, L3; P7.14): at most three moments a day (10:00, 15:00, 19:00 where the person is),
 * never in their quiet hours, only while dots still wait and only if they left nudges on. A nudge is words on the
 * Checklist card and a count on the launcher, nothing more: no notification, no push, nothing sent. Each moment shows once.
 */
export const NUDGE_SLOTS = [{id: '10', hour: 10}, {id: '15', hour: 15}, {id: '19', hour: 19}] as const;
export function nudgeDue(now: Date, opts: {on: boolean; waiting: number; nudged: readonly string[]; quiet: {from: string; to: string}}): string | null {
  if (!opts.on || opts.waiting <= 0 || inQuietHours(now, opts.quiet.from, opts.quiet.to)) return null;
  const hour = now.getHours();
  const due = [...NUDGE_SLOTS].reverse().find(s => hour >= s.hour);
  return due && !opts.nudged.includes(due.id) ? due.id : null;
}
export const nudgeText = (waiting: number) => `${waiting} ${waiting === 1 ? 'dot' : 'dots'} still waiting on your path.`;
