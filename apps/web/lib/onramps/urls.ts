import {PUBLIC_INTEGRATIONS, type PublicIntegrations} from '../public-integrations';
import {fromPrefix, l2bLink} from '../wallets/links';
import {NETWORKS, buyAsset, offerFor, type BuyAssetId, type NetworkId, type ProviderId} from './assets';
import {checkedAddress} from './guard';

/**
 * Session AF (L2b, Part 4, ADR-028 H18, H22, H34, H52, H83, H90; A2.6): the hand-off addresses. Public parameters only, each
 * `encodeURIComponent`-ed: Ramp's hosted mode (`hostApiKey`, `hostAppName`, `hostLogoUrl`, `enabledCryptoAssets` + `outAsset`
 * — Ramp's current names; amendment 2's `swapAsset`/`defaultAsset` are now deprecated by Ramp (docs/earn/af/ONRAMP_CODES.md),
 * and the owner's intent, the asset pre-selected, is kept —, `userAddress`, `finalUrl`) and Banxa's referral page
 * (`{partnerRef}.banxa.com/?coinType=&blockchain=&walletAddress=&fiatType=&returnUrl=`; `returnUrl` is the referral
 * parameter, `redirectUrl` is only for API-created orders).
 * No secret exists in either; the IDs come only from apps/web/config/public-integrations.json. While an ID is empty, the
 * provider's plain consumer site is linked instead, with nothing pre-filled (and the page says so). The address passes the
 * network-mismatch guard first; the return address carries the purchase's asset, network and the linked wallet's local
 * id, never the address. Production hosts in the app; the sandbox hosts (`app.demo.rampnetwork.com`,
 * `<ref>.banxa-sandbox.com`) are for tests, which build these and never open or submit them.
 */
export type Environment = 'production' | 'sandbox';
export type HandOff = {provider: ProviderId; url: string; prefilled: boolean};
export type HandOffInput = {provider: ProviderId; asset: BuyAssetId; network: NetworkId; address: string; walletId: string; origin: string; currency: 'USD' | 'EUR'; config?: PublicIntegrations; environment?: Environment};
const ownOrigin = (origin: string) => {
  const url = new URL(origin);
  if (url.pathname !== '/' || url.search || url.hash || !(url.protocol === 'https:' || url.hostname === '127.0.0.1' || url.hostname === 'localhost')) throw Error('Not this app\'s own origin.');
  return url.origin;
};
/** Where the provider sends the person back: ZIGoals' own return page, with no address in it. */
export function returnUrl(input: Pick<HandOffInput, 'provider' | 'asset' | 'network' | 'walletId' | 'origin'>): string {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(input.walletId)) throw Error('Not a linked wallet id.');
  const url = new URL('/app/wealth/add-money/back', ownOrigin(input.origin));
  url.search = new URLSearchParams({provider: input.provider, asset: input.asset, network: input.network, wallet: input.walletId}).toString();
  return url.toString();
}
const query = (params: Record<string, string>) => Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
export function handOffUrl(input: HandOffInput): HandOff {
  const config = input.config ?? PUBLIC_INTEGRATIONS, environment = input.environment ?? 'production';
  const asset = buyAsset(input.asset), offer = asset && offerFor(asset, input.network);
  if (!asset || !offer) throw Error('That asset is not offered on that network.');
  const address = checkedAddress(input.network, input.address);
  const back = returnUrl(input);
  if (input.provider === 'ramp') {
    if (!offer.ramp) throw Error('Ramp does not offer this here.');
    if (!config.rampHostApiKey) return {provider: 'ramp', url: l2bLink('ramp-site').url, prefilled: false};
    const host = environment === 'production' ? l2bLink('ramp-hosted').url : 'https://app.demo.rampnetwork.com/';
    const url = `${host}?${query({hostApiKey: config.rampHostApiKey, hostAppName: config.rampHostAppName, hostLogoUrl: `${ownOrigin(input.origin)}/apple-touch-icon.png`, enabledCryptoAssets: offer.ramp.value, outAsset: offer.ramp.value, userAddress: address, finalUrl: back})}`;
    return {provider: 'ramp', url: environment === 'production' ? fromPrefix('ramp-hosted', url) : url, prefilled: true};
  }
  if (!offer.banxa) throw Error('Banxa does not offer this here.');
  if (!config.banxaPartnerRef) return {provider: 'banxa', url: l2bLink('banxa-site').url, prefilled: false};
  const host = `https://${config.banxaPartnerRef}.${environment === 'production' ? 'banxa.com' : 'banxa-sandbox.com'}/`;
  if (!/^https:\/\/[a-z0-9-]{2,40}\.banxa(-sandbox)?\.com\/$/.test(host)) throw Error('Not a Banxa partner page.');
  return {provider: 'banxa', url: `${host}?${query({coinType: offer.banxa.coinType.value, blockchain: offer.banxa.blockchain.value, walletAddress: address, fiatType: input.currency, returnUrl: back})}`, prefilled: true};
}
/** The return page's own reading of its address bar: only the four known values, each checked. */
export function readReturn(search: string): {provider: ProviderId; asset: BuyAssetId; network: NetworkId; walletId: string} | null {
  const q = new URLSearchParams(search), provider = q.get('provider'), asset = q.get('asset'), network = q.get('network'), walletId = q.get('wallet');
  if ((provider !== 'ramp' && provider !== 'banxa') || !asset || !network || !walletId || !/^[A-Za-z0-9-]{1,64}$/.test(walletId) || !Object.hasOwn(NETWORKS, network)) return null;
  const a = buyAsset(asset);
  return a && offerFor(a, network) ? {provider, asset: a.id, network: network as NetworkId, walletId} : null;
}
