import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {ATTESTATION_TYPE_URL, NATIVE_STAKING_TYPE_URLS} from '../app-environment';

/**
 * Session AF (ADR-028 H4; `TIER 3 (wallet/signing)`): the static gate. Signing exists in exactly two files — the Goal
 * Manager contract path (lib/wallet.ts, blocked on the Alpha by assertFinancialExecutionAllowed) and native staking's one
 * signer (lib/staking/execute.ts, which starts with assertNativeStakingAllowed). A signature can only follow the review
 * sheet's own submit: issueSignTicket is called only inside the review sheet's onSubmit handler, executeSigned only
 * there and after it; the gate's other two doors (registerQuote, redeemSignTicket) belong to quote.ts and execute.ts.
 * ZIGi's code never imports the pipeline. Only the five native message types (and the contract path's one) appear.
 */
const WEB = join(__dirname, '..', '..');
const read = (file: string) => readFileSync(join(WEB, file), 'utf8');
const sources = (dir: string): string[] => !existsSync(join(WEB, dir)) ? [] : readdirSync(join(WEB, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(WEB, path)).isDirectory() ? sources(path) : /\.(ts|tsx|mjs)$/.test(name) && !/\.test\.|\.spec\./.test(name) ? [path] : [];
});
const ALL = [...sources('lib'), ...sources('components'), ...sources('app')];
const SIGNER = /getOfflineSigner|connectWithSigner|createWithSigner|broadcastTx|signAndBroadcast|signDirect|signAmino|sendTransaction|eth_sendTransaction|signTransaction|SigningStargateClient|SigningCosmWasmClient/;
const callers = (name: string) => ALL.filter(file => new RegExp(`\\b${name}(<[^>]*>)?\\(`).test(read(file)));
/** The body of `{…}` starting at `open` (the index of its opening brace), by brace count. */
function block(text: string, open: number): string {
  let depth = 0;
  for (let i = open; i < text.length; i++) { if (text[i] === '{') depth++; else if (text[i] === '}' && --depth === 0) return text.slice(open, i + 1); }
  throw Error('unbalanced');
}

