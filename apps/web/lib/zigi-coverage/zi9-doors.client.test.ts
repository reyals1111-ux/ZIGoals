// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach, expect, test} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {AskZigiCorner, AskZigiItem, ExplainCardItem} from '../../components/ai/ask-zigi-item';

// Session AK F0 (ADR-034 ZI9 with D-059, D-030, B-125, N-203; the "no new test found" row): every "Ask ZIGi" door follows
// the launcher live — none while ZIGi is off, hidden or on a private screen (the root has no data-zigi-launcher="shown"),
// each one back once it shows — and the global rule hides the CSS-only doors the same way.
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
const roots: Root[] = [];
afterEach(() => { act(() => { for (const r of roots.splice(0)) r.unmount(); }); document.body.innerHTML = ''; document.documentElement.removeAttribute('data-zigi-launcher'); });
const doors = () => createElement('div', null,
  createElement(AskZigiItem, {kind: 'habit', metric: 'streak', name: 'Read'}),
  createElement(AskZigiCorner, {kind: 'habit-history', metric: 'history', label: 'your habit history'}),
  createElement(ExplainCardItem, {card: {id: 'today-water', label: 'Water'}}));
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
test('no door while the launcher is not shown; all three once it shows; gone again when it is hidden', async () => {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); roots.push(root);
  await act(async () => { root.render(doors()); });
  expect(host.querySelectorAll('button')).toHaveLength(0);
  document.documentElement.setAttribute('data-zigi-launcher', 'shown'); await settle();
  expect([...host.querySelectorAll('button')].map(b => b.textContent)).toEqual(['Ask ZIGi about this', 'Ask ZIGi', 'Explain this card']);
  document.documentElement.setAttribute('data-zigi-launcher', 'hidden'); await settle();
  expect(host.querySelectorAll('button')).toHaveLength(0);
});
test('a goal or habit door needs its name; an unknown kind without a card has none', async () => {
  document.documentElement.setAttribute('data-zigi-launcher', 'shown');
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); roots.push(root);
  await act(async () => { root.render(createElement('div', null, createElement(AskZigiItem, {kind: 'habit', metric: 'streak', name: '  '}), createElement(AskZigiItem, {kind: 'not-a-kind', metric: 'x'}))); });
  expect(host.querySelectorAll('button')).toHaveLength(0);
});
test('the global rule hides the CSS doors whenever the launcher is not shown', () => {
  const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8').replace(/\s+/g, ' ');
  expect(css).toContain('html:not([data-zigi-launcher="shown"]) .ai-ask-link, html:not([data-zigi-launcher="shown"]) .page-ask-zigi { display: none !important; }');
});
