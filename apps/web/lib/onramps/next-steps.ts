import type {VerifiedKind, VerifiedProvider} from '@zigoals/ecosystem-registry/verified-links';
import type {L2bLinkId} from '../wallets/links';
import type {BuyAssetId} from './assets';

/**
 * Session AF (L2b, Part 4, ADR-028 H49, H83; A2.8, A2.9): "What can I do with it now?", per asset, as guided link-outs. Every
 * outgoing link comes from the verified link registry (`packages/ecosystem-registry`) or the lane's rows waiting to join it
 * (lib/wallets/links.ts); ZIGoals' own pages are app links. Nothing here moves money: each step happens in the person's
 * own wallet or on the linked site, and ZIGoals watches the balance. The routes and figures are the Part 0 route check's,
 * docs/earn/af/ROUTES_ONTO_ZIGCHAIN.md (read 2026-10-18 22:18–22:50 UTC; Skip Go's own time estimates; pool figures as
 * read, they move with every block):
 * - USDC: Base → Skip Go (Circle CCTP V2 to Injective) → IBC to ZIGChain, arriving as USDC.inj; never Noble's USDC.n, which
 *   Circle is winding down;
 * - USDT and ETH: they can travel (IBC Eureka through the Cosmos Hub) but ZIGChain has almost no market for them, so the
 *   honest answer is "hold", not "swap" or "earn";
 * - ATOM: one IBC send, Cosmos Hub channel-1555 → ZIGChain channel-4, then OroSwap's ATOM/ZIG pool;
 * - ZIGChain takes fees in ZIG only: an address that has just received ATOM or USDC.inj cannot pay for its first swap.
 */
export type GuideLink = {label: string} & ({source: 'registry'; provider: VerifiedProvider; kind: string} | {source: 'l2b'; id: L2bLinkId} | {source: 'app'; href: string});
export type Guide = {id: 'hold' | 'swap' | 'bridge' | 'earn'; title: string; body: string; steps?: readonly string[]; note?: string; links: readonly GuideLink[]};
const registry = <P extends VerifiedProvider>(label: string, provider: P, kind: VerifiedKind<P>): GuideLink => ({label, source: 'registry', provider, kind: String(kind)});
export const ROUTES_SOURCE = 'ZIGoals’ route check, 18 Oct 2026 (Skip Go’s estimates; pool figures as read then)';
export const ZIG_FOR_FEES = 'ZIGChain takes its fees in ZIG only: an address that has only just received ATOM or USDC.inj has no ZIG to pay for its first swap. Get a little ZIG onto it first.';
const earn: Guide = {id: 'earn', title: 'Earn with it', body: 'Earning options on ZIGChain need ZIG (the Valdora USDC vaults take USDC on ZIGChain). Each option, its live numbers, risks and steps are on ZIGoals’ Earn page.', links: [{label: 'Open Earn', source: 'app', href: '/app/earn'}]};
const stable = (issuer: 'Circle' | 'Tether', id: L2bLinkId, extra = ''): Guide => ({id: 'hold', title: 'Hold it', body: `A stablecoin is a token its issuer (${issuer}) promises to redeem for 1 US dollar. Three risks: the issuer must really hold the reserves; the price can slip below 1 USD for a while (a “depeg”); and each network has its own copy, so money sent on the wrong network can be lost.${extra}`, links: [{label: `${issuer}: about this stablecoin`, source: 'l2b', id}]});
const atomBridge: Guide = {id: 'bridge', title: 'Bring it to ZIGChain', body: 'ATOM moves from the Cosmos Hub to ZIGChain in one IBC send (Cosmos Hub channel-1555 to ZIGChain channel-4): about 30 seconds by Skip Go’s estimate, one signature in Keplr, a small ATOM fee on the Cosmos Hub.',
  steps: ['In Keplr’s own IBC send, Skip Go (From ATOM on Cosmos Hub, To ATOM on ZIGChain) or ZIGChain Hub’s bridge.', 'Send to your zig1… address: the same key as your cosmos1… address.', 'Sign once in Keplr. ZIGoals watches your balance and shows the ATOM when it lands.'],
  note: ROUTES_SOURCE, links: [registry('ZIGChain Hub bridge', 'zig-finance', 'hub-bridge'), {label: 'Skip Go', source: 'l2b', id: 'skip-go'}]};
