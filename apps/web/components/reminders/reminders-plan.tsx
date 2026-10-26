'use client';
import {useState} from 'react';
import Link from 'next/link';
import {NebulaFlow} from '../nebula-flow';
import {HeaderArtCorner, OrbitArt} from '../header-art/orbit-art';
import {RemindersGlyph} from '../header-art/glyphs/reminders';
import {useDeviceRecord} from '../ai/use-device-record';
import {useReminders} from './use-reminders';
import {useHabits} from '../habits/use-habits';
import {useWeeklyReview} from '../weekly-review/use-weekly-review';
import {PLAN_KINDS, PLAN_LABELS, REMINDERS_PLAN, quietHours, setPlanItem, setQuietHours} from '../../lib/reminders-plan/schema';
import {reminderTime, WATER_REMINDER} from '../../lib/reminders/schema';
import {setHabitReminder, setWaterReminder} from '../../lib/reminders/store';
import {WEEKDAY_NAMES} from '../../lib/ai/actions/schema';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {LayoutLockButton, LayoutPage} from '../layout-edit';
import './reminders-plan.css';
import {formatClock} from '../../lib/visual-format';

const DAY_LABEL = (d: number) => WEEKDAY_NAMES[d]![0]!.toUpperCase() + WEEKDAY_NAMES[d]!.slice(1);
/**
 * S7: one Settings page "Reminders" listing every reminder type with its time and the quiet hours: habit and water
 * reminders (the existing device key), bedtime, the weekly review, a fast's end and a goal check-in (the reminders plan).
 * In-app cards work now; push delivery stays off until the owner activates push, and the page says so plainly.
 */
