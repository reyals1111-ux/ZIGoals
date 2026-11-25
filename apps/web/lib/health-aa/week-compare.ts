import {weightText, type WeightUnit} from '../health-units';
import {WEEK_MIN_WEIGH_INS, type WeekCompare} from './trend';

/**
 * Session AW (X6; LEDGER #458): the trend card's line for this week against the week before, in the person's unit. A fact
 * in calm words ("under", "over", "the same as"): never a judgement, and never a 0 for a week without enough weigh-ins.
 */
export function weekCompareText(c: WeekCompare, unit: WeightUnit): string {
  if (!c.ready) return `This week against the week before: not enough weigh-ins yet (${WEEK_MIN_WEIGH_INS} or more in each week; this week ${c.thisCount}, the week before ${c.prevCount}).`;
  const gap = weightText(Math.abs(c.diff), unit), same = gap === weightText(0, unit);
  const mean = (g: number) => weightText(g, unit); // a derived figure: one decimal, as the trend
  return `This week ${mean(c.thisMean)} on average (${c.thisCount} weigh-ins), ${same ? 'the same as' : `${gap} ${c.diff < 0 ? 'under' : 'over'}`} the week before (${mean(c.prevMean)}, ${c.prevCount} weigh-ins).`;
}
