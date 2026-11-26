'use client';
import {useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../../ai/use-device-record';
import {copyDateProblem, copyEntry, copyTags, type Copied} from '../../../lib/money-log/copy';
import type {MoneyEntry, MoneyLog} from '../../../lib/money-log/schema';
import {MONEY_TAGS_RECORD} from '../../../lib/money-tags/schema';
import {categoryPath} from '../../../lib/money-more/quick';
import {formatDate} from '../../../lib/visual-format';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {moneyCents} from '../money-tools/format';
import './aw-x7.css';

/**
 * Session AW, round 7 X7 (money; Cashew's "Duplicate", LEDGER #463): Copy on an entry in Wealth → Spending (this week's
 * list, or Edit on any entry found in the search), its own chunk. The copy is dated today, or the day chosen here, and
 * comes with the app's one Undo toast; a split copies its parts, a transfer both its sides, and its tags come too
 * (lib/money-log/copy.ts). A normal write through the money log.
 */
export default function CopyEntry({entry, log, today, onDone, onCancel}: {entry: MoneyEntry; log: DeviceRecordState<MoneyLog>; today: string; onDone: (words: string) => void; onCancel: () => void}) {
  const id = useId(), tags = useDeviceRecord(MONEY_TAGS_RECORD), [date, setDate] = useState(today), [problem, setProblem] = useState(''), field = useRef<HTMLInputElement>(null);
  useEffect(() => { const raf = requestAnimationFrame(() => field.current?.focus()); return () => cancelAnimationFrame(raf); }, []);
  const what = `${categoryPath(entry)} ${moneyCents(Math.round(Number(entry.amount) * 100), entry.currency)}`;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const issue = copyDateProblem(date, today); if (issue) { setProblem(issue); return; }
    let made: Copied | null = null;
    const words = `Copied: ${what} on ${formatDate(date, {weekday: true, year: !date.startsWith(today.slice(0, 4))})}${entry.transfer ? ', both sides of the transfer' : ''}.`;
    void changeWithUndo(log.update, current => { made = copyEntry(current, entry.id, date, today, new Date().toISOString(), () => crypto.randomUUID()); return made.log; }, words, {undone: 'Copy removed.', undoLabel: `Undo the copy of ${entry.category}`})
      .then(() => {
        const done = made as Copied | null;
        if (done && tags.loaded && !tags.unreadable) { try { tags.update(t => copyTags(t, done.pairs)); } catch { /* the copy stands without its tags */ } }
        onDone(words);
      }, cause => setProblem(cause instanceof Error ? cause.message : 'This could not be copied on this device. Nothing was changed.'));
  };
  return <form className="money-copy-form" onSubmit={submit} aria-label={`Copy ${what}`}>
    <label className="field"><span>Copy to the day</span><input ref={field} type="date" value={date} max={today} min="1990-01-01" onChange={e => setDate(e.target.value)} aria-describedby={`${id}-what`}/></label>
    <button type="submit" className="secondary">Copy</button>
    <button type="button" className="quiet" onClick={() => setDate(today)} disabled={date === today}>Today</button>
    <button type="button" className="quiet" onClick={onCancel}>Cancel</button>
    <p id={`${id}-what`} className="fine">A new entry like this one{entry.parts?.length ? ', with its split' : ''}{entry.transfer ? ', and the other side of its transfer' : ''}; the original stays as it is.</p>
    {problem && <p role="alert">{problem}</p>}
  </form>;
}
