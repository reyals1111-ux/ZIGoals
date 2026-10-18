import {metaMaskInAppLink, trustInAppLink} from '../../lib/wallets/in-app-browser';
import {walletConnectConfigured} from '../../lib/public-integrations';

/**
 * Session AF (L2b, ADR-028 H6, H38, H87; `TIER 3 (wallet)`): the phone's wallet paths in the Status & wallet sheet. On a
 * phone a browser has no wallet extension, so a wallet connects from inside its own app's browser (it injects itself
 * there and the rows above work unchanged): "Open ZIGoals in MetaMask" and "Open ZIGoals in Trust Wallet" open this page
 * there (lib/wallets/in-app-browser.ts). Keplr's own "Open ZIGoals in Keplr" is lane L2a's and sits beside these once
 * merged. Until the owner adds WalletConnect's project ID (apps/web/config/public-integrations.json), one honest line says
 * WalletConnect is not offered yet; nothing pretends to connect.
 */
export const WALLETCONNECT_SOON = 'WalletConnect (Trust, Ledger Wallet, Keplr Mobile without its own browser): available soon on phones.';
export function phoneWalletPaths(origin: string = typeof window === 'undefined' ? 'https://alpha.zigoals.app' : window.location.origin) {
  const items: {key: string; label: string; detail: string; href: string}[] = [];
  try {
    items.push({key: 'open-metamask', label: 'Open ZIGoals in MetaMask', detail: 'In MetaMask’s own browser, then link from the rows above', href: metaMaskInAppLink(origin)});
    items.push({key: 'open-trust', label: 'Open ZIGoals in Trust Wallet', detail: 'In Trust Wallet’s own browser, then link from the rows above', href: trustInAppLink(origin)});
  } catch { /* not this app's own https page (a preview host): no path is offered */ }
  return {key: 'phone', title: 'On a phone · open in your wallet’s app', items, note: walletConnectConfigured() ? undefined : WALLETCONNECT_SOON};
}
