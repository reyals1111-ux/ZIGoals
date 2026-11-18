import type {WidgetSpec} from './catalog';

/**
 * Session AS (ADR-042 Part 2): a widget for every kind of answer. Each is made by the answer it shows (the exact layer's
 * lookup names it, lib/nova/summon/summon.ts `factsWidgets`) with the answer's own record (`ref`) and period (`period`);
 * pinned from the gallery it shows its default period. All `made`; each reads under its pillar's switch (`gate`).
 * This file: Habits (family 1, month calendars; family 2, ranked miss bars). Health, Wealth and Goals, and the day's own
 * kinds are in catalog-as-health.ts, catalog-as-money.ts and catalog-as-day.ts.
 */
export const AS_HABITS: readonly WidgetSpec[] = [
  {id: 'habit-missed-days', title: 'Missed days', about: 'One habit’s month as a calendar: the days it was not done lit, missed and skipped told apart.', pillar: 'habits', href: '/app/habits', open: 'Open Habits', size: 'M', gate: 'habits', params: ['ref', 'period'], made: true},
  {id: 'habit-done-days', title: 'Days done', about: 'One habit’s month as a calendar, with the days it was done lit.', pillar: 'habits', href: '/app/habits', open: 'Open Habits', size: 'M', gate: 'habits', params: ['ref', 'period'], made: true},
  {id: 'habits-month', title: 'Habits by day', about: 'Every habit together as a calendar: the days on which one was not done.', pillar: 'habits', href: '/app/habits', open: 'Open Habits', size: 'M', gate: 'habits', params: ['period'], made: true},
  {id: 'habit-misses', title: 'Misses per habit', about: 'Which habits were missed and how often, ranked; skipped days told apart.', pillar: 'habits', href: '/app/habits', open: 'Open Habits', size: 'M', gate: 'habits', params: ['period'], made: true},
];
