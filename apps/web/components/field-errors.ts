'use client';
import {useCallback, useEffect, useId, useRef, useState} from 'react';

/**
 * Session Y Part 9 (persona row 19, WCAG 3.3.1 and 4.1.2): a form's error is tied to the fields it is about. Each such
 * field gets `aria-invalid` and an `aria-describedby` that points at the message, and when a submit fails the first of
 * them takes the focus, so a screen reader hears the field and why at once. A message about the whole form (a failed
 * save) names no field and stays the form's alert, as before.
 */
export type FieldErrors = {
  /** The message to show (empty when none), rendered as `<p role="alert" id={messageId}>`. */
  error: string;
  messageId: string;
  /** Shows `message` about the named fields (none: about the whole form) and moves the focus to the first of them. */
  fail: (message: string, ...fields: string[]) => void;
  clear: () => void;
  /** Props for a field: its id (kept if the field already has one), `aria-invalid` and `aria-describedby`. */
  field: (name: string, options?: {id?: string; describedBy?: string}) => {id: string; 'aria-invalid'?: true; 'aria-describedby'?: string};
};
export function useFieldErrors(): FieldErrors {
  const base = useId(), messageId = `${base}error`;
  const [state, setState] = useState<{message: string; fields: readonly string[]; ids: Record<string, string>} | null>(null);
  const ids = useRef<Record<string, string>>({}), focusNext = useRef(false);
  const fail = useCallback((message: string, ...fields: string[]) => { focusNext.current = fields.length > 0; setState({message, fields, ids: {...ids.current}}); }, []);
  const clear = useCallback(() => setState(null), []);
  useEffect(() => {
    if (!focusNext.current || !state) return;
    focusNext.current = false;
    const first = state.fields[0], id = first ? ids.current[first] ?? `${base}${first}` : null;
    const element = id ? document.getElementById(id) : null;
    if (element instanceof HTMLElement && !element.hasAttribute('disabled')) element.focus();
  }, [state, base]);
  const field = useCallback((name: string, options: {id?: string; describedBy?: string} = {}) => {
    const id = options.id ?? `${base}${name}`;
    ids.current[name] = id;
    const invalid = !!state?.fields.includes(name), describedBy = [options.describedBy, invalid ? messageId : undefined].filter(Boolean).join(' ');
    return {id, ...(invalid ? {'aria-invalid': true as const} : {}), ...(describedBy ? {'aria-describedby': describedBy} : {})};
  }, [base, messageId, state]);
  return {error: state?.message ?? '', messageId, fail, clear, field};
}
