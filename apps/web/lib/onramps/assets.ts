import type {AddressKind} from '../wallet-address';
import {chainById} from '../wallets/balances/chains';

/**
 * Session AF (L2b, Part 4, ADR-028 H83, owner amendment 2): the one asset × network × provider table that drives Add money.
 * Each asset is bought to the person's own address on its own network (never a ZIGoals address: none exists), from the
 * matching linked wallet only. Every provider code carries its status and source:
 * - `documented`: the code itself is in the provider's own published table, as docs/earn/af/ONRAMP_CODES.md and
 *   onramp-codes.json record it (Part 0, read 2026-10-18 22:34–22:41 UTC): Ramp's CHAIN_SYMBOL codes column (every code here
 *   is in it; Ramp's v3 list agrees) and Banxa's coin table (coinType = its Code column, blockchain = its Network column);
 * - `inferred`: built from a pattern only (none left);
 * - `confirmed`: seen working in the provider's checkout (none: without the owner's hostApiKey Ramp's pages answer
 *   "INTEGRATION ISSUE DETECTED", and Banxa's partner subdomains do not resolve before onboarding).
 * The networks per asset are the ones both providers list AND ZIGoals can watch (lib/wallets/balances/chains.ts), so the
 * return page can show the money arriving. USDT only where Tether itself issues it (Ethereum, Solana).
 */