const atomSwap: Guide = {id: 'swap', title: 'Swap it for ZIG', body: `On ZIGChain, OroSwap’s ATOM/ZIG pool (1 basis-point fee) swaps ATOM for ZIG: 6 ATOM returned 205.22 ZIG, 0.26 % below the pool’s mid price. A larger swap moves the price more, so check the price impact OroSwap shows before you sign. ${ZIG_FOR_FEES}`, note: ROUTES_SOURCE, links: [registry('OroSwap swap', 'oroswap', 'swap')]};
const thinOnZigchain = (what: 'USDT' | 'ETH', facts: string): Guide => ({id: 'bridge', title: 'Bring it to ZIGChain?', body: `${what} can travel to ZIGChain (Skip Go, IBC Eureka through the Cosmos Hub: one signature on Ethereum, about 20.5 minutes), but ZIGChain has almost no market for it: ${facts} So ZIGoals suggests holding it where it is.`, note: ROUTES_SOURCE, links: []});
export const NEXT_STEPS: {readonly [A in BuyAssetId]: readonly Guide[]} = Object.freeze({
  usdc: [stable('Circle', 'circle-usdc'), {id: 'bridge', title: 'Bring it to ZIGChain', body: 'The recommended route arrives as USDC.inj: USDC on Base through Skip Go (Circle’s CCTP V2 to Injective, then IBC to ZIGChain). Two signatures, about 18.5 minutes by Skip Go’s estimate; Skip’s relay fee was 0.000466 USDC, plus Base and Injective network fees. Do not use Noble’s USDC.n: Circle stopped minting it on 13 Oct 2026 and pauses it on 12 Jan 2027.',
    steps: ['On go.skip.build connect your EVM wallet (Base) and Keplr (Injective and ZIGChain).', 'From USDC on Base, to USDC.inj on ZIGChain; the route should show two transactions and about 18 minutes.', 'Sign the first in your EVM wallet (an approval may come first), the second in Keplr on Injective: it pays a little INJ, which a new Injective account does not have.', 'USDC.inj lands at your zig1… address. If you want ZIG: OroSwap’s USDC.inj/ZIG pool returned 1,980.25 ZIG for 100 USDC.inj (1.18 % below mid), and that swap needs ZIG for its fee.'],
    note: `${ROUTES_SOURCE}. ${ZIG_FOR_FEES}`, links: [{label: 'Skip Go', source: 'l2b', id: 'skip-go'}, registry('OroSwap swap', 'oroswap', 'swap')]},
    {id: 'swap', title: 'Or swap it where it is', body: 'On the network it arrived on: Uniswap for the Ethereum networks, Jupiter for Solana. Each swap is signed in your own wallet and pays that network’s fee.', links: [{label: 'Uniswap', source: 'l2b', id: 'uniswap-app'}, {label: 'Jupiter (Solana)', source: 'l2b', id: 'jupiter-app'}]}, earn],
  usdt: [stable('Tether', 'tether-site', ' Holding it where it arrived is the plain choice.'), thinOnZigchain('USDT', 'its only pool there held 139.57 USDT, and 100 USDT swapped to ZIG came back 41.8 % below the pool’s mid price.')],
  eth: [{id: 'hold', title: 'Hold it', body: 'ETH’s price goes up and down with the market. Keep it on Ethereum or Base, where it is used; a little ETH also pays every fee there.', links: []},
    thinOnZigchain('ETH', 'about 0.21 ETH exists on the chain and its pool held 0.082 ETH; 0.04 ETH swapped to ZIG came back 32.9 % below mid.')],
  sol: [{id: 'hold', title: 'Hold it', body: 'SOL’s price goes up and down with the market. A little SOL pays every fee on Solana.', links: []},
    {id: 'swap', title: 'Swap it', body: 'Jupiter finds swaps on Solana; each is signed in your own wallet.', links: [{label: 'Jupiter', source: 'l2b', id: 'jupiter-app'}]}],
  btc: [{id: 'hold', title: 'Hold it', body: 'Bitcoin’s price goes up and down with the market. ZIGoals watches your address read-only; nothing moves.', links: []}],
  atom: [{id: 'hold', title: 'Hold it', body: 'ATOM’s price goes up and down with the market. It can also move to ZIGChain and become ZIG (below).', links: []}, atomBridge, atomSwap, earn],
  'zig-via-atom': [atomBridge, atomSwap, {...earn, body: 'With ZIG in your wallet you can stake it on ZIGChain from ZIGoals (practice or real, your choice) or explore the other options on the Earn page.', links: [{label: 'Open Earn', source: 'app', href: '/app/earn'}, {label: 'Open Staking', source: 'app', href: '/app/staking'}]}],
});
