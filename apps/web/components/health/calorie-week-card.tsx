'use client';
import {useState} from 'react';
import {GlassBar} from '../progress/glass-progress';
import {useDeviceRecord} from '../ai/use-device-record';
import {CALORIE_WEEK, MAX_ROLLOVER, resetShifts, setRollover, shiftCalories, weekBudget, type CalorieWeek} from '../../lib/health-aa/calorie-week';
import {KCAL_FLOOR} from '../../lib/health-aa/energy';
import type {HealthData} from '../../lib/health';
import {formatNumber, formatWeekday} from '../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import './health-aa.css';

/**
 * Session AK (COMPETITORS N3, P2 #7): the weekly calorie budget, optional and loaded when opened: the daily target × 7 as
 * seven rows with what was logged, "Shift" between weekdays (the weekly total stays; no day under the floor) and an
 * optional "Roll over" of a past day's unused calories. A view over the person's own target, never advice; the coach's
 * maths do not change.
 */
export function CalorieWeekCard({data, date, today}: {data: HealthData; date: string; today: string}) {
  const record = useDeviceRecord(CALORIE_WEEK), r: CalorieWeek = record.loaded && !record.unreadable ? record.data : {version: 1};
  const [amount, setAmount] = useState('200'), [from, setFrom] = useState(0), [to, setTo] = useState(5), [note, setNote] = useState(''), [maxText, setMaxText] = useState(String(r.rollover?.maxKcal ?? 200));
  const week = weekBudget(data, r, date, today);
  const change = (fn: (c: CalorieWeek) => CalorieWeek, done: string) => { try { record.update(fn); setNote(done); } catch (e) { setNote(e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not kept on this device. ${deviceSettingFailureMessage(e)}`); } };
  if (!week) return <p className="health-empty-inline">Set a daily calorie target in Targets first; the weekly budget spreads that target over the week.</p>;
  // The weekday names come from the date format (Monday first), never typed by hand.
  const WEEKDAYS = week.days.map(d => formatWeekday(d.date));
  return <div className="health-rich" aria-labelledby="calorie-week-title" role="group">
    <h3 id="calorie-week-title">Weekly calorie budget</h3>
    <p className="fine">{formatNumber(week.weeklyBudget)} kcal this week ({formatNumber(week.base)} a day × 7) · {formatNumber(week.eaten)} kcal logged so far. <span className="health-estimate-tag">your own target, spread over the week; not advice</span></p>
    <ul className="health-micro-list">{week.days.map((d, i) => <li key={d.date}>
      <div><strong>{formatWeekday(d.date)} {Number(d.date.slice(8))}{d.date === today ? ' · today' : ''}</strong> <small>{formatNumber(d.budget)} kcal{d.shift ? ` (${d.shift > 0 ? '+' : '−'}${formatNumber(Math.abs(d.shift))} shifted)` : ''}{d.carried ? ` (+${formatNumber(d.carried)} rolled over)` : ''}</small></div>
      <div><small>{d.eaten === null ? (d.past ? 'nothing logged' : '') : d.remaining! >= 0 ? `${formatNumber(d.eaten)} logged · ${formatNumber(d.remaining!)} left` : `${formatNumber(d.eaten)} logged · ${formatNumber(-d.remaining!)} over`}</small></div>
      <GlassBar identity={`calorie-week:${i}`} className="health-micro-bar" role="progressbar" aria-label={`${WEEKDAYS[i]}: ${d.eaten === null ? 'nothing logged' : `${formatNumber(d.eaten)} of ${formatNumber(d.budget)} kcal`}`} aria-valuenow={d.eaten ?? 0} aria-valuemin={0} aria-valuemax={d.budget} value={d.eaten === null ? 0 : Math.min(1, d.eaten / d.budget)} />
    </li>)}</ul>
    <form className="health-form-grid" aria-label="Shift calories between weekdays" onSubmit={e => { e.preventDefault(); const kcal = Math.round(Number(amount.replace(',', '.'))); if (!Number.isFinite(kcal) || kcal <= 0) { setNote('Enter the calories to move as a number above 0.'); return; } change(c => shiftCalories(c, week.base, from, to, kcal), `${formatNumber(kcal)} kcal moved from ${WEEKDAYS[from]} to ${WEEKDAYS[to]}, every week. The weekly total is the same.`); }}>
      <label className="field"><span>Move (kcal)</span><input type="text" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <label className="field"><span>From</span><select value={from} onChange={e => setFrom(Number(e.target.value))}>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label>
      <label className="field"><span>To</span><select value={to} onChange={e => setTo(Number(e.target.value))}>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label>
      <div className="actions"><button type="submit" className="secondary" disabled={from === to}>Shift</button>{r.shifts && <button type="button" className="quiet" onClick={() => change(resetShifts, 'Every day has the same budget again.')}>Even days again</button>}</div>
    </form>
    <div className="actions"><button type="button" className="quiet" aria-pressed={r.rollover?.on === true} onClick={() => change(c => setRollover(c, !c.rollover?.on, Number(maxText) || 0), r.rollover?.on ? 'Roll over is off.' : 'Roll over is on: unused calories of a logged day carry to the next, up to the amount you chose.')}>Roll over unused calories</button>
      <label className="field"><span>At most (kcal)</span><input type="text" inputMode="numeric" value={maxText} onChange={e => setMaxText(e.target.value)} onBlur={() => { const n = Math.round(Number(maxText)); if (r.rollover && Number.isFinite(n)) change(c => setRollover(c, c.rollover?.on ?? false, n), `Roll over keeps at most ${formatNumber(Math.max(0, Math.min(MAX_ROLLOVER, n)))} kcal.`); }} /></label></div>
    {note && <p className="fine" aria-live="polite">{note}</p>}
    <p className="fine">No day goes below {formatNumber(KCAL_FLOOR)} kcal. A day with nothing logged is unknown: nothing rolls over from it.</p>
  </div>;
}
