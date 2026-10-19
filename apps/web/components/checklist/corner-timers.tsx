'use client';
import {useEffect, useState, type CSSProperties} from 'react';
import {runningNights, inBedMinutes} from '../../lib/sleep/engine';
import {remainingMs, clockText} from '../../lib/meditation/timer';
import {runningSession, elapsedMs as fastElapsed, formatFast} from '../../lib/fasting/engine';
import {habitTimerPreview} from '../../lib/habit-timer-actions';
import {formatMinutes} from '../../lib/zone-time';
import {formatTime} from '../../lib/visual-format';
import {PATH_COLOURS} from '../../lib/path/colours';
import type {TimerKind} from '../../lib/checklist/commands';
import {PathGlyph} from '../path/path-glyphs';
import type {ChecklistState} from './use-checklist';
import {useEscapeLayer} from './escape-layers';

/**
 * The always-on-top corner timers (P7.16): Sleep, Meditate, Fast, and Focus when a timed habit is on the path. One tap
 * starts the page's own timer (it is tracked on Health or Habits, exactly as if started there); the next tap ends it and
 * the record lands on its page (a night on Health's sleep, a session, a fast, minutes on the habit). Running: the button
 * says so, with how long, and a still ring shows how far (no loop). Session AF (L3b): on a wide screen the timers stand at
 * the top of the side column; on a phone or tablet they fold into one corner button (it shows a running timer's mark and a
 * lit ring) that opens them above it, each still one tap to start and one to end.
 */
type Timer = {kind: TimerKind; label: string; glyph: string; colour: keyof typeof PATH_COLOURS; running: boolean; line: string; share?: number};
export function CornerTimers({state, open, onOpen}: {state: ChecklistState; open: boolean; onOpen: (open: boolean) => void}) {
  const [busy, setBusy] = useState<TimerKind | null>(null), [message, setMessage] = useState('');
  // Session AF (L3b): on a phone or tablet the timers fold into one corner button that opens them (Escape closes them). The
  // open state is the overlay's, so it outlives a moment when the stores reload.
  useEscapeLayer(open, () => onOpen(false));
  const {sleep, meditation, fasting} = state.stores, [clock, setClock] = useState(0);
  const night = runningNights(sleep.sleep)[0], run = meditation.run.data.run, fast = runningSession(fasting.data), focus = state.focusHabit;
  // While a timer runs its text moves on each second (only then; nothing ticks at rest).
  const anyRunning = !!night || !!run || !!fast || !!focus?.timer;
  useEffect(() => { if (!anyRunning) return; const tick = () => setClock(Date.now()); tick(); const t = window.setInterval(tick, 1000); return () => window.clearInterval(t); }, [anyRunning]);
  const now = Math.max(clock, sleep.now, meditation.now, fasting.now.getTime());
  const focusTimer = focus?.timer, focusPreview = focus && focusTimer ? (() => { try { return habitTimerPreview(focus, new Date(now)); } catch { return null; } })() : null;
  const timers: Timer[] = [
    {kind: 'sleep', label: 'Sleep', glyph: 'moon', colour: 'magenta', running: !!night, line: night ? `In bed since ${formatTime(night.start, {timeZone: night.timeZone})} · ${formatMinutes(inBedMinutes(night, now))}` : 'Tap at bedtime'},
    {kind: 'meditate', label: 'Meditate', glyph: 'lotus', colour: 'teal', running: !!run, line: run ? `${clockText(remainingMs(run, now))} left` : '10 minutes', ...(run ? {share: 1 - remainingMs(run, now) / (run.plannedSec * 1000)} : {})},
    {kind: 'fast', label: 'Fast', glyph: 'hourglass', colour: 'gold', running: !!fast, line: fast ? `${formatFast(fastElapsed(fast, new Date(now)).ms)} of ${fast.targetHours} h` : `${fasting.data.sessions.at(-1)?.targetHours ?? 16} h target`, ...(fast ? {share: Math.min(1, fastElapsed(fast, new Date(now)).ms / (fast.targetHours * 3_600_000))} : {})},
    ...(focus ? [{kind: 'focus' as const, label: 'Focus', glyph: 'focus', colour: 'cyan' as const, running: !!focusTimer, line: focusTimer && focusPreview ? `${focus.title} · ${clockText(focusPreview.elapsedMs)}` : focus.title}] : []),
  ];
  async function press(kind: TimerKind) {
    setBusy(kind); setMessage('');
    const out = await state.timer(kind);
    setBusy(null);
    if (!out.ok) setMessage(out.message);
  }
  const running = timers.find(t => t.running);
  return <div className="checklist-timers-wrap" data-open={open || undefined} data-running={running ? '' : undefined}>
    <button type="button" className="checklist-timers-fab" aria-expanded={open} aria-label={`Timers: Sleep, Meditate, Fast${focus ? ', Focus' : ''}${running ? ` (${running.label} running)` : ''}`} onClick={() => onOpen(!open)}
      style={running ? {'--timer': PATH_COLOURS[running.colour].token} as CSSProperties : undefined}>
      <PathGlyph name={running?.glyph ?? 'hourglass'} size={24}/>{running && <span className="checklist-timers-fab-dot" aria-hidden="true"/>}
    </button>
    <div className="checklist-timers" role="group" aria-label="Quick timers">
    {timers.map(t => <button key={t.kind} type="button" className="checklist-timer" data-kind={t.kind} data-running={t.running || undefined} aria-pressed={t.running} aria-busy={busy === t.kind || undefined} disabled={busy !== null} onClick={() => void press(t.kind)}
      aria-label={`${t.label}: ${t.running ? `running, ${t.line}. Tap to end` : `${t.line}. Tap to start`}`} style={{'--timer': PATH_COLOURS[t.colour].token, ...(t.share !== undefined ? {'--share': Math.max(0, Math.min(1, t.share))} : {})} as CSSProperties}>
      <span className="checklist-timer-ring" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false"><circle className="checklist-timer-track" cx="20" cy="20" r="17"/>{t.running && <circle className="checklist-timer-arc" cx="20" cy="20" r="17" pathLength={1}/>}</svg><PathGlyph name={t.glyph} size={20}/></span>
      <span className="checklist-timer-text"><strong>{t.label}</strong>{t.running && <small>{t.line}</small>}</span>
    </button>)}
    {message && <p className="checklist-timers-message" role="alert">{message}</p>}
    </div>
  </div>;
}
