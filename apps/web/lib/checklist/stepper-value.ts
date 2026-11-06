import {validateValue, type NumberKind} from '../limits/plausibility';
import {parseNumberInput} from '../numbers/parse';
import {formatNumber} from '../visual-format';
import type {StepValue} from '../path/model';

/**
 * Session AL third pass (PRIMITIVES 3d, P-LS-20, LS-057): the value stepper's one reading of what was typed, through the
 * app's shared number reader and limits table, so the Checklist refuses exactly what the Health form and ZIGi refuse.
 * - The text is read by `parseNumberInput` (decimal comma, no sign, ambiguous "1,234" asked about, never guessed).
 * - The dot's own range comes next, with the stepper's own sentence ("Choose 1 to 5,000 ml.").
 * - A health unit (kg/lb, ml/fl oz, meditation minutes) is then checked by `validateValue` for that kind: the store's
 *   numbers and its decimals. A habit's own unit ("pages") has no kind and keeps the dot's range only.
 */
export type StepperReading = {ok: true; value: number; error: null} | {ok: false; value: null; error: string};

const KIND_BY_UNIT: Readonly<Record<string, {kind: NumberKind; unit?: string}>> = {
  kg: {kind: 'weight', unit: 'kg'}, lb: {kind: 'weight', unit: 'lb'},
  ml: {kind: 'water', unit: 'ml'}, mL: {kind: 'water', unit: 'ml'}, 'fl oz': {kind: 'water', unit: 'fl-oz-us'},
  min: {kind: 'minutes'},
};

/** The sentence a value outside the dot's range gets (also the live hint while typing). */
export const stepperRangeText = (value: Pick<StepValue, 'min' | 'max' | 'unit'>) => `Choose ${formatNumber(value.min)} to ${formatNumber(value.max)} ${value.unit}.`.replace(' .', '.');

export function readStepperValue(text: string, value: Pick<StepValue, 'min' | 'max' | 'unit'>): StepperReading {
  const parsed = parseNumberInput(text);
  if (!parsed.ok) return {ok: false, value: null, error: parsed.error};
  const n = parsed.value;
  if (n < value.min || n > value.max) return {ok: false, value: null, error: stepperRangeText(value)};
  const shared = KIND_BY_UNIT[value.unit];
  if (shared) {
    const checked = validateValue(shared.kind, text, shared.unit);
    if (!checked.ok) return {ok: false, value: null, error: checked.error};
  }
  return {ok: true, value: n, error: null};
}
