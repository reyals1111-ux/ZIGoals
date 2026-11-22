import {addLocalDays, localDate} from '../local-date';
import {MAX_LOOKED, moneyMoreSchema, type MoneyMore} from '../money-more/schema';
import type {MoneyEntry} from './schema';

/**
 * Session AV lane 2, round 6 (money; EveryDollar's streaks, LEDGER #427): "Days in a row you looked at your money", off by
 * default and shown on Spending only. A day counts when an entry was logged that day (its own time: by hand, from ZIGi, a
 * quick line or a bank file read), or the person said "I looked at my money today". As the habits' two-day rule allows
 * (lib/habit-two-day.ts), one day off does not end the run; two in a row do. Today still open never counts against it.
 * Never a money figure and never a lost-streak warning. Derived; the only stored parts are the switch and the said days.
 */
export const STREAK_DAYS_BACK = 730;
/** The local days with a look at the money: entries logged (by their time) and the days the person said so. */
export function lookedDays(entries: readonly Pick<MoneyEntry, 'createdAt'>[], said: readonly string[] = [], dayOf: (iso: string) => string = iso => localDate(new Date(iso))): Set<string> {
  const out = new Set(said);
  for (const e of entries) { try { out.add(dayOf(e.createdAt)); } catch { /* an unreadable time is left out */ } }
  return out;
}
export type MoneyStreak = {days: number; today: boolean; dayOff: boolean};
/**
 * The run up to today: the days looked at in it (`days`), whether today is one (`today`), and whether the run is keeping a
 * day off right now (yesterday missed, so today keeps it going — said kindly, never as a warning).
 */
export function moneyStreak(days: ReadonlySet<string>, today: string): MoneyStreak {
  let count = 0, missed = 0;
  for (let i = 0, d = today; i < STREAK_DAYS_BACK; i++, d = addLocalDays(d, -1)) {
    if (days.has(d)) { count++; missed = 0; continue; }
    if (d === today) continue;
    if (missed) break;
    missed = 1;
  }
  const today_ = days.has(today);
  return {days: count, today: today_, dayOff: !today_ && count > 0 && !days.has(addLocalDays(today, -1))};
}
/** The line on Spending, in plain words; never a money figure. */
export function streakWords(s: MoneyStreak, lang: 'en' | 'nl' = 'en'): string {
  if (!s.days) return lang === 'nl' ? 'Elke dag dat je naar je geld kijkt telt hier.' : 'Each day you look at your money counts here.';
  const n = lang === 'nl' ? `${s.days} ${s.days === 1 ? 'dag' : 'dagen'} op rij naar je geld gekeken` : `Days in a row you looked at your money: ${s.days}`;
  if (s.today) return lang === 'nl' ? `${n}, vandaag ook.` : `${n}, today too.`;
  return lang === 'nl' ? `${n}. Een dag overslaan mag.` : `${n}. A day off is fine.`;
}
/** Turns the streak on or off (off keeps the said days, so turning it on again finds them). */
export function setStreakOn(more: MoneyMore, on: boolean): MoneyMore {
  const {on: _o, ...rest} = more.streak ?? {}; void _o;
  return moneyMoreSchema.parse({...more, streak: {...rest, ...(on ? {on: true} : {})}});
}
/** "I looked at my money today": today is kept once (the last 400 days). */
export function sayLooked(more: MoneyMore, today: string): MoneyMore {
  const looked = [...new Set([...(more.streak?.looked ?? []), today])].sort().slice(-MAX_LOOKED);
  return moneyMoreSchema.parse({...more, streak: {...more.streak, looked}});
}
