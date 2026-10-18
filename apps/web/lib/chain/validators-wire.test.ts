import {expect, test} from 'vitest';
import {validatorsWireSchema} from './validators-wire';

// Session AF (ADR-028 H58): the fixed wire shape of GET /api/chain/validators (lane L1 consumes it).
const validator = {
  operator: 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl', moniker: 'ZIGChain Foundation 1', website: 'https://zigchain.com',
  status: 'bonded', jailed: false, tombstoned: false, tokens: '100000000000000000000000', votingPowerShare: '0.158',
  commission: {rate: '0.05', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: '2025-10-14T08:39:33.270Z'},
  selfBond: '100000000000000000000000', uptime: {window: 35000, missed: 12, signedShare: '0.999657142857142857'},
};
const ok = {version: 1, status: 'ok', network: 'zigchain-1', height: '13044857', observedAt: '2026-10-18T20:52:35.000Z', source: 'https://api.zigchain.com', bondedTotal: '632000000000000000000000', validators: [validator]};
test('an ok answer and an unavailable one parse', () => {
  expect(validatorsWireSchema.parse(ok)).toEqual(ok);
  expect(validatorsWireSchema.parse({version: 1, status: 'unavailable', reason: 'The chain did not answer just now.', network: 'zig-test-2', source: 'https://testnet-api.zigchain.com', validators: []}).status).toBe('unavailable');
  expect(validatorsWireSchema.parse({...ok, validators: [{...validator, tombstoned: null, selfBond: null, uptime: null}]}).validators[0]!.uptime).toBeNull();
});
test.each([
  ['an unknown field', {...ok, extra: 1}],
  ['a float amount', {...ok, validators: [{...validator, tokens: '1.5'}]}],
  ['a share above 1', {...ok, validators: [{...validator, votingPowerShare: '1.2'}]}],
  ['a percentage', {...ok, validators: [{...validator, commission: {...validator.commission, rate: '5'}}]}],
  ['a number instead of a string', {...ok, bondedTotal: 632}],
  ['an account address as operator', {...ok, validators: [{...validator, operator: 'zig1akyvf3rgrcd2ycg47ae3u57nygg3zj45a7lpc2'}]}],
  ['the other network\'s source', {...ok, source: 'https://testnet-api.zigchain.com'}],
  ['ok without a height', {...ok, height: undefined}],
  ['ok with a reason', {...ok, reason: 'x'}],
  ['unavailable with validators', {...ok, status: 'unavailable', reason: 'x'}],
  ['unavailable without a reason', {...ok, status: 'unavailable', validators: []}],
  ['a validator twice', {...ok, validators: [validator, validator]}],
  ['another network', {...ok, network: 'zigchain-2'}],
])('refuses %s', (_, wire) => {
  expect(validatorsWireSchema.safeParse(wire).success).toBe(false);
});
