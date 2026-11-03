// @vitest-environment jsdom
import {afterEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';

// Session AK F0 (ADR-034 ZI8 with D-092, D-242, M-019, M-020, ST5; the "no test found" row): the chooser's result is
// worded as information ("Fits your answers", never "our suggestion"), is brought into view when it appears (motion
// follows reduced motion and Motion Off), and offers "Set this up" and "Start over".
vi.mock('next/link', () => ({default: ({href, children, ...rest}: {href: string; children: unknown}) => createElement('a', {href, ...rest}, children as never)}));
const {default: SetupChooser} = await import('../../components/ai/setup-chooser');
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
const roots: Root[] = [];
afterEach(() => { act(() => { for (const r of roots.splice(0)) r.unmount(); }); document.body.innerHTML = ''; delete document.documentElement.dataset.appMotion; });
const scrolls: ScrollIntoViewOptions[] = [];
Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) { scrolls.push(typeof options === 'object' ? options : {}); };
async function mount() {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); roots.push(root);
  await act(async () => { root.render(createElement(SetupChooser)); });
  return host;
}
async function answer(host: HTMLElement, label: string) {
  const option = [...host.querySelectorAll('label')].find(l => l.textContent === label)?.querySelector('input');
  if (!option) throw new Error(`no option "${label}"`);
  await act(async () => { option.click(); });
}
test('the result says "Fits your answers", is scrolled into view, and offers Set this up and Start over', async () => {
  scrolls.length = 0;
  const host = await mount();
  expect(host.querySelector('.ai-chooser-result')).toBeNull();
  await answer(host, 'An API account with an AI provider');
  await answer(host, 'On a phone');
  await answer(host, 'The best answers');
  const result = host.querySelector<HTMLElement>('article.ai-chooser-result')!;
  expect(result.getAttribute('aria-label')).toBe('Recommendation');
  expect(result.querySelector('.eyebrow')?.textContent).toBe('Fits your answers');
  expect(result.textContent).not.toMatch(/our suggestion|we recommend/i);
  expect(scrolls).toEqual([{block: 'nearest', behavior: 'smooth'}]);
  const setUp = [...result.querySelectorAll('a')].find(a => a.textContent === 'Set this up')!;
  expect(setUp.getAttribute('href')).toBe('/app/settings#your-ai');
  const again = [...result.querySelectorAll('button')].find(b => b.textContent === 'Start over')!;
  await act(async () => { again.click(); });
  expect(host.querySelector('.ai-chooser-result')).toBeNull();
  expect(host.querySelectorAll('input:checked')).toHaveLength(0);
});
test('with Motion Off the result comes into view without a smooth scroll', async () => {
  scrolls.length = 0;
  document.documentElement.dataset.appMotion = 'off';
  const host = await mount();
  await answer(host, 'Nothing yet');
  await answer(host, 'On a phone');
  await answer(host, 'No extra cost');
  expect(host.querySelector('article.ai-chooser-result')).not.toBeNull();
  expect(scrolls).toEqual([{block: 'nearest', behavior: 'auto'}]);
});
