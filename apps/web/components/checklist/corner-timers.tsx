'use client';
import {useEffect, useState, type CSSProperties} from 'react';
import {runningNights, inBedMinutes} from '../../lib/sleep/engine';
import {remainingMs, clockText} from '../../lib/meditation/timer';
import {runningSession, elapsedMs as fastElapsed, formatFast} from '../../lib/fasting/engine';
import {habitTimerPreview} from '../../lib/habit-timer-actions';
import {latestHabitRule} from '../../lib/habits';
import {formatTime} from '../../lib/visual-format';
import {PATH_COLOURS} from '../../lib/path/colours';
import type {TimerKind} from '../../lib/checklist/commands';
import {PathGlyph} from '../path/path-glyphs';
import type {ChecklistState} from './use-checklist';

/**
 * The always-on-top corner timers (P7.16): Sleep, Meditate, Fast, and Focus when a timed habit is on the path. One tap
 * starts the page's own timer (it is tracked on Health or Habits, exactly as if started there); the next tap ends it and
 * the record lands on its page (a night on Health's sleep, a session, a fast, minutes on the habit).
 *
 * Session AG (owner pointer 10, references 08–11): slim horizontal glass cards — a thin neon border and glow in the card's
 * colour (Sleep cyan, Meditate teal, Fast violet, Focus pink), a line icon on the left (crescent moon, lotus, clock,
 * target), the name in white and one sub line with its number in the card's colour. Honest values only (owner amendment
 * 3): only a goal the person set says "Goal" (Sleep's goal, Meditate's weekly goal, the timed habit's own target); a value
 * last used or a default says what it is ("Last night · 7h 12m", "Last fast · 16h", "Usually 15m"); with nothing set the
 * card says so ("No goal set · …"). Running: a brighter border, the icon lit once (no loop) and "Running · 1h 12m",
 * moving on while it runs. On a computer and a tablet the cards stand in the side column; on a phone they are the foot
 * bar's compact cards (44 px or more), each still one tap to start and one to end.
 */
