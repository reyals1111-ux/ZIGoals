import {metaMaskInAppLink, trustInAppLink} from '../../lib/wallets/in-app-browser';
import {walletConnectConfigured} from '../../lib/public-integrations';
import {keplrMobileLink} from '../../lib/wallets/keplr-session';

/**
 * Session AF (L2b, ADR-028 H6, H38, H87; `TIER 3 (wallet)`): the phone's wallet paths in the Status & wallet sheet. On a
 * phone a browser has no wallet extension, so a wallet connects from inside its own app's browser (it injects itself
 * there and the rows above work unchanged): "Open ZIGoals in MetaMask" and "Open ZIGoals in Trust Wallet" open this page
 * there (lib/wallets/in-app-browser.ts). Keplr's own "Open ZIGoals in Keplr" is lane L2a's (Session AF chunk 3, the one
 * edit here): first in the group, Keplr Mobile's in-app browser by its `keplrwallet://web-browser?url=…` link (Android's
 * intent form with Keplr's package), built in lib/wallets/keplr-session.ts. Until the owner adds WalletConnect's project ID
 * (apps/web/config/public-integrations.json), one honest line says WalletConnect is not offered yet; nothing pretends to
 * connect. With the ID, "Connect by WalletConnect" comes right after Keplr.
 */
export const WALLETCONNECT_SOON = 'WalletConnect (Trust, Ledger Wallet, Keplr Mobile without its own browser): available soon on phones.';
export function phoneWalletPaths(origin: string = typeof window === 'undefined' ? 'https://alpha.zigoals.app' : window.location.origin, onWalletConnect?: () => void, android: boolean = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)) {
  const items: {key: string; label: string; detail: string; href?: string; onSelect?: () => void}[] = [];
  try { items.push({key: 'open-keplr', label: 'Open ZIGoals in Keplr', detail: 'In Keplr’s own browser: connect Keplr there to stake and vote', href: keplrMobileLink(origin, android, '/app')}); }
  catch { /* not this app's own page (a preview host): no path is offered */ }
  // With the owner's project ID: WalletConnect first (components/wallet/walletconnect-panel.tsx; the package loads on tap).
  if (walletConnectConfigured() && onWalletConnect) items.push({key: 'walletconnect', label: 'Connect by WalletConnect', detail: 'Trust, Ledger Wallet, Keplr Mobile and other WalletConnect wallets · addresses only', onSelect: onWalletConnect});
  try {
    items.push({key: 'open-metamask', label: 'Open ZIGoals in MetaMask', detail: 'In MetaMask’s own browser, then link from the rows above', href: metaMaskInAppLink(origin)});
    items.push({key: 'open-trust', label: 'Open ZIGoals in Trust Wallet', detail: 'In Trust Wallet’s own browser, then link from the rows above', href: trustInAppLink(origin)});
  } catch { /* not this app's own https page (a preview host): no path is offered */ }
  return {key: 'phone', title: 'On a phone · open in your wallet’s app', items, note: walletConnectConfigured() ? undefined : WALLETCONNECT_SOON};
}
