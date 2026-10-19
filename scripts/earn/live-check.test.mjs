import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {liveCheck, replay} from './live-check.mjs';

// Session AF chunk 2 (P11.7): scripts/earn/live-check.mjs on one recorded real run (scripts/earn/fixtures/live-check-2026-10-19.json),
// with no network: every check passes on the record; a malformed, out-of-range or missing answer fails the run (exit 1);
// measured and issuance figures more than 10 % apart are flagged, not failed (H51, H97); the chain's own denom facts are
// checked against azig / 18 decimals (H21).
const recorded = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/live-check-2026-10-19.json', import.meta.url)), 'utf8'));
const answer = (hit, body) => { const headers = new Headers({'content-type': 'application/json'}); if (hit?.responseHeight) headers.set('x-cosmos-block-height', hit.responseHeight); return new Response(typeof body === 'string' ? body : JSON.stringify(body), {status: 200, headers}); };
const edit = (match, change) => (url, hit) => match(url, hit) ? answer(hit, change(JSON.parse(hit.body))) : undefined;
const run = override => liveCheck({fetcher: replay(recorded, override)});
const failed = r => r.results.filter(x => !x.ok).map(x => x.name);
const earliest = recorded.requests.filter(r => r.url.includes('/rewards/')).map(r => r.height).sort()[0];

describe('the Earn live check, on a recorded run', () => {
  test('every check passes on the record, each with its as-of; nothing flagged', async () => {
    const r = await run();
    expect(r.exitCode).toBe(0);
    expect(r.results).toHaveLength(8);
    for (const x of r.results) { expect(x.ok, x.name).toBe(true); expect(x.asOf, x.name).toMatch(/^2026-10-19T/); expect(x.flag).toBeUndefined(); }
    expect(r.results.find(x => x.name.startsWith('chain denom')).detail).toContain('bond denom azig, display zig at exponent 18');
    expect(r.results.find(x => x.name.startsWith('measured')).detail).toMatch(/measured 5\.\d\d %, issuance 5\.\d\d %/);
    expect(recorded.requests.every(q => q.url.startsWith('https://') && !/zig1[02-9ac-hj-np-z]{38}/.test(q.url.replace(/zig1(8nnde5|09f7g2|xx3aup|0v0hrj|86ucx5|ewkl2p|wvqk2t|h72z8p|h3au5n|mayx7w|m526fl|fn4rrr|8vykgj)[02-9ac-hj-np-z]+/g, '')))).toBe(true);
  });
  test('a registry-style uzig / 6 answer fails the denom facts (H21)', async () => {
    const r = await run(edit(u => u.endsWith('/denoms_metadata/azig'), b => ({metadata: {...b.metadata, denom_units: [{denom: 'azig', exponent: 0}, {denom: 'zig', exponent: 6}]}})));
    expect(failed(r)).toEqual(['chain denom facts (H21: azig, 18 decimals, from the chain itself)']);
    expect(r.exitCode).toBe(1);
  });
  test('an out-of-range figure fails its check and the run', async () => {
    const r = await run(edit(u => u.endsWith('/cosmos/mint/v1beta1/inflation'), () => ({inflation: '0.9'})));
    expect(failed(r)).toEqual(['staking parameters and the issuance inputs']);
    expect(r.results.find(x => !x.ok).reason).toContain('inflation');
    expect(r.exitCode).toBe(1);
  });
  test('a malformed answer or a source that does not answer fails the run', async () => {
    const broken = await run((url, hit) => url.includes(btoa(JSON.stringify({protocol_info: {}}))) ? answer(hit, '{"data":') : undefined);
    expect(failed(broken)).toEqual(['Valdora stZIG (pinned staker) and the rate against OroSwap’s pool']);
    const down = await run(url => url.startsWith('https://yields.llama.fi') ? new Response('{}', {status: 503}) : undefined);
    expect(failed(down)).toEqual(['DefiLlama (third party): value locked per app and yield pools on ZIGChain']);
    expect(down.exitCode).toBe(1);
    const unpinned = await run(edit(u => u.includes(btoa(JSON.stringify({pairs_by_assets: {asset_infos: [{native_token: {denom: 'azig'}}, {native_token: {denom: 'ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B'}}]}}))), () => ({data: {pairs: []}})));
    expect(failed(unpinned)).toEqual(['OroSwap fee tiers, pools (vouched for by the factory) and farms']);
  });
  test('measured and issuance more than 10 % apart: flagged "reward path unverified", the run still passes', async () => {
    // Half the accrual in the window: the measured figure falls about 50 % below the issuance one.
    const latestRewards = recorded.requests.find(r => r.url.includes('/rewards/') && r.height !== earliest);
    const then = JSON.parse(recorded.requests.find(r => r.url.includes('/rewards/') && r.height === earliest).body).rewards[0].amount.split('.')[0];
    const now = JSON.parse(latestRewards.body).rewards[0].amount.split('.')[0];
    const half = (BigInt(then) + (BigInt(now) - BigInt(then)) / 2n).toString();
    const r = await run(edit((u, hit) => u.includes('/rewards/') && hit?.height !== earliest, () => ({rewards: [{denom: 'azig', amount: `${half}.0`}]})));
    expect(r.exitCode).toBe(0);
    const m = r.results.find(x => x.name.startsWith('measured'));
    expect(m.flag).toBe('unavailable: reward path unverified — the two figures differ by more than 10 %');
    // Rewards that fell (a claim in the window): flagged as not measurable.
    const claimed = await run(edit((u, hit) => u.includes('/rewards/') && hit?.height !== earliest, () => ({rewards: [{denom: 'azig', amount: '1.0'}]})));
    expect(claimed.results.find(x => x.name.startsWith('measured')).flag).toBe('rewards were claimed or the stake changed during the window');
  });
  test('the script reads nothing it was not recorded reading (no network in tests)', async () => {
    const r = await liveCheck({fetcher: replay({requests: []})});
    expect(r.exitCode).toBe(1);
    expect(r.results).toHaveLength(1);
  });
});
