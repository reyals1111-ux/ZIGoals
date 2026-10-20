import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, test} from 'vitest';

/**
 * Session AE (Part 6, ADR-027; `TIER 3 (wallet)`): the wallets linked read-only stay read-only. This guard reads the new
 * wallet files and fails on any signing, sending, permission or network-switching method, on any network request, and
 * on any EVM method other than `eth_requestAccounts`. It also keeps the one signer the app has (`getOfflineSigner*`) inside
 * the existing execute path of lib/wallet.ts, which assertFinancialExecutionAllowed blocks in the public Alpha.
 */
const WEB = join(__dirname, '..');
const NEW_FILES = ['lib/wallet-link.ts', 'lib/wallet-address.ts', 'lib/linked-wallets.ts', 'lib/linked-wallets-key.ts',
  ...readdirSync(join(WEB, 'components/wallet')).filter(name => /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)).map(name => `components/wallet/${name}`)];
// Gate C security review (ADR-027): every Keplr-API signing or sending method too (signEthereum, signICNSAdr36,
// experimentalSignEIP712CosmosTx_v0, sendEthereumTx…), by shape rather than by a list that a new method could slip past.
const FORBIDDEN = /signAmino|signDirect|signArbitrary|eth_sign|personal_sign|eth_signTypedData|eth_sendTransaction|wallet_requestPermissions|wallet_switchEthereumChain|wallet_addEthereumChain|sendTx|broadcast|\bsign[A-Z]\w*|experimentalSign|send\w*Tx\b/;
const read = (file: string) => readFileSync(join(WEB, file), 'utf8');
const sources = (dir: string): string[] => readdirSync(join(WEB, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(WEB, path)).isDirectory() ? sources(path) : /\.(ts|tsx|mjs)$/.test(name) && !/\.test\.|\.spec\./.test(name) ? [path] : [];
});

