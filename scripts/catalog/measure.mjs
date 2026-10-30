// Session AJ (item 5, WE16; owner decision D8): the catalog's size before and after, on a full-size synthetic catalog
// (the live one cannot be read from a cloud session; B-094 measured it at about 5.1 MB raw and 1.39 MB compressed).
// Synthetic and deterministic: ~17,000 coin rows shaped like CoinGecko's coins/list?include_platform=true (ids, names,
// tickers, and for about half of them one to three contract addresses), plus the RWA list. Prints raw, gzip (level 6,
// as the weight budget measures) and Brotli sizes of the version 1 answer (today) and the version 2 rows (Session AJ).
//   node scripts/catalog/measure.mjs [--json]
import {gzipSync, brotliCompressSync, constants} from 'node:zlib';
// mulberry32: a deterministic 32-bit generator (integer math only, so it never repeats early).
let seed = 20261029;
const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const word = n => Array.from({length: n}, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(rand() * 26)]).join('');
const hex = n => Array.from({length: n}, () => '0123456789abcdef'[Math.floor(rand() * 16)]).join('');
const CHAINS = ['ethereum', 'binance-smart-chain', 'solana', 'polygon-pos', 'arbitrum-one', 'base', 'avalanche', 'optimistic-ethereum', 'tron', 'sui'];
export function syntheticCatalog(coins = 18500) {
  const assets = [];
  for (let i = 0; i < coins; i++) {
    const name = `${word(3 + Math.floor(rand() * 8))} ${rand() < 0.4 ? word(3 + Math.floor(rand() * 6)) : 'token'}`;
    const id = name.replace(/\s+/g, '-') + (rand() < 0.2 ? `-${i}` : '');
    const platforms = {};
    if (rand() < 0.7) for (let k = 0, n = 1 + Math.floor(rand() * 6); k < n; k++) { const chain = CHAINS[Math.floor(rand() * CHAINS.length)]; platforms[chain] = chain === 'solana' || chain === 'sui' ? word(44) : `0x${hex(40)}`; }
    assets.push({ref: {provider: 'coingecko', kind: 'coin', id}, name: name[0].toUpperCase() + name.slice(1), symbol: word(2 + Math.floor(rand() * 4)), platforms});
  }
  for (let i = 0; i < 400; i++) assets.push({ref: {provider: 'coingecko', kind: 'rwa', id: `${word(6)}-${i}`, assetType: ['stock', 'etf', 'commodity'][i % 3]}, name: `${word(7)} Inc`, symbol: word(4)});
  return {assets, error: null, fetchedAt: '2026-10-29T00:00:00.000Z', stale: false};
}
export function v2(result) {
  return {version: 2, catalogVersion: '0123456789abcdef', error: result.error, fetchedAt: result.fetchedAt, stale: result.stale,
    coins: result.assets.filter(a => a.ref.kind === 'coin').map(a => [a.ref.id, a.name, a.symbol]),
    rwas: result.assets.filter(a => a.ref.kind === 'rwa').map(a => [a.ref.id, a.name, a.symbol, a.ref.assetType])};
}
const sizes = text => { const b = Buffer.from(text); return {raw: b.length, gzip: gzipSync(b, {level: 6}).length, brotli: brotliCompressSync(b, {params: {[constants.BROTLI_PARAM_QUALITY]: 5}}).length}; };
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = syntheticCatalog(), before = sizes(JSON.stringify(result)), after = sizes(JSON.stringify(v2(result)));
  const out = {rows: result.assets.length, before, after, unchanged304: {raw: 0, note: 'an unchanged catalog answers 304 with no body'}};
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
  else { const kb = n => `${(n / 1000).toFixed(0)} kB`; console.log(`rows ${out.rows}\nversion 1: raw ${kb(before.raw)}, gzip ${kb(before.gzip)}, brotli ${kb(before.brotli)}\nversion 2: raw ${kb(after.raw)}, gzip ${kb(after.gzip)}, brotli ${kb(after.brotli)}\nunchanged: 304, 0 kB`); }
}
