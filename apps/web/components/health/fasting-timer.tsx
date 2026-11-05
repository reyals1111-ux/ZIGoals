'use client';
import {removeWithUndo} from '../ui/remove-with-undo';
import {showUndo} from '../ui/undo-toast';
import {timerRuleText, tooShortText, tooShortToSave} from '../../lib/health-timer-rules';
import {fastingRhythm, fastingRhythmText} from '../../lib/health-fasting-rhythm';
import {useState} from 'react';
import {FASTING_PRESETS, MAX_CUSTOM_HOURS, MAX_HOURS, elapsedMs, fastStartAt, fastingHistory, formatFast, logFastToHabit, logPastFast, removeFast, startFast, stopFast} from '../../lib/fasting/engine';
import {instantAt} from '../../lib/zone-time';
import type {HealthData} from '../../lib/health';
import {dailyData, healthDay} from '../../lib/health-daily';
import {latestHabitRule} from '../../lib/habits';
import {readFormNumber} from '../../lib/decimal-input';
import {saveFailureMessage} from '../../lib/storage-error-copy';
import {isShowcase} from '../../lib/showcase-storage';
import {formatDate, formatTime} from '../../lib/visual-format';
import {GlassBar} from '../progress/glass-progress';
import {useHabits} from '../habits/use-habits';
import type {FastingStore} from './use-fasting';
import './fasting.css';
import type {LayoutAttrs} from '../layout-edit';
import {StarToggle} from '../checklist/star-toggle';
import {PastDayLine, useHealthDay} from './health-day';

export const FASTING_SAFETY_NOTE = 'Fasting isn’t for everyone. If you’re pregnant, under 18, have a medical condition or an eating disorder, or take medication, talk to a doctor first. Stop if you feel unwell.';
const clock = (iso: string, zone: string) => { try { return formatTime(iso, {timeZone: zone}); } catch { return formatTime(iso); } };
/** The Health page module "Fasting timer" (HE6): a clock against a chosen target, a short history, no praise. */
/** Session AL (P-MO-55; MO-025, C-MO-36): a fast that already happened, with its start and end, checked by logPastFast. */
function PastFastForm({fasting, zone, onDone}: {fasting: FastingStore; zone: string; onDone: (line: string) => void}) {
  const today = healthDay(zone);
  const [startDate, setStartDate] = useState(today), [startTime, setStartTime] = useState(''), [endDate, setEndDate] = useState(today), [endTime, setEndTime] = useState(''), [target, setTarget] = useState('16'), [issue, setIssue] = useState('');
  async function save() {
    setIssue('');
    try {
      if (!startTime || !endTime) throw new RangeError('Enter when the fast started and ended.');
      const t = target.trim(); if (!/^\d+$/.test(t)) throw new RangeError('Enter whole hours, like 16.'); if (Number(t) < 1 || Number(t) > MAX_CUSTOM_HOURS) throw new RangeError(`Choose a target from 1 to ${MAX_CUSTOM_HOURS} hours.`);
      const start = new Date(instantAt(startDate, startTime, zone)), end = new Date(instantAt(endDate, endTime, zone));
      await fasting.update(current => logPastFast(current, {id: `fast_${crypto.randomUUID()}`, start, end, targetHours: Number(t), timeZone: zone, now: new Date()}));
      onDone(`Past fast saved: ${formatFast(end.getTime() - start.getTime())}.`); setStartTime(''); setEndTime('');
    } catch (e) { setIssue(e instanceof RangeError || (e instanceof Error && /fast|history/.test(e.message)) ? e.message : saveFailureMessage(e)); }
  }
  return <details className="fasting-past"><summary className="health-fold-button" data-icon="template">Log a past fast</summary>
    <form aria-label="Log a past fast" noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="sleep-form-row"><label className="field">Started (date)<input type="date" max={today} value={startDate} onChange={e => setStartDate(e.target.value)}/></label><label className="field">Started (time)<input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}/></label></div>
      <div className="sleep-form-row"><label className="field">Ended (date)<input type="date" max={today} value={endDate} onChange={e => setEndDate(e.target.value)}/></label><label className="field">Ended (time)<input type="time" value={endTime} aria-invalid={issue ? true : undefined} aria-describedby={issue ? 'past-fast-issue' : undefined} onChange={e => setEndTime(e.target.value)}/></label></div>
      <label className="field">Its target, in hours (1–{MAX_CUSTOM_HOURS})<input type="text" inputMode="numeric" autoComplete="off" value={target} onChange={e => setTarget(e.target.value)}/></label>
      {issue && <p className="field-error" id="past-fast-issue" role="alert">{issue}</p>}
      <button type="submit" className="secondary">Save past fast</button>
    </form>
  </details>;
}

