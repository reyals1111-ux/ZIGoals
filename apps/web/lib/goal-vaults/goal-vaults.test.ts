import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, test} from 'vitest';
import {GOAL_VAULTS_KEY, WALLET_CATALOG_LABELS, WALLET_ERASE_KEYS, WALLET_EXPORT_KEYS, WALLET_NEVER_RESTORED, WALLET_PERSONAL_KEYS} from '../af-wallet-keys';
import {GOAL_VAULTS, GoalVaultError, MAX_VAULT_LINKS, linksFor, partsOf, writeGoalVaults, withLink, withoutLink, type GoalVaults} from './store';
import {baselineOf, progressOf, shareOfGoal, stakeOf, stzigInAzig} from './progress';
import {ILLUSTRATION_LABEL, illustrate, rateFromPercent} from './illustration';
import {readDeviceRecord} from '../device-record';
import {buildShowcase} from '../showcase-data';
import {chainById} from '../wallets/balances/chains';

// Session AF (L2b, Part 6, ADR-028 H8, H11, H17, H44; P6.2–P6.4): Goal Vaults.
const ZIG = 10n ** 18n, STZIG = chainById('zigchain-1')!.tokens[0]!.id, AT = new Date('2026-10-19T08:00:00.000Z');
const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }} as Pick<Storage, 'getItem' | 'setItem'>}; };
const reading = (staked: bigint, rewards: bigint, stzig: bigint) => ({stakedAzig: staked, rewardsAzig: rewards, stzigUnits: stzig, at: AT.toISOString(), height: '13046000'});

describe('the key and the record: personal, device-only, never synced or restored, in Export, erased', () => {
  test('listed for every registry the lead wires; no sync module or Worker names it; the Showcase never writes it', () => {
    expect(GOAL_VAULTS_KEY).toBe('zigoals:goal-vaults:v1');
    expect(WALLET_PERSONAL_KEYS).toContain(GOAL_VAULTS_KEY); expect(WALLET_ERASE_KEYS).toContain(GOAL_VAULTS_KEY);
    expect(WALLET_EXPORT_KEYS.goalVaults).toBe(GOAL_VAULTS_KEY); expect(WALLET_CATALOG_LABELS.goalVaults[0]).toMatch(/Goal Vaults/);
    expect(WALLET_NEVER_RESTORED).toContain('Goal Vault links');
    const files = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? (name === 'node_modules' ? [] : files(path)) : /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : []; });
    const lib = join(__dirname, '..');
    // The lead's frozen-reader fixture test is the one exception (it proves older builds read the record; it syncs nothing),
    // as in the other lanes' guards (Session AF, at the merge).
    const fixture = join(lib, 'vault', 'frozen-fixtures.test.ts');
    const sync = [...files(join(lib, 'vault')).filter(f => f !== fixture), ...files(join(lib, 'sync-offer')), join(lib, 'sync-homes-store.ts'), ...files(join(lib, '..', '..', '..', 'workers'))];
    expect(sync.filter(f => /goal-vaults|GOAL_VAULTS/.test(readFileSync(f, 'utf8'))).map(f => relative(lib, f))).toEqual([]);
    for (const aa of [false, true]) expect(Object.keys(buildShowcase('2026-10-19', 'UTC', {aa}).records)).not.toContain(GOAL_VAULTS_KEY);
  });
  test('one link per Goal and wallet, at most 50, something must count; loose; unreadable bytes never overwritten', () => {
    const baseline = baselineOf(reading(100n * ZIG, ZIG, 5_000_000n), '1.0728');
    let r: GoalVaults = withLink({version: 1}, {goalId: '91', walletId: 'w1', parts: ['delegations', 'stzig'], baseline}, AT, 'v1');
    expect(r.links).toEqual([{id: 'v1', goalId: '91', walletId: 'w1', parts: ['delegations', 'stzig'], linkedAt: AT.toISOString(), baseline: {stakedAzig: (100n * ZIG).toString(), rewardsAzig: ZIG.toString(), stzigUnits: '5000000', zigPerStZig: '1.0728', height: '13046000'}}]);
    expect(() => withLink(r, {goalId: '91', walletId: 'w1', parts: ['stzig'], baseline})).toThrow(GoalVaultError);
    expect(() => withLink(r, {goalId: '92', walletId: 'w1', parts: [], baseline})).toThrow(/Choose what counts/);
    r = withLink(r, {goalId: '92', walletId: 'w1', parts: ['stzig'], baseline}, AT, 'v2');
    expect(linksFor(r, '91').map(l => l.id)).toEqual(['v1']);
    expect(linksFor({version: 1, links: [{...r.links![0]!, parts: ['later-part']}]}, '91')).toEqual([]);
    expect(partsOf({parts: ['stzig', 'later-part']})).toEqual(['stzig']);
    expect(withoutLink(r, 'v1').links!.map(l => l.id)).toEqual(['v2']);
    let full: GoalVaults = {version: 1};
    for (let i = 0; i < MAX_VAULT_LINKS; i++) full = withLink(full, {goalId: `${i}`, walletId: 'w', parts: ['delegations'], baseline});
    expect(() => withLink(full, {goalId: 'x', walletId: 'w', parts: ['delegations'], baseline})).toThrow(/At most 50/);
    const {m, storage} = memory();
    m.set(GOAL_VAULTS_KEY, JSON.stringify({version: 1, later: 1, links: [{...r.links![0]!, extra: true}]}));
    writeGoalVaults(storage, x => withoutLink(x, 'nope'));
    expect(JSON.parse(m.get(GOAL_VAULTS_KEY)!)).toMatchObject({later: 1, links: [{extra: true}]});
    m.set(GOAL_VAULTS_KEY, '{"version":2}');
    expect(readDeviceRecord(storage, GOAL_VAULTS).unreadable).toBe(true);
    expect(() => writeGoalVaults(storage, x => x)).toThrow(/could not be read/);
    expect(m.get(GOAL_VAULTS_KEY)).toBe('{"version":2}');
  });
});

