'use client';
import {useDeviceRecord} from '../../ai/use-device-record';
import {usePomodoro} from '../../focus/use-pomodoro';
import {startSoundscape} from '../../music/soundscape-start';
import {FOCUS_SESSIONS} from '../../../lib/focus-sessions/schema';
import {focusMinutesBetween, gardenOf} from '../../../lib/focus-sessions/engine';
import {POMODORO_DEFAULTS, cleanSettings, phaseShare} from '../../../lib/focus-sessions/pomodoro';
import {dismissPomodoroResult, skipPomodoroBreak, startPomodoro, stopPomodoro, undoPomodoroTick} from '../../../lib/focus-sessions/pomodoro-run';
import {focusWidgetView} from '../../../lib/nova/widgets/focus';
import {durationWords} from '../../../lib/nova/widgets/words';
import type {WidgetSize} from '../../../lib/nova/store';
import {formatWeekday} from '../../../lib/visual-format';
import {Columns, TickRing} from '../holo/parts';
import {useLocalToday} from '../../use-local-today';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/**
 * "Focus" (Session AK T3/N2; lane WA): the page's one Pomodoro run (lib/focus-sessions/pomodoro-run.ts, the same run the
 * Focus Sessions panel and the Tasks page start). While it runs anywhere in ZIGoals: the phase, the time left, the block,
 * the task it is for, Skip the break and End the run. After a run: what grew, and Undo for a task it ticked. Otherwise:
 * this week's focus and a Start with the person's own lengths and sound choice; a week with none teaches instead of
 * showing a zero. The timer is a plain number (no motion); it ticks while this page is open, as on Focus Sessions.
 * Session AM-2: a running phase is a ring gauge (the share of the phase behind you; it moves with the clock, not an
 * animation) beside the time left, with one pip for each block; a week with focus shows its seven days as glowing
 * columns (minutes a day against the week's best day; a day without focus leaves its slot unlit).
 */
/** The seven days ending today (YYYY-MM-DD, the app's own day strings), oldest first. */
function lastSevenDays(today: string): string[] {
  const end = Date.parse(`${today}T00:00:00Z`);
  return Number.isFinite(end) ? Array.from({length: 7}, (_, i) => new Date(end - (6 - i) * 86_400_000).toISOString().slice(0, 10)) : [];
}
export default function FocusWidget({size}: {size: WidgetSize}) {
  const snap = usePomodoro(), record = useDeviceRecord(FOCUS_SESSIONS), today = useLocalToday();
  if (!record.loaded && !snap.run) return <NovaReading/>;
  const readable = record.loaded && !record.unreadable, saved = readable ? record.data.pomodoro : undefined;
  const settings = cleanSettings({...POMODORO_DEFAULTS, ...(saved ?? {})}), garden = readable ? gardenOf(record.data, today) : null;
  const view = focusWidgetView({run: snap.run, last: snap.last, now: snap.now, week: garden ? {minutes: garden.weekMinutes, sessions: garden.weekSessions} : null, settings});
  const start = () => startPomodoro({settings, ...(saved?.sound ? {startSound: () => { void startSoundscape('focus'); }} : {})});
  const error = snap.error ? <p role="alert" className="nova-line">{snap.error}</p> : null;
  if (view.kind === 'running') return <div className="nova-focus hw-focus" data-running="" data-size={size}>
    <TickRing share={snap.run ? phaseShare(snap.run, snap.now || snap.run.phaseStartedAt) : null} size={size === 'S' ? 56 : undefined} className="hw-mini-ring"/>
    <p className="nova-big"><span className="nova-figure" role="timer" aria-live="off" aria-label={`${view.clock} left`}>{view.clock}</span><small> {view.phase}</small></p>
    <p className="nova-line">Block {view.block} of {view.blocks}{view.task && size !== 'S' ? ` · for “${view.task}”` : ''}</p>
    <span className="hw-pips" aria-hidden="true">{Array.from({length: Math.min(12, view.blocks)}, (_, i) => <i key={i} data-lit={i < view.block - 1 || undefined} data-now={i === view.block - 1 || undefined}/>)}</span>
    <div className="nova-focus-actions">
      {view.onBreak && <button type="button" className="nova-chip-link" onClick={skipPomodoroBreak}>Skip the break</button>}
      <button type="button" className="nova-chip-link" onClick={stopPomodoro}>End the run</button>
    </div>
    {error}
  </div>;
  if (view.kind === 'result') return <div className="nova-focus" role="status">
    <p className="nova-line">{view.line}</p>
    {view.ticked && <p className="nova-line">Marked “{view.ticked}” done. <button type="button" className="nova-chip-link" onClick={undoPomodoroTick}>Undo</button></p>}
    <button type="button" className="nova-chip-link" onClick={dismissPomodoroResult}>OK</button>
    {error}
  </div>;
  if (!readable) return <NovaUnread what="Your focus sessions"/>;
  const startButton = <button type="button" className="nova-chip-link" onClick={start}>{view.start}</button>;
  if (view.kind === 'empty') return <div className="nova-focus">
    <NovaEmpty pillar="habits" ghost="clock">No focus sessions this week yet. A Pomodoro is a calm way to start: {settings.work} minutes of focus, then a short break.</NovaEmpty>
    {startButton}{error}
  </div>;
  const days = !readable ? [] : lastSevenDays(today), perDay = days.map(d => focusMinutesBetween(record.data, d, d).minutes), best = Math.max(1, ...perDay);
  return <div className="nova-focus hw-focus" data-size={size}>
    <p className="nova-big"><span className="nova-figure">{durationWords(view.minutes)}</span><small> this week</small></p>
    {days.length > 0 && <Columns shares={perDay.map(m => m > 0 ? m / best : null)} labels={days.map(d => formatWeekday(d).slice(0, 2))} today={6}/>}
    {size !== 'S' && <p className="nova-line">{view.sessions} {view.sessions === 1 ? 'session' : 'sessions'} · {garden!.grown} grown, {garden!.withered} withered in your garden.</p>}
    {startButton}{error}
  </div>;
}
