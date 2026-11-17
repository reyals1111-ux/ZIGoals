import {allHabitsTrack, habitTrack, habitsAnswer} from '../../ai/local-answers/exact/habits';
import {trackAnswer} from '../../ai/local-answers/exact/track';
import type {Ask, Query, Shape} from '../../ai/local-answers/exact/types';
import {latestHabitRule} from '../../habits';
import type {AxLine} from './ax-lines';

/** Session AS (ADR-042 Part 2): the lines of the Habits answer widgets, said by the exact layer itself (the same days as the widget). */
const query = (ask: Ask, shape: Shape, period: string, lang: 'en' | 'nl'): Query => ({domain: 'habits', ask, shape, lang, period, weekday: null, subject: null, read: ''});
const one = (ask: Ask, fallback: string): AxLine => (params, d, lang) => {
  const live = (d.habits ?? []).filter(h => latestHabitRule(h).state !== 'archived');
  if (!d.habits) return null;
  const habit = live.find(h => h.id === params?.ref) ?? live[0];
  if (!habit) return lang === 'nl' ? 'Je hebt nog geen gewoontes.' : 'You have no habits yet.';
  return trackAnswer(query(ask, 'count', params?.period ?? fallback, lang), habitTrack(habit, d.day), d.day)?.text ?? null;
};
export const AX_HABIT_LINES: Readonly<Record<string, AxLine>> = {
  'habit-missed-days': one('not-done', 'this-month'),
  'habit-done-days': one('done', 'this-month'),
  'habits-month': (params, d, lang) => !d.habits ? null : !d.habits.length ? (lang === 'nl' ? 'Je hebt nog geen gewoontes.' : 'You have no habits yet.') : trackAnswer(query('not-done', 'count', params?.period ?? 'this-month', lang), allHabitsTrack(d.habits, d.day), d.day)?.text ?? null,
  'habit-misses': (params, d, lang) => d.habits ? habitsAnswer(query('missed', 'count', params?.period ?? 'this-week', lang), d.habits, d.day)?.text ?? null : null,
};
