// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {wordListsFor} from '../secret-guard/word-lists';
import {KOREAN} from '../secret-guard/wordlists/korean';

/**
 * Session AK (lane FU; G7 follow-up, security review F10): the emergency sheet loads the Korean, Japanese and Chinese word
 * lists itself as it opens, so Korean recovery words are caught there without another page having loaded the list. This
 * file runs in its own module, so no list is loaded at first.
 */
const ko = KOREAN.split(' ').slice(50, 62).join(' ');
let root: Root;
const wait = async (ms = 10, times = 40, until = () => false) => { for (let i = 0; i < times && !until(); i++) await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
function type(el: HTMLTextAreaElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', {bubbles: true}));
}
beforeEach(() => { (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear(); root = createRoot(document.body.appendChild(document.createElement('div'))); });
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; localStorage.clear(); });

test('opening the sheet loads the CJK lists (not the Latin ones it does not use); Korean words in the note are named and refused', {timeout: 20_000}, async () => {
  expect(wordListsFor('hangul')).toBeNull();
  const {default: EmergencySheetPanel} = await import('../../components/wealth/money-tools/emergency-sheet');
  await act(async () => { root.render(h(EmergencySheetPanel)); });
  await wait(10, 300, () => !!(wordListsFor('hangul') && wordListsFor('kana') && wordListsFor('han') && document.querySelector('textarea')));
  expect(wordListsFor('hangul')).not.toBeNull(); // loaded on open, before anything is typed
  expect(wordListsFor('kana')).not.toBeNull();
  expect(wordListsFor('han')).not.toBeNull();
  expect(wordListsFor('latin')).toBeNull();
  const note = document.querySelector('textarea')!;
  await act(async () => { type(note, ko); });
  expect(document.querySelector('.emergency-warnings')?.textContent).toContain('The note');
  const saveButton = [...document.querySelectorAll('button')].find(b => b.textContent === 'Save notes')!;
  await act(async () => { saveButton.click(); });
  await wait(5, 4);
  expect(document.body.textContent).toContain('Not saved: take out what looks like a key or recovery words first.');
  for (let k = 0; k < localStorage.length; k++) expect(localStorage.getItem(localStorage.key(k)!) ?? '').not.toContain(ko.split(' ')[0]);
});
