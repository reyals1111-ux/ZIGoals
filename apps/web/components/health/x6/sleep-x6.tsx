'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import {clockFromNoon, GOAL_PERIODS, goalPeriod, type GoalPeriod} from '../../../lib/sleep/engine';
import {SLEEP_GOAL_PERIOD} from '../../../lib/sleep/goal-period';
import {removeSleepTag, renameSleepTag, restoreSleepTags, SLEEP_TAG_MAX, tagCounts, type TagChange} from '../../../lib/sleep/tags';
import type {Sleep} from '../../../lib/sleep/schema';
import {formatMinutes} from '../../../lib/zone-time';
import {formatClock} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import type {SleepStore} from '../sleep/use-sleep';
import './body-x6.css';

/**
 * Session AW (X6; Sleep as Android): Health → Sleep's two parts, one lazy chunk.
 * - `goal-period` (LEDGER #460): "Your sleep goal" over 14 days or 30 — the average asleep against the goal, the nights at
 *   or above it and, with a bedtime window, the average bedtime against its end and the nights inside it. Facts from the
 *   logged nights; the period is this device's choice (zigoals:sleep-goal-period:v1), never in the synced sleep group.
 * - `tags` (LEDGER #459): rename or remove a tag on every night at once, with one Undo; ordinary writes of the nights' tags.
 */
export default function SleepX6({part, store}: {part: 'goal-period' | 'tags'; store: SleepStore}) {
  return part === 'goal-period' ? <GoalPeriodPart sleep={store.sleep} today={store.today}/> : <TagsPart store={store}/>;
}

/** The bedtime against the window's end, in calm words (shared with the tests). */
export function bedtimeWords(b: NonNullable<GoalPeriod['bedtime']>): string {
  const at = formatClock(clockFromNoon(b.average)), end = formatClock(b.to);
  if (Math.abs(b.fromEnd) < 1) return `${at}, right at the end of your window (${end})`;
  return `${at}, ${formatMinutes(Math.abs(b.fromEnd))} ${b.fromEnd < 0 ? 'before' : 'after'} the end of your window (${end})`;
}
function GoalPeriodPart({sleep, today}: {sleep: Sleep; today: string}) {
  const pref = useDeviceRecord(SLEEP_GOAL_PERIOD), [note, setNote] = useState('');
  if (!sleep.goal || !pref.loaded) return null;
  const days = pref.data.days, p = goalPeriod(sleep, today, days);
  const choose = (d: 14 | 30) => { try { pref.update(r => ({...r, days: d})); setNote(`Your sleep goal now looks back over ${d} days on this device.`); } catch (cause) { setNote(plainErrorMessage(cause, 'That could not be kept on this device.')); } };
  return <section className="x6-tool x6-goal-period" aria-label={`Your sleep goal over ${days} days`}>
    <div className="x6-filter" role="group" aria-label="Look back over">{GOAL_PERIODS.map(d => <button key={d} type="button" className="secondary" aria-pressed={days === d} onClick={() => choose(d)}>{d} days</button>)}</div>
    {p ? <dl className="x6-goal-facts">
      <div><dt>Asleep, on average</dt><dd>{formatMinutes(p.asleep)}{p.estimated ? ' (estimated)' : ''}, against your goal of {formatMinutes(p.goal)}</dd></div>
      <div><dt>Nights at or above your goal</dt><dd>{p.atOrAbove} of {p.nights} logged {p.nights === 1 ? 'night' : 'nights'}</dd></div>
      {p.bedtime && <>
        <div><dt>Bedtime, on average</dt><dd>{bedtimeWords(p.bedtime)}</dd></div>
        <div><dt>Nights in your bedtime window</dt><dd>{p.bedtime.inside} of {p.bedtime.nights} ({formatClock(p.bedtime.from)}–{formatClock(p.bedtime.to)})</dd></div>
      </>}
    </dl> : <p className="x6-line">No night logged in the last {days} days yet. Log one above and it counts here.</p>}
    {p && !p.bedtime && <p className="x6-line">Add a bedtime window to your goal (below) to see your bedtimes against it.</p>}
    <p className="x6-line">From the nights you logged over the last {days} days: a day without a night is left out, never counted as 0. Your last 7 days stay as they are above.</p>
    <p className="sr-only" role="status" aria-live="polite">{note}</p>
  </section>;
}

