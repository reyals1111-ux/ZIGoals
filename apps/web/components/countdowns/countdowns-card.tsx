'use client';
import Link from 'next/link';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useTaskClock} from '../tasks/use-task-list';
import {showStatus, showUndo} from '../ui/undo-toast';
import {COUNTDOWNS, COUNTDOWN_NOTE_MAX, COUNTDOWN_TITLE_MAX, MAX_COUNTDOWNS, addCountdown, countdownWords, removeCountdown, restoreCountdown, type Countdown} from '../../lib/countdowns/schema';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {COUNTDOWN_EXTRAS, REMIND_CHOICES, dueReminders, splitWithExtras, withExtra, withoutExtra} from '../../lib/countdowns/extras';
import './countdowns.css';

/**
 * Session AP ("Days until"): a Today card kept on this device (`countdowns` in zigoals:today-cards:v1), off until the
 * person turns it on while arranging Today. The person's own countdowns (zigoals:countdowns:v1, at most 50): the coming
 * ones soonest first, each "Today", "Tomorrow" or "In N days"; a passed one moves to "Passed" and says "N days ago",
 * never a negative count. Each also shows on the Agenda's day of the event. Written only on the person's taps; Remove
 * has Undo.
 * Session AV (owner follow-up 1, F-COUNTDOWN-YEARLY; TickTick): a countdown can come back every year (a birthday) and can
 * remind some days before; both kept in their own record (zigoals:countdown-extras:v1), and the card's top says which are
 * within their reminder.
 */
