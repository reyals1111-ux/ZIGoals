'use client';
import Link from 'next/link';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useTaskClock} from '../tasks/use-task-list';
import {showStatus, showUndo} from '../ui/undo-toast';
import {COUNTDOWNS, COUNTDOWN_NOTE_MAX, COUNTDOWN_TITLE_MAX, MAX_COUNTDOWNS, addCountdown, countdownWords, removeCountdown, restoreCountdown, type Countdown} from '../../lib/countdowns/schema';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {COUNTDOWN_EXTRAS, REMIND_CHOICES, dueReminders, sinceWords, splitWithExtras, withExtra, withoutExtra, yearsOnNext} from '../../lib/countdowns/extras';
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
 * Session AV (1c, q1 #44, fresh-agent review): the reminder can be changed on each row, and it reaches the device's
 * notifications (lib/notify/plan.ts, "Countdown reminders") in the morning it starts and on the day.
 * Session AV lane 2 (tasks, LEDGER #15; TickTick's "days since"): a countdown can count up from its day ("412 days since ·
 * 1 year, 1 month": a habit quit, a move, a wedding) in its own "Counting up" list, and a yearly one says the years it
 * marks next ("30 years").
 */
const fmt = (n: number) => formatNumber(n);
export default function CountdownsCard() {
  const record = useDeviceRecord(COUNTDOWNS), {today} = useTaskClock(), id = useId();
  const [title, setTitle] = useState(''), [date, setDate] = useState(''), [note, setNote] = useState(''), [error, setError] = useState('');
  const extras = useDeviceRecord(COUNTDOWN_EXTRAS), [yearly, setYearly] = useState(false), [remind, setRemind] = useState(''), [since, setSince] = useState(false);
  const {upcoming, passed, since: counting} = useMemo(() => splitWithExtras(record.data, extras.data, today), [record.data, extras.data, today]);
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
    if ((yearly || remind || since) && !extras.unreadable) { try { extras.update(x => withExtra(x, newId, {yearly, remindDays: remind ? Number(remind) : null, since: since && !yearly})); } catch { /* the countdown is kept without them */ } }
    showStatus(`Added “${title.trim()}”: ${(since && !yearly && date <= today ? sinceWords(date, today, fmt) : countdownWords(date, today, fmt)).toLowerCase()}${yearly ? ', every year' : ''}.`);
    setTitle(''); setDate(''); setNote(''); setError(''); setYearly(false); setRemind(''); setSince(false);
  };
  const remove = (shownItem: Countdown & {shown?: string}) => {
    // Session AV (F-COUNTDOWN-YEARLY): the row's display date is not part of the strict record.
    const {shown: _shown, ...c} = shownItem; void _shown;
    const index = record.data.items.findIndex(i => i.id === c.id);
    const extra = extras.data.items[c.id];
    try { record.update(r => removeCountdown(r, c.id)); } catch { showStatus('It could not be removed on this device.', {tone: 'error'}); return; }
    if (extra && !extras.unreadable) { try { extras.update(x => withoutExtra(x, c.id)); } catch { /* left; harmless */ } }
    showUndo({message: `Removed “${c.title}”.`, undone: `“${c.title}” is back.`, restore: () => { record.update(r => restoreCountdown(r, c, index)); if (extra) extras.update(x => withExtra(x, c.id, {yearly: !!extra.yearly, remindDays: extra.remindDays ?? null, since: !!extra.since})); }});
  };
  const toggleYearly = (c: Countdown) => {
    const e = extras.data.items[c.id], on = !e?.yearly;
    try { extras.update(x => withExtra(x, c.id, {yearly: on, remindDays: e?.remindDays ?? null})); } catch { showStatus('This could not be kept on this device.', {tone: 'error'}); return; }
    showStatus(on ? `“${c.title}” comes back every year.` : `“${c.title}” no longer repeats.`);
  };
  const setRemindDays = (c: Countdown, days: number | null) => {
    const e = extras.data.items[c.id];
    try { extras.update(x => withExtra(x, c.id, {yearly: !!e?.yearly, remindDays: days})); } catch { showStatus('This could not be kept on this device.', {tone: 'error'}); return; }
    showStatus(days ? `“${c.title}”: a reminder ${days === 1 ? '1 day' : `${days} days`} before, here and in your notifications when they are on.` : `“${c.title}”: no reminder.`);
  };
  const toggleSince = (c: Countdown) => {
    const e = extras.data.items[c.id], on = !e?.since;
    try { extras.update(x => withExtra(x, c.id, {yearly: !!e?.yearly && !on, remindDays: e?.remindDays ?? null, since: on})); } catch { showStatus('This could not be kept on this device.', {tone: 'error'}); return; }
    showStatus(on ? `“${c.title}” counts the days since.` : `“${c.title}” counts down again.`);
  };
  const row = (c: Countdown & {shown: string}) => { const e = extras.data.items[c.id], up = !!e?.since && c.date <= today && !e.yearly, years = e?.yearly ? yearsOnNext(c, c.shown) : 0; return <li key={c.id} className="countdown" data-passed={(!up && c.shown < today) || undefined} data-since={up || undefined}>
    <span className="countdown-days">{up ? sinceWords(c.date, today, fmt) : countdownWords(c.shown, today, fmt)}</span>
    <span className="countdown-text"><strong>{c.title}</strong><small>{up ? `Since ${formatDate(c.date, {weekday: true, year: true})}` : formatDate(c.shown, {weekday: true, year: year(c.shown)})}{e?.yearly ? ` · every year${years ? ` · ${fmt(years)} ${years === 1 ? 'year' : 'years'}` : ''}` : ''}{e?.remindDays ? ` · reminder ${e.remindDays === 1 ? '1 day' : `${e.remindDays} days`} before` : ''}{c.note ? ` · ${c.note}` : ''}</small></span>
    <span className="countdown-actions">
    {/* Session AV (1c, q1 #44): the reminder can be changed on each row, not only when adding. */}
    <label className="countdown-remind"><span className="sr-only">Reminder for “{c.title}”</span><select value={e?.remindDays ? String(e.remindDays) : ''} disabled={extras.unreadable} onChange={ev => setRemindDays(c, ev.target.value ? Number(ev.target.value) : null)}><option value="">No reminder</option>{REMIND_CHOICES.map(n => <option key={n} value={n}>{n === 1 ? '1 day before' : `${n} days before`}</option>)}</select></label>
    <button type="button" className="text-link" aria-pressed={!!e?.yearly} aria-label={`Every year: “${c.title}”`} disabled={extras.unreadable} onClick={() => toggleYearly(c)}>Every year</button>
    {!e?.yearly && <button type="button" className="text-link" aria-pressed={!!e?.since} aria-label={`Count the days since: “${c.title}”`} disabled={extras.unreadable} onClick={() => toggleSince(c)}>Days since</button>}
    <button type="button" className="text-link" aria-label={`Remove the countdown “${c.title}”`} onClick={() => remove(c)}>Remove</button></span>
  </li>; };
  return <section className="panel countdowns-card" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Days until</h3>
    {record.unreadable && <p className="notice" role="status">Your countdowns could not be read on this device; they are not written over.</p>}
    {reminders.length > 0 && <ul className="countdowns-reminders" aria-label="Reminders">{reminders.map(x => <li key={x.item.id}><span aria-hidden="true">◷ </span><strong>{x.item.title}</strong> {x.days === 0 ? 'is today' : x.days === 1 ? 'is tomorrow' : `in ${fmt(x.days)} days`}</li>)}</ul>}
    {upcoming.length ? <ul className="countdowns" aria-label="Coming up">{upcoming.map(row)}</ul> : !counting.length ? <p className="fine">No countdown yet. Add a day you are looking forward to: a trip, a birthday, a race. Or count up from one: the day you quit smoking, moved house or got married.</p> : null}
    {counting.length > 0 && <><h4 className="countdowns-since-title">Counting up</h4><ul className="countdowns" aria-label="Counting up">{counting.map(row)}</ul></>}
    {passed.length > 0 && <details className="countdowns-passed"><summary>Passed ({fmt(passed.length)})</summary><ul className="countdowns" aria-label="Passed">{passed.map(row)}</ul></details>}
    <details className="countdowns-add" open={!upcoming.length && !passed.length ? true : undefined}>
      <summary>Add a countdown</summary>
      <form noValidate aria-label="Add a countdown" onSubmit={e => { e.preventDefault(); add(); }}>
        <label className="field"><span>Name</span><input value={title} maxLength={COUNTDOWN_TITLE_MAX} placeholder="Trip to Lisbon" aria-invalid={error && !title.trim() ? true : undefined} onChange={e => { setTitle(e.target.value); setError(''); }} /></label>
        <label className="field"><span>Date</span><input type="date" value={date} onChange={e => { setDate(e.target.value); setError(''); }} /></label>
        <label className="field countdowns-note"><span>Note (optional)</span><input value={note} maxLength={COUNTDOWN_NOTE_MAX} onChange={e => setNote(e.target.value)} /></label>
        <label className="countdowns-check"><input type="checkbox" checked={yearly} onChange={e => { setYearly(e.target.checked); if (e.target.checked) setSince(false); }} /> <span>Every year (a birthday, an anniversary)</span></label>
        <label className="countdowns-check"><input type="checkbox" checked={since} disabled={yearly} onChange={e => setSince(e.target.checked)} /> <span>Count the days since (a day that has passed)</span></label>
        <label className="field"><span>Remind me</span><select value={remind} onChange={e => setRemind(e.target.value)}><option value="">No reminder</option>{REMIND_CHOICES.map(n => <option key={n} value={n}>{n === 1 ? '1 day before' : `${n} days before`}</option>)}</select></label>
        <button type="submit" className="secondary" disabled={record.unreadable || record.data.items.length >= MAX_COUNTDOWNS}>Add</button>
        {error && <p className="countdowns-error" role="alert">{error}</p>}
      </form>
      <p className="fine">{fmt(record.data.items.length)} of {fmt(MAX_COUNTDOWNS)} kept on this device. Each one also shows on its day in your <Link prefetch={false} className="text-link" href="/app/agenda">Agenda</Link>.</p>
    </details>
  </section>;
}
