'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {goalRefs} from '../../lib/ai/knock/due';
import {ZIGI, ZIGI_REMINDERS, zigiPrefs, type ZigiReminders} from '../../lib/ai/store/records';
import {useDeviceRecord} from './use-device-record';
import {useGoals} from '../goal-provider';
import {usePlatform} from '../platform/use-platform';

/**
 * Settings → ZIGi · your AI → Reminders (Session V Part 18): ZIGi's own weekly reminders (`zigoals:zigi-reminders:v1`:
 * goal check-ins, a look at Wealth, a new context pack) listed with a Remove button each, whether ZIGi knocks, and where
 * the other reminders live. Reminders are added from cards in the chat or the context pack; only Remove writes here.
 */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type Row = {id: string; title: string; when: string; remove: (r: ZigiReminders) => ZigiReminders};
export default function ZigiRemindersPanel() {
  const record = useDeviceRecord(ZIGI_REMINDERS), zigi = useDeviceRecord(ZIGI), platform = usePlatform(), legacy = useGoals(), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const goal = useMemo(() => goalRefs(platform.data, Object.fromEntries(legacy.goals.map(g => [g.id, legacy.metadata?.goals?.[g.id]?.name ?? `Goal #${g.id}`]))), [platform.data, legacy.goals, legacy.metadata]);
  if (!record.loaded || !zigi.loaded) return <p className="ai-note" role="status">Loading…</p>;
  const data = record.data, rows: Row[] = [];
  for (const [key, when] of Object.entries(data.goalCheckIns ?? {})) {
    const found = goal(key);
    rows.push({id: `goal:${key}`, title: found ? `Weekly check-in: ${found.title}` : 'Weekly check-in: a goal that is closed or not on this device', when: `${WEEKDAYS[when.weekday]} at ${when.time}`, remove: r => { const goalCheckIns = {...(r.goalCheckIns ?? {})}; delete goalCheckIns[key]; return {...r, goalCheckIns}; }});
  }
  if (data.wealthLook) rows.push({id: 'wealth', title: 'A look at Wealth', when: `${WEEKDAYS[data.wealthLook.weekday]} at ${data.wealthLook.time}`, remove: r => ({...r, wealthLook: null})});
  if (data.packRefresh) rows.push({id: 'pack', title: 'A new context pack', when: `${WEEKDAYS[data.packRefresh.weekday]} at ${data.packRefresh.time}`, remove: r => ({...r, packRefresh: null})});
  const remove = (row: Row) => {
    try { record.update(row.remove); setMessage({text: `Removed: ${row.title}.`}); }
    catch { setMessage({text: 'This reminder could not be removed on this device.', failed: true}); }
  };
  const knock = zigiPrefs(zigi.data).knock;
  return <div className="ai-zigi-reminders">
    {rows.length === 0 ? <p className="ai-note">No weekly reminders from ZIGi on this device. Ask ZIGi for one in the chat (for example &ldquo;remind me to check my Japan goal on Sundays&rdquo;) or set the pack&rsquo;s weekly reminder in the context pack; each one is a card you confirm.</p>
      : <ul className="ai-reminder-list" aria-label="ZIGi’s weekly reminders">{rows.map(row => <li key={row.id}>
        <span><strong>{row.title}</strong><small>{row.when}, on Today and, if ZIGi knocks, from ZIGi</small></span>
        <button type="button" className="secondary" aria-label={`Remove ${row.title}`} onClick={() => remove(row)}>Remove</button>
      </li>)}</ul>}
    <p className="ai-note">ZIGi {knock.enabled ? 'knocks' : 'does not knock'} when a reminder is due; change it in <Link className="text-link" href="/app/settings#zigi-look">ZIGi&rsquo;s look and feel</Link>. Habit and water reminders are set on each habit and in Health; a notification while ZIGoals is closed is under <Link className="text-link" href="/app/settings#reminders">Reminders when closed</Link>.</p>
    {message && <p role={message.failed ? 'alert' : 'status'} className="ai-note">{message.text}</p>}
  </div>;
}
