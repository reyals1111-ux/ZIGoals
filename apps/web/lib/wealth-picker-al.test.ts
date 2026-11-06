// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {AssetPicker} from '../components/platform/asset-picker';

/** Session AL (TK-014, DV-144, P-TK-49): the Add asset form marks the field it refuses, and asks once about a huge value. */
vi.mock('next/link', () => ({default: ({href, children, ...rest}: {href: string; children: unknown}) => createElement('a', {href, ...rest}, children as never)}));
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  vi.stubGlobal('fetch', async () => new Response('{}', {status: 503}));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  Element.prototype.scrollIntoView = () => {};
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const setValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', {bubbles: true}));
};
const input = (selector: string) => host.querySelector<HTMLInputElement>(selector)!;
const submit = async () => { await act(async () => { host.querySelector<HTMLButtonElement>('form button.primary')!.click(); }); };
async function custom(onDraft: (p: unknown) => void) {
  await act(async () => root.render(createElement(AssetPicker, {initialCategory: 'Custom', onDraft, submitLabel: 'Save asset'})));
  setValue(input('input[name=name]'), 'Painting');
}

test('TK-014: an invented currency is refused at its own field, which is marked invalid and points at the message', async () => {
  const onDraft = vi.fn();
  await custom(onDraft);
  setValue(input('input[name=value]'), '1500');
  await act(async () => { setValue(input('input[aria-label="Other valuation currency"]'), 'XYZ'); });
  await submit();
  const currency = input('input[aria-label="Other valuation currency"]');
  expect(currency.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(currency.getAttribute('aria-describedby')!)!.textContent).toContain('“XYZ” is not a currency code ZIGoals knows');
  expect(onDraft).not.toHaveBeenCalled();
});

test('DV-144: an empty value or a zero quantity says what to enter, under its field', async () => {
  const onDraft = vi.fn();
  await custom(onDraft);
  await submit();
  expect(input('input[name=value]').getAttribute('aria-invalid')).toBe('true');
  expect(host.textContent).toContain('Enter the total holding value.');
  setValue(input('input[name=value]'), '100');
  setValue(input('input[name=quantity]'), '0');
  await submit();
  expect(input('input[name=quantity]').getAttribute('aria-invalid')).toBe('true');
  expect(host.textContent).toContain('Enter a quantity above 0.');
  expect(onDraft).not.toHaveBeenCalled();
});

test('P-TK-49 (W6): a value of a billion or more asks once; "Keep this amount" saves it as typed', async () => {
  const onDraft = vi.fn();
  await custom(onDraft);
  setValue(input('input[name=value]'), '5000000000');
  await submit();
  expect(onDraft).not.toHaveBeenCalled();
  const note = host.querySelector('.plausible-check')!;
  expect(note.getAttribute('role')).toBe('status');
  expect(note.textContent).toContain('$5,000,000,000.00 is more than a billion');
  expect(input('input[name=value]').getAttribute('aria-describedby')).toContain(note.id);
  await act(async () => { note.querySelector('button')!.click(); });
  expect(onDraft).toHaveBeenCalledTimes(1);
  expect(host.querySelector('.plausible-check')).toBeNull();
});

test('P-TK-49: an ordinary value saves at once, with no question', async () => {
  const onDraft = vi.fn();
  await custom(onDraft);
  setValue(input('input[name=value]'), '250000');
  await submit();
  expect(onDraft).toHaveBeenCalledTimes(1);
});
