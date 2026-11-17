import {habitDay, habitRuleOn, habitStats, latestHabitRule, measurementUnit, type Habit} from '../../../habits';
import {localWeekday} from '../../../local-date';
import {formatNumber} from '../../../visual-format';
import {text as clean} from '../../tools/format';
import {dayWords, periodSpan, periodWords, previousPeriod, resolvePeriod, weekdayName, type Period} from './period';
import {dayList, rate, tally, type DayPoint, type DayState, type Tally} from './series';
import {listWords, t} from './text';
import {periodFor, streakText, trackAnswer, type Track} from './track';
import type {Ask, Exact, ExactWidget, Lang, Query} from './types';

/**
 * Session AS (ADR-042, Part 1; the owner's two questions): habits, exactly. One habit is a track (track.ts): its days are
 * the Habits page's own outcomes (lib/habits.ts `habitDay`; nothing is counted a second way). Every habit together is
 * answered here: which were missed and how often (ranked, skipped said apart), which days, what is open or done today,
 * the week or month in figures, the runs, the weekday that goes wrong most, this period beside the one before.
 */
const STATE: Record<string, DayState> = {complete: 'done', partial: 'part', failed: 'missed', skipped: 'skipped', 'planned-skip': 'skipped', due: 'open'};
/** A habit's days as points: today's partly done day is still open (the day is not over). */
export function habitPoints(habit: Habit, days: readonly string[], today: string): DayPoint[] {
  return days.map(date => {
    const d = habitDay(habit, date, today), state = d.status === 'partial' && date === today ? 'open' : STATE[d.status] ?? 'rest';
    return {date, state, value: state === 'rest' ? null : d.count};
  });
}
/** A habit's name in a sentence: the person's own words as data (escaped and bounded, lib/ai/tools/format.ts), without the Showcase's label. */
export const habitName = (habit: Pick<Habit, 'title'>): string => clean(habit.title.replace(/\s*\(Showcase[^)]*\)\s*$/i, '').trim() || habit.title, 60);
const number = (value: number) => formatNumber(Math.round(value * 100) / 100);
export function habitWidgets(ask: Ask, period: Period, ref?: string): ExactWidget[] {
  const p = period.token, one = ref ? {ref} : {};
  if (ask === 'streak') return [{id: 'streak-flames', ...one, fallback: 'habits-hud'}];
  if (ask === 'compare' || ask === 'trend') return [{id: 'compare-periods', ...one, period: p, fallback: 'habit-week'}];
  if (!ref) return ask === 'missed' || ask === 'not-done' || ask === 'skipped' || ask === 'best' || ask === 'worst' ? [{id: 'habit-misses', period: p, fallback: 'habit-week'}, {id: 'habits-month', period: p, fallback: 'perfect-days'}] : [{id: 'habit-week'}];
  if (ask === 'missed' || ask === 'not-done' || ask === 'skipped') return [{id: 'habit-missed-days', ref, period: p, fallback: 'habit-week'}];
  return period.days.length <= 1 ? [{id: 'habit-week'}] : [{id: 'habit-done-days', ref, period: p, fallback: 'habit-week'}];
}
export function habitTrack(habit: Habit, today: string): Track {
  const rule = habitRuleOn(habit, today) ?? latestHabitRule(habit), unit = measurementUnit(rule), stats = habitStats(habit, today);
  const measured = rule.type === 'build' && rule.measurement.kind !== 'boolean' && !!unit && !(rule.target === 1 && /^times?$/i.test(unit));
  return {
    key: `habit:${habit.id}`, domain: 'habits', name: habitName(habit), subject: {kind: 'habit', id: habit.id, name: habit.title}, kind: 'habit',
    points: days => habitPoints(habit, days, today),
    measure: measured ? {text: v => `${number(v)} ${unit}`, kind: 'sum', target: rule.target} : null,
    did: ['done', 'gedaan'], not: ['not done', 'niet gedaan'],
    streak: {current: stats.currentStreak, best: stats.bestStreak, unit: stats.streakUnit},
    source: ['Your habits', 'Je gewoontes'],
    widgets: (ask, period) => habitWidgets(ask, period, habit.id),
  };
}

