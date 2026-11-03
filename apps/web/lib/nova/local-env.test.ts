import {expect, test} from 'vitest';
import {DEFAULT_NOVA_SCOPES, NOVA_SCOPES, type NovaScopes} from '../ai/context-pack/nova';
import {novaEnvInfo} from '../ai/local-answers/nova-env';
import {gatesFor, showcaseSources, withHandHealth} from '../ai/tools/fixtures';
import {novaLocalEnv} from './local-env';

/** Release review 2 (R2-2): NOVA's on-device answers read under ZIGi's local gates narrowed by NOVA → Permissions. */
const ALL = Object.fromEntries(NOVA_SCOPES.map(s => [s, true])) as NovaScopes;
const sources = () => withHandHealth(showcaseSources());
test('every area answers on the device without a model; Health needs NOVA\'s Health and this device\'s gate', () => {
  const open = novaLocalEnv({sources: sources(), gates: gatesFor(true), scopes: ALL, chainChosen: true})!;
  expect(open.areas).toMatchObject({today: true, goals: true, habits: true, wealth: true, health: true}); expect(open.health).not.toBeNull();
  expect(novaEnvInfo(open)).toEqual({healthScope: true, healthGate: true, todayScope: true});
  const defaults = novaLocalEnv({sources: sources(), gates: gatesFor(true), scopes: DEFAULT_NOVA_SCOPES, chainChosen: true})!;
  expect(defaults.health).toBeNull(); expect(defaults.areas.health).toBe(false); expect(defaults.journal).toBeNull();
  expect(novaEnvInfo(defaults)).toEqual({healthScope: false, healthGate: true, todayScope: true});
  const gateShut = novaLocalEnv({sources: sources(), gates: gatesFor(false), scopes: ALL, chainChosen: true})!;
  expect(gateShut.health).toBeNull(); expect(novaEnvInfo(gateShut)).toMatchObject({healthScope: true, healthGate: false});
  const noGoals = novaLocalEnv({sources: sources(), gates: gatesFor(true), scopes: {...ALL, goals: false, wealth: false, earn: false}, chainChosen: true})!;
  expect(noGoals.areas).toMatchObject({goals: false, wealth: false, habits: true});
});
test('a private screen reads nothing; no sources, no environment', () => {
  const paused = novaLocalEnv({sources: sources(), gates: gatesFor(true, 'today', '/app', {sensitive: true}), scopes: ALL, chainChosen: true})!;
  expect(Object.values(paused.areas).some(Boolean)).toBe(false); expect(paused.health).toBeNull();
  expect(novaLocalEnv({sources: null, gates: gatesFor(true), scopes: ALL, chainChosen: true})).toBeNull();
});
