/**
 * Session AF (L2b, Part 3, ADR-028 H16 (c), H56, H64): what ZIGoals reads for a linked address, where, and how it is
 * priced. A fixed registry (no token discovery from user input, non-negotiable 7): each chain's native coin, Circle's
 * USDC (Ethereum, Arbitrum, Base, OP Mainnet, Polygon PoS, Solana; contract addresses from Circle's list, read 2026-10-18),
 * Tether's USDT where Tether itself issues it (Ethereum and Solana on tether.to/en/supported-protocols, read 2026-10-18
 * 22:37 UTC; the USDT on the other five chains is a bridge's or Binance's token, so it is not listed), and on BNB Chain
 * Binance-Peg USDC (Binance's token, 18 decimals, address from trustwallet/assets), labelled so and never priced as
 * Circle's (H56). ZIGChain is read through ZIGoals' own relay `/api/positions` (H16 (a)); every other chain browser-direct
 * from PublicNode or mempool.space (H16 (c)), so ZIGoals' server never sees those addresses. CoinGecko ids are the market
 * service's (verified 2026-10-18, R4 §5).
 */
export type TrackedAsset = {id: string; symbol: string; name: string; decimals: number; coingecko: string | null; note?: string};
export type ChainKind = 'zigchain' | 'cosmos-hub' | 'evm' | 'solana' | 'bitcoin';
export type TrackedChain = {id: string; name: string; kind: ChainKind; origin: string | null; native: TrackedAsset; tokens: readonly TrackedAsset[]};
const usdc = (id: string): TrackedAsset => ({id, symbol: 'USDC', name: 'USD Coin (Circle)', decimals: 6, coingecko: 'usd-coin'});
const usdt = (id: string): TrackedAsset => ({id, symbol: 'USDT', name: 'Tether USD', decimals: 6, coingecko: 'tether'});
const eth: TrackedAsset = {id: 'native', symbol: 'ETH', name: 'Ether', decimals: 18, coingecko: 'ethereum'};
export const TRACKED_CHAINS: readonly TrackedChain[] = Object.freeze([
  {id: 'zigchain-1', name: 'ZIGChain', kind: 'zigchain', origin: null, native: {id: 'azig', symbol: 'ZIG', name: 'ZIG', decimals: 18, coingecko: 'zignaly'},
    tokens: [{id: 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig', symbol: 'stZIG', name: 'Valdora staked ZIG', decimals: 6, coingecko: 'staked-zig'}]},
  {id: 'cosmoshub-4', name: 'Cosmos Hub', kind: 'cosmos-hub', origin: 'https://cosmos-rest.publicnode.com', native: {id: 'uatom', symbol: 'ATOM', name: 'Cosmos Hub ATOM', decimals: 6, coingecko: 'cosmos'}, tokens: []},
  {id: 'eip155:1', name: 'Ethereum', kind: 'evm', origin: 'https://ethereum-rpc.publicnode.com', native: eth,
    tokens: [usdc('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), usdt('0xdAC17F958D2ee523a2206206994597C13D831ec7')]},
  {id: 'eip155:42161', name: 'Arbitrum', kind: 'evm', origin: 'https://arbitrum-one-rpc.publicnode.com', native: eth, tokens: [usdc('0xaf88d065e77c8cC2239327C5EDb3A432268e5831')]},
  {id: 'eip155:8453', name: 'Base', kind: 'evm', origin: 'https://base-rpc.publicnode.com', native: eth, tokens: [usdc('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')]},
  {id: 'eip155:10', name: 'OP Mainnet', kind: 'evm', origin: 'https://optimism-rpc.publicnode.com', native: eth, tokens: [usdc('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85')]},
  {id: 'eip155:137', name: 'Polygon', kind: 'evm', origin: 'https://polygon-bor-rpc.publicnode.com', native: {id: 'native', symbol: 'POL', name: 'POL', decimals: 18, coingecko: 'polygon-ecosystem-token'}, tokens: [usdc('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359')]},
  {id: 'eip155:56', name: 'BNB Chain', kind: 'evm', origin: 'https://bsc-rpc.publicnode.com', native: {id: 'native', symbol: 'BNB', name: 'BNB', decimals: 18, coingecko: 'binancecoin'},
    tokens: [{id: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'Binance-Peg USDC', decimals: 18, coingecko: null, note: 'Binance-Peg USDC is Binance’s own token, not Circle’s USDC, so ZIGoals shows no price for it.'}]},
  {id: 'solana:mainnet', name: 'Solana', kind: 'solana', origin: 'https://solana-rpc.publicnode.com', native: {id: 'native', symbol: 'SOL', name: 'Solana SOL', decimals: 9, coingecko: 'solana'},
    tokens: [usdc('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), usdt('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')]},
  {id: 'bitcoin', name: 'Bitcoin', kind: 'bitcoin', origin: 'https://mempool.space', native: {id: 'native', symbol: 'BTC', name: 'Bitcoin', decimals: 8, coingecko: 'bitcoin'}, tokens: []},
] satisfies TrackedChain[]);
/** The browser-direct read hosts: exactly H16 (d)'s list minus the signing RPC (lane L2a) — the CSP test pins the same list. */
export const BALANCE_ORIGINS: readonly string[] = Object.freeze(TRACKED_CHAINS.flatMap(c => c.origin ? [c.origin] : []));
export const chainById = (id: string): TrackedChain | undefined => TRACKED_CHAINS.find(c => c.id === id);
/** Every asset of a chain, native first. */
export const assetsOf = (chain: TrackedChain): TrackedAsset[] => [chain.native, ...chain.tokens];
export const EVM_CHAINS = TRACKED_CHAINS.filter(c => c.kind === 'evm');
/** The chains a linked wallet is read on: a ZIGChain address on ZIGChain and on Cosmos Hub (the same key, H16 (c)), an EVM
 *  address on the chains it tracks (all six by default), Solana and Bitcoin on their own chain. */
export function chainsFor(wallet: {kind: string; address: string; chains?: readonly string[]}): TrackedChain[] {
  if (wallet.kind === 'cosmos') return /^zig1/.test(wallet.address) ? [chainById('zigchain-1')!, chainById('cosmoshub-4')!] : [];
  if (wallet.kind === 'evm') { const chosen = wallet.chains?.length ? EVM_CHAINS.filter(c => wallet.chains!.includes(c.id)) : EVM_CHAINS; return chosen.length ? chosen : EVM_CHAINS; }
  if (wallet.kind === 'solana') return [chainById('solana:mainnet')!];
  if (wallet.kind === 'btc') return [chainById('bitcoin')!];
  return [];
}
