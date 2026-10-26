import type {HabitRule} from './habits';

/**
 * Session AH (HA9; N-005, N-112, N-087): how much one tap of "+" or "−" changes a measured habit. One for small
 * targets (10 glasses, 30 push-ups); a round share of a large target (8,000 steps → 1,000); a quarter litre or 250 mL
 * for water-like units; five minutes for a duration of 20 minutes or more, a quarter hour for hours.
 */
const ROUND = [1, 5, 10, 50, 100, 250, 500, 1000, 5000, 10_000] as const;
export function habitStep(rule: Pick<HabitRule, 'measurement' | 'target'>): number {
  const m = rule.measurement, target = rule.target;
  if (m.kind === 'boolean') return 1;
  if (m.kind === 'duration') return m.unit === 'hours' ? 0.25 : target >= 20 ? 5 : 1;
  const unit = 'unit' in m && typeof m.unit === 'string' ? m.unit.trim().toLowerCase() : '';
  if (m.kind !== 'count') {
    if (/^(l|liters?|litres?)$/.test(unit)) return 0.25;
    if (/^(ml|millilit(er|re)s?)$/.test(unit)) return target >= 500 ? 250 : 50;
    if (/^(km|kilomet(er|re)s?|mi|miles?)$/.test(unit)) return target >= 5 ? 1 : 0.5;
  }
  let step = 1;
  for (const r of ROUND) if (r <= target / 8) step = r;
  return step;
}