describe('Session AE wallet guard', () => {
  test('the new wallet files exist and name no signing, sending or permission method', () => {
    expect(NEW_FILES).toEqual(expect.arrayContaining(['components/wallet/wallet-menu.tsx', 'components/wallet/wallet-more-button.tsx', 'components/wallet/use-linked-wallets.ts']));
    for (const file of NEW_FILES) expect(read(file), file).not.toMatch(FORBIDDEN);
  });
  test('they make no network request and ask an EVM wallet for nothing but its accounts', () => {
    for (const file of NEW_FILES) {
      const text = read(file);
      expect(text, file).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.connection/);
      for (const method of text.match(/\b(?:eth|wallet|net|personal)_[A-Za-z]+/g) ?? []) expect(method, file).toBe('eth_requestAccounts');
      // A method built at run time (`request({method: m})`, "eth_" + "send…") would pass the line above: every request call is
      // written out, and asks for the accounts only.
      for (const call of text.match(/\.request\([^)]*\)/g) ?? []) expect(call, file).toBe(".request({method: 'eth_requestAccounts'})");
    }
    // The Cosmos calls are exactly Keplr's connect (suggest, enable, getKey) and Keplr's own disable for Disconnect.
    const link = read('lib/wallet-link.ts');
    expect([...new Set(link.match(/provider\.(\w+)\(/g))].sort()).toEqual(['provider.enable(', 'provider.experimentalSuggestChain(', 'provider.getKey(', 'provider.request(']);
  });
  // Assertion changed (Session AF, ADR-028 H4, `TIER 3 (wallet/signing)`; owner rule change "native-staking signing on
  // practice and real networks"): the one signer had one file; now exactly two may name it — this contract path (still
  // blocked on the Alpha) and native staking's one signer, lib/staking/execute.ts, whose only function that calls it starts
  // with assertNativeStakingAllowed. Every other file, the AE wallet files above included, still names no signer at all;
  // lib/staking/staking-guard.test.ts pins who may reach execute.ts (the review sheet's submit handler only).
  // Gate C test audit: a file is cut at every top-level declaration (a function or a const, exported or not), so a signer
  // call in a private helper written after a function is that helper's, never the function's above it.
  const declarations = (text: string) => text.split(/(?=^(?:export )?(?:async )?function |^(?:export )?const \w+ = )/m);
  const nameOf = (body: string) => body.match(/^(?:export )?(?:async )?function (\w+)|^(?:export )?const (\w+)/)?.slice(1).find(Boolean) ?? 'outside a function';
  test('the only signers stay in lib/wallet.ts\'s blocked execute path and lib/staking/execute.ts\'s staking path', () => {
    const uses = [...sources('lib'), ...sources('components'), ...sources('app')].filter(file => /getOfflineSigner/.test(read(file)));
    expect(uses).toEqual(['lib/staking/execute.ts', 'lib/wallet.ts']);
    const staking = declarations(read('lib/staking/execute.ts'));
    const stakingCalls = staking.filter(body => /\.getOfflineSigner\w*\(/.test(body)).map(nameOf);
    expect(stakingCalls).toEqual(['executeSigned']);
    // Session AF chunk 3: the first statement passes the ticket as the signature's context (chain id, memo, Ledger), so
    // the practice-badge and revoke rules run there too; it is still the first statement (equal strength).
    expect(staking.find(body => body.startsWith('export async function executeSigned('))!.replace(/^[^{]*\{/, '').trimStart().startsWith('assertNativeStakingAllowed(ticket.messages, ticket);')).toBe(true);
    // The staking wallet session (Session AF) is held to the same no-signing shapes as the AE wallet files.
    expect(read('lib/wallets/keplr-session.ts')).not.toMatch(FORBIDDEN);
    const wallet = read('lib/wallet.ts');
    // The interface declares it once; each call sits in quoteExecute or executeQuote, which start with the Alpha's block.
    const functions = declarations(wallet);
    const calling = functions.filter(body => /\.getOfflineSigner\w*\(/.test(body)).map(nameOf);
    expect(calling.sort()).toEqual(['executeQuote', 'quoteExecute']);
    for (const name of calling) expect(functions.find(body => body.startsWith(`export async function ${name}(`))!.replace(/^[^{]*\{/, '').trimStart().startsWith('assertFinancialExecutionAllowed();'), name).toBe(true);
    expect(relative(WEB, join(WEB, 'lib/wallet.ts'))).toBe('lib/wallet.ts');
  });
});

/**
 * Session AF (L2b, ADR-028 H40; `TIER 3 (wallet)`): the Solana side, held to the same rules. The read-only wallet files of
 * lib/wallets (every file there except lane L2a's staking session and the balance readers, which have their own guard in
 * lib/wallets/balances/hosts.test.ts) name no signing, sending or permission method, make no request, ask an EVM wallet
 * for its accounts only, and call exactly two Wallet Standard features: `standard:connect` (the address) and
 * `standard:disconnect` (Remove). No `solana:sign…` feature is named anywhere in the wallet files or components.
 */
describe('Session AF wallet guard: the Solana side and lib/wallets', () => {
  const LANE_FILES = sources('lib/wallets').filter(file => !file.startsWith('lib/wallets/balances/') && file !== 'lib/wallets/keplr-session.ts');
  const ALL = [...NEW_FILES, ...LANE_FILES];
  test('the lane\'s wallet files exist and name no signing, sending or permission method', () => {
    expect(LANE_FILES).toEqual(expect.arrayContaining(['lib/wallets/solana-link.ts', 'lib/wallets/eip6963.ts', 'lib/wallets/in-app-browser.ts', 'lib/wallets/links.ts']));
    for (const file of LANE_FILES) expect(read(file), file).not.toMatch(FORBIDDEN);
  });
  test('they make no request and ask an EVM wallet for its accounts only', () => {
    for (const file of LANE_FILES) {
      const text = read(file);
      expect(text, file).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.connection/);
      for (const method of text.match(/\b(?:eth|wallet|net|personal)_[A-Za-z]+/g) ?? []) expect(method, file).toBe('eth_requestAccounts');
      for (const call of text.match(/\.request\([^)]*\)/g) ?? []) expect(call, file).toBe(".request({method: 'eth_requestAccounts'})");
    }
  });
  test('exactly standard:connect and standard:disconnect; no solana:sign… feature, no signing feature by any spelling', () => {
    for (const file of ALL) {
      const text = read(file);
      expect(text, file).not.toMatch(/solana:sign|signAndSend|signTransaction|signMessage|signIn\b/i);
      for (const name of text.match(/['"`](?:standard|solana):[A-Za-z]+['"`]/g) ?? []) expect(['standard:connect', 'standard:disconnect', 'solana:mainnet'], `${file}: ${name}`).toContain(name.slice(1, -1));
    }
    const link = read('lib/wallets/solana-link.ts');
    expect([...new Set(link.match(/feature\(wallet, '[^']+'\)/g))].sort()).toEqual(["feature(wallet, 'standard:connect')", "feature(wallet, 'standard:disconnect')"]);
    // Only the two features' own methods are read off a wallet.
    expect([...new Set(link.match(/\?\.(?:connect|disconnect)\b/g))].sort()).toEqual(['?.connect', '?.disconnect']);
  });
});
