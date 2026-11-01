'use client';
import {useDeviceRecord} from '../../ai/use-device-record';
import {usePomodoro} from '../../focus/use-pomodoro';
import {startSoundscape} from '../../music/soundscape-start';
import {FOCUS_SESSIONS} from '../../../lib/focus-sessions/schema';
import {gardenOf} from '../../../lib/focus-sessions/engine';
import {POMODORO_DEFAULTS, cleanSettings} from '../../../lib/focus-sessions/pomodoro';
import {dismissPomodoroResult, skipPomodoroBreak, startPomodoro, stopPomodoro, undoPomodoroTick} from '../../../lib/focus-sessions/pomodoro-run';
import {focusWidgetView} from '../../../lib/nova/widgets/focus';
import {durationWords} from '../../../lib/nova/widgets/words';
import type {WidgetSize} from '../../../lib/nova/store';
import {useLocalToday} from '../../use-local-today';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/**
 * "Focus" (Session AK T3/N2; lane WA): the page's one Pomodoro run (lib/focus-sessions/pomodoro-run.ts, the same run the
 * Focus Sessions panel and the Tasks page start). While it runs anywhere in ZIGoals: the phase, the time left, the block,
 * the task it is for, Skip the break and End the run. After a run: what grew, and Undo for a task it ticked. Otherwise:
 * this week's focus and a Start with the person's own lengths and sound choice; a week with none teaches instead of
 * showing a zero. The timer is a plain number (no motion); it ticks while this page is open, as on Focus Sessions.
 */
export default function FocusWidget({size}: {size: WidgetSize}) {
  const snap = usePomodoro(), record = useDeviceRecord(FOCUS_SESSIONS), today = useLocalToday();
  if (!record.loaded && !snap.run) return <NovaReading/>;
  const readable = record.loaded && !record.unreadable, saved = readable ? record.data.pomodoro : undefined;
  const settings = cleanSettings({...POMODORO_DEFAULTS, ...(saved ?? {})}), garden = readable ? gardenOf(record.data, today) : null;
  const view = focusWidgetView({run: snap.run, last: snap.last, now: snap.now, week: garden ? {minutes: garden.weekMinutes, sessions: garden.weekSessions} : null, settings});
  const start = () => startPomodoro({settings, ...(saved?.sound ? {startSound: () => { void startSoundscape('focus'); }} : {})});
  const error = snap.error ? <p role="alert" className="nova-line">{snap.error}</p> : null;
  if (view.kind === 'running') return <div className="nova-focus" data-running="">
    <p className="nova-big"><span className="nova-figure" role="timer" aria-live="off" aria-label={`${view.clock} left`}>{view.clock}</span><small> {view.phase}</small></p>
    <p className="nova-line">Block {view.block} of {view.blocks}{view.task && size !== 'S' ? ` · for “${view.task}”` : ''}</p>
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
    <NovaEmpty pillar="habits">No focus sessions this week yet. A Pomodoro is a calm way to start: {settings.work} minutes of focus, then a short break.</NovaEmpty>
    {startButton}{error}
  </div>;
  return <div className="nova-focus">
    <p className="nova-big"><span className="nova-figure">{durationWords(view.minutes)}</span><small> this week</small></p>
    {size !== 'S' && <p className="nova-line">{view.sessions} {view.sessions === 1 ? 'session' : 'sessions'} · {garden!.grown} grown, {garden!.withered} withered in your garden.</p>}
    {startButton}{error}
  </div>;
}
