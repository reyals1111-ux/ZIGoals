import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {toBech32} from '@cosmjs/encoding';
import {describe, expect, test} from 'vitest';
import * as keys from '../af-signing-keys';
import {MAX_STAKING_JOURNAL, STAKING_JOURNAL, newStakingEntry, readStakingJournal, stakingEntriesOf, updateStakingJournal, withStakingEntry, withStakingTransition, type StakingJournal} from './journal';
import {STAKING_PREFS, lastValidatorOf, networkChoiceOf, readStakingPrefs, realConfirmedAtOf, updateStakingPrefs, withLastValidator, withNetworkChoice, withRealConfirmed, withoutRealConfirm} from './prefs';

// Session AF (ADR-028, L2 design §12; TIER 3 (storage)): the two staking device records.
class Memory {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
}
const WALLET = toBech32('zig', new Uint8Array(20).fill(3)), VALIDATOR = toBech32('zigvaloper', new Uint8Array(20).fill(5));

describe('the key module', () => {
  test('names exactly the four keys, imports nothing, and the device keys are versioned', () => {
    expect({...keys}).toEqual({STAKING_PREFS_KEY: 'zigoals:staking-prefs:v1', STAKING_JOURNAL_KEY: 'zigoals:staking-journal:v1', WALLET_SESSION_KEY: 'zigoals:wallet-session:v1', STAKING_PREFILL_KEY: 'zigoals:ai:staking-prefill:v1'});
    expect(readFileSync(join(__dirname, '..', 'af-signing-keys.ts'), 'utf8')).not.toMatch(/^\s*import\b/m);
  });
  test('no sync module, extras section, restore or Worker names a staking key', () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? (name === 'node_modules' ? [] : files(path)) : /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : []; });
    const sync = [...files(join(__dirname, '..', 'vault')), ...files(join(__dirname, '..', 'sync-offer')), join(__dirname, '..', 'sync-homes-store.ts'), ...files(join(__dirname, '..', '..', '..', '..', 'workers'))];
    expect(sync.length).toBeGreaterThan(20);
    // The frozen-reader proof (vault/frozen-fixtures.test.ts) may name them once the lead registers them; nothing else.
    const naming = sync.filter(file => /staking-prefs|staking-journal|wallet-session|staking-prefill|STAKING_PREFS|STAKING_JOURNAL|af-signing-keys/.test(readFileSync(file, 'utf8'))).map(file => relative(join(__dirname, '..'), file));
    expect(naming.filter(file => file !== join('vault', 'frozen-fixtures.test.ts'))).toEqual([]);
  });
});

describe('zigoals:staking-prefs:v1', () => {
  test('empty by default: practice, no confirm, no validator', () => {
    const {data, unreadable} = readStakingPrefs(new Memory());
    expect(unreadable).toBe(false);
    expect(networkChoiceOf(data)).toBe('practice');
    expect(realConfirmedAtOf(data)).toBeUndefined();
    expect(lastValidatorOf(data, 'zig-test-2')).toBeUndefined();
  });
  test('an unknown or damaged network value reads as practice (fail safe)', () => {
    for (const network of ['REAL', 'mainnet', 'real ', 'zigchain-1', '']) expect(networkChoiceOf(STAKING_PREFS.schema.parse({version: 1, network})), network).toBe('practice');
    expect(networkChoiceOf(STAKING_PREFS.schema.parse({version: 1, network: 'real'}))).toBe('real');
    // A confirm that is not a real date asks again.
    for (const at of ['yesterday', '2026-13-45T00:00:00Z', '1']) expect(realConfirmedAtOf({version: 1, realConfirmedAt: at}), at).toBeUndefined();
  });
  test('writes keep unknown fields; remove asks for the confirm again; only a validator address is remembered', () => {
    const storage = new Memory();
    storage.setItem(STAKING_PREFS.key, JSON.stringify({version: 1, fromNewerBuild: {x: 1}, lastValidator: {'zigchain-1': VALIDATOR}}));
    updateStakingPrefs(storage, p => withRealConfirmed(withNetworkChoice(p, 'real'), new Date('2026-10-18T21:00:00.000Z')));
    let saved = JSON.parse(storage.getItem(STAKING_PREFS.key)!);
    expect(saved).toEqual({version: 1, fromNewerBuild: {x: 1}, network: 'real', realConfirmedAt: '2026-10-18T21:00:00.000Z', lastValidator: {'zigchain-1': VALIDATOR}});
    updateStakingPrefs(storage, p => withLastValidator(withoutRealConfirm(p), 'zig-test-2', VALIDATOR));
    saved = JSON.parse(storage.getItem(STAKING_PREFS.key)!);
    expect(saved.realConfirmedAt).toBeUndefined();
    expect(saved.fromNewerBuild).toEqual({x: 1});
    expect(lastValidatorOf(saved, 'zig-test-2')).toBe(VALIDATOR);
    expect(() => withLastValidator(saved, 'zig-test-2', WALLET)).toThrow('validator');
    expect(() => withLastValidator(saved, 'zig test', VALIDATOR)).toThrow();
    expect(lastValidatorOf({version: 1, lastValidator: {'zig-test-2': WALLET}}, 'zig-test-2')).toBeUndefined();
  });
  test('a record that cannot be read is never overwritten', () => {
    const storage = new Memory();
    storage.setItem(STAKING_PREFS.key, '{"version":2}');
    expect(readStakingPrefs(storage)).toEqual({data: {version: 1}, unreadable: true});
    expect(() => updateStakingPrefs(storage, p => withNetworkChoice(p, 'real'))).toThrow('could not be read');
    expect(storage.getItem(STAKING_PREFS.key)).toBe('{"version":2}');
  });
});

