import {toBech32} from '@cosmjs/encoding';
import {Registry} from '@cosmjs/proto-signing';
import {defaultRegistryTypes} from '@cosmjs/stargate';
import {TxBody, TxRaw} from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import {describe, expect, test} from 'vitest';
import {claim, delegate, redelegate, undelegate, vote, type StakingMessage} from './messages';
import {RECEIPT_MISMATCH, SIGNED_DIFFERENT, txHash, verifySignedMessages, verifyStakingReceipt} from './receipt';

// Session AF (ADR-028 H4, H61): signed bytes and receipts must be the reviewed messages.
const ME = toBech32('zig', new Uint8Array(20).fill(1)), A = toBech32('zigvaloper', new Uint8Array(20).fill(2)), B = toBech32('zigvaloper', new Uint8Array(20).fill(3));
const registry = new Registry(defaultRegistryTypes);
const signed = (messages: readonly StakingMessage[], body: {memo?: string; timeoutHeight?: bigint; extensionOptions?: {typeUrl: string; value: Uint8Array}[]} = {}) =>
  TxRaw.encode(TxRaw.fromPartial({bodyBytes: TxBody.encode(TxBody.fromPartial({messages: messages.map(m => registry.encodeAsAny(m)), memo: '', ...body})).finish(), authInfoBytes: new Uint8Array([1, 2, 3]), signatures: [new Uint8Array(64).fill(7)]})).finish();
const attr = (key: string, value: string) => ({key, value});

describe('signed bytes', () => {
  const msgs = [delegate({delegator: ME, validator: A, amount: '25'})];
  test('the reviewed messages pass, whatever fee the wallet chose', async () => {
    await expect(verifySignedMessages(msgs, signed(msgs))).resolves.toBeUndefined();
  });
  test.each([
    ['another amount', signed([delegate({delegator: ME, validator: A, amount: '26'})])],
    ['another validator', signed([delegate({delegator: ME, validator: B, amount: '25'})])],
    ['an extra message', signed([...msgs, undelegate({delegator: ME, validator: A, amount: '1'})])],
    ['no message', signed([])],
    ['a memo', signed(msgs, {memo: 'hi'})],
    ['a timeout height', signed(msgs, {timeoutHeight: 5n})],
    ['an extension option', signed(msgs, {extensionOptions: [{typeUrl: '/x', value: new Uint8Array()}]})],
    ['garbage', new Uint8Array([255, 255, 255])],
  ])('refuses %s', async (_, bytes) => {
    await expect(verifySignedMessages(msgs, bytes)).rejects.toThrow(SIGNED_DIFFERENT);
  });
});
describe('receipts', () => {
  const height = 8290600;
  const receiptOf = async (messages: readonly StakingMessage[], events: {type: string; attributes: {key: string; value: string}[]}[], code = 0) => {
    const tx = signed(messages), hash = await txHash(tx);
    return {hash, receipt: {hash, height, code, tx, events}};
  };
  test.each<[string, StakingMessage[], {type: string; attributes: {key: string; value: string}[]}[]]>([
    ['delegate', [delegate({delegator: ME, validator: A, amount: '25'})], [{type: 'delegate', attributes: [attr('validator', A), attr('amount', '25azig')]}]],
    ['undelegate', [undelegate({delegator: ME, validator: A, amount: '25'})], [{type: 'unbond', attributes: [attr('validator', A)]}]],
    ['redelegate', [redelegate({delegator: ME, source: A, destination: B, amount: '25'})], [{type: 'redelegate', attributes: [attr('source_validator', A), attr('destination_validator', B)]}]],
    ['claim all', claim({delegator: ME, validators: [A, B]}), [{type: 'withdraw_rewards', attributes: [attr('validator', A)]}, {type: 'withdraw_rewards', attributes: [attr('validator', B)]}]],
    ['vote', [vote({voter: ME, proposalId: '42', option: 'yes'})], [{type: 'proposal_vote', attributes: [attr('proposal_id', '42')]}]],
  ])('%s: hash, body and the staking event match', async (_, messages, events) => {
    const {hash, receipt} = await receiptOf(messages, events);
    await expect(verifyStakingReceipt(messages, hash, receipt)).resolves.toMatchObject({hash, height, code: 0});
  });
  test('a success without its event, a different hash, a lower-case hash or another body is refused', async () => {
    const messages = claim({delegator: ME, validators: [A, B]});
    const {hash, receipt} = await receiptOf(messages, [{type: 'withdraw_rewards', attributes: [attr('validator', A)]}]);
    await expect(verifyStakingReceipt(messages, hash, receipt)).rejects.toThrow(RECEIPT_MISMATCH);
    await expect(verifyStakingReceipt(messages, 'A'.repeat(64), receipt)).rejects.toThrow(RECEIPT_MISMATCH);
    await expect(verifyStakingReceipt(messages, hash.toLowerCase(), receipt)).rejects.toThrow(RECEIPT_MISMATCH);
    await expect(verifyStakingReceipt(claim({delegator: ME, validators: [A]}), hash, receipt)).rejects.toThrow(RECEIPT_MISMATCH);
    await expect(verifyStakingReceipt(messages, hash, {...receipt, height: 0})).rejects.toThrow(RECEIPT_MISMATCH);
  });
  test('a failed transaction (out of gas) is a proven outcome with its code, not a mismatch', async () => {
    const messages = [delegate({delegator: ME, validator: A, amount: '25'})];
    const {hash, receipt} = await receiptOf(messages, [], 11);
    await expect(verifyStakingReceipt(messages, hash, receipt)).resolves.toMatchObject({code: 11, height});
  });
});
