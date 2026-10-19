import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner, planAction, type Env, type Stores} from './actions/plan';
import {actionSchema, PREFILL_KINDS, WRITING_KINDS, type Action} from './actions/schema';
import {AUTO_ACCEPT_KINDS, AUTO_ACCEPT_NEVER, autoAcceptVerdict} from './actions/auto-accept';
import {STAKING_PREFILL_ROUTE} from './actions/staking-prefill';
import {runnerEffect} from '../../components/ai/runner-effects';
import {createEmptyHealth, healthSchema} from '../health';
import {emptyHabitData} from '../habits';
import {emptyPlatform} from '../positions';
import {emptyReminders} from '../reminders/schema';
import {emptyWeeklyReview} from '../weekly-review/schema';
import {presetSettings} from '../dashboard-settings';
beforeAll(() => loadAaPlanner());

/**
 * Session AF (L4; ADR-028 D7, H4, H47, H69; `TIER 3 (wallet/signing)`): no ZIGi path reaches signing. ZIGi may only fill in
 * the Staking page's review (`prefill-staking`), which the person reviews and signs in their own wallet. Every source file
 * under lib/ai, components/ai and components/zigi is read: no wallet, signer, CosmJS or staking-pipeline import, no signer
 * symbol, no wallet provider; nothing under lib/ai/earn (ZIGi's Earn coach) or the Earn snapshot fetches anything. The
 * runtime half: the staking card is a pre-fill that writes nothing, is never automatic and only opens the Staking page.
 */
const WEB = join(__dirname, '..', '..');
const sources = (dir: string): string[] => !existsSync(join(WEB, dir)) ? [] : readdirSync(join(WEB, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(WEB, path)).isDirectory() ? sources(path) : /\.(ts|tsx|mjs|js)$/.test(name) && !/\.test\.|\.spec\./.test(name) ? [path] : [];
});
const read = (file: string) => readFileSync(join(WEB, file), 'utf8');
const ZIGI = [...sources('lib/ai'), ...sources('components/ai'), ...sources('components/zigi')];
const IMPORTS = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g;
const FORBIDDEN_IMPORT = /^(?:@cosmjs\/|cosmjs-types|@keplr-wallet\/|@walletconnect\/|@metamask\/|ethers$|viem)|(?:^|\/)(?:wallet|wallets|wallet-link|staking|governance|onramps)(?:\/|$)|\/lib\/wallet(?:\.ts)?$|(?:^|\/)keplr-session$|(?:^|\/)(?:sign|execute|quote|sign-gate|receipt)$/;
const SIGNER = /getOfflineSigner|connectWithSigner|createWithSigner|SigningStargateClient|SigningCosmWasmClient|signAndBroadcast|broadcastTx|signDirect|signAmino|sendTransaction|eth_sendTransaction|signTransaction|issueSignTicket|executeSigned|experimentalSuggestChain|window\.keplr|\bkeplr\.enable\(|eth_requestAccounts|signMessage|personal_sign/;
const NETWORK = /\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|navigator\.sendBeacon|EventSource\(/;

describe('the ZIGi guard (static): nothing in ZIGi\'s trees can reach a wallet, a signer or the staking pipeline', () => {
  test('ZIGi\'s trees are read, and none imports wallet, signer, CosmJS or staking-pipeline code', () => {
    expect(ZIGI.length).toBeGreaterThan(150);
    const bad: string[] = [];
    for (const file of ZIGI) for (const m of read(file).matchAll(IMPORTS)) if (FORBIDDEN_IMPORT.test(m[1]!)) bad.push(`${file}: ${m[1]}`);
    expect(bad).toEqual([]);
  });
  test('no signer symbol or wallet provider call anywhere under lib/ai, components/ai or components/zigi', () => {
    expect(ZIGI.filter(file => SIGNER.test(read(file)))).toEqual([]);
  });
  test('ZIGi\'s Earn coach and the Earn snapshot never fetch: every figure ZIGi states comes from what the Earn page read', () => {
    const coach = sources('lib/ai/earn');
    expect(coach.length).toBeGreaterThan(0);
    for (const file of [...coach, 'lib/earn/snapshot.ts', 'lib/ai/tools/earn.ts']) expect(read(file), file).not.toMatch(NETWORK);
    // The snapshot is written only by the Earn page's own live hook (one line), never by ZIGi (the evals' recorded fixture aside, which is test data).
    const writers = [...sources('lib'), ...sources('components'), ...sources('app')].filter(f => f !== 'lib/earn/snapshot.ts' && !f.startsWith('lib/ai/evals/') && /recordEarnSnapshot\(/.test(read(f)));
    expect(writers).toEqual(['components/earn/use-earn-live.ts']);
  });
  test('the staking hand-off shares only the key\'s name with the staking form (lib/af-signing-keys.ts, a module without imports)', () => {
    const handoff = read('lib/ai/actions/staking-prefill.ts');
    expect([...handoff.matchAll(IMPORTS)].map(m => m[1])).toEqual(['../../af-signing-keys']);
    expect([...read('lib/af-signing-keys.ts').matchAll(IMPORTS)]).toEqual([]);
    expect(STAKING_PREFILL_ROUTE).toMatch(/^\/app\/staking(?:#[a-z-]+)?$/);
  });
});

describe('the ZIGi guard (runtime): the staking card fills in the review and nothing else', () => {
  const stores = (): Stores => ({habits: emptyHabitData(), health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform: emptyPlatform(), fasting: {version: 1, sessions: []}, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: emptyWeeklyReview(), memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}});
  const env: Env = {stores: stores(), handles: [], now: new Date('2026-10-19T08:00:00Z'), habitDay: '2026-10-19', healthDay: '2026-10-19', timeZone: 'UTC'};
  test('prefill-staking is a pre-fill, never a writing kind, never automatic, whatever the switches say', () => {
    expect(PREFILL_KINDS).toContain('prefill-staking'); expect(WRITING_KINDS).not.toContain('prefill-staking');
    expect(AUTO_ACCEPT_NEVER).toContain('prefill-staking'); expect(AUTO_ACCEPT_KINDS).not.toContain('prefill-staking');
    expect(autoAcceptVerdict({version: 1, autoAccept: {kinds: {'prefill-staking': true}}}, 'prefill-staking', '2026-10-19', true)).toEqual({ok: false, reason: 'never'});
  });
  test('its plan is a form with no write, no Undo, no device record and no navigation of its own; only the staking hand-off', () => {
    for (const raw of [{kind: 'prefill-staking'}, {kind: 'prefill-staking', action: 'undelegate', amount: '5'}, {kind: 'prefill-staking', action: 'claim', network: 'real'}]) {
      const result = planAction(actionSchema.parse(raw) as Action, env);
      expect(result.ok).toBe(true); if (!result.ok) continue;
      const p = result.plan;
      expect(p.target).toBe('form'); expect(p.write(env.stores)).toEqual({}); expect(p.undo).toBeNull();
      expect(p.device).toBeUndefined(); expect(p.navigate).toBeUndefined(); expect(p.confirm).toBeUndefined(); expect(p.prefill).toBeUndefined(); expect(p.contribution).toBeUndefined();
      expect(Object.keys(p.staking!).sort()).toEqual(expect.arrayContaining(['action', 'network']));
      expect(runnerEffect(p)).toBeNull(); // the generic effects never act on it; only the runner's staking hand-off does
      expect(p.card.lines.join(' ')).toMatch(/nothing is signed or sent until you review it there and sign in your own wallet/);
    }
  });
});
