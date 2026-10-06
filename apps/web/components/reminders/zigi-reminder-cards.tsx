'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {dismissZigiReminder, goalRefs, zigiDue, type ZigiDue} from '../../lib/ai/knock/due';
import {ZIGI_REMINDERS} from '../../lib/ai/store/records';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {useDeviceRecord} from '../ai/use-device-record';
import {useGoals} from '../goal-provider';
import {usePlatform} from '../platform/use-platform';

/**
 * ZIGi's own reminders on Today (Session V Part 13): a weekly goal check-in, the weekly look at Wealth and the weekly
 * context-pack refresh, as cards next to T's habit and water cards, from `zigoals:zigi-reminders:v1`. Loaded only on a
 * device that has such reminders; read on view, written only by "Dismiss for today".
 */
const LINES: Record<ZigiDue['kind'], {line: string; open: string}> = {
  goal: {line: 'Your weekly look at this goal.', open: 'Open goal'},
  wealth: {line: 'Your weekly look at your wealth.', open: 'Open Wealth'},
  pack: {line: 'Refresh the file you give your AI.', open: 'Make the pack'},
};
export default function ZigiReminderCards({now, onError}: {now: Date; onError: (message: string) => void}) {
  const record = useDeviceRecord(ZIGI_REMINDERS), platform = usePlatform(), legacy = useGoals();
  const legacyNames = useMemo(() => Object.fromEntries(legacy.goals.map(g => [g.id, legacy.metadata?.goals?.[g.id]?.name ?? `Goal #${g.id}`])), [legacy.goals, legacy.metadata]);
  if (!record.loaded) return null;
  const due = zigiDue({reminders: record.data, goal: goalRefs(platform.data, legacyNames), now});
  const dismiss = (reminder: ZigiDue) => {
    try { record.update(current => dismissZigiReminder(current, reminder.id, reminder.day)); onError(''); }
    catch (error) { onError(`This reminder was not dismissed on this device. ${deviceSettingFailureMessage(error)}`); }
  };
  return <>{due.map(reminder => <article key={reminder.id} className="panel reminder-card" aria-label={`Reminder: ${reminder.title}`}>
    <p className="eyebrow">Reminder · {reminder.time} · on this device</p>
    <h2>{reminder.kind === 'goal' ? `Weekly check-in: ${reminder.title}` : reminder.title}</h2>
    <p>{LINES[reminder.kind].line}</p>
    <div className="reminder-card-actions">
      <Link className="secondary" href={reminder.href}>{LINES[reminder.kind].open}</Link>
      <button type="button" className="quiet" onClick={() => dismiss(reminder)}>Dismiss for today</button>
    </div>
  </article>)}</>;
}
