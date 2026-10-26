'use client';
import {YourPoolShares, type ShareRead} from './your-shares';
import type {LiveState} from '../../lib/earn/client';
import {bps, decimal, tokenAmount, usd} from '../../lib/earn/format';
import type {DefillamaData, OroswapData} from '../../lib/earn/live/types';
import {PROVIDER_CLAIMS} from '../../lib/earn/options';
import {VerifiedLink} from '../links/verified-link';
import {GuideLink, type Guide} from './guide-panel';
import {LiveFigure, Unavailable, shown} from './live-figure';
import {OptionSection} from './option-section';
import {IllustrationSlot} from './illustrations/slot';
import {Risk} from './risk';
import {WhatsThis} from './whats-this';

/**
 * Session AF (L1, ADR-028 H84): OroSwap, ZIGChain's exchange: swaps, and pools that share the swap fees. Each pool's
 * depth and fee come from the chain (its own `fee_info` per pair type, not a fee from the docs), farms appear only when
 * the incentives contract lists an active pool, and impermanent loss is explained in plain words before any step.
 */
export const OROSWAP_GUIDE: Guide<'oroswap'> = {id: 'oroswap-swap', app: 'OroSwap', title: 'Swap on OroSwap', provider: 'oroswap', kind: 'swap', open: 'Open OroSwap', option: 'oroswap',
  steps: ['On OroSwap, connect your wallet (Keplr or Leap, for example) and check ZIGChain is selected.', 'Choose the token you give and the token you get, and the amount.', 'Check the price impact and the slippage limit before you go on: in a small pool a large swap moves the price.', 'Press Swap and review in your wallet: you sign one swap and nothing else.', 'The new token lands in your wallet. ZIGoals shows it once your wallet is read.']};
export const OROSWAP_POOL_GUIDE: Guide<'oroswap'> = {id: 'oroswap-pool', app: 'OroSwap', title: 'Add liquidity on OroSwap', provider: 'oroswap', kind: 'pools', open: 'Open OroSwap pools', option: 'oroswap',
  steps: ['On OroSwap’s Pools page, connect your wallet and choose a pool.', 'Enter amounts of both tokens of equal value (the page fills in the second one).', 'Review in your wallet: you sign one transaction that sends both tokens to the pool and returns LP tokens, your share.', 'Your share earns part of every swap’s fee in that pool.', 'To leave: Portfolio, Remove liquidity, then choose how much.']};
