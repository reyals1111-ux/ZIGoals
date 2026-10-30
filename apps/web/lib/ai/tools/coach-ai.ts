import {coachCheckIn} from '../../health-aa/coach';
import {dailyData} from '../../health-daily';
import type {ToolEnv} from './env';
import {ok} from './format';
import {gated, where} from './health';
import {NO_ARGS, type ToolDefinition} from './types';

/**
 * Session AJ (item 9; real-model `sp-aa-coach-keep-*`): the weekly coach check-in as a read-only tool. The person can
 * say "keep my calorie target this week" from any Health view, but the check-in itself was on no page and in no tool,
 * so a model found nothing to keep. This reads it the way Health → Your coach shows it: this week's start, the weekly
 * weight rate in the person's unit, whether this week is answered on this device, the current target and the estimate's
 * suggestion when it is ready. An estimate, never medical advice; under the Health gate like every Health tool.
 */
export const coachCheckinTool: ToolDefinition<Record<string, never>> = {
  name: 'coach_checkin', title: 'Your coach this week', area: 'health',
  description: 'The weekly calorie coach check-in on this device: this week\'s start, the weekly weight rate from the trend (when two or more weights are logged), whether this week was answered (keep or adjust), the current daily calorie target and the suggested target when the energy estimate is ready. Read it before a coach-answer card ("keep my calorie target", "adjust it to 2100").',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Your coach this week',
  run(_args, env: ToolEnv, label) {
    const g = gated(env, 'coach_checkin', label); if (!g.ok) return g;
    const unit = dailyData(g.health).preferences.weightUnit;
    const c = coachCheckIn(g.health, env.coach ?? {version: 1}, env.healthDay, unit);
    return ok('coach_checkin', label, where(env, 'the weekly coach check-in', null), {
      weekStart: c.weekStart, answeredThisWeek: c.answered ?? 'not yet', week: c.sentence,
      canAsk: c.rateGrams !== null, currentTargetKcal: c.currentKcal ?? 'no target set',
      suggestedTargetKcal: c.suggestion?.kcal ?? 'not ready yet (the energy estimate needs about two weeks of logs)',
      note: 'An estimate from the person\'s own logs, not medical advice.',
    });
  },
};
