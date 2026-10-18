import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {NATIVE_STAKING_TYPE_URLS} from '../app-environment';

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
    expect(body.replace(/^\{/, '').trimStart().startsWith('assertNativeStakingAllowed(ticket.messages);')).toBe(true);
    expect(body.indexOf('redeemSignTicket(ticket)')).toBeGreaterThan(body.indexOf('assertNativeStakingAllowed('));
    for (const [call, count] of [['.getOfflineSignerAuto(', 1], ['SigningStargateClient.connectWithSigner(', 1], ['client.sign(', 1], ['client.broadcastTxSync(', 1]] as const) expect(text.split(call).length - 1, call).toBe(count);
    // The signature and the broadcast each re-check the build and the message types right before they happen.
    expect(body.match(/sign: async \(\) => \{\s*assertNativeStakingAllowed\(quote\.messages\);/)).not.toBeNull();
    expect(body.match(/broadcast: async bytes => \{\s*assertNativeStakingAllowed\(quote\.messages\);/)).not.toBeNull();
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
    expect(issuers.every(f => f === sheet) && executors.every(f => f === sheet), [...issuers, ...executors].join(' ')).toBe(true);
    if (issuers.length || executors.length) {
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
      // The ticket is made from the handler's own event, nothing else.
      expect(body).toMatch(/issueSignTicket\(\w+, (\w+)\)/);
      expect(body.match(/issueSignTicket\(\w+, (\w+)\)/)![1]).toBe(/const \w+ = async \((\w+): FormEvent/.exec(text.slice(at))![1]);
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
  test('only the five native message types (and the contract path\'s one) are named anywhere', () => {
    const allowed = new Set([...NATIVE_STAKING_TYPE_URLS]);
    const contract = '/cosmwasm.wasm.v1.MsgExecuteContract';
    for (const file of ALL) for (const literal of read(file).match(/["'`]\/(cosmos|cosmwasm|ibc|zigchain|osmosis|ethermint)\.[A-Za-z0-9_.]+["'`]/g) ?? []) {
      const url = literal.slice(1, -1);
      if (url === contract) expect(['lib/wallet.ts', 'lib/receipt-reconciliation.ts'], file).toContain(file);
      else expect(allowed.has(url), `${file}: ${url}`).toBe(true);
    }
  });
  test('the staking wallet session asks Keplr for its connect calls only and reads only the two RPC hosts', () => {
    const text = read('lib/wallets/keplr-session.ts');
    expect(text).not.toMatch(SIGNER);
    expect(text).not.toMatch(/signArbitrary|eth_|personal_|wallet_|sendTx|\bsign[A-Z]\w*\(/);
    expect([...new Set(text.match(/keplr\.(\w+)\(/g))].sort()).toEqual(['keplr.enable(', 'keplr.experimentalSuggestChain(', 'keplr.getKey(']);
    expect(text.match(/\bfetcher\((.*?),/g)).toEqual(['fetcher(config.rpcUrl + path,']);
  });
});