export function RemindersPlanPage() {
  const plan = useDeviceRecord(REMINDERS_PLAN), reminders = useReminders(), habits = useHabits(), review = useWeeklyReview(), [error, setError] = useState('');
  const reviewDay = review.loaded && !review.unreadable ? review.data.weekday : 0;
  const p = plan.loaded && !plan.unreadable ? plan.data : {version: 1 as const}, q = quietHours(p);
  const keep = (what: () => void) => { try { what(); setError(''); } catch (e) { setError(`Not saved on this device. ${deviceSettingFailureMessage(e)}`); } };
  const habitRows = habits.data.habits.filter(h => h.rules[h.rules.length - 1]!.state === 'active').map(h => ({id: h.id, title: h.title, time: reminders.data.habits[h.id]?.time ?? ''}));
  return <LayoutPage page="reminders"><div className="reminders-plan">
    <section className="page-heading header-art-host"><div><p className="eyebrow page-eyebrow"><NebulaFlow identity="reminders-eyebrow">SETTINGS · REMINDERS</NebulaFlow></p><h1><NebulaFlow identity="reminders-title">Every reminder, in one place.</NebulaFlow></h1><p className="page-lede">Times for each kind, and the quiet hours they all respect. Cards show on Today while ZIGoals is open.</p></div><LayoutLockButton /><HeaderArtCorner><OrbitArt glyph={RemindersGlyph} spin={-6}/></HeaderArtCorner></section>
    <section className="panel reminders-push" aria-label="Delivery"><p className="eyebrow">Delivery</p><p><strong>In-app now.</strong> A reminder is a card on Today (and ZIGi may knock). <strong>Push delivery is off</strong> until the owner activates push for the Alpha; your times here will carry over then, unchanged.</p><p className="fine"><Link className="text-link" href="/app/settings">Back to Settings</Link></p></section>
    <section className="panel reminders-group" aria-labelledby="reminders-quiet-title"><p className="eyebrow">Quiet hours</p><h2 id="reminders-quiet-title"><NebulaFlow identity="reminders-quiet">Nothing between {formatClock(q.from)} and {formatClock(q.to)}</NebulaFlow></h2>
      <form className="reminders-row" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); keep(() => plan.update(r => setQuietHours(r, {from: String(f.get('from')), to: String(f.get('to'))}))); }}><label className="field"><span>From</span><input type="time" name="from" defaultValue={q.from} required /></label><label className="field"><span>Until</span><input type="time" name="to" defaultValue={q.to} required /></label><div className="actions"><button type="submit" className="secondary">Save quiet hours</button></div></form>
      <p className="fine">Every reminder, the timer bell and ZIGi’s knock wait until the quiet hours end.</p></section>
    <section className="panel reminders-group" aria-labelledby="reminders-plan-title"><p className="eyebrow">Daily and weekly</p><h2 id="reminders-plan-title"><NebulaFlow identity="reminders-plan">Your reminders</NebulaFlow></h2>
      <ul className="reminders-list">{PLAN_KINDS.map(kind => { const item = p.items?.[kind]; return <li key={kind} className="reminders-item" data-on={item?.on || undefined}>
        <label className="reminders-switch"><input type="checkbox" role="switch" aria-checked={!!item?.on} checked={!!item?.on} onChange={e => keep(() => plan.update(r => setPlanItem(r, kind, {on: e.target.checked, time: item?.time ?? PLAN_LABELS[kind].defaultTime, ...(kind === 'goal-checkin' ? {weekday: item?.weekday ?? 0} : {})})))} /><span><strong>{PLAN_LABELS[kind].title}</strong><small>{PLAN_LABELS[kind].blurb}</small></span></label>
        <div className="reminders-when"><label className="field"><span>Time</span><input type="time" aria-label={`${PLAN_LABELS[kind].title} time`} value={item?.time ?? PLAN_LABELS[kind].defaultTime} onChange={e => { const t = reminderTime(e.target.value); if (t) keep(() => plan.update(r => setPlanItem(r, kind, {on: item?.on ?? false, time: t}))); }} /></label>{kind === 'review' && <p className="fine reminders-review-day">On your review day, {DAY_LABEL(reviewDay)}. <Link className="text-link" href="/app/settings#weekly-review-day">Change it in Settings</Link></p>}{kind === 'goal-checkin' && <label className="field"><span>Day</span><select aria-label={`${PLAN_LABELS[kind].title} day`} value={item?.weekday ?? 0} onChange={e => keep(() => plan.update(r => setPlanItem(r, kind, {on: item?.on ?? false, weekday: Number(e.target.value)})))}>{WEEKDAY_NAMES.map((_, d) => <option key={d} value={d}>{DAY_LABEL(d)}</option>)}</select></label>}</div>
      </li>; })}</ul></section>
    <section className="panel reminders-group" aria-labelledby="reminders-habits-title"><p className="eyebrow">Habits and water</p><h2 id="reminders-habits-title"><NebulaFlow identity="reminders-habits">Habit reminders</NebulaFlow></h2>
      {!reminders.loaded ? <p role="status">Loading…</p> : reminders.unreadable ? <p role="alert">The habit reminders on this device could not be read; set one from a habit’s editor to replace them.</p> : <ul className="reminders-list">
        <li className="reminders-item" data-on={reminders.data.water ? true : undefined}><div className="reminders-switch"><span><strong>Water</strong><small>While the day is below your water goal.</small></span></div><div className="reminders-when"><label className="field"><span>Time</span><input type="time" aria-label="Water reminder time" value={reminders.data.water?.time ?? ''} onChange={e => keep(() => reminders.update(habits.today, c => setWaterReminder(c, reminderTime(e.target.value))))} /></label>{reminders.data.water && <button type="button" className="quiet" onClick={() => keep(() => reminders.update(habits.today, c => setWaterReminder(c, null)))}>Off</button>}</div></li>
        {habitRows.map(h => <li key={h.id} className="reminders-item" data-on={h.time ? true : undefined}><div className="reminders-switch"><span><strong>{h.title}</strong><small>On its scheduled days, until it is done.</small></span></div><div className="reminders-when"><label className="field"><span>Time</span><input type="time" aria-label={`${h.title} reminder time`} value={h.time} onChange={e => keep(() => reminders.update(habits.today, c => setHabitReminder(c, h.id, reminderTime(e.target.value), new Set(habits.data.habits.map(x => x.id)))))} /></label>{h.time && <button type="button" className="quiet" aria-label={`Turn the ${h.title} reminder off`} onClick={() => keep(() => reminders.update(habits.today, c => setHabitReminder(c, h.id, null, new Set(habits.data.habits.map(x => x.id)))))}>Off</button>}</div></li>)}
        {habitRows.length === 0 && <li className="fine">No active habit yet. <Link className="text-link" href="/app/habits">Habits →</Link></li>}
      </ul>}
      <p className="fine">The water reminder’s id in the existing device key is “{WATER_REMINDER}”; nothing here is synced or backed up.</p></section>
    {error && <p role="alert">{error}</p>}
  </div></LayoutPage>;
}
