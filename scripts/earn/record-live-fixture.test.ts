import {writeFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {readChain} from '../../apps/web/lib/server/earn/chain';
import {readDefillama} from '../../apps/web/lib/server/earn/defillama';
import {readOroswap} from '../../apps/web/lib/server/earn/oroswap';
import {readValdora} from '../../apps/web/lib/server/earn/valdora';
import type {Fetcher} from '../../apps/web/lib/server/earn/upstream';

/**
 * Session AF (L1, `TIER 3 (egress routes)`): records the Earn routes' fixture from one real read of each upstream. It
 * never runs by itself: only with EARN_RECORD_FIXTURE=1 (and EARN_FIXTURE_OUT, the file to write), from the repository
 * root: `EARN_RECORD_FIXTURE=1 EARN_FIXTURE_OUT=apps/web/lib/earn/fixtures/live-<date>.json pnpm exec vitest run
 * scripts/earn/record-live-fixture.test.ts`. Plain GETs through the routes' own readers, so the recorded requests are the
 * exact ones the routes send; nothing is signed and no address of a person is read.
 *
 * Bodies are kept as answered except four large ones, cut to the fields the readers use (each marked `reduced`): node_info
 * (its build list), block headers (signatures), DefiLlama's protocol records (their full history) and yields.llama.fi/pools
 * (about 11 MB: its ZIGChain rows and the first three other rows are kept, so the filter is still exercised).
 */
const enabled = process.env.EARN_RECORD_FIXTURE === '1';
type Recorded = {url: string; height: string | null; status: number; responseHeight: string | null; reduced?: true; body: unknown};
function reduce(url: string, body: unknown): {body: unknown; reduced?: true} {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== 'object') return {body};
  if (url.endsWith('/cosmos/base/tendermint/v1beta1/node_info')) {
    const n = b as {default_node_info: {network: string; version: string}; application_version: {name: string; version: string}};
    return {reduced: true, body: {default_node_info: {network: n.default_node_info.network, version: n.default_node_info.version}, application_version: {name: n.application_version.name, version: n.application_version.version}}};
  }
  if (/\/cosmos\/base\/tendermint\/v1beta1\/blocks\//.test(url)) {
    const h = (b as {block: {header: {height: string; time: string; chain_id: string}}}).block.header;
    return {reduced: true, body: {block: {header: {chain_id: h.chain_id, height: h.height, time: h.time}}}};
  }
  if (url.startsWith('https://api.llama.fi/protocol/')) {
    const p = b as {name: string; currentChainTvls?: unknown; hacks?: unknown};
    return {reduced: true, body: {name: p.name, currentChainTvls: p.currentChainTvls, hacks: p.hacks}};
  }
  if (url === 'https://yields.llama.fi/pools') {
    const rows = (b as {status: string; data: {chain: string}[]}).data;
    return {reduced: true, body: {status: (b as {status: string}).status, data: [...rows.filter(r => r.chain !== 'ZIGChain').slice(0, 3), ...rows.filter(r => r.chain === 'ZIGChain')]}};
  }
  return {body};
}
describe.skipIf(!enabled)('record the live Earn fixture', () => {
  it('reads every upstream once and writes the fixture', async () => {
    const out = process.env.EARN_FIXTURE_OUT;
    expect(out, 'EARN_FIXTURE_OUT names the file to write').toMatch(/^apps\/web\/lib\/earn\/fixtures\/live-\d{4}-\d{2}-\d{2}\.json$/);
    const requests: Recorded[] = [];
    const recorder: Fetcher = async (url, init) => {
      const response = await fetch(url, init), text = await response.text();
      const sent = (init.headers as Record<string, string> | undefined)?.['x-cosmos-block-height'] ?? null;
      let parsed: unknown = text;
      try { parsed = JSON.parse(text); } catch { /* kept as text */ }
      const {body, reduced} = response.ok ? reduce(url, parsed) : {body: parsed, reduced: undefined};
      requests.push({url, height: sent, status: response.status, responseHeight: response.headers.get('x-cosmos-block-height'), ...(reduced ? {reduced} : {}), body});
      const headers = new Headers({'content-type': response.headers.get('content-type') ?? 'application/json'});
      const height = response.headers.get('x-cosmos-block-height');
      if (height) headers.set('x-cosmos-block-height', height);
      return new Response(text, {status: response.status, headers});
    };
    const startedAt = new Date().toISOString();
    const answers = {
      chainMainnet: await readChain(recorder, 'mainnet'),
      chainTestnet: await readChain(recorder, 'testnet'),
      valdora: await readValdora(recorder),
      oroswap: await readOroswap(recorder),
      defillama: await readDefillama(recorder),
    };
    writeFileSync(out!, JSON.stringify({version: 1, recordedAt: startedAt, note: 'One real read of each Earn upstream (plain GETs through the routes’ own readers). Large bodies are cut to the fields the readers use and marked reduced. Replay: apps/web/lib/server/earn/fixture-fetcher.ts.', answers, requests}, null, 1) + '\n');
    for (const [name, answer] of Object.entries(answers)) expect(answer.status, name).toBe('ok');
  }, 600_000);
});
