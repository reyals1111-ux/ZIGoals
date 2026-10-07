import {localClock} from '../../reminders/due';
import type {ZigiKnock, ZigiPrefs} from '../store/records';

/**
 * ZIGi's knock (Session V Part 13), the rules, all on this device: knock is off until the person turns it on (or says
 * "Yes, knock" to the one-time offer); then a reminder that is due may make ZIGi peek out and knock once. Never in
 * the quiet hours (22:00 to 08:00 by default), never more than the daily cap (3 by default), never twice for the same
 * reminder on one day unless the person snoozed it, and never while a page shows that reminder's own card. Sensitive
 * screens and a hidden ZIGi are the component's to check. The counts live in `zigoals:zigi-knock:v1`, written only when
 * a knock shows or is snoozed; two weeks of dates are kept.
 */
export type KnockKind = 'habit' | 'water' | 'goal' | 'wealth' | 'pack' | 'wind-down' | 'meditation-time' | 'stack-next' | 'contribution-due';
/** `after`: for 'stack-next' (Session W Part 10), the habit before it in the stack, done today. */
export type KnockCandidate = {id: string; kind: KnockKind; title: string; time: string; day: string; href: string; after?: string};
export type KnockPrefs = ZigiPrefs['knock'];
const KEEP_DAYS = 14;
/** Whether a clock time ("HH:MM") falls in the quiet window; a window may cross midnight; an empty one never does. */
export function inQuietHours(clock: string, from: string, to: string): boolean {
  if (from === to) return false;
  return from < to ? clock >= from && clock < to : clock >= from || clock < to;
}
/** The reminder to knock for now, or null. `blocked`: reminders whose own card the page shows. */
export function knockFor({candidates, prefs, state, now, day, blocked = new Set()}: {candidates: readonly KnockCandidate[]; prefs: KnockPrefs; state: ZigiKnock; now: Date; day: string; blocked?: ReadonlySet<string>}): KnockCandidate | null {
  if (!prefs.enabled || inQuietHours(localClock(now), prefs.quietFrom, prefs.quietTo)) return null;
  if ((state.counts?.[day] ?? 0) >= prefs.maxPerDay) return null;
  const shown = new Set(state.shown?.[day] ?? []);
  for (const candidate of candidates) {
    if (blocked.has(candidate.id)) continue;
    const until = state.snoozed?.[candidate.id];
    if (until) { if (Date.parse(until) > now.getTime()) continue; return candidate; }
    if (!shown.has(candidate.id)) return candidate;
  }
  return null;
}
const recent = <T>(record: Readonly<Record<string, T>> | undefined, day: string, value: T): Record<string, T> =>
  Object.fromEntries([[day, value], ...Object.entries(record ?? {}).filter(([d]) => d !== day).sort(([a], [b]) => b.localeCompare(a)).slice(0, KEEP_DAYS - 1)]);
const liveSnoozes = (state: ZigiKnock, now: Date, without?: string) => Object.fromEntries(Object.entries(state.snoozed ?? {}).filter(([id, until]) => id !== without && Date.parse(until) > now.getTime()));
/** A knock showed: one more for today, this reminder counted as shown, its snooze (if any) used up. */
export function recordKnock(state: ZigiKnock, id: string, day: string, now: Date): ZigiKnock {
  return {...state, counts: recent(state.counts, day, (state.counts?.[day] ?? 0) + 1), shown: recent(state.shown, day, [...new Set([...(state.shown?.[day] ?? []), id])].slice(-50)), snoozed: liveSnoozes(state, now, id)};
}
export type SnoozeChoice = '15m' | '1h' | 'tonight';
export const SNOOZE_LABELS: Record<SnoozeChoice, string> = {'15m': '15 minutes', '1h': '1 hour', tonight: 'Tonight'};
/** When a snooze ends; "Tonight" is 20:00 today, offered only before 19:30 and outside the quiet hours. */
export function snoozeUntil(choice: SnoozeChoice, now: Date, prefs: Pick<KnockPrefs, 'quietFrom' | 'quietTo'>): Date | null {
  if (choice === '15m') return new Date(now.getTime() + 15 * 60_000);
  if (choice === '1h') return new Date(now.getTime() + 60 * 60_000);
  if (localClock(now) >= '19:30' || inQuietHours('20:00', prefs.quietFrom, prefs.quietTo)) return null;
  const tonight = new Date(now); tonight.setHours(20, 0, 0, 0);
  return tonight;
}
export function snooze(state: ZigiKnock, id: string, until: Date, now: Date): ZigiKnock {
  return {...state, snoozed: {...liveSnoozes(state, now), [id]: until.toISOString()}};
}
/** What ZIGi says when it knocks: the reminder's name and its time, nothing about what was missed. */
export function knockLines(candidate: KnockCandidate): {title: string; line: string; action: string} {
  switch (candidate.kind) {
    case 'habit': return {title: candidate.title, line: `On your list for today · ${candidate.time}`, action: 'Check in'};
    case 'water': return {title: 'Water', line: `A glass of water? · ${candidate.time}`, action: 'Open water journal'};
    case 'goal': return {title: `Weekly check-in: ${candidate.title}`, line: `Your weekly look at this goal · ${candidate.time}`, action: 'Open goal'};
    case 'wealth': return {title: 'A look at Wealth', line: `Your weekly look · ${candidate.time}`, action: 'Open Wealth'};
    case 'pack': return {title: 'A new context pack', line: `Your weekly refresh for your AI · ${candidate.time}`, action: 'Make the pack'};
    // Session W Part 4: the wind-down time set on this device (quiet hours apply as for every knock).
    case 'wind-down': return {title: 'Wind-down time', line: `Your wind-down time · ${candidate.time}`, action: 'Open Sleep'};
    // Session W Part 5: the meditation time set on this device, until a session is logged that day.
    case 'meditation-time': return {title: 'Time to meditate', line: `Your meditation time · ${candidate.time}`, action: 'Open Meditation'};
    // Session W Part 10: a stack's chained reminder, once the habit before it is done today.
    case 'stack-next': return {title: `Next in your stack: ${candidate.title}`, line: candidate.after ? `After ${candidate.after}, done today` : 'Next in your stack', action: 'Open Habits'};
    // Session W Part 12: a contribution plan's reminder on a day an amount is due; "Fund now" opens the filled-in form.
    case 'contribution-due': return {title: `A contribution is due: ${candidate.title}`, line: `Your plan's amount for today · ${candidate.time}`, action: 'Fund now'};
  }
}