export function OroswapSection({oroswap, llama, now, shares = []}: {oroswap: LiveState<OroswapData>; llama: LiveState<DefillamaData>; now: number; shares?: readonly ShareRead[]}) {
  const data = oroswap.phase === 'ok' ? oroswap.answer.data : null;
  const unavailable = oroswap.phase === 'unavailable' ? oroswap.reason : 'UPSTREAM_DOWN';
  return <OptionSection id="oroswap" eyebrow="OroSwap · exchange and pools" title="Swap, or earn swap fees in a pool"
    lede={<>Swap tokens on ZIGChain’s exchange, or put two tokens into a pool and earn a share of the fee on every swap through it. <WhatsThis term="swap"/> <WhatsThis term="pool"/></>}
    logo={{src: '/ecosystem-logos/oroswap.png', alt: 'OroSwap site icon'}}
    tags={[{tone: 'live', text: 'Live on mainnet'}, {tone: 'contract', text: 'Pools hold the tokens'}]}
    facts={[
      {label: 'Best for', value: <>Swapping; and, for pools, people who already hold both tokens and understand impermanent loss. <WhatsThis term="impermanent-loss"/></>},
      {label: 'Who runs it', value: 'OroSwap, through contracts on ZIGChain.'},
      {label: 'Who holds the funds', value: <>For a swap, you, before and after. In a pool, the pool’s contract holds the tokens; you hold LP tokens, your share. <WhatsThis term="custody"/></>},
      {label: 'Who can use it', value: 'Anyone with a ZIGChain wallet, under OroSwap’s terms and the rules where you live.'},
    ]}
    figures={<>
      {(data?.pools ?? [{id: 'zig-usdc', label: 'ZIG / USDC.n (Noble)'}, {id: 'zig-usdc-inj', label: 'ZIG / USDC.inj (Injective)'}, {id: 'zig-atom', label: 'ZIG / ATOM'}, {id: 'stzig-zig', label: 'stZIG / ZIG'}] as {id: string; label: string}[]).map(p => <LiveFigure key={p.id} id={`oroswap-${p.id}`} label={`${p.label} pool`} now={now}
        figure={shown(oroswap, d => { const pool = d.pools.find(x => x.id === p.id); return pool ? pool.reserves.map(r => tokenAmount(r.amount, r.decimals, r.symbol, {compact: true})).join(' + ') : null; })}
        hint={(() => { const pool = data?.pools.find(x => x.id === p.id); return pool ? <>Pool price: 1 {pool.price.base} = {decimal(pool.price.value, pool.price.value.startsWith('0.') ? 5 : 3)} {pool.price.quote}. Fee on each swap: {bps(pool.feeBps)}.</> : undefined; })()}/>)}
      <LiveFigure id="oroswap-farms" label="Farms (extra rewards for pools)" now={now} figure={shown(oroswap, d => d.farms.active ? `${d.farms.activePools} running now` : 'None running now')}/>
      <LiveFigure id="oroswap-llama-tvl" label="Value locked in OroSwap" third now={now} figure={shown(llama, d => d.protocols.oroswap.status === 'ok' ? d.protocols.oroswap.tvlUsd === null ? {unavailable: 'NOT_PUBLISHED'} : usd(d.protocols.oroswap.tvlUsd) : {unavailable: d.protocols.oroswap.reason})}/>
    </>}
    figuresNote={<p className="fine">{PROVIDER_CLAIMS.oroswapDocsFee.text} <VerifiedLink provider="oroswap" kind="docs-swap" className="text-link" mark="compact">OroSwap’s swap guide</VerifiedLink></p>}
    columns={[
      {title: 'Fees', body: <p>{data ? <>Each pool charges its own fee on every swap ({[...new Set(data.pools.map(p => bps(p.feeBps)))].join(', ')} in the pools above). Of that fee, {bps(data.pools[0]!.makerFeeBps)} goes to OroSwap’s fee collector; the rest stays with the pool’s providers. Fee tiers a new pool can choose: {[...new Set(data.pairTypes.filter(p => !p.disabled).map(p => p.totalFeeBps))].sort((x, y) => x - y).map(bps).join(', ')} (from OroSwap’s factory contract).</> : <>The fees are <Unavailable reason={unavailable} short/> right now.</>} Plus a small network fee for each step you sign. <WhatsThis term="gas"/></p>},
      {title: 'Lockups', body: <p>None. You can swap any time and take your share out of a pool any time.{data?.farms.active ? ' A farm may set its own rules.' : ''}</p>},
      {title: 'Minimums', body: <p>None set by OroSwap for a swap or a pool share; the network fee still applies.</p>},
      // Session AF (L1c, N5): each risk with its source (R2 §3, plan section 5 row 3, RECHECK B): OroSwap's docs, or the chain read in words.
      {title: 'Risks', body: <ul className="earn-risks">
        <Risk link={<VerifiedLink provider="oroswap" kind="docs-liquidity" className="text-link" mark="compact">OroSwap on liquidity</VerifiedLink>}><b>Impermanent loss, in plain words:</b> when one token’s price moves against the other, the pool sells some of the rising token for you as people swap. When you take your share out, you can have less value than if you had simply kept both tokens. The fees you earn can make up for it, or not.</Risk>
        <Risk chain="each pool’s depth above, read from the chain" tap={<><WhatsThis term="pool-depth"/> <WhatsThis term="slippage"/></>}>Small pools: a large swap moves the price a lot. Check the price impact and the slippage limit before you sign.</Risk>
        <Risk chain="the pool contracts on ZIGChain, each one listed by OroSwap’s factory contract">Contract risk: a fault in a pool contract could lose its tokens.</Risk>
        <Risk chain="OroSwap’s factory contract on ZIGChain, read 18 October 2026">OroSwap’s factory can pause a pool. Its owner is a multi-signature account on which two of three keys must agree.</Risk>
        <Risk chain="the pools’ own prices, read from the chain">Price risk: both tokens’ prices move, and a pool with ZIG in it moves with ZIG.</Risk>
        <Risk chain="each token’s full name (its denom) in ZIGChain’s own records; see Safety below" tap={<WhatsThis term="decoy"/>}>Token risk: a copy can carry a real token’s name. Check every token is the real one by its full denom before you swap or add it.</Risk>
      </ul>},
    ]}
    // Session AH (AF3): your own pool shares, read through /api/earn/shares (components/earn/your-shares.tsx).
    mine={<YourPoolShares reads={shares} oroswap={oroswap}/>}
    steps={[
      {text: 'Open OroSwap (a new tab) and connect your wallet.'},
      {text: 'To swap: choose the two tokens and the amount, check the price impact and slippage, and press Swap.', sign: 'one swap through the pool. Nothing else.'},
      {text: 'To earn fees: open Pools, pick a pool, and add equal value of both tokens.', sign: 'one transaction that sends both tokens to the pool and returns LP tokens.'},
      {text: data?.farms.active ? 'A farm is running: you can stake your LP tokens in it for extra rewards, as OroSwap shows.' : 'No farm is running right now, so pools earn swap fees only.'},
      {text: 'To leave a pool: Portfolio, Remove liquidity, choose how much.'},
    ]}
    stepsTime="about 3 minutes for a swap; about 5 to add to a pool. A first visit shows OroSwap’s terms, which you accept or not yourself."
    illustration={<><IllustrationSlot set="oroswap-swap" title="What you’ll see on OroSwap’s page when you swap"/><IllustrationSlot set="oroswap-pools" title="What you’ll see on OroSwap’s page when you add to a pool"/></>}
    actions={<>
      <GuideLink guide={OROSWAP_GUIDE}/>
      <GuideLink guide={OROSWAP_POOL_GUIDE} className="secondary"/>
      <VerifiedLink provider="oroswap" kind="docs" className="secondary">OroSwap’s docs</VerifiedLink>
    </>}
  />;
}