const fmt = (n: number) => formatNumber(n);
export default function CountdownsCard() {
  const record = useDeviceRecord(COUNTDOWNS), {today} = useTaskClock(), id = useId();
  const [title, setTitle] = useState(''), [date, setDate] = useState(''), [note, setNote] = useState(''), [error, setError] = useState('');
  const extras = useDeviceRecord(COUNTDOWN_EXTRAS), [yearly, setYearly] = useState(false), [remind, setRemind] = useState('');
  const {upcoming, passed} = useMemo(() => splitWithExtras(record.data, extras.data, today), [record.data, extras.data, today]);
  const reminders = useMemo(() => dueReminders(record.data, extras.data, today), [record.data, extras.data, today]);
  if (!record.loaded) return <p className="fine" role="status">Opening your countdowns…</p>;
  const year = (d: string) => d.slice(0, 4) !== today.slice(0, 4);
  const add = () => {
    if (record.unreadable) { setError('Your countdowns could not be read on this device, so nothing was written over them.'); return; }
    if (!title.trim()) { setError('Give the countdown a name.'); return; }
    if (!date) { setError('Choose its date.'); return; }
    const newId = `countdown_${crypto.randomUUID()}`;
    try { record.update(r => addCountdown(r, {title, date, note}, {id: newId, at: new Date()})); }
    catch (e) { setError(e instanceof Error ? e.message : 'This device refused to keep it.'); return; }
    if ((yearly || remind) && !extras.unreadable) { try { extras.update(x => withExtra(x, newId, {yearly, remindDays: remind ? Number(remind) : null})); } catch { /* the countdown is kept without them */ } }
    showStatus(`Added “${title.trim()}”: ${countdownWords(date, today, fmt).toLowerCase()}${yearly ? ', every year' : ''}.`);
    setTitle(''); setDate(''); setNote(''); setError(''); setYearly(false); setRemind('');
  };
  const remove = (shownItem: Countdown & {shown?: string}) => {
    // Session AV (F-COUNTDOWN-YEARLY): the row's display date is not part of the strict record.
    const {shown: _shown, ...c} = shownItem; void _shown;
    const index = record.data.items.findIndex(i => i.id === c.id);
    const extra = extras.data.items[c.id];
    try { record.update(r => removeCountdown(r, c.id)); } catch { showStatus('It could not be removed on this device.', {tone: 'error'}); return; }
    if (extra && !extras.unreadable) { try { extras.update(x => withoutExtra(x, c.id)); } catch { /* left; harmless */ } }
    showUndo({message: `Removed “${c.title}”.`, undone: `“${c.title}” is back.`, restore: () => { record.update(r => restoreCountdown(r, c, index)); if (extra) extras.update(x => withExtra(x, c.id, {yearly: !!extra.yearly, remindDays: extra.remindDays ?? null})); }});
  };
  const toggleYearly = (c: Countdown) => {
    const e = extras.data.items[c.id], on = !e?.yearly;
    try { extras.update(x => withExtra(x, c.id, {yearly: on, remindDays: e?.remindDays ?? null})); } catch { showStatus('This could not be kept on this device.', {tone: 'error'}); return; }
    showStatus(on ? `“${c.title}” comes back every year.` : `“${c.title}” no longer repeats.`);
  };
  const row = (c: Countdown & {shown: string}) => { const e = extras.data.items[c.id]; return <li key={c.id} className="countdown" data-passed={c.shown < today || undefined}>
    <span className="countdown-days">{countdownWords(c.shown, today, fmt)}</span>
    <span className="countdown-text"><strong>{c.title}</strong><small>{formatDate(c.shown, {weekday: true, year: year(c.shown)})}{e?.yearly ? ' · every year' : ''}{e?.remindDays ? ` · reminder ${e.remindDays === 1 ? '1 day' : `${e.remindDays} days`} before` : ''}{c.note ? ` · ${c.note}` : ''}</small></span>
    <span className="countdown-actions"><button type="button" className="text-link" aria-pressed={!!e?.yearly} aria-label={`Every year: “${c.title}”`} disabled={extras.unreadable} onClick={() => toggleYearly(c)}>Every year</button>
    <button type="button" className="text-link" aria-label={`Remove the countdown “${c.title}”`} onClick={() => remove(c)}>Remove</button></span>
  </li>; };
  return <section className="panel countdowns-card" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Days until</h3>
    {record.unreadable && <p className="notice" role="status">Your countdowns could not be read on this device; they are not written over.</p>}
    {reminders.length > 0 && <ul className="countdowns-reminders" aria-label="Reminders">{reminders.map(x => <li key={x.item.id}><span aria-hidden="true">◷ </span><strong>{x.item.title}</strong> {x.days === 0 ? 'is today' : x.days === 1 ? 'is tomorrow' : `in ${fmt(x.days)} days`}</li>)}</ul>}
    {upcoming.length ? <ul className="countdowns" aria-label="Coming up">{upcoming.map(row)}</ul> : <p className="fine">No countdown yet. Add a day you are looking forward to: a trip, a birthday, a race.</p>}
    {passed.length > 0 && <details className="countdowns-passed"><summary>Passed ({fmt(passed.length)})</summary><ul className="countdowns" aria-label="Passed">{passed.map(row)}</ul></details>}
    <details className="countdowns-add" open={!upcoming.length && !passed.length ? true : undefined}>
      <summary>Add a countdown</summary>
      <form noValidate aria-label="Add a countdown" onSubmit={e => { e.preventDefault(); add(); }}>
        <label className="field"><span>Name</span><input value={title} maxLength={COUNTDOWN_TITLE_MAX} placeholder="Trip to Lisbon" aria-invalid={error && !title.trim() ? true : undefined} onChange={e => { setTitle(e.target.value); setError(''); }} /></label>
        <label className="field"><span>Date</span><input type="date" value={date} onChange={e => { setDate(e.target.value); setError(''); }} /></label>
        <label className="field countdowns-note"><span>Note (optional)</span><input value={note} maxLength={COUNTDOWN_NOTE_MAX} onChange={e => setNote(e.target.value)} /></label>
        <label className="countdowns-check"><input type="checkbox" checked={yearly} onChange={e => setYearly(e.target.checked)} /> <span>Every year (a birthday, an anniversary)</span></label>
        <label className="field"><span>Remind me</span><select value={remind} onChange={e => setRemind(e.target.value)}><option value="">No reminder</option>{REMIND_CHOICES.map(n => <option key={n} value={n}>{n === 1 ? '1 day before' : `${n} days before`}</option>)}</select></label>
        <button type="submit" className="secondary" disabled={record.unreadable || record.data.items.length >= MAX_COUNTDOWNS}>Add</button>
        {error && <p className="countdowns-error" role="alert">{error}</p>}
      </form>
      <p className="fine">{fmt(record.data.items.length)} of {fmt(MAX_COUNTDOWNS)} kept on this device. Each one also shows on its day in your <Link prefetch={false} className="text-link" href="/app/agenda">Agenda</Link>.</p>
    </details>
  </section>;
}
