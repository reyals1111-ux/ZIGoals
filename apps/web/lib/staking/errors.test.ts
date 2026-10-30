import {expect, test} from 'vitest';
import {PLAIN_WORDS, abciCode, classifyStakingError, plainWords} from './errors';

// Session AF (L2 design §3): the five errors the staking screens name, in plain words, with the explorer when a hash exists.
const HASH = 'ab'.repeat(32);
test.each([
  ['rejected', Error('Request rejected')],
  ['rejected', Error('Transaction denied by the Ledger')],
  ['insufficient-fee', Error('Broadcasting transaction failed with code 13 (codespace: sdk). Log: insufficient fee; got: 1azig required: 2azig')],
  ['out-of-gas', Object.assign(Error('The chain rejected this action.'), {code: 11})],
  ['out-of-gas', Error('out of gas in location: WriteFlat; gasWanted: 100, gasUsed: 120')],
  ['sequence', Error('Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 8, got 7')],
  ['timeout', Error('Still confirming. Check the transaction on the explorer before trying again.')],
  ['insufficient-funds', Error('failed with code 5 (codespace: sdk). Log: spendable balance 1azig is smaller than 2azig: insufficient funds')],
  ['delegation', Error('Query failed with (18): invalid shares amount: invalid request')],
  ['unbonding-limit', Error('too many unbonding delegation entries for (delegator, validator) tuple')],
  ['no-account', Error('Account \'zig1…\' does not exist on chain. Send some tokens there before trying to query sequence.')],
  ['network', Error('Network or denomination changed. Signing is disabled until configuration is verified.')],
  ['unavailable', Error('Failed to fetch')],
  ['other', Error('something odd')],
])('%s ← %s', (kind, error) => {
  expect(classifyStakingError(error)).toBe(kind);
});
test('codes: own field first, then the CosmJS message', () => {
  expect(abciCode(Object.assign(Error('x'), {code: 11}))).toBe(11);
  expect(abciCode(Error('failed with code 13 (codespace: sdk)'))).toBe(13);
  expect(abciCode(Error('no code here'))).toBeUndefined();
});
test('plain words carry the explorer links of the hash on its own network', () => {
  const practice = plainWords(Error('Still confirming.'), {chainId: 'zig-test-2', hash: HASH});
  expect(practice).toEqual({kind: 'timeout', message: PLAIN_WORDS.timeout, hash: HASH.toUpperCase(), links: [{name: 'ZIGScan', url: `https://testnet.zigscan.org/tx/${HASH.toUpperCase()}`}]});
  const real = plainWords(Object.assign(Error('x'), {code: 11}), {chainId: 'zigchain-1', hash: HASH});
  expect(real.message).toBe('This needed more gas than estimated. Nothing moved, but the network fee was charged. Review again (ZIGoals adds 30 % on top of the simulation).');
  expect(real.links.map(l => l.url)).toEqual([`https://app.range.org/tx/zigchain/${HASH.toUpperCase()}`, `https://zigscan.org/tx/${HASH.toUpperCase()}`]);
  expect(plainWords(Error('Request rejected'), {chainId: 'zigchain-1', hash: 'nothex'})).toEqual({kind: 'rejected', message: 'You stopped this in your wallet. Nothing was sent.', links: []});
  // The receipt's code wins over a generic message.
  expect(plainWords(Error('The chain rejected this action.'), {chainId: 'zig-test-2', code: 13}).kind).toBe('insufficient-fee');
});
// Session AJ (ADR-035 D1, A1, P3, P4): the v6 cases, each in plain words.
test.each([
  ['The network was upgraded; checks are pending.', 'upgraded'],
  ['Your wallet changed the network fee, so nothing was sent. Review again; ZIGoals signs exactly the fee you reviewed.', 'fee-changed'],
  ['The network fee could not be read just now. Nothing was signed. Try again in a minute.', 'fee-unreadable'],
  ['The network fee is unusually high right now. Nothing was signed. Try again later.', 'fee-unreadable'],
  ['failed to execute message; message index: 0: no voting power: invalid vote', 'no-voting-power'],
])('%s → %s', (message, kind) => {
  expect(classifyStakingError(Error(message))).toBe(kind);
  expect(PLAIN_WORDS[kind as keyof typeof PLAIN_WORDS]).toMatch(/Nothing was (signed|sent)\./);
});
