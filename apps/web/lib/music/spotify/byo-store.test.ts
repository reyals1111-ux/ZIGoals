// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {BYO_CHANGE_EVENT, BYO_SPOTIFY_DATABASE, forgetByoSpotify, indexedDbByoAdapter, readByoSpotify, saveByoSpotify, tidyClientId, validByoClientId, type ByoAdapter} from './byo-store';
import {validClientId} from './oauth';

// Session AK (owner decision MUSIC): "Use my own Spotify app": the person's Client ID, on this device only.
const ID = '0123456789abcdef0123456789abcdef';
function memory(): ByoAdapter & {value: unknown; forgotten: number} {
  const m = {value: null as unknown, forgotten: 0, read: async () => m.value, write: async (r: unknown) => { m.value = structuredClone(r); }, forget: async () => { m.value = null; m.forgotten++; }};
  return m;
}
const databases = async () => (await indexedDB.databases()).map(d => d.name);
afterEach(async () => { await forgetByoSpotify(); });

describe('the Client ID rule', () => {
  test('32 lowercase hexadecimal characters, and nothing else; every such id also passes the site rule', () => {
    expect(validByoClientId(ID)).toBe(true);
    for (const bad of [ID.toUpperCase(), ID.slice(1), `${ID}0`, `${ID.slice(1)}g`, ` ${ID}`, '', null, 32, undefined]) expect(validByoClientId(bad), String(bad)).toBe(false);
    expect(validClientId(ID)).toBe(true);
  });
  test('what is pasted is tidied first: spaces around it go and letters are lowered', () => {
    expect(tidyClientId(`  ${ID.toUpperCase()}\n`)).toBe(ID);
  });
});

describe('the store, with an in-memory adapter', () => {
  test('save checks first: a wrong id throws a plain message and nothing is written', async () => {
    const m = memory();
    await expect(saveByoSpotify('my-secret', m)).rejects.toThrow(/32 letters a–f and digits/);
    expect(m.value).toBeNull();
  });
  test('save, read, remove; every change is announced on the page', async () => {
    const m = memory(), heard = vi.fn();
    window.addEventListener(BYO_CHANGE_EVENT, heard);
    expect(await readByoSpotify(m)).toBeNull();
    expect(await saveByoSpotify(` ${ID.toUpperCase()} `, m, new Date('2026-10-31T12:00:00Z'))).toBe(ID);
    expect(m.value).toEqual({version: 1, clientId: ID, savedAt: '2026-10-31T12:00:00.000Z'});
    expect(await readByoSpotify(m)).toBe(ID);
    await forgetByoSpotify(m);
    expect(m.forgotten).toBe(1);
    expect(await readByoSpotify(m)).toBeNull();
    expect(heard).toHaveBeenCalledTimes(2);
    window.removeEventListener(BYO_CHANGE_EVENT, heard);
  });
  test('a stored record that is not a valid id, or a store that fails, reads as none', async () => {
    const m = memory();
    for (const value of [{version: 1, clientId: 'nope', savedAt: '2026-10-31T12:00:00.000Z'}, {version: 2, clientId: ID, savedAt: '2026-10-31T12:00:00.000Z'}, 'x', 7]) { m.value = value; expect(await readByoSpotify(m)).toBeNull(); }
    expect(await readByoSpotify({...m, read: () => Promise.reject(Error('broken'))})).toBeNull();
  });
});

describe('the store, in IndexedDB', () => {
  test('reading never creates the database; saving makes zigoals-music-byo-v1 with one record; removing deletes the database', async () => {
    expect(await readByoSpotify()).toBeNull();
    expect(await databases()).not.toContain(BYO_SPOTIFY_DATABASE);
    await saveByoSpotify(ID);
    expect(await databases()).toContain(BYO_SPOTIFY_DATABASE);
    expect(await readByoSpotify()).toBe(ID);
    const other = 'ffffffffffffffffffffffffffffffff';
    await saveByoSpotify(other);
    expect(await readByoSpotify()).toBe(other);
    await forgetByoSpotify();
    expect(await databases()).not.toContain(BYO_SPOTIFY_DATABASE);
    expect(await readByoSpotify()).toBeNull();
    await expect(indexedDbByoAdapter.forget()).resolves.toBeUndefined();
  });
});
