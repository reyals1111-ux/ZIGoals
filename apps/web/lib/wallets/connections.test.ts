import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {VERIFIED_URLS} from '@zigoals/ecosystem-registry/verified-links';
import {KNOWN_EVM_WALLETS, evmSuggestions} from './eip6963';
import {metaMaskInAppLink, trustInAppLink} from './in-app-browser';
import {L2B_LINKS, L2B_URLS, fromPrefix} from './links';
import {WALLETCONNECT_SOON, phoneWalletPaths} from '../../components/wallet/phone-wallet-paths';
import {PUBLIC_INTEGRATIONS} from '../public-integrations';
import {WALLETCONNECT_CSP} from './walletconnect';

// Session AF (L2b, ADR-028 H40, H41, H87, P3.1–P3.4): the wallets the menu names, the phones' in-app-browser links and the
// outgoing-link rule for the L2b files.
const WEB = join(__dirname, '..', '..');
const sources = (dir: string): string[] => readdirSync(join(WEB, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(WEB, path)).isDirectory() ? sources(path) : /\.(ts|tsx)$/.test(name) && !/\.test\.|\.spec\./.test(name) ? [path] : [];
});

describe('EVM wallets (EIP-6963)', () => {
  test('the six R4 wallets by the rdns each announces, each with its official site from the link list', () => {
    expect(KNOWN_EVM_WALLETS.map(w => [w.rdns, w.name])).toEqual([['io.metamask', 'MetaMask'], ['io.rabby', 'Rabby'], ['com.coinbase.wallet', 'Coinbase Wallet'], ['com.trustwallet.app', 'Trust Wallet'], ['com.okex.wallet', 'OKX Wallet'], ['app.phantom', 'Phantom']]);
    // AE's three keep their exact sites (wallet-menu.spec asserts them).
    expect(evmSuggestions([]).slice(0, 3).map(s => s.href)).toEqual(['https://metamask.io/', 'https://rabby.io/', 'https://www.coinbase.com/wallet']);
    expect(evmSuggestions([{rdns: 'io.metamask'}, {rdns: 'app.phantom'}]).map(s => s.name)).toEqual(['Rabby', 'Coinbase Wallet', 'Trust Wallet', 'OKX Wallet']);
    for (const s of evmSuggestions([])) expect(L2B_URLS.has(s.href), s.href).toBe(true);
  });
});

describe('phones: the wallets\' own in-app browsers (H87), WalletConnect said honestly (H6)', () => {
  test('MetaMask and Trust links open this app\'s own page only', () => {
    expect(metaMaskInAppLink('https://alpha.zigoals.app')).toBe('https://link.metamask.io/dapp/alpha.zigoals.app/app');
    expect(metaMaskInAppLink('https://alpha.zigoals.app', '/app/wealth')).toBe('https://link.metamask.io/dapp/alpha.zigoals.app/app/wealth');
    expect(trustInAppLink('https://alpha.zigoals.app')).toBe('https://link.trustwallet.com/open_url?coin_id=60&url=https%3A%2F%2Falpha.zigoals.app%2Fapp');
    expect(metaMaskInAppLink('http://127.0.0.1:3104')).toBe('https://link.metamask.io/dapp/127.0.0.1:3104/app');
    for (const [origin, path] of [['http://evil.example', '/app'], ['https://alpha.zigoals.app', '/'], ['https://alpha.zigoals.app', '//evil.example/app'], ['https://alpha.zigoals.app', 'https://evil.example/app']]) {
      expect(() => metaMaskInAppLink(origin!, path), `${origin}${path}`).toThrow(); expect(() => trustInAppLink(origin!, path), `${origin}${path}`).toThrow();
    }
    expect(() => fromPrefix('trust-site', 'https://trustwallet.com/x')).toThrow();
    expect(() => fromPrefix('metamask-dapp', 'https://evil.example/dapp/')).toThrow();
  });
  test('the sheet group: three links (L2a\'s Keplr first); with the owner\'s project ID (Session AK) WalletConnect comes second when the sheet can open it, and no "available soon" line', () => {
    expect(PUBLIC_INTEGRATIONS.reownProjectId).not.toBeNull();
    expect(phoneWalletPaths('https://alpha.zigoals.app', () => undefined, false).items.map(i => i.key)).toEqual(['open-keplr', 'walletconnect', 'open-metamask', 'open-trust']);
    const group = phoneWalletPaths('https://alpha.zigoals.app', undefined, false);
    expect(group.items.map(i => [i.label, i.href])).toEqual([['Open ZIGoals in Keplr', 'keplrwallet://web-browser?url=https%3A%2F%2Falpha.zigoals.app%2Fapp'], ['Open ZIGoals in MetaMask', 'https://link.metamask.io/dapp/alpha.zigoals.app/app'], ['Open ZIGoals in Trust Wallet', 'https://link.trustwallet.com/open_url?coin_id=60&url=https%3A%2F%2Falpha.zigoals.app%2Fapp']]);
    // Android opens Keplr Mobile by its intent form (Keplr's package), the same page.
    expect(phoneWalletPaths('https://alpha.zigoals.app', undefined, true).items[0]!.href).toBe('intent://web-browser?url=https%3A%2F%2Falpha.zigoals.app%2Fapp#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;');
    expect(group.note).toBeUndefined(); expect(WALLETCONNECT_SOON).toMatch(/available soon/);
    expect(phoneWalletPaths('http://preview.example').items).toEqual([]);
  });
});

describe('outgoing links and labels of the L2b wallet files', () => {
  const files = [...sources('components/wallet'), ...sources('lib/wallets').filter(f => !f.endsWith('keplr-session.ts'))];
  test('every literal https address in them is a verified link (the registry or lib/wallets/links.ts), a JSON-RPC read host, or a namespace', () => {
    expect(files).toEqual(expect.arrayContaining(['components/wallet/wallet-menu.tsx', 'lib/wallets/solana-link.ts', 'lib/wallets/links.ts']));
    const prefixes = Object.values(L2B_LINKS).filter(l => 'prefix' in l).map(l => l.url);
    for (const file of files) {
      // The list itself (its rows' sources) and the read hosts (pinned by lib/wallets/balances/hosts.test.ts) are not links.
      if (file === 'lib/wallets/links.ts' || file.startsWith('lib/wallets/balances/')) continue;
      for (const url of readFileSync(join(WEB, file), 'utf8').match(/https:\/\/[^\s'"`)<>\\]+/g) ?? []) {
        const ok = L2B_URLS.has(url) || VERIFIED_URLS.has(url) || prefixes.some(p => url.startsWith(p)) || url === 'https://alpha.zigoals.app' || (WALLETCONNECT_CSP.connect as readonly string[]).includes(url) || (WALLETCONNECT_CSP.frame as readonly string[]).includes(url);
        expect(ok, `${file}: ${url}`).toBe(true);
      }
    }
  });
  test('P3.4: no "Preview" label in the wallet menu, the sheet rows or the wallet card', () => {
    for (const file of files) expect(readFileSync(join(WEB, file), 'utf8'), file).not.toMatch(/\bPreview\b/);
  });
});
