import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

/**
 * Session AF (L1): records a fixture of GET /api/chain/validators?network=mainnet in lane L2a's wire shape, from one real
 * read of ZIGChain's mainnet LCD, for the Earn page's browser tests until L2a's route merges. It never runs by itself:
 * `EARN_RECORD_FIXTURE=1 EARN_VALIDATORS_OUT=apps/web/lib/earn/fixtures/validators-<date>.json pnpm exec vitest run
 * scripts/earn/record-validators-fixture.test.ts`. Plain GETs at one block height; only public validator data.
 * Uptime maps each validator to its signing info by `zigvalcons` = bech32(sha256(ed25519 key)[:20]); self-bond is the
 * delegation of the operator's own account (the same 20 bytes with the `zig` prefix).
 */
const enabled = process.env.EARN_RECORD_FIXTURE === '1';
// BIP-173 bech32, enough to move 20 bytes between the zigvaloper, zig and zigvalcons prefixes (no dependency at the root).
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const polymod = (values: number[]) => { let chk = 1; for (const v of values) { const top = chk >> 25; chk = ((chk & 0x1ffffff) << 5) ^ v; for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3][i]!; } return chk; };
const expand = (hrp: string) => [...[...hrp].map(c => c.charCodeAt(0) >> 5), 0, ...[...hrp].map(c => c.charCodeAt(0) & 31)];
const convert = (data: Uint8Array | number[], from: number, to: number, pad: boolean) => { let acc = 0, bits = 0; const out: number[] = []; for (const v of data) { acc = (acc << from) | v; bits += from; while (bits >= to) { bits -= to; out.push((acc >> bits) & ((1 << to) - 1)); } } if (pad && bits) out.push((acc << (to - bits)) & ((1 << to) - 1)); return out; };
const toBech32 = (hrp: string, bytes: Uint8Array) => { const words = convert(bytes, 8, 5, true), mod = polymod([...expand(hrp), ...words, 0, 0, 0, 0, 0, 0]) ^ 1; return `${hrp}1${[...words, ...[0, 1, 2, 3, 4, 5].map(i => (mod >> (5 * (5 - i))) & 31)].map(w => CHARSET[w]).join('')}`; };
const fromBech32 = (address: string) => { const sep = address.lastIndexOf('1'), words = [...address.slice(sep + 1)].map(c => CHARSET.indexOf(c)); if (polymod([...expand(address.slice(0, sep)), ...words]) !== 1) throw new Error('bad checksum'); return {data: Uint8Array.from(convert(words.slice(0, -6), 5, 8, false))}; };
const LCD = 'https://api.zigchain.com', UA = 'ZIGoals/1.0 (+https://zigoals.app)';
type V = {operator_address: string; consensus_pubkey: {key: string}; jailed: boolean; status: string; tokens: string; description: {moniker: string; website: string}; commission: {commission_rates: {rate: string; max_rate: string; max_change_rate: string}; update_time: string}};
describe.skipIf(!enabled)('record the validators fixture', () => {
  it('reads the validator set once and writes the fixture', async () => {
    const out = process.env.EARN_VALIDATORS_OUT;
    expect(out).toMatch(/^apps\/web\/lib\/earn\/fixtures\/validators-\d{4}-\d{2}-\d{2}\.json$/);
    const get = async (path: string, height?: string) => { const r = await fetch(LCD + path, {headers: {'user-agent': UA, ...(height ? {'x-cosmos-block-height': height} : {})}}); expect(r.ok, path).toBe(true); if (height) expect(r.headers.get('x-cosmos-block-height')).toBe(height); return r.json(); };
    const latest = (await get('/cosmos/base/tendermint/v1beta1/blocks/latest')).block.header as {height: string; time: string};
    const h = latest.height;
    const [bonded, unbonding, unbonded, infos, pool, params] = await Promise.all([
      get('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=300', h), get('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_UNBONDING&pagination.limit=300', h),
      get('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_UNBONDED&pagination.limit=300', h), get('/cosmos/slashing/v1beta1/signing_infos?pagination.limit=300', h),
      get('/cosmos/staking/v1beta1/pool', h), get('/cosmos/slashing/v1beta1/params', h),
    ]);
    const all: V[] = [...bonded.validators, ...unbonding.validators, ...unbonded.validators];
    const total = BigInt(pool.pool.bonded_tokens), window = Number(params.params.signed_blocks_window);
    const byCons = new Map((infos.info as {address: string; missed_blocks_counter: string; tombstoned: boolean}[]).map(i => [i.address, i]));
    const validators = await Promise.all(all.map(async v => {
      const cons = toBech32('zigvalcons', createHash('sha256').update(Buffer.from(v.consensus_pubkey.key, 'base64')).digest().subarray(0, 20));
      const info = byCons.get(cons);
      const self = toBech32('zig', fromBech32(v.operator_address).data);
      let selfBond: string | null = null;
      if (v.status === 'BOND_STATUS_BONDED') { try { selfBond = (await get(`/cosmos/staking/v1beta1/validators/${v.operator_address}/delegations/${self}`, h)).delegation_response.balance.amount; } catch { selfBond = null; } }
      const missed = info ? Number(info.missed_blocks_counter) : null;
      return {operator: v.operator_address, moniker: v.description.moniker, website: v.description.website || null,
        status: v.status === 'BOND_STATUS_BONDED' ? 'bonded' : v.status === 'BOND_STATUS_UNBONDING' ? 'unbonding' : 'unbonded', jailed: v.jailed, tombstoned: info ? info.tombstoned : null,
        tokens: v.tokens, votingPowerShare: v.status === 'BOND_STATUS_BONDED' ? (Number(BigInt(v.tokens) * 1_000_000_000n / total) / 1e9).toString() : '0',
        commission: {rate: v.commission.commission_rates.rate, maxRate: v.commission.commission_rates.max_rate, maxChangeRate: v.commission.commission_rates.max_change_rate, updatedAt: v.commission.update_time},
        selfBond, uptime: info && missed !== null && v.status === 'BOND_STATUS_BONDED' ? {window, missed, signedShare: ((window - Math.min(window, missed)) / window).toString()} : null};
    }));
    const answer = {version: 1, status: 'ok', network: 'mainnet', height: h, observedAt: new Date(latest.time.replace(/\.(\d{3})\d*Z$/, '.$1Z')).toISOString(), source: {name: 'ZIGChain mainnet LCD (official)', origin: LCD}, bondedTotal: pool.pool.bonded_tokens, validators};
    writeFileSync(out!, JSON.stringify({recordedAt: new Date().toISOString(), note: 'One real read of ZIGChain mainnet’s validator set at one block height, in lane L2a’s GET /api/chain/validators wire shape (scripts/earn/record-validators-fixture.test.ts). For the Earn page’s browser tests until that route is in the build.', answer}, null, 1) + '\n');
    expect(validators.filter(v => v.status === 'bonded').length).toBeGreaterThan(0);
  }, 300_000);
});
