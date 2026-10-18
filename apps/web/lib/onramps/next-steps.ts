import type {VerifiedKind, VerifiedProvider} from '@zigoals/ecosystem-registry/verified-links';
import type {L2bLinkId} from '../wallets/links';
import type {BuyAssetId} from './assets';

/**
 * Session AF (L2b, Part 4, ADR-028 H83; A2.8, A2.9): "What can I do with it now?", per asset, as guided link-outs. Every
 * outgoing link comes from the verified link registry (`packages/ecosystem-registry`) or the lane's rows waiting to join it
 * (lib/wallets/links.ts); ZIGoals' own pages are app links. Nothing here moves money: each step happens in the person's
 * own wallet or on the linked site. Routes onto ZIGChain are only those verified live: ATOM over IBC (Cosmos Hub
 * channel-1555 ↔ ZIGChain channel-4, both ends read 2026-10-18, R3 §9); for USDC, USDT and ETH the route check
 * (docs/earn/af/ROUTES_ONTO_ZIGCHAIN.md, Part 0 helper) has not landed, so the page says there is no recommended route
 * yet and names the thin or winding-down ones plainly (Noble's USDC, Circle 10 Sep 2026; the USDT pool's depth, R3 §9).
 */
export type GuideLink = {label: string} & ({source: 'registry'; provider: VerifiedProvider; kind: string} | {source: 'l2b'; id: L2bLinkId} | {source: 'app'; href: string});
export type Guide = {id: 'hold' | 'swap' | 'bridge' | 'earn'; title: string; body: string; steps?: readonly string[]; links: readonly GuideLink[]};
const registry = <P extends VerifiedProvider>(label: string, provider: P, kind: VerifiedKind<P>): GuideLink => ({label, source: 'registry', provider, kind: String(kind)});
const earn: Guide = {id: 'earn', title: 'Earn with it', body: 'Earning options on ZIGChain need ZIG (or, for the Valdora USDC vaults, USDC on ZIGChain). Each option, its live numbers, risks and steps are on ZIGoals’ Earn page.', links: [{label: 'Open Earn', source: 'app', href: '/app/earn'}]};
const stable = (issuer: 'Circle' | 'Tether', id: L2bLinkId): Guide => ({id: 'hold', title: 'Hold it', body: `A stablecoin is a token its issuer (${issuer}) promises to redeem for 1 US dollar. Three risks: the issuer must really hold the reserves; the price can slip below 1 USD for a while (a “depeg”); and each network has its own copy, so money sent on the wrong network can be lost.`, links: [{label: `${issuer}: about this stablecoin`, source: 'l2b', id}]});
const noRouteYet = (what: string, note: string): Guide => ({id: 'bridge', title: 'Bring it to ZIGChain', body: `ZIGoals does not recommend a route for ${what} onto ZIGChain yet: its route check is still being written.${note ? ` ${note}` : ''}`, links: []});
const atomBridge: Guide = {id: 'bridge', title: 'Bring it to ZIGChain', body: 'ATOM moves from the Cosmos Hub to ZIGChain over IBC (Cosmos Hub channel-1555 to ZIGChain channel-4, both ends checked on 2026-10-18). You sign the transfer in Keplr; it pays a small ATOM fee on the Cosmos Hub and lands once the transfer is relayed (ZIGoals has not measured how long that takes).',
  steps: ['Open Keplr’s IBC transfer (or ZIGChain Hub’s bridge) on the Cosmos Hub.', 'Choose ZIGChain as the destination; your zig1… address is the same key.', 'Review and sign in Keplr. ZIGoals watches your balance and shows the ATOM when it lands.'],
  links: [registry('ZIGChain Hub bridge', 'zig-finance', 'hub-bridge'), {label: 'Skip Go (lists ZIGChain)', source: 'l2b', id: 'skip-go'}]};
const atomSwap: Guide = {id: 'swap', title: 'Swap it for ZIG', body: 'On ZIGChain, OroSwap’s ATOM/ZIG pool swaps ATOM for ZIG. The pool is small, so a large swap moves the price: check the price impact OroSwap shows before you sign. The swap fee is paid in ZIG, so keep a little ZIG for fees.', links: [registry('OroSwap swap', 'oroswap', 'swap')]};
export const NEXT_STEPS: {readonly [A in BuyAssetId]: readonly Guide[]} = Object.freeze({
  usdc: [stable('Circle', 'circle-usdc'), {id: 'swap', title: 'Swap it', body: 'On the network it arrived on: Uniswap for the Ethereum networks, Jupiter for Solana. Each swap is signed in your own wallet and pays that network’s fee.', links: [{label: 'Uniswap', source: 'l2b', id: 'uniswap-app'}, {label: 'Jupiter (Solana)', source: 'l2b', id: 'jupiter-app'}]},
    noRouteYet('USDC', 'The Noble USDC route is winding down (Circle, 10 Sep 2026: minting stopped 13 Oct 2026).'), earn],
  usdt: [stable('Tether', 'tether-site'), {id: 'swap', title: 'Swap it', body: 'On the network it arrived on: Uniswap on Ethereum, Jupiter on Solana. Each swap is signed in your own wallet.', links: [{label: 'Uniswap', source: 'l2b', id: 'uniswap-app'}, {label: 'Jupiter (Solana)', source: 'l2b', id: 'jupiter-app'}]},
    noRouteYet('USDT', 'The USDT pool on ZIGChain is very small (139.57 USDT at block 13,042,429, 2026-10-18), so a swap there would move the price a lot.'), earn],
  eth: [{id: 'hold', title: 'Hold it', body: 'ETH’s price goes up and down with the market. Keep some on each network you use: it pays the fees there.', links: []},
    {id: 'swap', title: 'Swap it', body: 'Uniswap works on Ethereum and the Ethereum networks with low fees; each swap is signed in your own wallet.', links: [{label: 'Uniswap', source: 'l2b', id: 'uniswap-app'}]}, noRouteYet('ETH', ''), earn],
  sol: [{id: 'hold', title: 'Hold it', body: 'SOL’s price goes up and down with the market. A little SOL pays every fee on Solana.', links: []},
    {id: 'swap', title: 'Swap it', body: 'Jupiter finds swaps on Solana; each is signed in your own wallet.', links: [{label: 'Jupiter', source: 'l2b', id: 'jupiter-app'}]}, earn],
  btc: [{id: 'hold', title: 'Hold it', body: 'Bitcoin’s price goes up and down with the market. ZIGoals watches your address read-only; nothing moves.', links: []}, earn],
  atom: [{id: 'hold', title: 'Hold it', body: 'ATOM’s price goes up and down with the market. It can also move to ZIGChain and become ZIG (below).', links: []}, atomBridge, atomSwap, earn],
  'zig-via-atom': [atomBridge, atomSwap, {...earn, body: 'With ZIG in your wallet you can stake it on ZIGChain from ZIGoals (practice or real, your choice) or explore the other options on the Earn page.', links: [{label: 'Open Earn', source: 'app', href: '/app/earn'}, {label: 'Open Staking', source: 'app', href: '/app/staking'}]}],
});
