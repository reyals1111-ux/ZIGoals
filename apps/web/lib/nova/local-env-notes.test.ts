import {describe, expect, it, vi} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {DEFAULT_NOVA_SCOPES} from '../ai/context-pack/nova';
import {gatesFor, showcaseSources} from '../ai/tools/fixtures';
import {readNovaToolSources} from '../ai/tools/nova-sources';

// Session AS (found by tests/nova-families-as.spec.ts): NOVA's on-device answers read the notes when NOVA's own Notes
// permission is on, though the app's shared context reads its tool sources without them; never on a private screen,
// never with the permission off.
const RECORDS = buildShowcase('2026-11-17', 'UTC').records, storage = {getItem: (k: string) => RECORDS[k] ?? null};
vi.mock('../showcase-storage', () => ({getAppStorage: () => storage}));
const {novaLocalEnv} = await import('./local-env');
const sources = () => {
  const s = showcaseSources('2026-11-17');
  return {...s, nova: readNovaToolSources(storage)}; // as components/ai/use-ai-context.ts reads them: no notes
};
describe('NOVA reads its notes on this device only with its Notes permission', () => {
  it('on: the notes are read', () => {
    const env = novaLocalEnv({sources: sources(), gates: gatesFor(true), scopes: {...DEFAULT_NOVA_SCOPES, notes: true}, chainChosen: true})!;
    expect(env.nova?.notes?.notes.length).toBeGreaterThan(0);
  });
  it('off, or a private screen: nothing is read', () => {
    expect(novaLocalEnv({sources: sources(), gates: gatesFor(true), scopes: {...DEFAULT_NOVA_SCOPES, notes: false}, chainChosen: true})!.nova?.notes).toBeUndefined();
    const paused = novaLocalEnv({sources: sources(), gates: gatesFor(true, 'today', '/app', {sensitive: true}), scopes: {...DEFAULT_NOVA_SCOPES, notes: true}, chainChosen: true})!;
    expect(paused.nova?.notes).toBeUndefined();
  });
});
