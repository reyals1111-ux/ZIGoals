import {healthFieldIssue, type HealthCheck} from './health-field-rules';

/** Session AL fourth pass (AL-FIELD-ERROR-003): the DOM side of the Health page's field check (components/health/health-field.tsx). */
const labelOf = (el: HTMLElement) => (el.closest('label')?.querySelector('span')?.textContent ?? el.getAttribute('aria-label') ?? '').trim();
/** Every message of a submitted form, keyed by the field's id, in the form's order. Exported for tests. */
export function checkHealthForm(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const el of form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[data-check], input[required], select[required]')) {
    // Only a field with its sentence slot (<Checked>/<FieldNote>) is checked here, so every mark names a shown message.
    if (el.disabled || !el.id || el.closest('[hidden]') || !el.closest('.health-checked')) continue;
    const value = el.value, check = el.dataset.check as HealthCheck | undefined, label = labelOf(el);
    const message = check
      ? healthFieldIssue(check, value, {unit: el.dataset.unit, required: el.required, label})
      : !value.trim() ? (el instanceof HTMLSelectElement ? `Choose ${label ? `“${label}”` : 'an option'}.` : `Fill in ${label ? `“${label}”` : 'this field'}.`) : null;
    if (message) out[el.id] = message;
  }
  return out;
}

