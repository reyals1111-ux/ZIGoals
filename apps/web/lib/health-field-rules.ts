import {LIMITS, validateValue, type NumberKind} from './limits/plausibility';
import {INVISIBLE_NAME} from './visible-text';

/**
 * Session AL fourth pass (AL-FIELD-ERROR-003: MO-001, MO-020, MO-036, MO-030, MO-141, BUG-009, BUG-020, BUG-084, D-024,
 * D-074, D-077, D-142, D-143, L-035, N-116, N-130, PR-063, T-137, DV-136; D-089): what each Health form field takes, said
 * at the field before anything is saved. Every sentence names the range and its unit (a "-5", an "abc", a "1e6" and a
 * 99,999 alike), so no limit ever reaches the store and comes back as the "browser storage" text. The numbers are the
 * one limits table's (lib/limits/plausibility VALUE_LIMITS / LIMITS); a target is a daily amount, so it is at least 1.
 */
export type HealthCheck =
  | 'kcal' | 'kcal-target' | 'macro' | 'macro-target' | 'steps' | 'steps-target' | 'minutes'
  | 'weight' | 'weight-goal' | 'water' | 'waist' | 'portion' | 'name' | 'brand';

type Rule = {kind: NumberKind; sentence: (unit?: string) => string; whole?: boolean; atLeastOne?: boolean; max?: number};
const n = (v: number) => v.toLocaleString('en-GB', {maximumFractionDigits: 2});
/** The table's own range sentence for a measured kind, in the unit typed ("Enter a weight from 45 to 881 lb."). */
const tableSentence = (kind: NumberKind) => (unit?: string) => validateValue(kind, Number.MAX_SAFE_INTEGER, unit).error ?? '';
const RULES: Record<Exclude<HealthCheck, 'name' | 'brand'>, Rule> = {
  kcal: {kind: 'kcal', sentence: () => `Enter calories from 0 to ${n(LIMITS.kcalTarget)} kcal.`},
  'kcal-target': {kind: 'kcal', atLeastOne: true, whole: true, sentence: () => `Enter a calorie target from 1 to ${n(LIMITS.kcalTarget)} kcal a day.`},
  macro: {kind: 'macro', sentence: () => 'Enter grams from 0 to 1,000 g.'},
  'macro-target': {kind: 'macro', atLeastOne: true, sentence: () => 'Enter a daily target from 1 to 1,000 g.'},
  steps: {kind: 'steps', whole: true, sentence: () => `Enter steps as a whole number from 0 to ${n(LIMITS.stepsPerDay)}.`},
  // A daily step target above what one day can hold (100,000) is never reached, so it is refused like the day itself (T-137).
  'steps-target': {kind: 'steps', whole: true, atLeastOne: true, sentence: () => `Enter a daily step target from 1 to ${n(LIMITS.stepsPerDay)} steps.`},
  minutes: {kind: 'minutes', whole: true, sentence: () => `Enter whole minutes from 0 to ${n(LIMITS.minutesPerDay)}.`},
  weight: {kind: 'weight', sentence: tableSentence('weight')},
  'weight-goal': {kind: 'weight', sentence: tableSentence('weight')},
  water: {kind: 'water', sentence: tableSentence('water')},
  waist: {kind: 'waist', sentence: tableSentence('waist')},
  portion: {kind: 'count', atLeastOne: true, max: 100_000, sentence: unit => `Enter a portion from 1 to 100,000 ${unit === 'ml' ? 'mL' : 'g'}.`},
};
export const HEALTH_NAME_MAX = 120, HEALTH_BRAND_MAX = 80;

/**
 * The sentence for one field, or null when it reads. `label` is the field's own name, used where the person typed
 * something that is not a number at all ("Check the highlighted fields: Water amount needs a number more than 0 and at
 * most 5,000 mL."; the prefix is pinned by tests/a11y-field-errors.spec.ts). Blank: null when the field is optional.
 */
export function healthFieldIssue(check: HealthCheck, raw: string, {unit, required = true, label = ''}: {unit?: string; required?: boolean; label?: string} = {}): string | null {
  const typed = raw ?? '';
  if (check === 'name' || check === 'brand') return textIssue(typed, check === 'name' ? HEALTH_NAME_MAX : HEALTH_BRAND_MAX, required);
  const rule = RULES[check], sentence = rule.sentence(unit);
  if (!typed.trim()) return required ? sentence : null;
  const v = validateValue(rule.kind, typed, rule.kind === 'kcal' || rule.kind === 'macro' || rule.kind === 'count' ? undefined : unit);
  if (!v.ok) {
    if (/^Use at most \d+ decimal/.test(v.error)) return v.error;
    // Not a plain number (letters, a sign, an exponent, an ambiguous separator): say what the field takes.
    if (!/^Enter (a |an )?(weight|amount|measurement|calories|whole|steps|minutes|count|hours)/.test(v.error)) {
      const range = sentence.replace(/^Enter /, '').replace(/\.$/, '');
      const ambiguous = /could be|separator|mixes/i.test(v.error) ? ` ${v.error}` : '';
      return `Check the highlighted fields: ${label || 'This field'} needs a number: ${range}.${ambiguous}`;
    }
    return sentence;
  }
  if (rule.whole && !Number.isInteger(v.input)) return sentence;
  if (rule.atLeastOne && v.input < 1) return sentence;
  if (rule.max !== undefined && v.input > rule.max) return sentence;
  return null;
}

function textIssue(raw: string, max: number, required: boolean): string | null {
  const value = raw.replace(/\s+/g, ' ').trim();
  if (!raw.length) return required ? 'Enter a name.' : null;
  if (!value || !/[\p{L}\p{N}\p{P}\p{S}]/u.test(value)) return required ? INVISIBLE_NAME : null;
  // D-089: a long name was cut to 120 characters without a word; it is said instead, and nothing is cut.
  if (value.length > max) return `A name can be at most ${n(max)} characters (this one has ${n(value.length)}).`;
  return null;
}
