import {expect, test} from 'vitest';
import {emptyReceipts, receiptOf, receiptsSchema, receivedBy, setReceipt} from './receipts';

test('Session AI (J15): what a transfer in was, beside the transaction; loose; un-named with null', () => {
  let r = setReceipt(emptyReceipts(), 'tx1', 'reward');
  r = setReceipt(r, 'tx2', 'airdrop');
  expect(receiptOf(r, 'tx1')).toBe('reward');
  expect(receivedBy(r, [{id: 'tx1', kind: 'transfer-in', quantity: '1.5'}, {id: 'tx2', kind: 'transfer-in', quantity: '10'}, {id: 'tx3', kind: 'buy', quantity: '2'}])).toEqual({reward: 1.5, airdrop: 10});
  expect(setReceipt(r, 'tx1', null).kinds).toEqual({tx2: 'airdrop'});
  const later = receiptsSchema.parse({version: 1, kinds: {tx9: 'gift'}, extra: 1});
  expect(receiptOf(later, 'tx9')).toBeNull(); expect(later).toMatchObject({extra: 1, kinds: {tx9: 'gift'}});
});
