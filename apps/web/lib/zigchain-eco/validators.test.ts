import {toBech32} from '@cosmjs/encoding';
import {describe, expect, it} from 'vitest';
import {readValidators} from '../server/chain-validators';
import {HEIGHT, NETWORK, lcdAnswers, lcdFetch, type Shape} from './fixtures/lcd';
import {STATUS_WORDS, TOP_N, chooserOrder, decentralisationHint, nakamotoCount, powerRanks, spreadLine, statusOf, uptimeWords, type ChooserValidator} from './validators';

const op = (i: number) => toBech32('zigvaloper', Uint8Array.from({length: 20}, (_, j) => (i * 13 + j) & 0xff));
const v = (i: number, tokens: string, over: Partial<ChooserValidator> = {}): ChooserValidator => ({operator: op(i), moniker: `Val ${String(i).padStart(2, '0')}`, status: 'bonded', jailed: false, tombstoned: false, tokens, uptime: {window: 35000, missed: i}, ...over});
// Twelve active validators, stakes 12..1 (val 01 the largest), plus a jailed, a removed and an inactive one.
const SET = [...Array.from({length: 12}, (_, i) => v(i + 1, String((12 - i) * 1000))), v(20, '99999', {jailed: true}), v(21, '50000', {tombstoned: true, jailed: true}), v(22, '1', {status: 'unbonded'})];

describe('validator chooser facts', () => {
  it('ranks active validators by stake only (jailed, removed and inactive have no rank)', () => {
    const ranks = powerRanks(SET);
    expect(ranks.size).toBe(12);
    expect(ranks.get(op(1))).toBe(1);
    expect(ranks.get(op(12))).toBe(12);
    expect(ranks.has(op(20))).toBe(false);
  });
  it('words each status, removal first', () => {
    expect(SET.slice(-3).map(statusOf)).toEqual(['jailed', 'tombstoned', 'inactive']);
    expect(statusOf(v(1, '1', {status: 'unbonding'}))).toBe('leaving');
    expect(STATUS_WORDS.tombstoned.label).toBe('Removed for good');
  });
  it('counts the fewest validators holding more than a third (the Nakamoto count)', () => {
    // total 78,000; a third is 26,000: 12,000 + 11,000 = 23,000 is not more, + 10,000 = 33,000 is.
    expect(nakamotoCount(SET)).toBe(3);
    expect(nakamotoCount([v(1, '10'), v(2, '10'), v(3, '10')])).toBe(2);
    expect(nakamotoCount([v(1, '100'), v(2, '1')])).toBe(1);
    expect(nakamotoCount([])).toBeNull();
    expect(spreadLine(SET)).toMatch(/^3 validators together hold more than a third/);
    expect(spreadLine([v(1, '100'), v(2, '1')])).toMatch(/^One validator alone/);
  });
  it('hints gently only for the 10 largest, and only when there are more than 10', () => {
    expect(decentralisationHint(1, 12)).toBe(`One of the ${TOP_N} largest validators (number 1 by stake). Choosing one outside the ${TOP_N} largest helps keep ZIGChain in many hands.`);
    expect(decentralisationHint(11, 12)).toBeNull();
    expect(decentralisationHint(1, 9)).toBeNull();
    expect(decentralisationHint(undefined, 12)).toBeNull();
  });
  it('orders by name, or outside the 10 largest first — never by return', () => {
    expect(chooserOrder(SET, false).slice(0, 3).map(x => x.moniker)).toEqual(['Val 01', 'Val 02', 'Val 03']);
    const gentle = chooserOrder(SET, true).map(x => x.moniker);
    expect(gentle.slice(0, 2)).toEqual(['Val 11', 'Val 12']);
    expect(gentle.slice(-3)).toEqual(['Val 20', 'Val 21', 'Val 22']);
    // With 10 or fewer active validators there is no "outside": the name order stays.
    const few = SET.slice(0, 5);
    expect(chooserOrder(few, true).map(x => x.moniker)).toEqual(chooserOrder(few, false).map(x => x.moniker));
  });
  it('says uptime in words, unknown as unavailable', () => {
    expect(uptimeWords({window: 35000, missed: 1234})).toBe('Missed 1,234 of the last 35,000 blocks');
    expect(uptimeWords({window: 35000, missed: 0})).toBe('Missed no blocks of the last 35,000');
    expect(uptimeWords(null)).toBe('Uptime unavailable');
    expect(uptimeWords({window: 0, missed: 0})).toBe('Uptime unavailable');
  });
});

describe.each(['v5.1', 'v6.0'] as const)('from the validators route on a %s LCD', (shape: Shape) => {
  it('reads the same facts the chooser needs', async () => {
    const answers = lcdAnswers(shape);
    const fetcher = lcdFetch(shape, {
      '/cosmos/slashing/v1beta1/signing_infos': {info: [], pagination: {next_key: null, total: '0'}},
      '/cosmos/slashing/v1beta1/params': {params: {signed_blocks_window: '35000', min_signed_per_window: '0.800000000000000000', downtime_jail_duration: '600s', slash_fraction_double_sign: '0.000500000000000000', slash_fraction_downtime: '0.000100000000000000'}},
      '/cosmos/staking/v1beta1/pool': {pool: {not_bonded_tokens: '0', bonded_tokens: '1000000000000000000000000'}},
    });
    expect(answers['/cosmos/base/tendermint/v1beta1/node_info']).toMatchObject({application_version: {version: NETWORK[shape].version}});
    const wire = await readValidators(NETWORK[shape].chainId, fetcher);
    expect(wire).toMatchObject({status: 'ok', height: HEIGHT, network: NETWORK[shape].chainId});
    const list = wire.validators.map(x => ({...x, uptime: x.uptime}));
    expect(powerRanks(list).size).toBe(2);
    expect(nakamotoCount(list)).toBe(1);
    expect(list.map(x => uptimeWords(x.uptime))).toEqual(['Uptime unavailable', 'Uptime unavailable']);
  });
});