describe('progress: staked now + rewards waiting (+ stZIG at the two-source rate); since you linked = now − then', () => {
  test('the stake from the wallet\'s ZIGChain observation (the relay, mainnet only)', () => {
    expect(stakeOf({walletId: 'w', chainId: 'zigchain-1', at: AT.toISOString(), height: '9', assets: [{id: 'azig', symbol: 'ZIG', decimals: 18, amount: '7'}, {id: 'azig:staked', symbol: 'ZIG', decimals: 18, amount: '400'}, {id: 'azig:rewards', symbol: 'ZIG', decimals: 18, amount: '2'}, {id: STZIG, symbol: 'stZIG', decimals: 6, amount: '100'}]}))
      .toEqual({stakedAzig: 400n, rewardsAzig: 2n, stzigUnits: 100n, at: AT.toISOString(), height: '9'});
    expect(stakeOf(null)).toBeNull();
    expect(stakeOf({walletId: 'w', chainId: 'zigchain-1', error: 'refused', errorAt: AT.toISOString()})).toBeNull();
  });
  test('exact arithmetic: stZIG in ZIG cut, never rounded up', () => {
    expect(stzigInAzig(1_000_000n, '1.0728')).toBe(1_072_800_000_000_000_000n);
    expect(stzigInAzig(3n, '1.333333333333333333')).toBe(3_999_999_999_999n);
    expect(() => stzigInAzig(1n, '1e3')).toThrow();
  });
  test('the figures and the change since linking, part by part; stZIG without a rate counts in units only', () => {
    const link = {parts: ['delegations', 'stzig'], baseline: baselineOf(reading(400n * ZIG, 2n * ZIG, 100_000_000n), '1.0700')};
    const now = reading(410n * ZIG, 3n * ZIG, 110_000_000n);
    const p = progressOf(link, now, '1.0728');
    expect(p.totalAzig).toBe(410n * ZIG + 3n * ZIG + stzigInAzig(110_000_000n, '1.0728'));
    expect(p.since).toEqual({azig: 11n * ZIG + stzigInAzig(110_000_000n, '1.0728') - stzigInAzig(100_000_000n, '1.0700'), stzigUnits: 10_000_000n, complete: true});
    const disagree = progressOf(link, now, null);
    expect(disagree.complete).toBe(false); expect(disagree.stzig).toEqual({units: 110_000_000n, valueAzig: null}); expect(disagree.totalAzig).toBe(413n * ZIG);
    expect(disagree.since).toEqual({azig: 11n * ZIG, stzigUnits: 10_000_000n, complete: false});
    // Claimed rewards: the waiting rewards fall, and the change shows it honestly (negative), never reconstructed.
    expect(progressOf({parts: ['delegations'], baseline: link.baseline}, reading(400n * ZIG, 0n, 0n), null).since.azig).toBe(-2n * ZIG);
    expect(progressOf({parts: ['stzig'], baseline: link.baseline}, now, '1.0728').stakedAzig).toBe(0n);
  });
  test('the share of a Goal counted in ZIG; none for another asset', () => {
    expect(shareOfGoal({asset: 'ZIG', decimals: 18, target: (1000n * ZIG).toString()}, 413n * ZIG)).toBe(41.3);
    expect(shareOfGoal({asset: 'ZIG', decimals: 6, target: '1000000000'}, 413n * ZIG)).toBe(41.3);
    expect(shareOfGoal({asset: 'USD', decimals: 2, target: '100000'}, 413n * ZIG)).toBeNull();
  });
});

describe('the projection is an illustration only', () => {
  test('labelled; months at a monthly-compounded rate; none without a rate or past 50 years; a typed percentage', () => {
    expect(ILLUSTRATION_LABEL).toBe('Illustration, not a promise');
    expect(illustrate({currentAzig: 500n * ZIG, targetAzig: 1000n * ZIG, yearlyRate: '0.0533'})).toEqual({reached: false, months: 157});
    expect(illustrate({currentAzig: 1000n * ZIG, targetAzig: 1000n * ZIG, yearlyRate: null})).toEqual({reached: true, months: 0});
    expect(illustrate({currentAzig: 500n * ZIG, targetAzig: 1000n * ZIG, yearlyRate: null}).months).toBeNull();
    expect(illustrate({currentAzig: 1n, targetAzig: 1000n * ZIG, yearlyRate: '0.01'}).months).toBeNull();
    expect(rateFromPercent('5.2')).toBe('0.052'); expect(rateFromPercent('5,25')).toBe('0.0525');
    for (const bad of ['', '0', 'abc', '101', '5.255', '-3']) expect(rateFromPercent(bad), bad).toBeNull();
  });
});

describe('nothing leaves the wallet: no message, no signer, no request of its own', () => {
  test('the Goal Vault files build no message and reach no host', () => {
    const web = join(__dirname, '..', '..');
    const files = [...readdirSync(join(web, 'lib/goal-vaults')).filter(f => !/\.test\./.test(f)).map(f => `lib/goal-vaults/${f}`), ...readdirSync(join(web, 'components/goal-vaults')).map(f => `components/goal-vaults/${f}`)];
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const f of files) expect(readFileSync(join(web, f), 'utf8'), f).not.toMatch(/Msg[A-Z]|typeUrl|getOfflineSigner|signAndBroadcast|broadcast|\bsign[A-Z]\w*|executeSigned|\bfetch\(|lib\/staking/);
  });
});
