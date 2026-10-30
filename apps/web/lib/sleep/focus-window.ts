import {asleep, nightDay, wakeClock} from './engine';
import type {Sleep} from './schema';

/**
 * Session AJ (item 28): "your best focus window today", an estimate from the person's own sleep. Many people are most
 * alert some two to four hours after waking (a common pattern in sleep research, not a rule for everyone), so from the
 * wake time of the night that ended today the window runs from 2 h to 4 h after waking; after a short night (an hour or
 * more under the person's own goal, or under 6 h without a goal) it is an hour shorter (2½ h to 3½ h after waking) and
 * says so. Nothing without a night ending today; never after 22:00; never medical advice. Read only.
 */
export const WINDOW_FROM = 120, WINDOW_TO = 240, SHORT_FROM = 150, SHORT_TO = 210, SHORT_UNDER_GOAL = 60, SHORT_WITHOUT_GOAL = 360, LATEST = 22 * 60;
export type FocusWindow = {from: number; to: number; wake: number; short: boolean; asleepMinutes: number | null; estimated: boolean};
export function focusWindow(sleep: Sleep, today: string): FocusWindow | null {
  const night = sleep.nights.filter(n => n.kind === 'night' && n.end && nightDay(n) === today).sort((a, b) => (b.end ?? '').localeCompare(a.end ?? ''))[0];
  const wake = night ? wakeClock(night) : null;
  if (!night || wake === null) return null;
  const slept = asleep(night), minutes = slept?.minutes ?? null;
  const short = minutes !== null && (sleep.goal ? minutes <= sleep.goal.minutes - SHORT_UNDER_GOAL : minutes < SHORT_WITHOUT_GOAL);
  const from = wake + (short ? SHORT_FROM : WINDOW_FROM), to = Math.min(wake + (short ? SHORT_TO : WINDOW_TO), LATEST);
  if (from >= to) return null;
  return {from, to, wake, short, asleepMinutes: minutes, estimated: slept?.estimated ?? false};
}
/** The "Why?" line, in plain words (`clock` formats minutes after midnight as the page does). */
export function focusWhy(w: FocusWindow, clock: (minutes: number) => string): string {
  const base = `You woke at ${clock(w.wake)}. Many people are most alert about two to four hours after waking, so this window starts ${w.short ? '2½' : '2'} hours after you woke.`;
  return `${base}${w.short ? ' After a shorter night the window is an hour shorter.' : ''} It is an estimate from your own sleep, not a rule and not medical advice; you know your day best.`;
}
