import {expect, test} from 'vitest';
import {accountsForGoal} from './account-funding';
import {addAccount, editAccount} from '../accounts/net-worth';
import {emptyAccounts} from '../accounts/schema';

const at = '2026-11-08T10:00:00.000Z', id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const money = (value: bigint) => ({value, decimals: 2, date: '2026-11-08'});

test('Session AL (RR-2): a cash or savings balance in the goal currency is offered as a Cash asset draft; nothing else is', () => {
  let g = emptyAccounts();
  g = addAccount(g, {id: id(1), kind: 'savings', name: 'ING Savings', currency: 'USD', balance: money(240000n)}, at);
  g = addAccount(g, {id: id(2), kind: 'savings', name: 'Euro pot', currency: 'EUR', balance: money(5000n)}, at);
  g = addAccount(g, {id: id(3), kind: 'cash', name: 'Wallet', currency: 'USD'}, at);
  g = addAccount(g, {id: id(4), kind: 'pension', name: 'Pension', currency: 'USD', balance: money(900000n)}, at);
  g = addAccount(g, {id: id(5), kind: 'loan', name: 'Car loan', currency: 'USD', balance: money(100000n)}, at);
  g = addAccount(g, {id: id(6), kind: 'cash', name: 'Old', currency: 'USD', balance: money(100n)}, at);
  g = editAccount(g, id(6), {archived: true}, at);
  const offers = accountsForGoal(g, 'usd', '2026-11-08');
  expect(offers.map(o => o.name)).toEqual(['ING Savings', 'Euro pot', 'Wallet', 'Pension']); // no debt, nothing archived
  expect(offers[0]!.draft).toEqual({category: 'Cash', name: 'ING Savings', quantity: '2400.00', currency: 'USD', notes: 'Recorded from the Wealth account “ING Savings” (balance on 2026-11-08).'});
  expect(offers[1]).toMatchObject({why: 'in EUR, and this goal counts USD'});
  expect(offers[1]!.draft).toBeUndefined();
  expect(offers[2]).toMatchObject({why: 'no balance recorded yet'}); // unknown is never zero
  expect(offers[3]).toMatchObject({why: 'not a cash or savings balance'});
});