describe('zigoals:staking-journal:v1', () => {
  const at = new Date('2026-10-18T21:00:00.000Z');
  const entry = (id: string, when = at) => newStakingEntry({chainId: 'zig-test-2', wallet: WALLET, action: 'delegate', validator: VALIDATOR, amount: '25000000000000000000'}, when, id);
  const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
  test('a new entry awaits its signature; transitions follow the journal states and a finished entry never moves again', () => {
    let record: StakingJournal = withStakingEntry({version: 1}, entry(uuid(1)));
    expect(stakingEntriesOf(record)[0]).toMatchObject({state: 'AWAITING_SIGNATURE', at: at.toISOString(), action: 'delegate'});
    const hash = 'ab'.repeat(32);
    record = withStakingTransition(record, uuid(1), {state: 'BROADCASTING', hash});
    record = withStakingTransition(record, uuid(1), {state: 'CONFIRMING', hash});
    record = withStakingTransition(record, uuid(1), {state: 'CONFIRMED', hash, height: '8290600', code: 0});
    expect(stakingEntriesOf(record)[0]).toMatchObject({state: 'CONFIRMED', hash: hash.toUpperCase(), height: '8290600', code: 0});
    expect(() => withStakingTransition(record, uuid(1), {state: 'FAILED'})).toThrow('cannot move');
    expect(() => withStakingTransition(withStakingEntry({version: 1}, entry(uuid(2))), uuid(2), {state: 'CONFIRMED'})).toThrow('cannot move');
    expect(() => withStakingTransition(record, uuid(9), {state: 'FAILED'})).toThrow('not in the journal');
    const pending = withStakingTransition(withStakingEntry({version: 1}, entry(uuid(3))), uuid(3), {state: 'BROADCASTING', hash});
    expect(() => withStakingTransition(pending, uuid(3), {state: 'CONFIRMING', hash: 'cd'.repeat(32)})).toThrow('different transaction hash');
  });
  test('claim-all keeps every validator; refuses incomplete entries and a repeated operation', () => {
    const claim = newStakingEntry({chainId: 'zigchain-1', wallet: WALLET, action: 'claim', validators: [VALIDATOR, toBech32('zigvaloper', new Uint8Array(20).fill(6))], amount: '0'}, at, uuid(4));
    expect(stakingEntriesOf(withStakingEntry({version: 1}, claim))[0]!.validators).toHaveLength(2);
    expect(() => newStakingEntry({chainId: 'zig-test-2', wallet: WALLET, action: 'send' as 'delegate', amount: '1'})).toThrow();
    expect(() => newStakingEntry({chainId: 'zig-test-2', wallet: WALLET, action: 'delegate', amount: '1.5'})).toThrow();
    expect(() => withStakingEntry(withStakingEntry({version: 1}, claim), claim)).toThrow('already recorded');
  });
  test('at most 200 entries, the oldest dropped first', () => {
    let record: StakingJournal = {version: 1};
    for (let i = 0; i < MAX_STAKING_JOURNAL + 5; i++) record = withStakingEntry(record, entry(uuid(i), new Date(at.getTime() + i * 1000)));
    expect(record.entries).toHaveLength(MAX_STAKING_JOURNAL);
    expect(record.entries![0]!.operationId).toBe(uuid(5));
    expect(stakingEntriesOf(record)[0]!.operationId).toBe(uuid(MAX_STAKING_JOURNAL + 4));
  });
  test('frozen reader: unknown fields of the record and of an entry survive a write; an entry it cannot read is kept and not shown', () => {
    const storage = new Memory();
    const newer = {operationId: uuid(7), chainId: 'zig-test-2', wallet: WALLET, action: 'stake-lp', amount: '1', state: 'CONFIRMED', at: at.toISOString(), pool: 'x'};
    const known = {...entry(uuid(8)), note: 'from a newer build'};
    storage.setItem(STAKING_JOURNAL.key, JSON.stringify({version: 1, cursor: 'keep', entries: [newer, known]}));
    expect(stakingEntriesOf(readStakingJournal(storage).data).map(e => e.operationId)).toEqual([uuid(8)]);
    updateStakingJournal(storage, r => withStakingTransition(r, uuid(8), {state: 'REJECTED'}));
    const saved = JSON.parse(storage.getItem(STAKING_JOURNAL.key)!);
    expect(saved.cursor).toBe('keep');
    expect(saved.entries[0]).toEqual(newer);
    expect(saved.entries[1]).toMatchObject({note: 'from a newer build', state: 'REJECTED'});
    storage.setItem(STAKING_JOURNAL.key, 'not json');
    expect(() => updateStakingJournal(storage, r => withStakingEntry(r, entry(uuid(10))))).toThrow('could not be read');
    expect(storage.getItem(STAKING_JOURNAL.key)).toBe('not json');
  });
});
