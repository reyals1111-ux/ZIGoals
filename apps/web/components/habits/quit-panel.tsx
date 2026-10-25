'use client';
import {showToast} from '../ui/undo-toast';
import {useState, type FormEvent} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {quitSummary, slipMonth} from '../../lib/habits-extras/quit';
import {habitQuitCost, setQuitCost} from '../../lib/habits-extras/store';
import type {Habit} from '../../lib/habits';
import {addLocalDays} from '../../lib/local-date';
import {formatDate, formatMoney, formatMonth} from '../../lib/visual-format';
import {readFormNumber, formNumberText} from '../../lib/decimal-input';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {HabitExtrasState} from './use-habit-extras';

const moveMonth = (month: string, by: number) => { const d = new Date(`${month}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + by); return d.toISOString().slice(0, 7); };
/**
 * H3: a quit habit's "days since" card: the big counter, the longest run, a calendar of slips and the optional "money
 * saved" estimate from the person's own cost per day (device-only, ADR-022 B10; always labelled an estimate).
 */
export function QuitPanel({habit, today, extras}: {habit: Habit; today: string; extras: HabitExtrasState}) {
  const cost = extras.loaded && !extras.unreadable ? habitQuitCost(extras.data, habit.id) : null;
  const s = quitSummary(habit, today, cost);
  const [month, setMonth] = useState(today.slice(0, 7)), [editing, setEditing] = useState(false), [perDay, setPerDay] = useState(cost ? formNumberText(cost.perDay) : ''), [currency, setCurrency] = useState<'EUR' | 'USD'>(cost?.currency ?? 'EUR'), [error, setError] = useState('');
  const days = slipMonth(s, habit, month, today);
  const lead = ((new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7);
  function save(e: FormEvent) {
    e.preventDefault(); setError('');
    try { const value = perDay.trim() ? readFormNumber(perDay, {max: 100_000}) : null; extras.update(r => setQuitCost(r, habit.id, value === null ? null : {perDay: value, currency})); setEditing(false); }
    catch (cause) { setError(cause instanceof Error && !/storage|quota/i.test(cause.message) ? cause.message : `Not saved on this device. ${deviceSettingFailureMessage(cause)}`); }
  }
  return <section className="habit-quit" aria-label={`Days since for ${habit.title}`}>
    <div className="habit-quit-counter"><span className="eyebrow">Days since</span><strong className="habit-quit-days"><NebulaFlow identity={`quit:${habit.id}`}>{String(s.daysSince)}</NebulaFlow></strong><small>{s.lastSlip ? `since ${formatDate(s.lastSlip, {year: false})}` : `since you started, ${formatDate(habit.startDate, {year: false})}`}</small></div>
    <dl className="habit-quit-facts"><div><dt>Longest run</dt><dd>{s.longestRun} {s.longestRun === 1 ? 'day' : 'days'}</dd></div><div><dt>Slips</dt><dd>{s.slips.length}</dd></div><div><dt>Money saved</dt><dd>{s.moneySaved === null ? <button type="button" className="text-link" onClick={() => setEditing(true)}>Set a cost per day</button> : <>{formatMoney(String(s.moneySaved), cost!.currency)} <small>estimate</small></>}</dd></div></dl>
    {(editing || cost) && <details className="habit-quit-cost" open={editing || undefined}><summary>{cost ? `About ${formatMoney(String(cost.perDay), cost.currency)} a day` : 'Money saved'}</summary><form onSubmit={save} className="habit-quit-cost-form" aria-label={`Cost per day for ${habit.title}`}><label className="field">Cost per day<input type="text" inputMode="decimal" value={perDay} onChange={e => setPerDay(e.target.value)} placeholder="3.50" /></label><label className="field">Currency<select value={currency} onChange={e => setCurrency(e.target.value as 'EUR' | 'USD')}><option value="EUR">EUR</option><option value="USD">USD</option></select></label><div className="actions"><button type="submit" className="secondary">Save</button>{cost && <button type="button" className="quiet" onClick={() => { setPerDay(''); const was = cost; try { extras.update(r => setQuitCost(r, habit.id, null)); /* Session AH Part 3 (DS5): a labelled Undo sets the cost again. */ if (was) showToast({message: 'Cost per day removed.', undone: 'The cost per day is back.', undo: () => extras.update(r => setQuitCost(r, habit.id, was))}); } catch { /* kept */ } }}>Remove</button>}</div><p className="fine">An estimate from your own figure times the days since: nothing is counted from your accounts.</p>{error && <p role="alert">{error}</p>}</form></details>}
    <div className="habit-quit-calendar" role="group" aria-label={`Slips in ${formatMonth(month)}`}>
      <div className="habit-calendar-heading"><button type="button" className="quiet" aria-label="Previous month" disabled={month <= habit.startDate.slice(0, 7)} onClick={() => setMonth(moveMonth(month, -1))}>←</button><strong>{formatMonth(month)}</strong><button type="button" className="quiet" aria-label="Next month" disabled={month >= today.slice(0, 7)} onClick={() => setMonth(moveMonth(month, 1))}>→</button></div>
      <div className="habit-quit-grid">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <small key={`h${i}`} aria-hidden="true">{d}</small>)}{Array.from({length: lead}, (_, i) => <span key={`lead${i}`} />)}{days.map(d => <span key={d.date} role="img" className={`habit-quit-day habit-quit-${d.state}`} title={`${formatDate(d.date)}: ${d.state === 'slip' ? 'a slip' : d.state === 'clean' ? 'on track' : d.state === 'before' ? 'before you started' : 'ahead'}`} aria-label={`${formatDate(d.date, {year: false})}: ${d.state === 'slip' ? 'a slip' : d.state === 'clean' ? 'on track' : d.state === 'before' ? 'before you started' : 'ahead'}`}>{Number(d.date.slice(-2))}</span>)}</div>
      <p className="habit-calendar-legend"><span>● On track</span><span>× Slip</span></p>
    </div>
    <p className="fine">A slip is a day you recorded an event or marked failed. {s.daysSince > 0 && addLocalDays(s.since, s.daysSince - 1) === today ? 'Today counts while it stays clean.' : ''}</p>
  </section>;
}
