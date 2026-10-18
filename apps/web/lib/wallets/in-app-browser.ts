import {fromPrefix} from './links';

/**
 * Session AF (L2b, ADR-028 H6, H38, H87; `TIER 3 (wallet)`): on a phone, before WalletConnect has the owner's project ID,
 * a wallet connects from inside its own app's browser, where it injects itself and the computer flows work unchanged. These
 * build the two documented links that open this app's own page there (lib/wallets/links.ts holds their prefixes): MetaMask's
 * `https://link.metamask.io/dapp/<host><path>` and Trust Wallet's `https://link.trustwallet.com/open_url?coin_id=60&url=…`
 * (coin 60 = Ethereum, Trust's documented form). Keplr's own "Open ZIGoals in Keplr" is lane L2a's (lib/wallets/keplr-session.ts).
 * The address is always this app's own origin: an https page, or the local development host.
 */
function ownPage(origin: string, path: string): URL {
  const url = new URL(path, origin);
  const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  if ((url.protocol !== 'https:' && !local) || url.origin !== new URL(origin).origin || !path.startsWith('/app')) throw Error('Only this app\'s own pages can be opened in a wallet.');
  return url;
}
export const metaMaskInAppLink = (origin: string, path = '/app'): string => {
  const url = ownPage(origin, path);
  return fromPrefix('metamask-dapp', `https://link.metamask.io/dapp/${url.host}${url.pathname}`);
};
export const trustInAppLink = (origin: string, path = '/app'): string =>
  fromPrefix('trust-dapp', `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(ownPage(origin, path).toString())}`);
