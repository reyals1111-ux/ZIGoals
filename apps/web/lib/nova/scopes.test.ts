import {expect, test} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {DEFAULT_NOVA_SCOPES} from '../ai/context-pack/nova';
import {NOVA_SETUP, NOVA_SETUP_KEY, setPrivacyMode} from './setup';
import {readNovaScopes, resetScopes, scopesOf, setScope} from './scopes';

// Session AK (owner follow-up 2, N2/N4): NOVA's eight permissions as an optional field of the loose setup record.
const store = (value: unknown) => { const map = new Map<string, string>(value === undefined ? [] : [[NOVA_SETUP_KEY, typeof value === 'string' ? value : JSON.stringify(value)]]); return {getItem: (k: string) => map.get(k) ?? null}; };

test('the defaults are NE\'s: Health, Notes and the Journal off, the rest on', () => {
  expect(scopesOf({version: 1})).toEqual(DEFAULT_NOVA_SCOPES);
  expect(DEFAULT_NOVA_SCOPES).toMatchObject({health: false, notes: false, journal: false, today: true, goals: true, habits: true, wealth: true, earn: true});
  expect(readNovaScopes(store(undefined))).toEqual(DEFAULT_NOVA_SCOPES);
});
test('a scope set on or off is kept beside NC\'s own fields, and reads back through NC\'s schema', () => {
  let record = setPrivacyMode({version: 1}, 'guarded', '2026-11-01');
  record = setScope(record, 'health', true); record = setScope(record, 'wealth', false);
  expect(scopesOf(record)).toEqual({...DEFAULT_NOVA_SCOPES, health: true, wealth: false});
  expect(record).toMatchObject({privacyMode: 'guarded', privacyChosenOn: '2026-11-01'});
  const read = readDeviceRecord(store(record), NOVA_SETUP);
  expect(read.unreadable).toBe(false); expect(scopesOf(read.data)).toEqual({...DEFAULT_NOVA_SCOPES, health: true, wealth: false});
  expect(resetScopes(record)).toEqual({version: 1, privacyMode: 'guarded', privacyChosenOn: '2026-11-01'});
});
test('fail closed: a value that cannot be read is that scope\'s default (never on); an unreadable record reads as the defaults', () => {
  expect(scopesOf({version: 1, scopes: {health: 'yes', notes: 1, journal: true, later: true}} as never)).toEqual({...DEFAULT_NOVA_SCOPES, journal: true});
  expect(scopesOf({version: 1, scopes: 'all'} as never)).toEqual(DEFAULT_NOVA_SCOPES);
  expect(readNovaScopes(store('{broken'))).toEqual(DEFAULT_NOVA_SCOPES);
  expect(readNovaScopes({getItem: () => { throw new Error('denied'); }})).toEqual(DEFAULT_NOVA_SCOPES);
});