export type NetworkId = 'ethereum' | 'base' | 'arbitrum' | 'optimism' | 'polygon' | 'solana' | 'bitcoin' | 'cosmos-hub';
export type BuyAssetId = 'usdc' | 'usdt' | 'eth' | 'sol' | 'btc' | 'atom' | 'zig-via-atom';
export type CodeStatus = 'documented' | 'inferred' | 'confirmed';
export type ProviderCode = {value: string; status: CodeStatus; source: string};
export type ProviderId = 'ramp' | 'banxa';
export type Network = {id: NetworkId; name: string; chainId: string; walletKind: AddressKind; rampChain: string; banxaChain: string; plain: string};
export const NETWORKS: {readonly [N in NetworkId]: Network} = Object.freeze({
  ethereum: {id: 'ethereum', name: 'Ethereum', chainId: 'eip155:1', walletKind: 'evm', rampChain: 'ETH', banxaChain: 'ETH', plain: 'Ethereum itself: the most widely used, and the most expensive to move money on.'},
  base: {id: 'base', name: 'Base', chainId: 'eip155:8453', walletKind: 'evm', rampChain: 'BASE', banxaChain: 'BASE', plain: 'An Ethereum network with low fees, run by Coinbase. The same wallet address as on Ethereum.'},
  arbitrum: {id: 'arbitrum', name: 'Arbitrum', chainId: 'eip155:42161', walletKind: 'evm', rampChain: 'ARBITRUM', banxaChain: 'ARB', plain: 'An Ethereum network with low fees. The same wallet address as on Ethereum.'},
  optimism: {id: 'optimism', name: 'OP Mainnet', chainId: 'eip155:10', walletKind: 'evm', rampChain: 'OPTIMISM', banxaChain: 'OPTIMISM', plain: 'An Ethereum network with low fees (Optimism). The same wallet address as on Ethereum.'},
  polygon: {id: 'polygon', name: 'Polygon', chainId: 'eip155:137', walletKind: 'evm', rampChain: 'MATIC', banxaChain: 'MATIC', plain: 'A low-fee network that uses Ethereum-style addresses.'},
  solana: {id: 'solana', name: 'Solana', chainId: 'solana:mainnet', walletKind: 'solana', rampChain: 'SOLANA', banxaChain: 'SOL', plain: 'Solana: its own addresses and wallets (Phantom, for example); moving money costs a fraction of a cent.'},
  bitcoin: {id: 'bitcoin', name: 'Bitcoin', chainId: 'bitcoin', walletKind: 'btc', rampChain: 'BTC', banxaChain: 'BTC', plain: 'Bitcoin’s own network.'},
  'cosmos-hub': {id: 'cosmos-hub', name: 'Cosmos Hub', chainId: 'cosmoshub-4', walletKind: 'cosmos', rampChain: 'COSMOS', banxaChain: 'ATOM', plain: 'The Cosmos Hub. Your Keplr key’s cosmos1… address; from here ATOM can move to ZIGChain.'},
});
const RAMP_SOURCE = 'docs/earn/af/ONRAMP_CODES.md: Ramp\'s assets table (docs.rampnetwork.com/assets, read 2026-10-18 22:39 UTC) and v3 list (22:34 UTC)';
const BANXA_SOURCE = 'docs/earn/af/ONRAMP_CODES.md: Banxa\'s coin table (docs.banxa.com, read 2026-10-18 22:40 UTC)';
const rampCode = (network: NetworkId, symbol: string): ProviderCode => ({value: `${NETWORKS[network].rampChain}_${symbol}`, status: 'documented', source: RAMP_SOURCE});
const banxaCode = (network: NetworkId, symbol: string) => ({coinType: {value: symbol, status: 'documented' as const, source: BANXA_SOURCE}, blockchain: {value: NETWORKS[network].banxaChain, status: 'documented' as const, source: BANXA_SOURCE}});
export type Offer = {network: NetworkId; ramp: ProviderCode | null; banxa: {coinType: ProviderCode; blockchain: ProviderCode} | null};
const offer = (network: NetworkId, symbol: string, providers: {ramp?: boolean; banxa?: boolean} = {}): Offer => ({network, ramp: providers.ramp === false ? null : rampCode(network, symbol), banxa: providers.banxa === false ? null : banxaCode(network, symbol)});
export type BuyAsset = {
  id: BuyAssetId; symbol: string; name: string; kind: 'stablecoin' | 'coin';
  /** The tile's one line in plain words. */
  plain: string;
  /** "What's this?": a few more plain sentences. */
  more: string;
  offers: readonly Offer[]; recommended: NetworkId;
  /** Why that network, and the fee difference, in plain words (no number ZIGoals did not read). */
  recommendation: string;
};
export const BUY_ASSETS: readonly BuyAsset[] = Object.freeze([
  {id: 'usdc', symbol: 'USDC', name: 'USD Coin', kind: 'stablecoin', plain: 'USDC: a digital dollar, stays about 1 USD.',
    more: 'USDC is a stablecoin issued by Circle: each one is meant to be redeemable for 1 US dollar that Circle holds in reserve. Its price stays close to 1 USD but is not guaranteed, and it exists separately on each network.',
    offers: [offer('base', 'USDC'), offer('ethereum', 'USDC'), offer('arbitrum', 'USDC'), offer('optimism', 'USDC'), offer('polygon', 'USDC'), offer('solana', 'USDC')], recommended: 'base',
    recommendation: 'Base is recommended: it is an Ethereum network with low fees, so moving or swapping your USDC later usually costs far less than on Ethereum itself. If your wallet is a Solana wallet, Solana is cheap too.'},
  {id: 'usdt', symbol: 'USDT', name: 'Tether USD', kind: 'stablecoin', plain: 'USDT: a digital dollar, stays about 1 USD.',
    more: 'USDT is a stablecoin issued by Tether: each one is meant to be redeemable for 1 US dollar of Tether’s reserves. Its price stays close to 1 USD but is not guaranteed. ZIGoals offers it only on the networks where Tether itself issues it.',
    offers: [offer('solana', 'USDT'), offer('ethereum', 'USDT')], recommended: 'solana',
    recommendation: 'Solana is recommended: Tether issues USDT there and each later move usually costs a fraction of a cent; on Ethereum each move can cost far more.'},
  {id: 'eth', symbol: 'ETH', name: 'Ether', kind: 'coin', plain: 'ETH: Ethereum’s own coin. Its price goes up and down.',
    more: 'Ether pays for every action on Ethereum and on the Ethereum networks with low fees (Base, Arbitrum, OP Mainnet). Its price moves with the market, so it can lose value.',
    offers: [offer('base', 'ETH'), offer('ethereum', 'ETH'), offer('arbitrum', 'ETH'), offer('optimism', 'ETH')], recommended: 'base',
    recommendation: 'Base is recommended: the same ETH on a network with low fees, so later moves usually cost far less than on Ethereum itself.'},
  {id: 'sol', symbol: 'SOL', name: 'Solana', kind: 'coin', plain: 'SOL: Solana’s own coin. Its price goes up and down.',
    more: 'SOL pays for every action on Solana. Its price moves with the market, so it can lose value. It needs a Solana wallet (Phantom, for example).',
    offers: [offer('solana', 'SOL')], recommended: 'solana', recommendation: 'SOL lives on Solana only.'},
  {id: 'btc', symbol: 'BTC', name: 'Bitcoin', kind: 'coin', plain: 'BTC: Bitcoin. Its price goes up and down.',
    more: 'Bitcoin is the first cryptocurrency, on its own network. Its price moves with the market, so it can lose value. Moves on Bitcoin take minutes to an hour to confirm.',
    offers: [offer('bitcoin', 'BTC')], recommended: 'bitcoin', recommendation: 'BTC lives on Bitcoin’s own network.'},
  {id: 'atom', symbol: 'ATOM', name: 'Cosmos Hub ATOM', kind: 'coin', plain: 'ATOM: the Cosmos Hub’s coin. Its price goes up and down.',
    more: 'ATOM is the coin of the Cosmos Hub, a network that connects to ZIGChain. Its price moves with the market. It arrives at your Keplr key’s cosmos1… address.',
    offers: [offer('cosmos-hub', 'ATOM')], recommended: 'cosmos-hub', recommendation: 'ATOM lives on the Cosmos Hub.'},
  {id: 'zig-via-atom', symbol: 'ATOM', name: 'ZIG via ATOM', kind: 'coin', plain: 'ZIG, in three steps: buy ATOM, move it to ZIGChain, swap it for ZIG.',
    more: 'No provider sells ZIG on ZIGChain directly (checked 2026-10-18). The way there today: buy ATOM to your cosmos1… address, send it to ZIGChain in Keplr (an IBC transfer), then swap it for ZIG on OroSwap. Three steps, each signed in your own wallet; ZIGoals guides you and watches the balance.',
    offers: [offer('cosmos-hub', 'ATOM')], recommended: 'cosmos-hub', recommendation: 'The ATOM goes to the Cosmos Hub first; ZIGChain is the next step.'},
]);
export const buyAsset = (id: string): BuyAsset | undefined => BUY_ASSETS.find(a => a.id === id);
export const offerFor = (asset: BuyAsset, network: string): Offer | undefined => asset.offers.find(o => o.network === network);
/** Which tracked asset the balance watch looks at on the network's chain (lib/wallets/balances/chains.ts). */
export function watchedAssetId(asset: BuyAsset, network: NetworkId): string | null {
  const chain = chainById(NETWORKS[network].chainId);
  if (!chain) return null;
  if (chain.native.symbol === asset.symbol) return chain.native.id;
  return chain.tokens.find(t => t.symbol === asset.symbol && t.coingecko !== null)?.id ?? null;
}
/** Every provider code of the table, with where it applies (for the owner's and the codes doc's check). */
export function providerCodes(): {asset: BuyAssetId; network: NetworkId; provider: ProviderId; field: string; code: ProviderCode}[] {
  return BUY_ASSETS.flatMap(a => a.offers.flatMap(o => [
    ...(o.ramp ? [{asset: a.id, network: o.network, provider: 'ramp' as const, field: 'swapAsset', code: o.ramp}] : []),
    ...(o.banxa ? [{asset: a.id, network: o.network, provider: 'banxa' as const, field: 'coinType', code: o.banxa.coinType}, {asset: a.id, network: o.network, provider: 'banxa' as const, field: 'blockchain', code: o.banxa.blockchain}] : []),
  ]));
}
