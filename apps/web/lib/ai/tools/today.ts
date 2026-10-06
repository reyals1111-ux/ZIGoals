import {habitDay, latestHabitRule} from '../../habits';
import {dailyHealthSummary, scaleNutrition} from '../../health';
import {waterSummary} from '../../health-daily';
import {runningSession} from '../../fasting/engine';
import {nutrientText, nutrientTotal} from './health';
import {summaries} from './goals';
import {ok, provenance, text} from './format';
import {addLocalDays} from '../../local-date';
import {NO_ARGS, type ToolDefinition} from './types';

/**
 * Today at a glance (Session V Part 2): the same figures Today shows, from the same engines. Each area appears only when
 * its own switch allows it for this purpose; Health only through its gate. A fast that is running is mentioned without
 * any judgement, like Today's own line.
 */
export const todaySummary: ToolDefinition<Record<string, never>> = {
  name: 'today_summary', title: 'Today', area: 'today',
  description: 'Today at a glance: habits done and still open, goals with a planned date in the next 7 days, and (only when Health is shared) today\'s food diary energy, water, steps and whether a fast is running.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Today',
  run(_args, env, label) {
    const data: Record<string, unknown> = {habitDay: env.habitDay};
    if (env.areas.habits) {
      const active = env.habits.habits.filter(h => latestHabitRule(h).state === 'active'), days = active.map(h => ({h, day: habitDay(h, env.habitDay, env.habitDay)})).filter(x => x.day.scheduled);
      data.habits = {scheduledToday: days.length, done: days.filter(x => x.day.status === 'complete').length, open: days.filter(x => x.day.status === 'due' || x.day.status === 'partial').map(x => ({handle: env.handles.add('habit', x.h.id, x.h.title), habit: text(x.h.title, 60)})).slice(0, env.limits.rows), skipped: days.filter(x => x.day.status === 'skipped' || x.day.status === 'planned-skip').length};
    }
    if (env.areas.goals) {
      const soon = addLocalDays(env.habitDay, 7), goals = summaries(env).filter(g => g.status === 'active');
      data.goals = {active: goals.length, plannedSoon: goals.filter(g => g.nextContributionDate && g.nextContributionDate <= soon).map(g => ({handle: env.handles.add('goal', g.key, g.name), goal: text(g.name, 60), nextPlannedDate: g.nextContributionDate})).slice(0, env.limits.rows)};
    }
    if (env.health && env.areas.health) {
      const day = dailyHealthSummary(env.health, env.healthDay), water = waterSummary(env.health, env.healthDay);
      const values = env.health.diary.filter(e => e.date === env.healthDay).map(e => scaleNutrition(e.snapshot.nutrients, e.quantityMilli));
      data.health = {healthDay: env.healthDay, diaryEntries: day.entries, energy: nutrientText(nutrientTotal(values, 'kcal'), 'kcal'), waterMl: Math.round(water.millilitres), steps: day.steps, activeMinutes: day.minutes, fast: env.fasting && runningSession(env.fasting) ? 'a fast is running' : 'no fast running'};
    } else data.health = 'not shared with ZIGi';
    const shown = ['habits', 'goals'].some(a => a in data) || !!env.health;
    return ok('today_summary', label, provenance(env, 'records', null, {from: env.habitDay, to: env.habitDay, label: 'today'}, env.habitZone), {...data, ...(shown ? {} : {note: 'Nothing on Today is shared with ZIGi.'})});
  },
};
