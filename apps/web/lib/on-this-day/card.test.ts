// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import OnThisDay from '../../components/journal/on-this-day';
import {HIDE_FULL_NOTE, JOURNAL_DISPLAY_KEY, MAX_HIDDEN_MEMORIES} from './store';

/** Session AK (BUILD list 2 #3): the Journal card — away when nothing matches; "Not this one" and "Hide" kept on the device. */
let root: Root;
beforeEach(() => { (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; root = createRoot(document.body.appendChild(document.createElement('div'))); });
afterEach(async () => { await act(async () => root.unmount()); localStorage.clear(); document.body.innerHTML = ''; });
const settle = async () => { for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const entries = [{id: 'a', date: '2025-10-31', text: 'A year ago today.'}, {id: 'b', date: '2024-10-31', text: 'Two years ago today.'}];

test('shows the memories with energy and mood words; "Not this one" sets one aside; "Hide" hides it all', async () => {
  await act(async () => { root.render(h(OnThisDay, {entries, today: '2026-10-31', energy: {'2025-10-31': {energy: 4}}, moods: {'2025-10-31': 3}})); }); await settle();
  const card = document.querySelector('details.on-this-day')!;
  expect(card.textContent).toContain('On this day');
  expect(card.textContent).toContain('A year ago today.');
  expect(card.textContent).toContain('Energy: good');
  expect(card.textContent).toContain('2 years ago');
  const notThis = [...card.querySelectorAll('button')].find(b => b.textContent === 'Not this one')!;
  await act(async () => { notThis.click(); }); await settle();
  expect(JSON.parse(localStorage.getItem(JOURNAL_DISPLAY_KEY)!).hidden).toEqual(['a']);
  expect(document.body.textContent).not.toContain('A year ago today.');
  const hide = [...document.querySelectorAll('button')].find(b => b.textContent === 'Hide “On this day”')!;
  await act(async () => { hide.click(); }); await settle();
  expect(JSON.parse(localStorage.getItem(JOURNAL_DISPLAY_KEY)!).onThisDay).toBe(false);
  expect(document.querySelector('details.on-this-day')).toBeNull();
});
test('nothing matches: nothing is shown and nothing is written', async () => {
  await act(async () => { root.render(h(OnThisDay, {entries, today: '2026-10-30', energy: {}, moods: {}})); }); await settle();
  expect(document.querySelector('details.on-this-day')).toBeNull();
  expect(localStorage.getItem(JOURNAL_DISPLAY_KEY)).toBeNull();
});
test('a 501st "Not this one" is refused with a calm line; nothing set aside comes back', async () => {
  const hidden = Array.from({length: MAX_HIDDEN_MEMORIES}, (_, i) => `old${i}`);
  localStorage.setItem(JOURNAL_DISPLAY_KEY, JSON.stringify({version: 1, hidden}));
  const all = [...entries, ...hidden.map((id, i) => ({id, date: `2020-01-${String(i % 28 + 1).padStart(2, '0')}`, text: 'Old.'}))];
  await act(async () => { root.render(h(OnThisDay, {entries: all, today: '2026-10-31', energy: {}, moods: {}})); }); await settle();
  const notThis = [...document.querySelectorAll('button')].find(b => b.textContent === 'Not this one')!;
  await act(async () => { notThis.click(); }); await settle();
  expect(document.body.textContent).toContain(HIDE_FULL_NOTE);
  expect(document.body.textContent).toContain('A year ago today.');
  expect(JSON.parse(localStorage.getItem(JOURNAL_DISPLAY_KEY)!).hidden).toEqual(hidden);
});
