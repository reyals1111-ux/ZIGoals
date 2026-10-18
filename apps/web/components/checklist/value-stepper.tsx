'use client';
import {useId, useState, type CSSProperties, type FormEvent} from 'react';
import type {StepValue} from '../../lib/path/model';
import {formatNumber} from '../../lib/visual-format';

/**
 * The inline stepper for a value dot (P7.12): − and + by the item's step, a number field, the unit and "Log". It opens
 * with the last value logged from the path, else the item's default, and the dot remembers what was logged. Decimal
 * commas are read as points. 44 px targets; the field is 16 px so phones do not zoom.
 */
const decimals = (step: number) => (String(step).split('.')[1] ?? '').length;
const clamp = (v: number, value: StepValue) => Math.min(value.max, Math.max(value.min, v));
export function ValueStepper({label, value, colour, busy, onLog, onCancel}: {label: string; value: StepValue; colour: string; busy: boolean; onLog: (n: number) => void; onCancel: () => void}) {
  const id = useId(), start = value.current ?? value.suggested, places = decimals(value.step);
  const [text, setText] = useState(String(Number(start.toFixed(places)))), [error, setError] = useState('');
  const read = () => Number(text.replace(',', '.').trim());
  const bump = (delta: number) => { const n = read(); const next = clamp((Number.isFinite(n) ? n : start) + delta, value); setText(String(Number(next.toFixed(places)))); setError(''); };
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const n = read();
    if (!text.trim() || !Number.isFinite(n)) { setError('Enter a number.'); return; }
    if (n < value.min || n > value.max) { setError(`Choose ${formatNumber(value.min)} to ${formatNumber(value.max)} ${value.unit}.`); return; }
    onLog(n);
  }
  return <form className="checklist-stepper" onSubmit={submit} aria-label={`Log ${label}`} style={{'--dot': colour} as CSSProperties}>
    <div className="checklist-stepper-row">
      <button type="button" className="checklist-stepper-bump" aria-label={`Less, by ${value.step} ${value.unit}`} onClick={() => bump(-value.step)} disabled={busy}>−</button>
      <label className="checklist-stepper-field" htmlFor={id}><span className="sr-only">{label} in {value.unit}</span>
        <input id={id} inputMode="decimal" autoComplete="off" value={text} onChange={e => { setText(e.target.value); setError(''); }} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}/>
        <span className="checklist-stepper-unit" aria-hidden="true">{value.unit}</span>
      </label>
      <button type="button" className="checklist-stepper-bump" aria-label={`More, by ${value.step} ${value.unit}`} onClick={() => bump(value.step)} disabled={busy}>+</button>
    </div>
    {error && <p className="checklist-stepper-error" id={`${id}-error`} role="alert">{error}</p>}
    <div className="checklist-stepper-actions">
      <button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : `Log ${text.trim() || '…'} ${value.unit}`.trim()}</button>
      <button type="button" className="quiet" onClick={onCancel}>Cancel</button>
    </div>
  </form>;
}
