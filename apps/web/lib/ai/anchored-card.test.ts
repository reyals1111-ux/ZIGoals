// @vitest-environment jsdom
import {afterEach, expect, test} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {useAnchoredCard} from '../../components/ai/ai-settings';

/**
 * Session AV lane 2 (ADR-045, zigi-voice-z:199): Settings → ZIGi's cards that the address names (#zigi-voice, #zigi-notes…)
 * are open in their very first render, not one effect later; any other card starts closed, and a later change of the
 * address still opens its card.
 */
const renders: boolean[] = [];
// jsdom has no scrolling; the card scrolls itself into view at the next frame.
HTMLElement.prototype.scrollIntoView ??= () => {};
function Card({anchor}: {anchor: string}) {
  const {open, setOpen, card} = useAnchoredCard(anchor);
  renders.push(open);
  return h('details', {ref: card, id: anchor, open, onToggle: (e: {currentTarget: HTMLDetailsElement}) => setOpen(e.currentTarget.open)}, h('summary', null, anchor));
}
afterEach(() => { renders.length = 0; window.location.hash = ''; document.body.innerHTML = ''; });

test('the card the address names is open in its first render; another card starts closed', async () => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  window.location.hash = '#zigi-voice';
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  await act(async () => { root.render(h(Card, {anchor: 'zigi-voice'})); });
  expect(renders[0]).toBe(true);
  expect(host.querySelector('details')!.hasAttribute('open')).toBe(true);
  await act(async () => root.unmount());
  renders.length = 0;
  const other = createRoot(host);
  await act(async () => { other.render(h(Card, {anchor: 'zigi-notes'})); });
  expect(renders.every(open => !open)).toBe(true);
  // A later address that names it opens it.
  await act(async () => { window.location.hash = '#zigi-notes'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(host.querySelector('details')!.hasAttribute('open')).toBe(true);
  await act(async () => other.unmount());
});
