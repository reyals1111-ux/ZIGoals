import type {Habit} from '../habits';
import {latestHabitRule} from '../habits';

/**
 * Session AV lane 2 (habits; LEDGER #55, Finch's Seasonal events, without a pet): each month has a calm theme tied to a
 * life area. The month's challenge: 15 days with a check-in on a habit in that area (any habit counts while none is in
 * it). Reaching it earns the "Theme month" badge (lib/game/badges.ts) and lists the month on Journey. Part of the game
 * layer, and it can be hidden on its own (the game record's `monthTheme: false`). Derived from the records; pure.
 */
export type MonthTheme = {month: number; id: string; area: string; symbol: string; en: string; nl: string; lineEn: string; lineNl: string};
export const MONTH_THEMES: readonly MonthTheme[] = [
  {month: 1, id: 'fresh-page', area: 'learning', symbol: '✎', en: 'A fresh page', nl: 'Een nieuwe bladzijde', lineEn: 'Learn one small thing, often.', lineNl: 'Leer vaak één klein ding.'},
  {month: 2, id: 'kindness', area: 'relationships', symbol: '♡', en: 'Kindness', nl: 'Vriendelijkheid', lineEn: 'Make room for the people near you.', lineNl: 'Maak ruimte voor de mensen om je heen.'},
  {month: 3, id: 'move-more', area: 'health', symbol: '☀', en: 'Move more', nl: 'Meer bewegen', lineEn: 'A little movement, most days.', lineNl: 'Een beetje beweging, de meeste dagen.'},
  {month: 4, id: 'play', area: 'fun', symbol: '✿', en: 'Play', nl: 'Spelen', lineEn: 'Something you do just because you like it.', lineNl: 'Iets wat je doet omdat je het leuk vindt.'},
  {month: 5, id: 'rest-well', area: 'mind', symbol: '☾', en: 'Rest well', nl: 'Goed rusten', lineEn: 'Calm habits: quiet, sleep, breathing.', lineNl: 'Rustige gewoontes: stilte, slaap, ademhaling.'},
  {month: 6, id: 'water-sun', area: 'health', symbol: '◉', en: 'Water and sun', nl: 'Water en zon', lineEn: 'Drink, step outside, feel the day.', lineNl: 'Drink, ga naar buiten, voel de dag.'},
  {month: 7, id: 'slow-summer', area: 'fun', symbol: '◌', en: 'A slow summer', nl: 'Een trage zomer', lineEn: 'Keep one good thing going while things are slow.', lineNl: 'Houd één goed ding gaande terwijl het rustig is.'},
  {month: 8, id: 'read', area: 'learning', symbol: '❡', en: 'Read', nl: 'Lezen', lineEn: 'A few pages a day.', lineNl: 'Een paar bladzijden per dag.'},
  {month: 9, id: 'routines', area: 'career', symbol: '◇', en: 'Back to routines', nl: 'Terug naar ritme', lineEn: 'The small things that hold a working week.', lineNl: 'De kleine dingen die een werkweek dragen.'},
  {month: 10, id: 'steady-money', area: 'wealth', symbol: '◆', en: 'Steady money', nl: 'Rustig met geld', lineEn: 'Small, regular steps for your money.', lineNl: 'Kleine, vaste stappen voor je geld.'},
  {month: 11, id: 'gratitude', area: 'mind', symbol: '✦', en: 'Gratitude', nl: 'Dankbaarheid', lineEn: 'Notice what went well.', lineNl: 'Zie wat goed ging.'},
  {month: 12, id: 'look-back', area: 'relationships', symbol: '❄', en: 'Look back, together', nl: 'Samen terugkijken', lineEn: 'Time with others, and a look at your year.', lineNl: 'Tijd met anderen, en een blik op je jaar.'},
];
export const THEME_DAYS = 15;
export const themeOf = (day: string): MonthTheme => MONTH_THEMES[Number(day.slice(5, 7)) - 1]!;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** The habits the month's theme counts: those in its area, or every habit while none is in it. */
export function themeHabits(habits: readonly Habit[], extras: unknown, theme: MonthTheme): {habits: Habit[]; inArea: boolean} {
  const areas = isObj(extras) && isObj(extras.areas) ? extras.areas : {};
  const own = habits.filter(h => areas[h.id] === theme.area);
  return own.length ? {habits: own, inArea: true} : {habits: [...habits], inArea: false};
}
/** A month's progress ("2026-11"): the days with a check-in on a theme habit, up to `today`. */
export function themeProgress(habits: readonly Habit[], extras: unknown, month: string, today: string): {theme: MonthTheme; days: number; target: number; reached: boolean; inArea: boolean} {
  const theme = themeOf(`${month}-01`), pick = themeHabits(habits, extras, theme);
  const days = new Set(pick.habits.flatMap(h => h.entries.filter(e => e.date.startsWith(month) && e.date <= today && e.disposition === 'logged' && e.count > 0 && latestHabitRule(h).type === 'build').map(e => e.date))).size;
  return {theme, days, target: THEME_DAYS, reached: days >= THEME_DAYS, inArea: pick.inArea};
}
/** Every month (oldest first) whose theme was reached, from the first check-in to `today`. */
export function themeMonthsReached(habits: readonly Habit[], extras: unknown, today: string): string[] {
  const months = new Set(habits.flatMap(h => h.entries.filter(e => e.date <= today && e.disposition === 'logged' && e.count > 0).map(e => e.date.slice(0, 7))));
  return [...months].sort().filter(m => themeProgress(habits, extras, m, today).reached);
}
