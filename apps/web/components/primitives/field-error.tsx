'use client';
import {useCallback, useEffect, useId, useRef, useState} from 'react';
import type {Validated} from '../../lib/limits/plausibility';
import {focusFirstInvalid} from '../../lib/primitives/field-focus';

/**
 * Session AL (3d, BUG-009, TK-024, DV-016/DV-049): one way to say a field is wrong. The message sits directly under its
 * field (<FieldError> rendered right after the input), the field carries aria-invalid and an aria-describedby that names
 * the message, a failed submit scrolls to and focuses the first invalid field in the page's order (reduced motion
 * respected), and typing in a field clears its own message. There is no summary far away: a message about the whole
 * form (a failed save) goes in `formError`, rendered next to the submit button.
 *
 *   const form = useFormErrors();
 *   const submit = () => {
 *     const v = form.validate({weight: validateValue('weight', weight, unit), note: validateValue('note', note)});
 *     if (!v) return;                       // each message is under its field; the first field has the focus
 *     save(v.weight, v.note);               // v.weight is in kg, v.note trimmed
 *   };
 *   <input {...form.field('weight')} value={weight} onChange={…}/>
 *   <FieldError {...form.message('weight')}/>
 *
 * A wizard (DV-016) switches to the step that holds the field in the same handler before calling validate or fail: the
 * focus moves after that render, so it lands on the field of the step now shown.
 */
type FieldProps = {id: string; 'aria-invalid'?: true; 'aria-describedby'?: string; onInput: (event: unknown) => void};
export type FormErrors = {
  /** The current message per field (only invalid fields are present). */
  errors: Readonly<Record<string, string>>;
  /** A message about the whole form (a failed save); '' when none. Render it next to the submit button. */
  formError: string;
  /**
   * Checks every result at once: on any error, shows each message under its field, focuses the first invalid field and
   * returns null; when all are ok, clears the messages and returns each value (in its base unit, or the trimmed text).
   */
  validate: <T extends Record<string, Validated<unknown>>>(results: T) => {[K in keyof T]: T[K] extends Validated<infer V> ? V : never} | null;
  /** Shows these messages (null or '' clears that field) and focuses the first invalid field. Returns true if any. */
  fail: (messages: Record<string, string | null | undefined>) => boolean;
  /** Sets one field's message without moving the focus (a check while typing, on blur). */
  set: (name: string, message: string | null) => void;
  /** The whole form's message, for what no single field caused. */
  failForm: (message: string) => void;
  /** Clears one field's message, or every message. */
  clear: (name?: string) => void;
  /** Props for the field: its id (yours kept), aria-invalid, aria-describedby, and an onInput that clears its message. */
  field: (name: string, options?: {id?: string; describedBy?: string; onInput?: (event: never) => void}) => FieldProps;
  /** Props for the <FieldError> under the field. */
  message: (name: string) => {id: string; message: string; alert: boolean};
};

export function useFormErrors(): FormErrors {
  const base = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const ids = useRef<Record<string, string>>({}), focusNext = useRef(false);
  const idOf = useCallback((name: string) => ids.current[name] ?? `${base}f-${name}`, [base]);
  const messageId = useCallback((name: string) => `${base}m-${name}`, [base]);

  const fail = useCallback((messages: Record<string, string | null | undefined>) => {
    const next: Record<string, string> = {};
    for (const [name, text] of Object.entries(messages)) if (text) next[name] = text;
    setErrors(next);
    setFormError('');
    focusNext.current = Object.keys(next).length > 0;
    return focusNext.current;
  }, []);
  const set = useCallback((name: string, text: string | null) => setErrors(current => {
    if ((current[name] ?? '') === (text ?? '')) return current;
    const next = {...current};
    if (text) next[name] = text; else delete next[name];
    return next;
  }), []);
  const clear = useCallback((name?: string) => { if (name === undefined) { setErrors({}); setFormError(''); } else set(name, null); }, [set]);
  const failForm = useCallback((text: string) => setFormError(text), []);
  const validate = useCallback(<T extends Record<string, Validated<unknown>>>(results: T) => {
    const messages: Record<string, string | null> = {};
    let ok = true;
    for (const [name, r] of Object.entries(results)) { messages[name] = r.ok ? null : r.error; if (!r.ok) ok = false; }
    if (!ok) { fail(messages); return null; }
    setErrors({}); setFormError('');
    return Object.fromEntries(Object.entries(results).map(([name, r]) => [name, r.value])) as {[K in keyof T]: T[K] extends Validated<infer V> ? V : never};
  }, [fail]);

  // After the render that shows the messages: the first invalid field, in the page's order, is revealed and focused.
  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    focusFirstInvalid(Object.keys(errors).map(idOf));
  }, [errors, idOf]);

  // The first message (in the order validate or fail was given, which callers keep to the page's order) is announced.
  const first = Object.keys(errors)[0] ?? null;

  const field = useCallback((name: string, options: {id?: string; describedBy?: string; onInput?: (event: never) => void} = {}): FieldProps => {
    const id = options.id ?? `${base}f-${name}`;
    ids.current[name] = id;
    const invalid = name in errors, describedBy = [options.describedBy, invalid ? messageId(name) : undefined].filter(Boolean).join(' ');
    return {
      id, ...(invalid ? {'aria-invalid': true as const} : {}), ...(describedBy ? {'aria-describedby': describedBy} : {}),
      onInput: (event: unknown) => { options.onInput?.(event as never); if (invalid) set(name, null); },
    };
  }, [base, errors, messageId, set]);
  const message = useCallback((name: string) => ({id: messageId(name), message: errors[name] ?? '', alert: name === first}), [errors, first, messageId]);
  return {errors, formError, validate, fail, set, failForm, clear, field, message};
}

/**
 * The message right under its field, styled as every inline error (.field-error: words, weight and a mark, never colour
 * alone). Renders nothing when there is no message. `alert` (the first invalid field) announces it as it appears.
 */
export function FieldError({id, message, alert = false, className}: {id: string; message: string; alert?: boolean; className?: string}) {
  if (!message) return null;
  return <p id={id} className={className ? `field-error ${className}` : 'field-error'} role={alert ? 'alert' : undefined}>{message}</p>;
}
