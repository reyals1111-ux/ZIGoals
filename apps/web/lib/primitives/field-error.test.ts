// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement, Fragment, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {FieldError, useFormErrors, type FormErrors} from '../../components/primitives/field-error';
import {validateValue} from '../limits/plausibility';
import {focusFirstInvalid} from './field-focus';

/** Session AL (3d, BUG-009): the message under its field, aria wired, the first invalid field revealed, cleared on edit. */
let host: HTMLDivElement, root: Root, form: FormErrors, reduced = false;
const scrolled: {id: string; options: ScrollIntoViewOptions}[] = [];
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({matches: reduced}));
  Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) { scrolled.push({id: this.id, options: options as ScrollIntoViewOptions}); };
  scrolled.length = 0; reduced = false; delete document.documentElement.dataset.appMotion;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
function Form() {
  const f = useFormErrors();
  useEffect(() => { form = f; });
  return createElement(Fragment, null,
    createElement('input', {...f.field('weight'), 'data-name': 'weight'}), createElement(FieldError, f.message('weight')),
    createElement('input', {...f.field('note', {describedBy: 'hint'}), 'data-name': 'note'}), createElement(FieldError, f.message('note')));
}
const input = (name: string) => host.querySelector<HTMLInputElement>(`[data-name=${name}]`)!;

test('a failed submit shows each message right after its field, wires aria, focuses and scrolls to the first', async () => {
  await act(async () => root.render(createElement(Form)));
  let out: unknown;
  // Given out of page order: the focus still goes to the first field on the page.
  await act(async () => { out = form.validate({note: validateValue('note', 'x'.repeat(600)), weight: validateValue('weight', '900')}); });
  expect(out).toBeNull();
  const weight = input('weight'), msg = weight.nextElementSibling as HTMLElement;
  expect(msg.className).toBe('field-error');
  expect(msg.textContent).toBe('Enter a weight from 20 to 400 kg.');
  expect(weight.getAttribute('aria-invalid')).toBe('true');
  expect(weight.getAttribute('aria-describedby')).toBe(msg.id);
  expect(input('note').getAttribute('aria-describedby')).toBe(`hint ${input('note').nextElementSibling!.id}`);
  expect(document.activeElement).toBe(weight);
  expect(scrolled.at(-1)).toEqual({id: weight.id, options: {block: 'center', inline: 'nearest', behavior: 'smooth'}});
});
test('typing in a field clears its own message only', async () => {
  await act(async () => root.render(createElement(Form)));
  await act(async () => { form.fail({weight: 'Enter a weight.', note: 'Too long.'}); });
  await act(async () => { input('weight').dispatchEvent(new Event('input', {bubbles: true})); });
  expect(input('weight').hasAttribute('aria-invalid')).toBe(false);
  expect(input('weight').nextElementSibling?.className).not.toBe('field-error');
  expect(input('note').getAttribute('aria-invalid')).toBe('true');
});
test('all valid: values come back in base units and messages clear', async () => {
  await act(async () => root.render(createElement(Form)));
  let out: {weight: number; note: string} | null = null;
  await act(async () => { out = form.validate({weight: validateValue('weight', '160', 'lb'), note: validateValue('note', ' fine ')}); });
  expect(out!.note).toBe('fine');
  expect(out!.weight).toBeCloseTo(72.57, 2);
  expect(host.querySelector('.field-error')).toBeNull();
});
test('reduced motion or Motion Off: the page jumps instead of gliding; a disabled field is skipped', async () => {
  reduced = true;
  document.body.innerHTML += '<input id="a" disabled><input id="b">';
  expect(focusFirstInvalid(['a', 'b'])?.id).toBe('b');
  expect(scrolled.at(-1)!.options.behavior).toBe('auto');
  reduced = false; document.documentElement.dataset.appMotion = 'off';
  focusFirstInvalid(['b']);
  expect(scrolled.at(-1)!.options.behavior).toBe('auto');
  expect(focusFirstInvalid(['missing'])).toBeNull();
  document.getElementById('a')!.remove(); document.getElementById('b')!.remove();
});
test('a field inside a closed details is opened before it is focused', () => {
  const details = document.createElement('details'), field = document.createElement('input');
  field.id = 'inside'; details.append(document.createElement('summary'), field); document.body.append(details);
  focusFirstInvalid(['inside']);
  expect(details.open).toBe(true);
  expect(document.activeElement).toBe(field);
  details.remove();
});