type Sub = {value: string; label: string; before?: boolean};
type Timer = {kind: TimerKind; label: string; glyph: string; colour: keyof typeof PATH_COLOURS; running: boolean; sub: Sub; spoken: string};
/** 8h 0m, 20m, 16h — the references' own spelling. */
export const span = (minutes: number) => { const m = Math.max(0, Math.round(minutes)), h = Math.floor(m / 60), r = m % 60; return h ? `${h}h ${r}m` : `${r}m`; };
const hours = (h: number) => Number.isInteger(h) ? `${h}h` : span(h * 60);
export function CornerTimers({state}: {state: ChecklistState}) {
  const [busy, setBusy] = useState<TimerKind | null>(null), [message, setMessage] = useState('');
  const {sleep, meditation, fasting} = state.stores, [clock, setClock] = useState(0);
  const night = runningNights(sleep.sleep)[0], runSession = meditation.run.data.run, fast = runningSession(fasting.data), focus = state.focusHabit;
  // While a timer runs its text moves on each second (only then; nothing ticks at rest).
  const anyRunning = !!night || !!runSession || !!fast || !!focus?.timer;
  useEffect(() => { if (!anyRunning) return; const tick = () => setClock(Date.now()); tick(); const t = window.setInterval(tick, 1000); return () => window.clearInterval(t); }, [anyRunning]);
  const now = Math.max(clock, sleep.now, meditation.now, fasting.now.getTime());
  const focusTimer = focus?.timer, focusPreview = focus && focusTimer ? (() => { try { return habitTimerPreview(focus, new Date(now)); } catch { return null; } })() : null;
  const {sleep: sleepRecord} = sleep, meditationRecord = meditation.meditation;
  const lastNight = [...sleepRecord.nights].filter(n => n.kind === 'night' && n.end).sort((x, y) => (y.end ?? '').localeCompare(x.end ?? ''))[0];
  const meditateDefault = state.dots.find(d => d.kind === 'health' && d.input === 'meditation')?.item.defaultValue;
  const lastFast = fasting.data.sessions.at(-1);
  const focusRule = focus ? latestHabitRule(focus) : null, focusGoal = focusRule && focusRule.measurement.kind === 'duration' ? focusRule.target * (/hour/i.test(focusRule.measurement.unit ?? '') ? 60 : 1) : null;
  const run = (value: string): Sub => ({value, label: 'Running ·', before: true});
  const timers: Timer[] = [
    {kind: 'sleep', label: 'Sleep', glyph: 'moon', colour: 'cyan', running: !!night,
      sub: night ? run(span(inBedMinutes(night, now))) : sleepRecord.goal ? {value: span(sleepRecord.goal.minutes), label: 'Goal'} : lastNight ? {value: span((Date.parse(lastNight.end!) - Date.parse(lastNight.start)) / 60_000), label: 'Last night ·', before: true} : {value: '', label: 'No goal set · tap at bedtime'},
      spoken: night ? `in bed since ${formatTime(night.start, {timeZone: night.timeZone})}` : ''},
    {kind: 'meditate', label: 'Meditate', glyph: 'lotus', colour: 'teal', running: !!runSession,
      sub: runSession ? run(`${clockText(remainingMs(runSession, now))} left`) : meditationRecord.goal ? {value: `${span(meditationRecord.goal.minutesPerWeek)} a week`, label: 'Goal'} : meditateDefault ? {value: span(meditateDefault), label: 'Usually', before: true} : {value: '10m', label: 'No goal set · starts', before: true},
      spoken: ''},
    {kind: 'fast', label: 'Fast', glyph: 'clock', colour: 'purple', running: !!fast,
      sub: fast ? run(`${formatFast(fastElapsed(fast, new Date(now)).ms)} of ${hours(fast.targetHours)}`) : lastFast ? {value: hours(lastFast.targetHours), label: 'Last fast ·', before: true} : {value: '16h', label: 'No goal set · starts at', before: true},
      spoken: ''},
    ...(focus ? [{kind: 'focus' as const, label: 'Focus', glyph: 'target', colour: 'pink' as const, running: !!focusTimer,
      sub: focusTimer && focusPreview ? run(clockText(focusPreview.elapsedMs)) : focusGoal ? {value: span(focusGoal), label: 'Goal'} : {value: '', label: 'No goal set · tap to start'},
      spoken: focus.title}] : []),
  ];
  const line = (t: Timer) => t.sub.before ? `${t.sub.label} ${t.sub.value}`.trim() : `${t.sub.value} ${t.sub.label}`.trim();
  async function press(kind: TimerKind) {
    setBusy(kind); setMessage('');
    const out = await state.timer(kind);
    setBusy(null);
    if (!out.ok) setMessage(out.message);
  }
  const running = timers.find(t => t.running);
  return <div className="checklist-timers-wrap" data-running={running ? '' : undefined}>
    <div className="checklist-timers" role="group" aria-label="Quick timers">
    {timers.map(t => <button key={t.kind} type="button" className="checklist-timer" data-kind={t.kind} data-running={t.running || undefined} aria-pressed={t.running} aria-busy={busy === t.kind || undefined} disabled={busy !== null} onClick={() => void press(t.kind)}
      aria-label={`${t.label}: ${t.spoken ? `${t.spoken}. ` : ''}${t.running ? `${line(t).replace('Running ·', 'running,')}. Tap to end` : `${line(t)}. Tap to start`}`} style={{'--timer': PATH_COLOURS[t.colour].token} as CSSProperties}>
      <span className="checklist-timer-ring" aria-hidden="true"><PathGlyph name={t.glyph} size={30}/></span>
      <span className="checklist-timer-text"><strong>{t.label}</strong><small title={line(t)}>{t.sub.before ? <><span className="checklist-timer-label">{t.sub.label}</span>{t.sub.value && <> <b>{t.sub.value}</b></>}</> : <><b>{t.sub.value}</b> <span className="checklist-timer-label">{t.sub.label}</span></>}</small></span>
    </button>)}
    {message && <p className="checklist-timers-message" role="alert">{message}</p>}
    </div>
  </div>;
}