export function FastingTimer({fasting, health, ...layout}: LayoutAttrs & {fasting: FastingStore; health: HealthData}) {
  const habits = useHabits();
  const [preset, setPreset] = useState<number | 'custom'>(16); const [custom, setCustom] = useState('18'); const [habitId, setHabitId] = useState('');
  const [result, setResult] = useState(''); const [error, setError] = useState(''); const [confirming, setConfirming] = useState(false);
  // Session AL (P-MO-55; MO-025, C-MO-34): a fast that began before the tap ("Started at"), and a past fast typed afterwards.
  const [startedAt, setStartedAt] = useState('');
  const zone = dailyData(health).preferences.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Session AH Part 17: on a past Journal date, the fasts begun that day (a fast is timed live, so it is not logged afterwards).
  const day = useHealthDay(healthDay(zone)), dayFasts = day.past && !fasting.unreadable ? fastingHistory(fasting.data, 200).filter(row => row.day === day.date) : [];
  const running = fasting.running, durationHabits = habits.data.habits.filter(h => { const rule = latestHabitRule(h); return rule.measurement.kind === 'duration' && rule.state === 'active'; });
  async function start() {
    setError(''); setResult('');
    try {
      // Session Y Part 2 follow-up: the fast starts when the person taps Start, not when its save gets its turn (a slow
      // or busy storage ran the updater later, and the fast began then; fasting.spec.ts:66 in CI on c40475e).
      // Session AH (HE7, B-064): each wrong custom target gets its own sentence.
      // Session AL (N-MO-29): a whole number out of the range, negative ones too (−3), gets the range; a decimal the whole-hours line.
      if (preset === 'custom') { const t = custom.trim(); if (!t) throw new RangeError('Enter a target in whole hours.'); if (/^[-−]\d+$/.test(t)) throw new RangeError(`Choose a target from 1 to ${MAX_CUSTOM_HOURS} hours.`); if (!/^\d+$/.test(t)) throw new RangeError('Enter whole hours, like 16.'); if (Number(t) < 1 || Number(t) > MAX_CUSTOM_HOURS) throw new RangeError(`Choose a target from 1 to ${MAX_CUSTOM_HOURS} hours.`); }
      const hours = preset === 'custom' ? readFormNumber(custom, {min: 1, max: MAX_CUSTOM_HOURS, whole: true}) : preset, at = startedAt ? fastStartAt(startedAt, Date.now(), zone) : new Date();
      await fasting.update(current => startFast(current, {id: `fast_${crypto.randomUUID()}`, now: at, targetHours: hours, timeZone: zone, ...(habitId ? {habitId} : {})}));
    } catch (e) { setError(e instanceof RangeError || (e instanceof Error && /target|running|full/.test(e.message)) ? e.message : preset === 'custom' ? `Choose a target from 1 to ${MAX_CUSTOM_HOURS} hours.` : saveFailureMessage(e)); }
  }
  async function stop() {
    if (!running) return; setError(''); setResult('');
    try {
      // Session AL (PR-018, P-MO-55; MO-025, MO-132, M-136): the one timer rule. A fast stopped within ten minutes is
      // not kept (it was stored as "0.0 h"); Undo starts it again from its own start time.
      if (tooShortToSave('fast', Date.now() - Date.parse(running.startedAt))) {
        const held = running;
        await fasting.update(current => current.sessions.some(x => x.id === held.id) ? removeFast(current, held.id) : current);
        showUndo({message: tooShortText('fast'), undone: 'The fast is running again.', restore: () => fasting.update(current => current.sessions.some(x => x.id === held.id) || current.sessions.some(x => x.endedAt === null) ? current : startFast(current, {id: held.id, now: new Date(held.startedAt), targetHours: held.targetHours, timeZone: held.timeZone, ...(held.habitId ? {habitId: held.habitId} : {})}))});
        setResult(tooShortText('fast'));
        return;
      }
      const now = new Date(), next = await fasting.update(current => stopFast(current, running.id, now)), session = next.sessions.find(s => s.id === running.id)!;
      const elapsed = elapsedMs(session, now).ms;
      let line = `Stopped at ${formatFast(elapsed)}. Your target was ${session.targetHours} h.`;
      if (session.habitId) {
        const habit = habits.data.habits.find(h => h.id === session.habitId);
        const logged = logFastToHabit(habits.data, session, now);
        if (logged.logged !== null) { try { await habits.update(data => logFastToHabit(data, session, now).data); line += ` ${logged.logged} ${logged.logged === 1 ? 'hour' : 'hours'} added to ${habit?.title ?? 'your habit'}.`; } catch (e) { line += ` Not logged: ${saveFailureMessage(e)}`; } }
        else if (logged.reason) line += ` Not logged: ${logged.reason}`;
      }
      setResult(line);
    } catch (e) { setError(saveFailureMessage(e)); }
  }
  const history = fastingHistory(fasting.data);
  // As a layout item inside PhoneFold the region's attributes arrive here on desktop (components/phone/phone-fold.tsx).
  return <section {...layout} className="panel fasting-timer" id="fasting" aria-labelledby="fasting-title">
    <div className="habit-section-heading"><div><p className="eyebrow">A clock, nothing more</p><h2 id="fasting-title">Fasting timer</h2></div><StarToggle item={{kind: 'health', input: 'fast'}} label="Fast" defaultValue={16} unit="h"/></div>
    <p className="fasting-safety" role="note">{FASTING_SAFETY_NOTE}</p>
    <p className="fine">ZIGoals shows the clock only. It gives no medical or nutritional advice. {timerRuleText}</p>
    {/* Session AL fourth pass (C-MO-35, C-DVG-41): a rhythm of fasts that reached their own target (no longest fast) */}
    {(() => { const text = fasting.unreadable ? null : fastingRhythmText(fastingRhythm(fastingHistory(fasting.data, 400), day.today)); return text ? <p className="fine fasting-rhythm">{text}</p> : null; })()}
    <PastDayLine date={day.date} today={day.today}>{dayFasts.length ? dayFasts.map(row => `${formatFast(row.hours * 3_600_000)} fast`).join(', ') : 'no fast begun that day'}</PastDayLine>
    {fasting.unreadable ? fasting.error ? <div className="notice" role="alert"><p>{fasting.error}</p></div> : <div className="notice" role="alert"><p>Your saved fasts on this device could not be read. They were not changed.</p>
      {confirming ? <div className="actions"><p className="fine">Start over keeps the old bytes as a recovery copy and continues with no fasts.</p><button type="button" className="secondary" onClick={() => { setConfirming(false); fasting.startOver().catch(e => setError(saveFailureMessage(e))); }}>Start over</button><button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep them</button></div> : <button type="button" className="quiet" onClick={() => setConfirming(true)}>Start over…</button>}</div>
    : running ? <div className="fasting-running">
      {(() => { const {ms, clockMovedBack} = elapsedMs(running, fasting.now), target = running.targetHours * 3_600_000, reached = ms >= target; return <>
        <p className="fasting-clock" aria-live="off"><strong>{reached ? 'Target reached' : 'Fasting'} · {formatFast(ms)} of {running.targetHours} h</strong>{/* Session AH (HE7, L-061): the clock keeps counting past the target */}</p>
        <p className="fine">Started {clock(running.startedAt, running.timeZone)} · target {reached ? 'reached' : 'at'} {(() => { const at = new Date(Date.parse(running.startedAt) + target).toISOString(); let day = ''; try { const d = (iso: string) => formatDate(iso, {timeZone: running.timeZone}); if (d(at) !== d(running.startedAt)) day = `${formatDate(at, {timeZone: running.timeZone, weekday: true, year: false})}, `; } catch { /* the time alone */ } return `${day}${clock(at, running.timeZone)}`; })()}</p>
        <GlassBar identity="fasting-progress" className="fasting-track" aria-hidden="true" value={Math.min(1, ms / target)} />
        {clockMovedBack && <p className="notice">Your device clock changed; the time shown may be off. Stop and start again if you like.</p>}
        <button type="button" className="secondary" onClick={() => void stop()}>Stop fast</button>
      </>; })()}
    </div> : <div className="fasting-idle">
      <div className="fasting-presets" role="group" aria-label="Fasting target">{FASTING_PRESETS.map(p => <button key={p.hours} type="button" className={preset === p.hours ? 'secondary' : 'quiet'} aria-pressed={preset === p.hours} onClick={() => setPreset(p.hours)}>{p.label}</button>)}<button type="button" className={preset === 'custom' ? 'secondary' : 'quiet'} aria-pressed={preset === 'custom'} onClick={() => setPreset('custom')}>Custom</button></div>
      {preset === 'custom' && <label className="field">Target hours (1–{MAX_CUSTOM_HOURS}; every fast stops itself at {MAX_HOURS} h)<input type="text" inputMode="numeric" autoComplete="off" value={custom} onChange={event => setCustom(event.target.value)} /></label>}
      {/* Session AL (P-MO-30, MO-097): only when there is a duration habit to log the hours to. */}
      {/* Session AL fourth pass (MO-097): folded, so the page-wide fasting card does not show a habit picker on every view */}{durationHabits.length > 0 && <details className="fasting-habit-fold"><summary>Log the hours to a habit (optional)</summary><label className="field">Habit for the hours<select value={habitId} onChange={event => setHabitId(event.target.value)}><option value="">Don’t log</option>{durationHabits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label></details>}
      <label className="field">Started earlier? (optional)<input type="time" value={startedAt} onChange={event => setStartedAt(event.target.value)} aria-describedby="fast-started-hint"/></label>
      <p className="fine" id="fast-started-hint">Leave it empty to start now. A time later than now means yesterday.</p>
      <button type="button" className="primary" disabled={!fasting.loaded} onClick={() => void start()}>{startedAt ? `Start fast from ${startedAt}` : 'Start fast'}</button>
      <PastFastForm fasting={fasting} zone={zone} onDone={line => { setError(''); setResult(line); }}/>
    </div>}
    {fasting.data.sessions.some(s => s.stoppedBy === 'limit' && !result) && !running && history[0]?.session.stoppedBy === 'limit' && <p className="fine" role="status">This fast was stopped automatically at {MAX_HOURS} hours.</p>}
    {result && <p role="status">{result}</p>}{error && <p role="alert">{error}</p>}
    {history.length > 0 && <div className="fasting-history"><h3>Recent fasts</h3><ul>{history.map(row => <li key={row.session.id}><span>{formatDate(row.day)} · {row.hours.toFixed(1)} h · target {row.session.targetHours} h · {row.session.stoppedBy === 'limit' ? `stopped at ${MAX_HOURS} h` : 'stopped by you'}{isShowcase() && row.session.id.startsWith('fast_showcase') ? ' · Showcase example' : ''}</span><button type="button" className="quiet" aria-label={`Remove the fast of ${formatDate(row.day)}`} onClick={() => { setError(''); /* Session AH Part 3 (DS5, M-136): a labelled Undo puts the fast back. */ removeWithUndo(fasting.update, current => removeFast(current, row.session.id), `The fast of ${formatDate(row.day)} is removed.`, 'The fast is back.').catch(e => setError(saveFailureMessage(e))); }}>Remove</button></li>)}</ul></div>}
  </section>;
}