describe('Session AF staking guard', () => {
  test('signer calls live in lib/wallet.ts and lib/staking/execute.ts only', () => {
    expect(ALL.length).toBeGreaterThan(200);
    expect(ALL.filter(file => SIGNER.test(read(file)))).toEqual(['lib/staking/execute.ts', 'lib/wallet.ts']);
    // A `.sign(` anywhere else is Web Crypto's HMAC or the transaction runner calling its driver; never a wallet.
    for (const file of ALL.filter(f => f !== 'lib/staking/execute.ts' && f !== 'lib/wallet.ts'))
      for (const call of read(file).match(/[\w.]*\.sign\(/g) ?? []) expect(`${file}: ${call}`).toMatch(/: (crypto\.subtle\.sign\(|driver\.sign\()$/);
  });
  test('execute.ts: the one signer, after its assert; each signer call exactly once', () => {
    const text = read('lib/staking/execute.ts');
    const start = text.indexOf('export async function executeSigned(');
    expect(start).toBeGreaterThan(0);
    const body = block(text, text.indexOf('{', text.indexOf(')', text.indexOf('onState: TransactionUpdate', start))));
    // Session AF chunk 3: each check carries the signature's context (the ticket or its quote: chain id, memo, Ledger).
    expect(body.replace(/^\{/, '').trimStart().startsWith('assertNativeStakingAllowed(ticket.messages, ticket);')).toBe(true);
    expect(body).toMatch(/const quote = redeemSignTicket\(ticket\);\s*assertNativeStakingAllowed\(quote\.messages, quote\);/);
    expect(body.indexOf('redeemSignTicket(ticket)')).toBeGreaterThan(body.indexOf('assertNativeStakingAllowed('));
    for (const [call, count] of [['.getOfflineSignerAuto(', 1], ['SigningStargateClient.connectWithSigner(', 1], ['client.sign(', 1], ['client.broadcastTxSync(', 1]] as const) expect(text.split(call).length - 1, call).toBe(count);
    // The signature and the broadcast each re-check the build and the message types right before they happen.
    expect(body.match(/sign: async \(\) => \{\s*assertNativeStakingAllowed\(quote\.messages, quote\);/)).not.toBeNull();
    expect(body.match(/broadcast: async bytes => \{\s*assertNativeStakingAllowed\(quote\.messages, quote\);/)).not.toBeNull();
    // The signed bytes and the receipt are checked against the reviewed memo; the signature carries that memo only.
    expect(body).toMatch(/verifySignedMessages\(quote\.messages, bytes, quote\.memo\)/);
    expect(body).toMatch(/verifyStakingReceipt\(quote\.messages, hash, tx, quote\.memo\)/);
    expect(body).toMatch(/chain\.sign\(quote\.address, quote\.messages, quote\.fee, quote\.memo\)/);
    // A revoke is refused to a signer without signDirect (a Ledger's amino signer) before any connection.
    expect(body.indexOf('REVOKE_NEEDS_DIRECT')).toBeGreaterThan(body.indexOf('getOfflineSignerAuto('));
    expect(body.indexOf('REVOKE_NEEDS_DIRECT')).toBeLessThan(body.indexOf('connectWithSigner') < 0 ? body.indexOf('(deps.connect ?? cosmjsSigningChain)') : body.indexOf('connectWithSigner'));
  });
  test('quote.ts simulates and never signs or broadcasts', () => {
    const text = read('lib/staking/quote.ts');
    expect(text).not.toMatch(SIGNER);
    expect(text).not.toMatch(/\.sign\(|broadcast|getOfflineSigner/);
    expect(text).toMatch(/StargateClient\.connect\(rpcUrl\)/);
  });
  test('the gate\'s doors: registerQuote in quote.ts, redeemSignTicket in execute.ts, issueSignTicket and executeSigned in the review sheet\'s onSubmit only', () => {
    expect(callers('registerQuote').sort()).toEqual(['lib/staking/quote.ts', 'lib/staking/sign-gate.ts']);
    expect(callers('redeemSignTicket').sort()).toEqual(['lib/staking/execute.ts', 'lib/staking/sign-gate.ts']);
    const sheet = 'components/staking/review-sheet.tsx';
    const issuers = callers('issueSignTicket').filter(f => f !== 'lib/staking/sign-gate.ts'), executors = callers('executeSigned').filter(f => f !== 'lib/staking/execute.ts');
    expect(issuers).toEqual([sheet]);
    expect(executors).toEqual([sheet]);
    {
      const text = read(sheet);
      const handler = /<form[^>]*\sonSubmit=\{(\w+)\}/.exec(text)?.[1];
      expect(handler, 'the review sheet\'s form names its submit handler').toBeTruthy();
      expect(text.match(/\bonSubmit=/g)).toHaveLength(1);
      const at = text.search(new RegExp(`const ${handler} = async \\((\\w+): FormEvent<HTMLFormElement>\\) => \\{`));
      expect(at).toBeGreaterThan(0);
      const body = block(text, text.indexOf('{', text.indexOf('=>', at)));
      for (const name of ['issueSignTicket', 'executeSigned']) expect(text.split(`${name}(`).length - 1, name).toBe(1);
      const issue = body.indexOf('issueSignTicket('), execute = body.indexOf('executeSigned(');
      expect(issue).toBeGreaterThan(0); expect(execute).toBeGreaterThan(issue);
      // The ticket is made from the handler's own submit event and the Sign button's own click, nothing else: the one
      // submit button records its native click into `press`, which the handler reads (and clears) for the gate.
      const param = /const \w+ = async \((\w+): FormEvent/.exec(text.slice(at))![1];
      expect(body).toMatch(new RegExp(`issueSignTicket\\(quote, \\{submit: ${param}\\.nativeEvent as SubmitEvent, activation\\}\\)`));
      expect(body).toMatch(/const activation = press\.current;\s*press\.current = null;/);
      expect(text.match(/type="submit"/g)).toHaveLength(1);
      expect(text).toMatch(/<button type="submit"[^>]*onClick=\{event => \{ press\.current = event\.nativeEvent; \}\}/);
      expect(text.match(/press\.current = /g)).toHaveLength(2);
    }
  });
  // Session AF chunk 3: the new doors — Governance's vote, the rewards sweep, the revoke and the practice badge — all open
  // the same review screen; nothing else renders it, quotes or reaches the signer, and the new panels hold no signer at all.
  test('chunk 3\'s doors: only the staking actions and Governance quote (lazily) and render the review screen; the panels never reach the signer', () => {
    const renders = ALL.filter(file => /<ReviewSheet\b/.test(read(file)));
    expect(renders.sort()).toEqual(['components/governance/governance-view.tsx', 'components/staking/staking-actions.tsx']);
    expect(callers('quoteStaking').filter(f => f !== 'lib/staking/quote.ts').sort()).toEqual(['components/governance/governance-view.tsx', 'components/staking/staking-actions.tsx']);
    for (const file of renders) {
      const text = read(file);
      expect(text, file).not.toMatch(/import\s*\{[^}]*\bquoteStaking\b[^}]*\}\s*from/);
      expect(text, file).toMatch(/const \{quoteStaking\} = await import\('\.\.\/\.\.\/lib\/staking\/quote'\);/);
    }
    // Governance loads the review screen lazily, with the signing client, on the first "Review my vote".
    expect(read('components/governance/governance-view.tsx')).toMatch(/const ReviewSheet = lazy\(\(\) => import\('\.\.\/staking\/review-sheet'\)/);
    for (const file of ['components/staking/grants-panel.tsx', 'components/staking/attestation-card.tsx', 'components/staking/rewards-sweep.tsx', 'components/staking/validator-health.tsx', 'components/governance/proposal-card.tsx', 'components/settings/af-signing-section.tsx']) {
      const text = read(file);
      expect(text, file).not.toMatch(SIGNER);
      expect(text, file).not.toMatch(/lib\/staking\/(quote|execute|sign-gate)|review-sheet|issueSignTicket|executeSigned|quoteStaking/);
    }
  });
  test('ZIGi\'s code never reaches the pipeline', () => {
    const ai = [...sources('lib/ai'), ...sources('components/ai')];
    expect(ai.length).toBeGreaterThan(20);
    for (const file of ai) {
      const text = read(file);
      expect(text, file).not.toMatch(/from ['"][^'"]*(lib\/staking|\/staking\/|components\/staking|wallets\/keplr-session|@cosmjs\/stargate|@cosmjs\/proto-signing|cosmjs-types\/cosmos\/tx)/);
      expect(text, file).not.toMatch(/import\(['"][^'"]*(staking|keplr-session|@cosmjs)/);
      expect(text, file).not.toMatch(/getOfflineSigner|issueSignTicket|executeSigned|signDirect|signAmino/);
    }
  });
  // Assertion moved (Session AF chunk 3, ADR-028 D4, H45, H48): still every message type URL literal in the app is checked
  // against a fixed list; the list gains MsgRevoke (through NATIVE_STAKING_TYPE_URLS), and the bank send appears in exactly
  // two files: the build flag (lib/app-environment.ts, where the practice badge's rules live) and, as data a revoke names,
  // lib/staking/grants.ts — which, with MsgCancelUnbondingDelegation (also data there only), builds no message at all.
  test('only the native message types (and the contract path\'s one) are named anywhere; the badge\'s send and grant data in their two files', () => {
    const allowed = new Set([...NATIVE_STAKING_TYPE_URLS]);
    const contract = '/cosmwasm.wasm.v1.MsgExecuteContract';
    const data: Record<string, readonly string[]> = {[ATTESTATION_TYPE_URL]: ['lib/app-environment.ts', 'lib/staking/grants.ts'], '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation': ['lib/staking/grants.ts']};
    // A message type URL ("/<module path>.Msg…"); key types such as /cosmos.crypto.ed25519.PubKey are not messages.
    for (const file of ALL) for (const literal of read(file).match(/["'`]\/[a-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*\.Msg[A-Za-z0-9_]*["'`]/g) ?? []) {
      const url = literal.slice(1, -1);
      if (url === contract) expect(['lib/wallet.ts', 'lib/receipt-reconciliation.ts'], file).toContain(file);
      else if (data[url]) expect(data[url], `${file}: ${url}`).toContain(file);
      else expect(allowed.has(url), `${file}: ${url}`).toBe(true);
    }
    // grants.ts names those types as data only: no message object, no builder, no signer.
    const grants = read('lib/staking/grants.ts');
    expect(grants).not.toMatch(/\btypeUrl\s*:|STAKING_TYPE_URLS|from '\.\/(messages|quote|execute|sign-gate)'|\.sign\w*\(|broadcast\w*\(|getOfflineSigner/);
    // The send's rules: the flag's one place (assertAttestationAllowed), reached from assertNativeStakingAllowed.
    const flag = read('lib/app-environment.ts');
    expect(flag.match(/ATTESTATION_TYPE_URL = "\/cosmos\.bank\.v1beta1\.MsgSend"/g)).toHaveLength(1);
    expect(flag).toMatch(/context\.chainId !== ATTESTATION_CHAIN_ID/);
    expect(flag).toMatch(/value\.toAddress !== value\.fromAddress/);
    expect(flag).toMatch(/coin\.amount !== "1"/);
    expect(flag).toMatch(/!ATTESTATION_MEMO\.test\(context\.memo\)/);
    expect(flag).toMatch(/export const ATTESTATION_CHAIN_ID = "zig-test-2";/);
  });
  test('the staking wallet session asks Keplr for its connect calls only and reads only the two RPC hosts', () => {
    const text = read('lib/wallets/keplr-session.ts');
    expect(text).not.toMatch(SIGNER);
    expect(text).not.toMatch(/signArbitrary|eth_|personal_|wallet_|sendTx|\bsign[A-Z]\w*\(/);
    expect([...new Set(text.match(/keplr\.(\w+)\(/g))].sort()).toEqual(['keplr.enable(', 'keplr.experimentalSuggestChain(', 'keplr.getKey(']);
    expect(text.match(/\bfetcher\((.*?),/g)).toEqual(['fetcher(config.rpcUrl + path,']);
  });
});
