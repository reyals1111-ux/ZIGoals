'use client';
import {evaluateAmount, isExpression} from '../../lib/money-calc/expression';

/**
 * Session AK (BUILD list 2 #19): under a money-log or budget amount field, the result of a sum the person typed
 * ("12,50+3,20" → "= 15.70"), the amount that will be saved; or why it cannot be worked out. Nothing for a plain amount.
 * Polite live region: the result is read once the typing pauses, not on every key.
 */
export function CalcHint({value, id}: {value: string; id?: string}) {
  const sum = isExpression(value) ? evaluateAmount(value) : null;
  return <p id={id} className="fine money-calc-hint" aria-live="polite">{sum ? sum.ok ? <>= <strong>{sum.text}</strong> <span className="money-calc-note">(saved as this amount)</span></> : sum.reason : ''}</p>;
}
