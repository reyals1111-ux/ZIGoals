// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {CardForm} from '../../components/wealth/credit-card';
import {LimitForm} from '../../components/wealth/account-limits';
import type {Account} from '../accounts/schema';
import {WEALTH_SHEET_KEY} from './schema';

/**
 * Review b3a #3 (Session AV lane 2, round 3, LEDGER #293): a credit card's Sheet and the balance lines open with what is
 * kept (the form waits for the record to load), and changing one field keeps the others.
 */
const ID = '00000000-0000-4000-8000-0000000000c1', at = '2026-11-01T10:00:00.000Z';
const card: Account = {id: ID, kind: 'credit-card', name: 'Everyday Card', currency: 'EUR', snapshots: [], payments: [], createdAt: at, updatedAt: at};
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const field = (label: RegExp) => [...element.querySelectorAll('label')].find(l => label.test(l.textContent ?? ''))!.querySelector('input')!;
const type = async (input: HTMLInputElement, value: string) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', {bubbles: true})); }); };
const submit = async () => { await act(async () => { element.querySelector('form')!.requestSubmit(); }); await settle(); };
const stored = () => JSON.parse(localStorage.getItem(WEALTH_SHEET_KEY) ?? 'null');

test('the card form opens with the kept limit and days; changing the due day keeps the limit and statement day', async () => {
  localStorage.setItem(WEALTH_SHEET_KEY, JSON.stringify({version: 1, cards: {[ID]: {limit: '2000.00', statementDay: 5, dueDay: 25}}}));
  await act(async () => root.render(h(CardForm, {account: card, today: '2026-11-14'})));
  await settle();
  expect([field(/^Credit limit/).value, field(/^Statement day/).value, field(/^Payment due day/).value]).toEqual(['2000.00', '5', '25']);
  await type(field(/^Payment due day/), '28');
  await submit();
  expect(stored().cards).toEqual({[ID]: {limit: '2000.00', statementDay: 5, dueDay: 28}});
});
test('the balance lines open with the kept lines; changing one keeps the other', async () => {
  localStorage.setItem(WEALTH_SHEET_KEY, JSON.stringify({version: 1, limits: {[ID]: {below: '500.00', above: '20000.00'}}}));
  await act(async () => root.render(h(LimitForm, {account: {...card, kind: 'savings'}})));
  await settle();
  expect([field(/below/).value, field(/^Or above/).value]).toEqual(['500.00', '20000.00']);
  await type(field(/below/), '600');
  await submit();
  expect(stored().limits).toEqual({[ID]: {below: '600.00', above: '20000.00'}});
});