type Row = {id: string; name: string; T: Tally; notDone: number};
const dayCount = (n: number, lang: Lang) => `${n} ${lang === 'nl' ? (n === 1 ? 'dag' : 'dagen') : (n === 1 ? 'day' : 'days')}`;
/** Every habit that was due on some day of the period, with its days counted. */
export function habitRows(habits: readonly Habit[], period: Period, today: string): Row[] {
  return habits.map(h => { const T = tally(habitPoints(h, period.days, today)); return {id: h.id, name: habitName(h), T, notDone: T.missed + T.skipped + T.dates.part.filter(d => d !== today).length}; }).filter(r => r.T.due > 0);
}
/** The habits of the question: all of them, said as one. */
export function habitsAnswer(q: Query, habits: readonly Habit[], today: string): Exact | null {
  const lang = q.lang, source = t(lang, 'Your habits', 'Je gewoontes');
  const out = (text: string, facts: Record<string, unknown>, widgets: ExactWidget[], p?: Period): Exact => ({kind: 'answer', text, facts: {about: 'habits', ask: q.ask, ...(p ? {period: {token: p.token, from: p.from, to: p.to}} : {}), ...facts}, widgets, query: q, source});
  if (!habits.length) return out(t(lang, 'You have no habits yet.', 'Je hebt nog geen gewoontes.'), {habits: 0}, [{id: 'habit-week'}]);
  if (q.subject) {
    const habit = habits.find(h => h.id === q.subject!.id);
    return habit ? trackAnswer(q, habitTrack(habit, today), today) : null;
  }
  const live = habits.filter(h => latestHabitRule(h).state !== 'archived');
  if (q.ask === 'streak') {
    const runs = live.map(h => ({name: habitName(h), s: habitStats(h, today)})).filter(r => r.s.currentStreak > 0).sort((a, b) => Number(b.s.streakUnit === 'days') - Number(a.s.streakUnit === 'days') || b.s.currentStreak - a.s.currentStreak || a.name.localeCompare(b.name));
    const best = live.map(h => ({name: habitName(h), s: habitStats(h, today)})).sort((a, b) => b.s.bestStreak - a.s.bestStreak)[0];
    const facts = {streaks: runs.map(r => ({habit: r.name, current: r.s.currentStreak, best: r.s.bestStreak, unit: r.s.streakUnit}))};
    if (!runs.length) return out(t(lang, `No streak is running right now${best?.s.bestStreak ? `; your longest was ${best.name}, ${streakText(best.s.bestStreak, best.s.streakUnit, 'en')}` : ''}.`, `Er loopt nu geen reeks${best?.s.bestStreak ? `; je langste was ${best.name}, ${streakText(best.s.bestStreak, best.s.streakUnit, 'nl')}` : ''}.`), facts, habitWidgets('streak', resolvePeriod('today', today)!));
    const top = runs.slice(0, 4).map(r => `${r.name} ${streakText(r.s.currentStreak, r.s.streakUnit, lang)}`);
    return out(t(lang, `Your streaks now: ${listWords(top, 'en')}${runs.length > 4 ? `, and ${runs.length - 4} more` : ''}. Longest ever: ${best!.name}, ${streakText(best!.s.bestStreak, best!.s.streakUnit, 'en')}.`, `Je reeksen nu: ${listWords(top, 'nl')}${runs.length > 4 ? ` en nog ${runs.length - 4}` : ''}. Langste ooit: ${best!.name}, ${streakText(best!.s.bestStreak, best!.s.streakUnit, 'nl')}.`), facts, habitWidgets('streak', resolvePeriod('today', today)!));
  }
  const most = /\b(?:most|often|usually|vaakst|meest|meestal|vaak)\b/.test(q.read) && (q.ask === 'missed' || q.ask === 'not-done' || q.ask === 'skipped');
  const fallback = most ? 'last-30-days' : q.ask === 'open' || (q.ask === 'done' && q.shape !== 'count' && !q.period) ? 'today' : q.ask === 'status' || q.ask === 'missed' || q.ask === 'not-done' || q.ask === 'skipped' || q.ask === 'done' ? 'this-week' : 'this-month';
  const p = periodFor({...q, shape: q.shape === 'yes-no' && (q.ask === 'missed' || q.ask === 'not-done' || q.ask === 'skipped') ? 'list' : q.shape}, today, fallback), rows = habitRows(habits, p, today);
  const span = periodSpan(p, lang, today), day = (d: string) => dayWords(d, today), widgets = habitWidgets(q.ask, p);
  if (!rows.length) return out(t(lang, `No habit was due ${span}.`, `Er stond geen gewoonte gepland ${span}.`), {due: 0}, widgets, p);
  const sum = (pick: (T: Tally) => number) => rows.reduce((n, r) => n + pick(r.T), 0);
  const openRows = rows.filter(r => r.T.open > 0), openNote = openRows.length ? t(lang, ` Still open today: ${listWords(openRows.map(r => r.name), 'en')}.`, ` Vandaag nog open: ${listWords(openRows.map(r => r.name), 'nl')}.`) : '';
  const totals = {due: sum(T => T.due), done: sum(T => T.done), missed: sum(T => T.missed), skipped: sum(T => T.skipped), open: sum(T => T.open)};
  const perHabit = rows.map(r => ({habit: r.name, id: r.id, due: r.T.due, done: r.T.done, missed: r.T.missed, skipped: r.T.skipped, open: r.T.open, missedDays: r.T.dates.missed, skippedDays: r.T.dates.skipped}));

  // One weekday asked, or "which weekday": the not-done days by weekday.
  if (/\b(?:weekday|weekdays|day of the week|weekdag|weekdagen|dag van de week)\b/.test(q.read)) {
    const wide = q.period ? p : resolvePeriod('last-90-days', today)!, by = Array.from({length: 7}, () => 0);
    for (const h of habits) for (const point of habitPoints(h, wide.days, today)) if (point.state === 'missed' || point.state === 'skipped') by[localWeekday(point.date)]!++;
    const worst = by.indexOf(Math.max(...by)), all = by.reduce((a, b) => a + b, 0);
    return out(all ? t(lang, `Most habit days not done fall on ${weekdayName(worst, 'en', true)}: ${by[worst]} of ${all} ${periodWords(wide, 'en', today)}.`, `De meeste niet gedane gewoontedagen vallen op ${weekdayName(worst, 'nl')}: ${by[worst]} van ${all} ${periodWords(wide, 'nl', today)}.`)
      : t(lang, `No habit day was missed or skipped ${periodWords(wide, 'en', today)}.`, `Geen gewoontedag gemist of overgeslagen ${periodWords(wide, 'nl', today)}.`), {byWeekday: by, weekday: all ? worst : null}, [{id: 'habit-weekdays', period: wide.token, fallback: 'habit-week'}], wide);
  }
  if (q.ask === 'missed' || q.ask === 'not-done' || q.ask === 'skipped') {
    const pick = (r: Row) => q.ask === 'missed' ? r.T.missed : q.ask === 'skipped' ? r.T.skipped : r.notDone;
    const hit = rows.filter(r => pick(r) > 0).sort((a, b) => pick(b) - pick(a) || a.name.localeCompare(b.name));
    const facts = {count: hit.length, habits: hit.map(r => ({habit: r.name, id: r.id, days: pick(r), missed: r.T.missed, skipped: r.T.skipped, missedDays: r.T.dates.missed, skippedDays: r.T.dates.skipped})), totals, perHabit};
    // "Which days did I miss a habit": the days, each with what was not done.
    if (q.shape === 'dates') {
      const byDay = new Map<string, string[]>();
      for (const r of rows) for (const d of q.ask === 'missed' ? r.T.dates.missed : q.ask === 'skipped' ? r.T.dates.skipped : [...r.T.dates.missed, ...r.T.dates.skipped]) byDay.set(d, [...(byDay.get(d) ?? []), r.name]);
      const dates = [...byDay.keys()].sort(), word = q.ask === 'missed' ? t(lang, 'missed', 'gemist') : q.ask === 'skipped' ? t(lang, 'skipped', 'overgeslagen') : t(lang, 'not done', 'niet gedaan');
      return out(dates.length ? t(lang, `A habit was ${word} on ${dayCount(dates.length, 'en')} ${span}: ${dayList(dates, d => `${day(d)} (${byDay.get(d)!.join(', ')})`, 'en', 10)}.`, `Op ${dayCount(dates.length, 'nl')} ${span} was een gewoonte ${word}: ${dayList(dates, d => `${day(d)} (${byDay.get(d)!.join(', ')})`, 'nl', 10)}.`) + openNote
        : t(lang, `No habit was ${word} ${span}.`, `Geen gewoonte ${word} ${span}.`) + openNote, {...facts, days: dates}, widgets, p);
    }
    const each = (r: Row) => {
      const n = pick(r), mix = q.ask === 'not-done' && r.T.missed && r.T.skipped ? t(lang, `, ${r.T.missed} missed and ${r.T.skipped} skipped`, `, ${r.T.missed} gemist en ${r.T.skipped} overgeslagen`) : q.ask === 'not-done' && r.T.skipped && !r.T.missed ? t(lang, ', skipped', ', overgeslagen') : '';
      return p.days.length === 1 ? r.name : `${r.name} (${dayCount(n, lang)}${mix})`;
    };
    const list = hit.slice(0, 8).map(each), more = hit.length > 8 ? t(lang, `, and ${hit.length - 8} more`, ` en nog ${hit.length - 8}`) : '';
    const others = rows.length - hit.length;
    let text: string;
    if (q.ask === 'missed') {
      text = hit.length ? t(lang, `You missed ${hit.length} of ${rows.length} habits ${span}: ${listWords(list, 'en')}${more}.`, `Je hebt ${hit.length} van je ${rows.length} gewoontes gemist ${span}: ${listWords(list, 'nl')}${more}.`)
        : t(lang, `You missed no habit ${span}: ${totals.done} of ${totals.due - totals.open - totals.skipped} due check-ins done.`, `Je hebt geen gewoonte gemist ${span}: ${totals.done} van ${totals.due - totals.open - totals.skipped} geplande check-ins gedaan.`);
      const skipped = rows.filter(r => r.T.skipped > 0);
      const skip = (r: Row, l: Lang) => p.days.length === 1 ? r.name : `${r.name} (${dayCount(r.T.skipped, l)})`;
      if (skipped.length) text += t(lang, ` Skipped (not counted as missed): ${listWords(skipped.map(r => skip(r, 'en')), 'en')}.`, ` Overgeslagen (telt niet als gemist): ${listWords(skipped.map(r => skip(r, 'nl')), 'nl')}.`);
    } else if (q.ask === 'skipped') text = hit.length ? t(lang, `You skipped ${hit.length} of ${rows.length} habits ${span}: ${listWords(list, 'en')}${more}.`, `Je hebt ${hit.length} van je ${rows.length} gewoontes overgeslagen ${span}: ${listWords(list, 'nl')}${more}.`) : t(lang, `You skipped no habit ${span}.`, `Je hebt geen gewoonte overgeslagen ${span}.`);
    else text = hit.length ? t(lang, `${hit.length} of ${rows.length} habits were not done on some day ${span}: ${listWords(list, 'en')}${more}.${others ? ` The other ${others} ${others === 1 ? 'was' : 'were'} done every due day.` : ''}`, `${hit.length} van je ${rows.length} gewoontes zijn op een dag niet gedaan ${span}: ${listWords(list, 'nl')}${more}.${others ? ` De andere ${others} ${others === 1 ? 'is' : 'zijn'} elke geplande dag gedaan.` : ''}`)
      : t(lang, `Every habit was done on every due day ${span} (${totals.done} of ${totals.due - totals.open}).`, `Elke gewoonte is op elke geplande dag gedaan ${span} (${totals.done} van ${totals.due - totals.open}).`);
    return out(text + openNote, facts, widgets, p);
  }
  if (q.ask === 'best' || q.ask === 'worst') {
    const ranked = rows.map(r => ({r, pct: rate(r.T)})).filter(x => x.pct !== null).sort((a, b) => q.ask === 'best' ? b.pct! - a.pct! || b.r.T.done - a.r.T.done : a.pct! - b.pct! || b.r.notDone - a.r.notDone);
    const top = ranked[0];
    if (!top) return out(t(lang, `No habit day is decided yet ${span}.`, `Er is nog geen gewoontedag beslist ${span}.`), {totals}, widgets, p);
    const same = ranked.filter(x => x.pct === top.pct && (q.ask === 'worst' ? x.r.notDone === top.r.notDone : true));
    const names = listWords(same.slice(0, 4).map(x => x.r.name), lang), facts = {habit: top.r.name, id: top.r.id, rate: top.pct, done: top.r.T.done, missed: top.r.T.missed, skipped: top.r.T.skipped, tied: same.map(x => x.r.name), perHabit};
    return out(q.ask === 'best' ? t(lang, `Most consistent ${span}: ${names} (${top.r.T.done} of ${top.r.T.done + top.r.T.missed + top.r.T.part} days done, ${top.pct}%).`, `Het meest volgehouden ${span}: ${names} (${top.r.T.done} van ${top.r.T.done + top.r.T.missed + top.r.T.part} dagen gedaan, ${top.pct}%).`)
      : top.pct === 100 ? t(lang, `No habit fell behind ${span}: each was done on every decided day.`, `Geen gewoonte bleef achter ${span}: elke is op elke besliste dag gedaan.`)
        : t(lang, `Least consistent ${span}: ${names} (${top.r.T.done} of ${top.r.T.done + top.r.T.missed + top.r.T.part} days done, ${top.pct}%; ${top.r.T.missed} missed, ${top.r.T.skipped} skipped).`, `Het minst volgehouden ${span}: ${names} (${top.r.T.done} van ${top.r.T.done + top.r.T.missed + top.r.T.part} dagen gedaan, ${top.pct}%; ${top.r.T.missed} gemist, ${top.r.T.skipped} overgeslagen).`), facts, widgets, p);
  }
  if (q.ask === 'compare' || q.ask === 'trend') {
    const other = q.versus ? resolvePeriod(q.versus, today) : previousPeriod(p, today);
    if (!other) return null;
    const before = habitRows(habits, other, today), b = {done: before.reduce((n, r) => n + r.T.done, 0), due: before.reduce((n, r) => n + r.T.due - r.T.open - r.T.skipped, 0)}, a = {done: totals.done, due: totals.due - totals.open - totals.skipped};
    const pa = a.due ? Math.round(a.done / a.due * 100) : null, pb = b.due ? Math.round(b.done / b.due * 100) : null;
    const wb = q.versus ? periodWords(other, lang, today) : `${t(lang, 'the period before', 'de periode ervoor')} (${day(other.from)}${other.from === other.to ? '' : ` ${t(lang, 'to', 't/m')} ${day(other.to)}`})`;
    return out(t(lang, `Habits ${periodWords(p, 'en', today)}: ${a.done} of ${a.due} due check-ins done${pa === null ? '' : ` (${pa}%)`}; ${wb}: ${b.done} of ${b.due}${pb === null ? '' : ` (${pb}%)`}.`, `Gewoontes ${periodWords(p, 'nl', today)}: ${a.done} van ${a.due} geplande check-ins gedaan${pa === null ? '' : ` (${pa}%)`}; ${wb}: ${b.done} van ${b.due}${pb === null ? '' : ` (${pb}%)`}.`),
      {compare: {now: {from: p.from, to: p.to, ...a, rate: pa}, before: {from: other.from, to: other.to, ...b, rate: pb}}}, widgets, p);
  }
  // Perfect days: the days on which every habit that was due was done.
  if (/\bperfect\b|\bperfecte\b/.test(q.read)) {
    const perfect = p.days.filter(d => d !== today || !openRows.length).filter(d => { const states = habits.map(h => habitPoints(h, [d], today)[0]!.state).filter(s => s !== 'rest' && s !== 'skipped'); return states.length > 0 && states.every(s => s === 'done'); });
    return out(t(lang, `${dayCount(perfect.length, 'en')} ${span} had every due habit done${perfect.length && perfect.length <= 10 ? `: ${dayList(perfect, day, 'en')}` : ''}.`, `Op ${dayCount(perfect.length, 'nl')} ${span} is elke geplande gewoonte gedaan${perfect.length && perfect.length <= 10 ? `: ${dayList(perfect, day, 'nl')}` : ''}.`) + openNote, {count: perfect.length, days: perfect}, [{id: 'perfect-days'}], p);
  }
  // Today, or one day: what is done and what is open.
  if (p.days.length === 1) {
    const doneRows = rows.filter(r => r.T.done > 0), missedRows = rows.filter(r => r.T.missed > 0), skippedRows = rows.filter(r => r.T.skipped > 0), dueCount = rows.length - skippedRows.length;
    const facts = {day: p.from, due: dueCount, done: doneRows.map(r => r.name), open: openRows.map(r => r.name), missed: missedRows.map(r => r.name), skipped: skippedRows.map(r => r.name)}, w = periodWords(p, lang, today);
    if (q.ask === 'open') return out(openRows.length ? t(lang, `${openRows.length} of ${dueCount} habits ${openRows.length === 1 ? 'is' : 'are'} still open today: ${listWords(openRows.map(r => r.name), 'en')}.`, `${openRows.length} van je ${dueCount} gewoontes ${openRows.length === 1 ? 'staat' : 'staan'} vandaag nog open: ${listWords(openRows.map(r => r.name), 'nl')}.`)
      : p.today ? t(lang, `Nothing is open: all ${dueCount} habits due today are done.`, `Er staat niets meer open: alle ${dueCount} gewoontes van vandaag zijn gedaan.`) : t(lang, `That day is closed: ${doneRows.length} of ${dueCount} habits were done.`, `Die dag is voorbij: ${doneRows.length} van ${dueCount} gewoontes gedaan.`), facts, widgets, p);
    const rest = [missedRows.length ? t(lang, `missed: ${listWords(missedRows.map(r => r.name), 'en')}`, `gemist: ${listWords(missedRows.map(r => r.name), 'nl')}`) : '', skippedRows.length ? t(lang, `skipped: ${listWords(skippedRows.map(r => r.name), 'en')}`, `overgeslagen: ${listWords(skippedRows.map(r => r.name), 'nl')}`) : '', openRows.length ? t(lang, `still open: ${listWords(openRows.map(r => r.name), 'en')}`, `nog open: ${listWords(openRows.map(r => r.name), 'nl')}`) : ''].filter(Boolean);
    return out(t(lang, `${doneRows.length} of ${dueCount} habits done ${w} (${day(p.from)})${doneRows.length && q.shape === 'list' ? `: ${listWords(doneRows.map(r => r.name), 'en')}` : ''}${rest.length ? `; ${rest.join('; ')}` : ''}.`, `${doneRows.length} van ${dueCount} gewoontes gedaan ${w} (${day(p.from)})${doneRows.length && q.shape === 'list' ? `: ${listWords(doneRows.map(r => r.name), 'nl')}` : ''}${rest.length ? `; ${rest.join('; ')}` : ''}.`), facts, widgets, p);
  }
  // A period in figures.
  const decided = totals.due - totals.open - totals.skipped, pct = decided ? Math.round(totals.done / decided * 100) : null;
  return out(t(lang, `Habits ${span}: ${totals.done} of ${decided} due check-ins done${pct === null ? '' : ` (${pct}%)`}; ${totals.missed} missed, ${totals.skipped} skipped.`, `Gewoontes ${span}: ${totals.done} van ${decided} geplande check-ins gedaan${pct === null ? '' : ` (${pct}%)`}; ${totals.missed} gemist, ${totals.skipped} overgeslagen.`) + openNote, {totals, rate: pct, perHabit}, q.ask === 'done' || q.ask === 'status' ? [{id: 'habit-week'}, {id: 'habit-misses', period: p.token, fallback: 'habits-hud'}] : widgets, p);
}
