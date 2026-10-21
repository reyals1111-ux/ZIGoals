import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {validatorsWireSchema} from '../chain/validators-wire';
import {unavailableValidators} from '../server/chain-validators';
import {readValidators} from './client';

// Session AF (the lead, at L2a's merge): the Earn hub (L1) reads the validators route L2a built. L1's browser tests stand in
// for the route with a recorded answer; this proves that recording is exactly the shape L2a's route answers (its strict
// wire schema), and that the Earn page asks for a network name the route accepts.
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('the Earn hub and the validators route agree on the wire', () => {
  test('the recorded answer the Earn specs serve parses with the route\'s strict schema', () => {
    const fixture = JSON.parse(read('./fixtures/validators-2026-10-19.json'));
    const parsed = validatorsWireSchema.safeParse(fixture.answer);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
    if (parsed.success) { expect(parsed.data.network).toBe('zigchain-1'); expect(parsed.data.validators.length).toBeGreaterThan(0); }
  });
  test('the Earn page asks for the real network by the route\'s own name', () => {
    const client = read('./client.ts');
    expect(client).toContain("'/api/chain/validators?network=zigchain-1'");
    expect(client).not.toMatch(/chain\/validators\?network=mainnet/);
  });
});

describe('the Earn page reads the route\'s own answers honestly', () => {
  afterEach(() => vi.unstubAllGlobals());
  const answer = (body: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}})));
  test('the route\'s unavailable answer (a plain sentence) reads as unavailable with a reason, never as malformed', async () => {
    answer(unavailableValidators('zigchain-1'));
    const state = await readValidators();
    expect(state).toMatchObject({phase: 'unavailable', reason: 'UPSTREAM_DOWN', source: {name: 'ZIGChain mainnet LCD (official)'}});
  });
  test('the recorded ok answer reads as ok, named by the official service, every validator kept', async () => {
    const fixture = JSON.parse(read('./fixtures/validators-2026-10-19.json'));
    answer(fixture.answer);
    const state = await readValidators();
    expect(state.phase).toBe('ok');
    if (state.phase === 'ok') { expect(state.answer.source.name).toBe('ZIGChain mainnet LCD (official)'); expect(state.answer.data.validators).toHaveLength(fixture.answer.validators.length); }
  });
});