function TagsPart({store}: {store: SleepStore}) {
  const counts = tagCounts(store.sleep), [renaming, setRenaming] = useState<string | null>(null), [text, setText] = useState(''), [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false), field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (renaming) field.current?.focus(); }, [renaming]);
  /** One write for every night, then one Undo that puts each changed night's tags back. */
  async function apply(make: (s: Sleep, at: Date) => TagChange, said: (n: number) => string, undone: string) {
    setBusy(true); setError('');
    let done: TagChange | null = null;
    try {
      await store.update(s => { done = make(s, new Date()); return done.next; });
      const change = done as TagChange | null;
      if (!change || !change.nights) { setNote('No night had that tag any more; nothing changed.'); return true; }
      const message = said(change.nights), before = change.before;
      setNote(message);
      showUndo({message, undone, restore: () => store.update(s => restoreSleepTags(s, before, new Date()))});
      return true;
    } catch (cause) { setError(plainErrorMessage(cause, 'The tags could not be changed. Nothing was saved.')); return false; }
    finally { setBusy(false); }
  }
  async function rename(e: FormEvent, from: string) {
    e.preventDefault();
    const to = text.trim().replace(/\s+/g, ' ');
    if (await apply((s, at) => renameSleepTag(s, from, to, at), n => `“${from}” is now “${to}” on ${n} ${n === 1 ? 'night' : 'nights'}.`, `“${from}” is back on those nights.`)) setRenaming(null);
  }
  if (!counts.length) return <p className="x6-line">No tags on your nights yet. Tick one when you log a night; it can be renamed or removed here later.</p>;
  return <section className="x6-tool x6-tags" aria-label="Your sleep tags">
    <p className="x6-line">A change applies to every night with the tag at once, and one Undo takes it back. Renaming onto a tag a night already has keeps one.</p>
    <ul className="x6-list">{counts.map(c => <li key={c.tag}>
      {renaming === c.tag ? <form className="x6-form" onSubmit={e => void rename(e, c.tag)}>
        <label className="field"><span>New name for “{c.tag}”</span><input ref={field} value={text} onChange={e => setText(e.target.value)} maxLength={SLEEP_TAG_MAX} autoComplete="off" required/></label>
        <button type="submit" className="secondary" disabled={busy}>Rename on every night</button><button type="button" className="quiet" onClick={() => setRenaming(null)}>Cancel</button>
      </form> : <>
        <div className="x6-item"><strong>{c.tag}</strong> <span>{c.nights} {c.nights === 1 ? 'night' : 'nights'}</span></div>
        <div className="x6-filter">
          <button type="button" className="quiet" aria-label={`Rename ${c.tag}`} onClick={() => { setRenaming(c.tag); setText(c.tag); setConfirm(null); }}>Rename</button>
          {confirm === c.tag ? <><button type="button" className="secondary" disabled={busy} onClick={() => void apply((s, at) => removeSleepTag(s, c.tag, at), n => `“${c.tag}” is removed from ${n} ${n === 1 ? 'night' : 'nights'}.`, `“${c.tag}” is back on those nights.`).then(() => setConfirm(null))}>Remove from {c.nights} {c.nights === 1 ? 'night' : 'nights'}</button><button type="button" className="quiet" onClick={() => setConfirm(null)}>Keep it</button></>
            : <button type="button" className="quiet" aria-label={`Remove ${c.tag}`} onClick={() => setConfirm(c.tag)}>Remove</button>}
        </div>
      </>}
    </li>)}</ul>
    {error && <p className="field-error" role="alert">{error}</p>}
    <p className="sr-only" role="status" aria-live="polite">{note}</p>
  </section>;
}
