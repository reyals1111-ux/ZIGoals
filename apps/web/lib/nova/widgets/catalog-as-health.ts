import type {WidgetSpec} from './catalog';

/**
 * Session AS (ADR-042 Part 2): the answer widgets of Health: scanners, trends, sleep and fasting bars, gauges, heat, and
 * the calendars of Health’s logs. Same rules as catalog-as.ts: each is made by the answer it shows with the answer’s own
 * period, and every one reads under the Health switches and under no other gate (Q14, Q16: the mood map too).
 */
const health = (id: string, title: string, about: string, href: string, params: WidgetSpec['params'] = ['period']): WidgetSpec => ({id, title, about, pillar: 'health', href, open: 'Open Health', size: 'M', gate: 'health', params, made: true});
export const AS_HEALTH: readonly WidgetSpec[] = [
  // Family 1: month calendars of Health’s logs.
  health('water-days', 'Water days', 'Your water target as a month calendar: the days that did not reach it lit, the days with nothing logged left unlit.', '/app/health#water'),
  health('steps-days', 'Step days', 'Your step target as a month calendar: the days below it lit, the days with nothing logged left unlit.', '/app/health?view=activity'),
  health('sleep-nights', 'Sleep nights', 'Your sleep goal as a month calendar: the nights under it lit, the days with no night logged left unlit.', '/app/health?view=sleep'),
  health('workout-days', 'Workout days', 'The days with a workout as a month calendar.', '/app/health?view=workouts'),
  health('meditation-days', 'Meditation days', 'The days with a meditation session as a month calendar.', '/app/health?view=meditation'),
  health('protein-days', 'Protein days', 'Your protein target as a month calendar: the days below it lit, the days with no food logged left unlit.', '/app/health?view=diary'),
  // Scanners.
  health('health-scan', 'Health scan', 'What your records hold right now: last night’s sleep, today’s steps and water, your latest weight, each with its own day. Facts only, never a score.', '/app/health'),
  health('body-scan', 'Body scan', 'Your latest body measurements on a figure outline, each with its day.', '/app/health?view=weight'),
  // Trends.
  health('weight-trend', 'Weight trend', 'Your weigh-ins as one line with your weight goal, and the change over the period in words.', '/app/health?view=weight', ['period', 'range']),
  health('sleep-trend', 'Sleep trend', 'The hours you slept each night as one line against your own sleep goal.', '/app/health?view=sleep'),
  health('steps-trend', 'Steps trend', 'Your steps each day as one line against your own step target.', '/app/health?view=activity'),
  health('heart-trend', 'Resting pulse', 'The resting heart rate recorded for each day as one line. A record, never a live reading.', '/app/health?view=insights'),
  health('water-week', 'Water by day', 'The last 7 days of water as columns against your own target.', '/app/health#water'),
  health('calorie-trend', 'Calorie trend', 'The calories you logged each day as one line, with your own calorie target.', '/app/health?view=diary'),
  // Stage bars.
  health('sleep-stages', 'Sleep stages', 'Deep, REM and core sleep of each night as stacked bars, where a night holds them.', '/app/health?view=sleep'),
  health('sleep-times', 'Bed and wake', 'When you went to bed and got up each night, as bars on a 24-hour scale.', '/app/health?view=sleep'),
  health('fasting-windows', 'Fasting windows', 'Your last fasts as bars, each against its own target.', '/app/health#fasting'),
  // Gauges, heat, twins, map.
  health('nutrition-gauges', 'Nutrition', 'Today’s calories, protein, carbs and fat as arcs against your own targets.', '/app/health?view=diary'),
  health('steps-heat', 'Steps heat', 'The last 13 weeks of steps, a cell a day: the more steps the brighter, nothing logged left unlit.', '/app/health?view=activity'),
  health('health-compare', 'Compare health', 'One measure of Health in a period beside the period before it, with the difference in words.', '/app/health', ['ref', 'period']),
  health('mood-map', 'Mood map', 'A month of days, each lit by the mood you kept that evening, with the steps named in words. Counts only.', '/app/health'),
];
