import {expect, test} from 'vitest';
import {DEFAULT_NOVA_SCOPES} from '../ai/context-pack/nova';
import {checkNovaScopes} from './setup-scopes';

// Session AL (lane L7; Lisbon LA-003, Denver DV-062, Moscow MO-058): the check never says "NOVA can see" what the preview does not carry.
const scopes = {...DEFAULT_NOVA_SCOPES, today: true, goals: true, habits: true, wealth: true};
test('a scope on while the preview reads nothing of it fails and names the switch', () => {
  const r = checkNovaScopes(scopes, {included: ['goals'], notShared: ['habits']}, false, false);
  expect(r.ok).toBe(false);
  expect(r.note).toContain('the preview reads nothing of it');
  expect(r.note).toContain('What each page may share');
});
test('"NOVA can see" lists only what the preview carries', () => {
  const r = checkNovaScopes(scopes, {included: ['goals'], notShared: []}, false, false);
  expect(r.ok).toBe(true);
  expect(r.note).toMatch(/^NOVA can see: Goals and their pace\./);
  expect(r.note).toContain('Nothing recorded yet in:');
});
test('an empty pack never says "NOVA can see"', () => {
  const r = checkNovaScopes(scopes, {included: [], notShared: []}, false, false);
  expect(r.note).not.toMatch(/^NOVA can see/);
  expect(r.note).toContain('nothing there holds records yet');
});
