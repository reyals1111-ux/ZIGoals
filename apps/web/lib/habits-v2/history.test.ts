import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue} from '../habits';
import {habitStrength} from './strength';
import {strengthByWeek, totalsBy, weekdayByMonth, HISTORY_WEEKS} from './history';
import {addLocalDays} from '../local-date';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';

/** Session AV lane 2 (habits; LEDGER #187, #190 — Loop's score chart, history and frequency charts). */
const ID = 'aaaaaaaa-0000-4000-8000-000000000031', TODAY = '2026-11-25';
function walk(doneEvery: number) {
  let d = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', timeOfDay: 'anytime', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, new Date('2026-06-01T09:00:00Z'), ID);
  for (let day = '2026-06-01', i = 0; day <= TODAY; day = addLocalDays(day, 1), i++) if (i % doneEvery === 0) d = logHabitValue(d, ID, day, 1, {}, new Date(`${TODAY}T09:00:00Z`));
  return d.habits[0]!;
}
describe('a habit’s longer history', () => {
  it('the strength at the end of each week, the last week ending today, none before the habit began', () => {
    const h = walk(2), weeks = strengthByWeek(h, TODAY);
    expect(weeks).toHaveLength(HISTORY_WEEKS);
    expect(weeks.at(-1)).toEqual({weekEnd: TODAY, score: habitStrength(h, TODAY)!.score});
    expect(weeks[0]!.score).toBeNull(); // a year ago the habit had not begun
    expect(weeks.filter(w => w.score !== null).every(w => w.score! >= 0 && w.score! <= 100)).toBe(true);
    expect(weeks.find(w => w.weekEnd === '2026-11-22')!.score).toBe(habitStrength(h, '2026-11-22')!.score); // a Sunday
  });
  it('days done of days scheduled by month, quarter and year, newest first; today open is not counted', () => {
    const h = walk(1);
    const months = totalsBy(h, TODAY, 'month');
    expect(months[0]).toEqual({period: '2026-11', done: 25, scheduled: 25});
    expect(months.at(-1)).toEqual({period: '2026-06', done: 30, scheduled: 30});
    expect(totalsBy(h, TODAY, 'quarter').map(q => q.period)).toEqual(['2026-Q4', '2026-Q3', '2026-Q2']);
    expect(totalsBy(h, TODAY, 'year')).toEqual([{period: '2026', done: 178, scheduled: 178}]);
    const every2 = totalsBy(walk(2), TODAY, 'month')[0]!;
    expect(every2.scheduled).toBe(24); // today is not done, so not counted yet
  });
  it('per month, the days done on each weekday, Monday first', () => {
    const rows = weekdayByMonth(walk(1), TODAY);
    expect(rows[0]!.month).toBe('2026-11');
    expect(rows[0]!.days.reduce((a, b) => a + b, 0)).toBe(25);
    expect(rows[0]!.days[6]).toBe(4); // Sundays 1, 8, 15 and 22 (the 29th is ahead)
  });
  it('NOVA and ZIGi say the strength over the year, in English and Dutch', () => {
    const s = showcaseAll(), text = (q: string) => { const r = av2HabitsAnswer(q, zigiEnv(s)); return r && 'text' in r ? r.text : ''; };
    expect(text('how has my habit strength changed this year')).toMatch(/^(?:Strength \(0 to 100\) over the last year: |No habit has seven scheduled days)/);
    expect(text('hoe is de sterkte van mijn gewoontes dit jaar veranderd')).toMatch(/^(?:Sterkte \(0 tot 100\) over het afgelopen jaar: |Nog geen gewoonte)/);
  });
});
