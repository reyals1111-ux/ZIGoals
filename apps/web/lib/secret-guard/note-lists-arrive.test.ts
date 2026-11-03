// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {wordListsFor} from './word-lists';
import {KOREAN} from './wordlists/korean';

/**
 * Session AK (lane FU; G7 follow-up, security review F10): the guard's line under a field is read again when the word list
 * its text needs arrives, without another keystroke. This file runs in its own module, so no list is loaded at first.
 */
const everyday = 'eggs milk bread butter apples rice beans pasta flour sugar salt honey';
const ko = KOREAN.split(' ').slice(50, 62).join(' ');
let root: Root;
// The Latin lists arrive only when the test lets them, so "cautious while its list loads" is a moment that always exists
// (on a busy runner they could arrive inside the first render's act and the moment was gone).
const gate = vi.hoisted(() => { let release = () => {}; const held = new Promise<void>(r => { release = r; }); return {held, release: () => release()}; });
vi.mock('./wordlists/latin', async importOriginal => { await gate.held; return importOriginal(); });
// Waits up to 15 s for both lists (the 3 s it had was too short when other test files load at the same time).
const settle = async () => { for (let i = 0; i < 1500 && !(wordListsFor('latin') && wordListsFor('hangul')); i++) await act(async () => { await new Promise(r => setTimeout(r, 10)); }); await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
beforeEach(() => { (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; root = createRoot(document.body.appendChild(document.createElement('div'))); });
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; });

test('a pasted everyday list warns while its list loads, then the warning goes on its own; Korean recovery words keep theirs', {timeout: 20_000}, async () => {
  const {default: SecretGuardNote} = await import('../../components/secret-guard/secret-guard-note');
  expect(wordListsFor('latin')).toBeNull();
  // Two notes at once: one with an everyday list, one with Korean recovery words.
  await act(async () => { root.render(h('div', null, h('section', {id: 'list'}, h(SecretGuardNote, {text: everyday})), h('section', {id: 'ko'}, h(SecretGuardNote, {text: ko})))); });
  expect(document.querySelector('#list .secret-guard')).not.toBeNull(); // cautious until the Latin lists are here
  expect(document.querySelector('#ko .secret-guard')).not.toBeNull();
  gate.release();
  await settle(); // no new props, no keystroke: only the lists arriving
  expect(wordListsFor('latin')).not.toBeNull();
  expect(wordListsFor('hangul')).not.toBeNull();
  expect(document.querySelector('#list .secret-guard')).toBeNull();
  expect(document.querySelector('#ko .secret-guard')?.getAttribute('data-kind')).toBe('words');
});
