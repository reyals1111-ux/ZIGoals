// @vitest-environment jsdom
import {afterEach, describe, expect, test} from 'vitest';
import {act, createElement, createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {readFileSync} from 'node:fs';
import {addPlace, forgetPayeeAt, forgetPlaces, keepPayeeAt, payeesAt, placesOf, removePlace} from './places';
import {MONEY_MORE_KEY, moneyMoreSchema, type MoneyMore} from '../money-more/schema';
import type {MoneyEntry} from './schema';
import PlacePicker, {type KeepPayee} from '../../components/wealth/spending/places';

/**
 * Session AV lane 2, round 4 (money; Actual's payee locations, LEDGER #346, typed place names only): places are names the
 * person typed, kept with their payees on the money extras record — never on an entry, never a location.
 */
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { localStorage.clear(); document.body.innerHTML = ''; });
let n = 0;
const e = (note: string, category = 'Food & drink'): MoneyEntry => ({id: `p${n++}`, kind: 'expense', amount: '4.00', currency: 'EUR', category, note, date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z'});

describe('payee places (#346)', () => {
  const base = addPlace(addPlace({version: 1}, ' Work ', 'w'), 'The market', 'm');
  test('add, keep a payee once (newest first), forget one, remove, forget all; the record reads', () => {
    expect(placesOf(base).map(p => p.name)).toEqual(['Work', 'The market']);
    expect(() => addPlace(base, 'work', 'x')).toThrow('Work is already one of your places.');
    let more = keepPayeeAt(keepPayeeAt(keepPayeeAt(base, 'w', 'Canteen · card 1234'), 'w', 'Coffee corner'), 'w', 'canteen');
    expect(placesOf(more)[0]!.payees).toEqual(['canteen', 'Coffee corner']);
    expect(keepPayeeAt(more, 'nope', 'X')).toBe(more);
    more = forgetPayeeAt(more, 'w', 'Coffee corner');
    expect(placesOf(more)[0]!.payees).toEqual(['canteen']);
    expect(moneyMoreSchema.parse(more)).toEqual(more);
    expect(placesOf(removePlace(more, 'w')).map(p => p.id)).toEqual(['m']);
    expect(forgetPlaces(more)).toEqual({version: 1});
    expect(removePlace(removePlace(more, 'w'), 'm')).toEqual({version: 1});
  });
  test('the payees at a place, the most logged first, with their category before', () => {
    const more = keepPayeeAt(keepPayeeAt(base, 'w', 'Coffee corner'), 'w', 'Canteen');
    const entries = [e('Coffee corner'), e('Coffee corner · card'), e('Canteen', 'Groceries')];
    expect(payeesAt(more, 'w', entries, 'expense')).toEqual([{payee: 'Coffee corner', times: 2, category: 'Food & drink'}, {payee: 'Canteen', times: 1, category: 'Groceries'}]);
    expect(payeesAt(more, 'm', entries, 'expense')).toEqual([]);
  });
  test('nothing reads where the person is: no geolocation, no coordinates, no outside service', () => {
    for (const file of ['lib/money-log/places.ts', 'components/wealth/spending/places.tsx']) {
      const src = readFileSync(`${process.cwd().endsWith('web') ? '' : 'apps/web/'}${file}`, 'utf8');
      expect(src).not.toMatch(/geolocation|getCurrentPosition|watchPosition|latitude|longitude|fetch\(/);
    }
  });
  test('the picker: a place lists its payees, a tap fills the note, Save keeps the payee there', async () => {
    const more: MoneyMore = keepPayeeAt(base, 'w', 'Canteen');
    localStorage.setItem(MONEY_MORE_KEY, JSON.stringify(more));
    const box = document.createElement('div'); document.body.append(box);
    const keep = createRef<KeepPayee>() as {current: KeepPayee}, filled: string[] = [], said: string[] = [];
    const root = createRoot(box);
    await act(async () => { root.render(createElement(PlacePicker, {kind: 'expense', entries: [e('Canteen')], onPayee: (p: string) => { filled.push(p); }, keepRef: keep, say: (text: string) => { said.push(text); }})); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(box.querySelector('legend')?.textContent).toBe('Where are you? — optional');
    const work = [...box.querySelectorAll('label')].find(l => l.textContent === 'Work')!.querySelector('input')!;
    await act(async () => { work.click(); });
    const canteen = [...box.querySelectorAll('button')].find(b => b.textContent?.startsWith('Canteen'))!;
    await act(async () => { canteen.click(); });
    expect(filled).toEqual(['Canteen']);
    // Session AV lane 2 (CI run 2007): the picker speaks through Spending's one status line (`say`), with no line of its own.
    expect(said).toEqual(['Canteen is in the note, and Food & drink offered.']);
    expect(box.querySelector('[role="status"]')).toBeNull();
    expect(typeof keep.current).toBe('function');
    await act(async () => { keep.current!('Bakery Bart · pin'); });
    expect(JSON.parse(localStorage.getItem(MONEY_MORE_KEY)!).places[0].payees).toEqual(['Bakery Bart', 'Canteen']);
    await act(async () => { root.unmount(); });
  });
});
