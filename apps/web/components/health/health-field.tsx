'use client';
import {createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {FieldError} from '../primitives/field-error';
import {focusFirstInvalid} from '../../lib/primitives/field-focus';
import {checkHealthForm} from '../../lib/health-field-dom';
export {checkHealthForm};

/**
 * Session AL fourth pass (AL-FIELD-ERROR-003): one check for every Health page form, run before the form's own handler.
 * A form opts in with `data-health-check`; each field it checks carries `data-check` (lib/health-field-rules), an id,
 * and a <FieldNote of={id}/> right after it. On submit a wrong or empty field gets its sentence directly under it,
 * aria-invalid and aria-describedby naming that sentence, the first one the focus, and the save does not run. Typing in
 * a field clears its own sentence. The forms are noValidate, so the browser's "Please fill out this field." bubble is
 * replaced by the app's own words (D-142, D-143, D-074, L-035, N-130).
 *
 * The page's one feedback line ("Targets saved.", "Saving to this browser…") is shown at the end of the form that was
 * submitted while that form is on screen (it read ~1,500 px away, under the view strip: MO-001, D-074, L-035).
 */
type Ctx = {
  errors: Readonly<Record<string, string>>; first: string | null;
  feedbackForm: string | null; feedback: ReactNode;
  registerForm: (title: string) => () => void;
  /** Session AL fifth pass (replay L2 round 2): drops the named fields' sentences (a change elsewhere made them stale). */
  forget: (ids: readonly string[]) => void;
};
const HealthFieldContext = createContext<Ctx>({errors: {}, first: null, feedbackForm: null, feedback: null, registerForm: () => () => {}, forget: () => {}});
export const messageIdOf = (id: string) => `${id}-error`;

function setMarks(form: HTMLFormElement | null, errors: Record<string, string>) {
  if (!form) return;
  for (const el of form.querySelectorAll<HTMLElement>('[data-health-marked]')) {
    if (errors[el.id]) continue;
    el.removeAttribute('aria-invalid'); el.removeAttribute('data-health-marked');
    const rest = (el.getAttribute('aria-describedby') ?? '').split(' ').filter(x => x && x !== messageIdOf(el.id)).join(' ');
    if (rest) el.setAttribute('aria-describedby', rest); else el.removeAttribute('aria-describedby');
  }
  for (const id of Object.keys(errors)) {
    const el = document.getElementById(id); if (!el) continue;
    el.setAttribute('aria-invalid', 'true'); el.setAttribute('data-health-marked', '');
    const ids = (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
    if (!ids.includes(messageIdOf(id))) el.setAttribute('aria-describedby', [messageIdOf(id), ...ids].join(' '));
  }
}

/**
 * The page side: run it in onSubmitCapture and onInput (bubble) of the page wrapper. Never onInputCapture: its state change
 * renders between the capture and bubble phases, before a controlled field's onChange, and React puts the old value back.
 */
export function useHealthFieldChecks() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedbackForm, setFeedbackForm] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<string, number>>({});
  const form = useRef<HTMLFormElement | null>(null);
  /** Returns false (and stops the submit) when a field is wrong. */
  const onSubmit = useCallback((event: {target: EventTarget; preventDefault(): void; stopPropagation(): void}) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return true;
    setFeedbackForm(target.getAttribute('aria-label'));
    if (!target.hasAttribute('data-health-check')) return true;
    form.current = target;
    const found = checkHealthForm(target);
    setErrors(found); setMarks(target, found);
    if (!Object.keys(found).length) return true;
    event.preventDefault(); event.stopPropagation();
    focusFirstInvalid(Object.keys(found));
    return false;
  }, []);
  const onInput = useCallback((event: {target: EventTarget}) => {
    const el = event.target;
    if (!(el instanceof HTMLElement) || !el.id) return;
    setErrors(old => {
      if (!(el.id in old)) return old;
      const next = {...old}; delete next[el.id]; setMarks(form.current, next); return next;
    });
  }, []);
  /** A click on a button that is not a submit (a Remove, a view) says its result in the page's own line. */
  const onClick = useCallback((event: {target: EventTarget}) => {
    const b = event.target instanceof Element ? event.target.closest('button') : null;
    if (b && b.type !== 'submit') setFeedbackForm(null);
  }, []);
  const clear = useCallback(() => { setErrors({}); setMarks(form.current, {}); setFeedbackForm(null); }, []);
  const forget = useCallback((ids: readonly string[]) => setErrors(old => {
    if (!ids.some(id => id in old)) return old;
    const next = {...old}; for (const id of ids) delete next[id]; setMarks(form.current, next); return next;
  }), []);
  const registerForm = useCallback((title: string) => {
    setShown(s => ({...s, [title]: (s[title] ?? 0) + 1}));
    return () => setShown(s => ({...s, [title]: Math.max(0, (s[title] ?? 1) - 1)}));
  }, []);
  /** Whether the line shows inside the submitted form (true) or at its usual place under the views. */
  const atForm = !!feedbackForm && (shown[feedbackForm] ?? 0) > 0;
  return {errors, feedbackForm, atForm, onSubmit, onInput, onClick, clear, forget, registerForm};
}

export function HealthFieldProvider({value, feedback, children}: {value: ReturnType<typeof useHealthFieldChecks>; feedback: ReactNode; children: ReactNode}) {
  const first = Object.keys(value.errors).sort((a, b) => {
    const x = typeof document !== 'undefined' ? document.getElementById(a) : null, y = typeof document !== 'undefined' ? document.getElementById(b) : null;
    return x && y && x !== y ? (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1) : 0;
  })[0] ?? null;
  const ctx = useMemo<Ctx>(() => ({errors: value.errors, first, feedbackForm: value.atForm ? value.feedbackForm : null, feedback, registerForm: value.registerForm, forget: value.forget}), [value.errors, first, value.atForm, value.feedbackForm, feedback, value.registerForm, value.forget]);
  return <HealthFieldContext.Provider value={ctx}>{children}</HealthFieldContext.Provider>;
}

/** Drops stale sentences: a field whose rule changed (Measurements' type: a weight range under a waist value). */
export const useForgetFieldChecks = () => useContext(HealthFieldContext).forget;
/** The sentence under a checked field (nothing when it reads). */
export function FieldNote({of}: {of: string}) {
  const {errors, first} = useContext(HealthFieldContext);
  return <FieldError id={messageIdOf(of)} message={errors[of] ?? ''} alert={first === of}/>;
}
/** A checked field and its sentence, as one grid item. */
export function Checked({of, children}: {of: string; children: ReactNode}) {
  return <div className="health-checked">{children}<FieldNote of={of}/></div>;
}
/** The page's feedback line, inside the form named `title` when that form was the one submitted. */
export function FeedbackSlot({title}: {title: string}) {
  const {feedbackForm, feedback, registerForm} = useContext(HealthFieldContext);
  useLayoutEffect(() => registerForm(title), [registerForm, title]);
  return feedbackForm === title ? <>{feedback}</> : null;
}
