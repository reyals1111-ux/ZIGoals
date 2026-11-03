import type {Habit} from '../habits';
import {habitTimerPreview} from '../habit-timer-actions';
import type {FastingSession} from '../fasting/schema';
import {elapsedMs as fastElapsed, formatFast} from '../fasting/engine';
import type {SleepNight} from '../sleep/schema';
import {secondsLeft, type PomodoroRun} from '../focus-sessions/pomodoro';
import type {MeditationRun} from '../meditation/schema';
import {remainingMs} from '../meditation/timer';
import {FOCUS_PHASE_WORDS, focusClock} from './widgets/focus';

/**
 * Session AK lane P1 (owner follow-up 2 M3 "live activity chips"; WIRING_AUDIT_2 row M3): what is running now, as NOVA's
 * live chips show it (components/nova/live/live-chips.tsx) — the page's Pomodoro run, a meditation or breathing session,
 * a habit's saved timer (running or paused), a fast and a night in bed — each with its time in words and a link to the
 * page where it is ended. Pure: the chips read the same records the pages read; nothing is stored or sent.
 *
 * Honest values only: a time that cannot be worked out (a clock that moved back, a timer that needs review) says so and is
 * never shown as zero; a finished Pomodoro or a meditation whose time is up is not "running". Bounded: at most
 * MAX_HABIT_TIMERS habit timers and MAX_LIVE chips in all, in a fixed order (the clocks that count down first).
 */
export type LiveKind = 'pomodoro' | 'meditation' | 'habit' | 'fast' | 'sleep';
export type LiveActivity = {
  id: string; kind: LiveKind;
  /** The chip's name ("Focus", "Fast", a habit's title). */
  label: string;
  /** Its time in words ("18:42 left", "14 h 05 min of 16 h", "paused at 12 min"). */
  value: string;
  /** Where it is ended or changed. */
  href: string;
  /** The page it opens, for the link's name ("Open Focus Sessions"). */
  page: string;
  paused: boolean;
};
export type LiveSources = {
  now: number;
  pomodoro?: PomodoroRun | null;
  meditation?: MeditationRun['run'] | null;
  habits?: readonly Habit[] | null;
  fast?: FastingSession | null;
  /** The running night (lib/sleep/engine.ts `runningNights(sleep)[0]`). */
  night?: SleepNight | null;
};
export const MAX_LIVE = 6, MAX_HABIT_TIMERS = 3;
export const POMODORO_HREF = '/app/journey?focus=pomodoro#focus';
export const FAST_HREF = '/app/health#fasting';
export const SLEEP_HREF = '/app/health?view=sleep';
export const MEDITATION_HREF = '/app/health?view=meditation';
export const habitHref = (id: string) => `/app/habits#habit-${id}`;

/** "1 h 05 min", "12 min", "under a minute" for a span in milliseconds; null when it cannot be a span. */
export function spanWords(ms: number): string | null {
  if (!Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.floor(ms / 60_000), h = Math.floor(minutes / 60), m = minutes % 60;
  if (!minutes) return 'under a minute';
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}
const UNKNOWN = 'time to review';

export function liveActivities({now, pomodoro, meditation, habits, fast, night}: LiveSources): LiveActivity[] {
  const out: LiveActivity[] = [];
  if (pomodoro && !pomodoro.done) {
    const phase = pomodoro.phases[pomodoro.index];
    if (phase) out.push({id: `pomodoro:${pomodoro.id}`, kind: 'pomodoro', label: FOCUS_PHASE_WORDS[phase.kind], value: `${focusClock(secondsLeft(pomodoro, now))} left`, href: POMODORO_HREF, page: 'Focus Sessions', paused: false});
  }
  if (meditation) {
    const left = remainingMs(meditation, now), paused = meditation.pausedAt !== undefined;
    if (left > 0) out.push({id: `meditation:${meditation.startedAt}`, kind: 'meditation', label: meditation.kind === 'breathing' ? 'Breathing' : 'Meditation', value: `${paused ? 'paused, ' : ''}${focusClock(Math.ceil(left / 1000))} left`, href: MEDITATION_HREF, page: 'Meditation', paused});
  }
  for (const habit of (habits ?? []).filter(h => h.timer).slice(0, MAX_HABIT_TIMERS)) {
    const timer = habit.timer!, paused = timer.state === 'paused';
    let value = UNKNOWN;
    try { const p = habitTimerPreview(habit, new Date(now)); if (!p.reviewReason) value = spanWords(p.elapsedMs) ?? UNKNOWN; } catch { value = UNKNOWN; }
    out.push({id: `habit:${habit.id}:${timer.id}`, kind: 'habit', label: habit.title, value: paused && value !== UNKNOWN ? `paused at ${value}` : value, href: habitHref(habit.id), page: 'Habits', paused});
  }
  if (fast && fast.endedAt === null) {
    // The words Health's own fasting clock and Today use ("3 h 20 min of 16 h").
    const {ms, clockMovedBack} = fastElapsed(fast, new Date(now));
    out.push({id: `fast:${fast.id}`, kind: 'fast', label: 'Fast', value: clockMovedBack || !Number.isFinite(ms) || ms < 0 ? UNKNOWN : `${formatFast(ms)} of ${fast.targetHours} h`, href: FAST_HREF, page: 'Health', paused: false});
  }
  if (night && night.end === null) {
    const words = spanWords(now - Date.parse(night.start));
    out.push({id: `sleep:${night.id}`, kind: 'sleep', label: 'Sleep', value: words ? `in bed ${words}` : UNKNOWN, href: SLEEP_HREF, page: 'Sleep', paused: false});
  }
  return out.slice(0, MAX_LIVE);
}
/** Whether anything counts by the second (a chip shows minutes and seconds), so the chips tick each second only then. */
export const ticksBySecond = (items: readonly LiveActivity[]) => items.some(i => (i.kind === 'pomodoro' || i.kind === 'meditation') && !i.paused);
/** The chip's whole name for assistive technology: "Fast: 14 h 05 min of 16 h. Open Health". */
export const liveName = (item: LiveActivity) => `${item.label}: ${item.value}. Open ${item.page}`;
