import {validateValue, type Validated} from '../limits/plausibility';
import type {HealthGoalMeasure} from './schema';

/**
 * Session AL (DV-027b, DV-059, P-DV-02): a target is checked against the one limits table (lib/limits/plausibility.ts) for
 * its measure, in the unit shown beside it: steps up to 100,000 a day, minutes up to 1,440, a weight from 20 to 400 kg
 * (45 to 881 lb), whole water days and reps. A target is always above zero.
 */
export function checkGoalTarget(text: string, measure: HealthGoalMeasure, units: {weightUnit: 'kg' | 'lb'}): Validated<number> {
  const result = measure === 'weight' ? validateValue('weight', text, units.weightUnit)
    : validateValue(measure === 'steps' ? 'steps' : measure === 'activeMinutes' ? 'minutes' : measure === 'exercise' ? 'reps' : 'count', text);
  if (result.ok && result.input <= 0) return {ok: false, value: null, input: null, text: null, unit: result.unit, error: 'Enter a target above zero.'};
  if (!result.ok && !text.trim()) return {...result, error: 'Enter a target above zero.'};
  return result;
}
