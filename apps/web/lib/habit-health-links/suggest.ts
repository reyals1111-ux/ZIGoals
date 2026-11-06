import {formNumberText} from '../decimal-input';
import type {HabitHealthLinkV4} from './schema';

/**
 * Session AL (P-NB-28; NB-199, NB-200, NB-201): the water link a habit counted in litres starts with. A "Drink water,
 * 2 liters" habit links to the water journal at 2000 mL (or its fl oz), so the water already logged today ticks it off.
 */
const FL_OZ = 29.5735295625;
/** A habit target in litres as the water link's target in the Health water unit ("2" liters → "2000"); null when the unit is not litres or the target is not a number above 0. */
export function waterTargetFromLitres(unit: string, target: string, waterUnit: 'ml' | 'fl-oz-us'): string | null {
  if (!/^(l|liters?|litres?)$/i.test(unit.trim())) return null;
  const n = Number(target.trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return formNumberText(waterUnit === 'fl-oz-us' ? Math.round(n * 1000 / FL_OZ * 10) / 10 : Math.round(n * 1000));
}
/**
 * The Health link a habit made in one tap (an idea, the welcome's starters) starts with, as the editor would suggest it:
 * water in litres or the Health water unit, steps, or meditation minutes; null otherwise. Water targets are in mL.
 */
export function ideaHealthLink(input: {title: string; type?: string; measurement?: {kind: string; unit?: string}; target?: number}, waterUnit: 'ml' | 'fl-oz-us', now = new Date()): HabitHealthLinkV4 | null {
  if ((input.type ?? 'build') !== 'build' || !input.measurement || input.measurement.kind === 'boolean' || input.target === undefined || !(input.target > 0)) return null;
  const unit = (input.measurement.unit ?? '').trim().toLowerCase(), updatedAt = now.toISOString();
  if (unit === 'steps' && Number.isInteger(input.target)) return {version: 1, measure: 'steps', rule: 'at-least', target: input.target, updatedAt};
  if (waterTargetFromLitres(unit, String(input.target), 'ml') !== null) return {version: 1, measure: 'water', rule: 'at-least', target: Math.round(input.target * 1000), updatedAt};
  if (waterUnit === 'ml' ? unit === 'ml' : unit === 'fl oz') return {version: 1, measure: 'water', rule: 'at-least', target: waterUnit === 'ml' ? input.target : Math.round(input.target * FL_OZ * 1000) / 1000, updatedAt};
  if (input.measurement.kind === 'duration' && unit === 'minutes' && /meditat|mindful/i.test(input.title) && Number.isInteger(input.target)) return {version: 1, measure: 'meditationMinutes', rule: 'at-least', target: input.target, updatedAt};
  return null;
}
