'use client';
import {useState} from 'react';
import {FASTING_PRESETS, MAX_CUSTOM_HOURS, MAX_HOURS, elapsedMs, fastingHistory, formatFast, logFastToHabit, removeFast, startFast, stopFast} from '../../lib/fasting/engine';
import type {HealthData} from '../../lib/health';
import {dailyData} from '../../lib/health-daily';
import {latestHabitRule} from '../../lib/habits';
import {readFormNumber} from '../../lib/decimal-input';
import {saveFailureMessage} from '../../lib/storage-error-copy';
import {isShowcase} from '../../lib/showcase-storage';
import {formatTime} from '../../lib/visual-format';
import {GlassBar} from '../progress/glass-progress';
import {useHabits} from '../habits/use-habits';
import type {FastingStore} from './use-fasting';
import './fasting.css';
import type {LayoutAttrs} from '../layout-edit';

export const FASTING_SAFETY_NOTE = 'Fasting isn’t for everyone. If you’re pregnant, under 18, have a medical condition or an eating disorder, or take medication, talk to a doctor first. Stop if you feel unwell.';
const clock = (iso: string, zone: string) => { try { return formatTime(iso, {timeZone: zone, hour: 'numeric', minute: '2-digit'}); } catch { return formatTime(iso, {hour: 'numeric', minute: '2-digit'}); } };
/** The Health page module "Fasting timer" (HE6): a clock against a chosen target, a short history, no praise. */
export function FastingTimer({fasting, health, ...layout}: LayoutAttrs & {fasting: FastingStore; health: HealthData}) {
  const habits = useHabits();
  const [preset, setPreset] = useState<number | 'custom'>(16); const [custom, setCustom] = useState('18'); const [habitId, setHabitId] = useState('');
  const [result, setResult] = useState(''); const [error, setError] = useState(''); const [confirming, setConfirming] = useState(false);
  const zone = dailyData(health).preferences.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const running = fasting.running, durationHabits = habits.data.habits.filter(h => { const rule = latestHabitRule(h); return rule.measurement.kind === 'duration' && rule.state === 'active'; });
  async function start() {
    setError(''); setResult('');
    try {
      // Session Y Part 2 follow-up: the fast starts when the person taps Start, not when its save gets its turn (a slow
      // or busy storage ran the updater later, and the fast began then; fasting.spec.ts:66 in CI on c40475e).
      const hours = preset === 'custom' ? readFormNumber(custom, {min: 1, max: MAX_CUSTOM_HOURS, whole: true}) : preset, at = new Date();
      await fasting.update(current => startFast(current, {id: `fast_${crypto.randomUUID()}`, now: at, targetHours: hours, timeZone: zone, ...(habitId ? {habitId} : {})}));
    } catch (e) { setError(e instanceof Error && /target|running|full/.test(e.message) ? e.message : preset === 'custom' ? 'Choose a target up to 18 hours.' : saveFailureMessage(e)); }
  }
  async function stop() {
    if (!running) return; setError(''); setResult('');
    try {
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
    <div className="habit-section-heading"><div><p className="eyebrow">A clock, nothing more</p><h2 id="fasting-title">Fasting timer</h2></div></div>
    <p className="fasting-safety" role="note">{FASTING_SAFETY_NOTE}</p>
    <p className="fine">ZIGoals shows the clock only. It gives no medical or nutritional advice.</p>
    {fasting.unreadable ? fasting.error ? <div className="notice" role="alert"><p>{fasting.error}</p></div> : <div className="notice" role="alert"><p>Your saved fasts on this device could not be read. They were not changed.</p>
      {confirming ? <div className="actions"><p className="fine">Start over keeps the old bytes as a recovery copy and continues with no fasts.</p><button type="button" className="secondary" onClick={() => { setConfirming(false); fasting.startOver().catch(e => setError(saveFailureMessage(e))); }}>Start over</button><button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep them</button></div> : <button type="button" className="quiet" onClick={() => setConfirming(true)}>Start over…</button>}</div>
    : running ? <div className="fasting-running">
      {(() => { const {ms, clockMovedBack} = elapsedMs(running, fasting.now), target = running.targetHours * 3_600_000, reached = ms >= target; return <>
        <p className="fasting-clock" aria-live="off"><strong>{reached ? 'Target reached' : 'Fasting'} · {formatFast(reached ? target : ms)} of {running.targetHours} h</strong></p>
        <p className="fine">Started {clock(running.startedAt, running.timeZone)} · target reached at {clock(new Date(Date.parse(running.startedAt) + target).toISOString(), running.timeZone)}</p>
        <GlassBar identity="fasting-progress" className="fasting-track" aria-hidden="true" value={Math.min(1, ms / target)} />
        {clockMovedBack && <p className="notice">Your device clock changed; the time shown may be off. Stop and start again if you like.</p>}
        <button type="button" className="secondary" onClick={() => void stop()}>Stop fast</button>
      </>; })()}
    </div> : <div className="fasting-idle">
      <div className="fasting-presets" role="group" aria-label="Fasting target">{FASTING_PRESETS.map(p => <button key={p.hours} type="button" className={preset === p.hours ? 'secondary' : 'quiet'} aria-pressed={preset === p.hours} onClick={() => setPreset(p.hours)}>{p.label}</button>)}<button type="button" className={preset === 'custom' ? 'secondary' : 'quiet'} aria-pressed={preset === 'custom'} onClick={() => setPreset('custom')}>Custom</button></div>
      {preset === 'custom' && <label className="field">Target hours (1–{MAX_CUSTOM_HOURS})<input type="text" inputMode="numeric" autoComplete="off" value={custom} onChange={event => setCustom(event.target.value)} /></label>}
      <label className="field">Log the hours to a habit (optional)<select value={habitId} onChange={event => setHabitId(event.target.value)}><option value="">Don’t log</option>{durationHabits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label>
      <button type="button" className="primary" disabled={!fasting.loaded} onClick={() => void start()}>Start fast</button>
    </div>}
    {fasting.data.sessions.some(s => s.stoppedBy === 'limit' && !result) && !running && history[0]?.session.stoppedBy === 'limit' && <p className="fine" role="status">This fast was stopped automatically at {MAX_HOURS} hours.</p>}
    {result && <p role="status">{result}</p>}{error && <p role="alert">{error}</p>}
    {history.length > 0 && <div className="fasting-history"><h3>Recent fasts</h3><ul>{history.map(row => <li key={row.session.id}><span>{row.day} · {row.hours.toFixed(1)} h · target {row.session.targetHours} h · {row.session.stoppedBy === 'limit' ? `stopped at ${MAX_HOURS} h` : 'stopped by you'}{isShowcase() && row.session.id.startsWith('fast_showcase') ? ' · Showcase example' : ''}</span><button type="button" className="quiet" aria-label={`Remove the fast of ${row.day}`} onClick={() => { setError(''); fasting.update(current => removeFast(current, row.session.id)).catch(e => setError(saveFailureMessage(e))); }}>Remove</button></li>)}</ul></div>}
  </section>;
}
