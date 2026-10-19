'use client';
import Link from 'next/link';
import type {LiveState} from '../../lib/earn/client';
import {bps, decimal, tokenAmount} from '../../lib/earn/format';
import type {OroswapData, VaultsData} from '../../lib/earn/live/types';
import {NOBLE_USDC, ZIG_ROUTES} from '../../lib/earn/options';
import {formatDate} from '../../lib/visual-format';
import {VerifiedLink} from '../links/verified-link';
import {EarnGlyphMark} from './earn-glyph';
import {IllustrationSlot} from './illustrations/slot';
import {LiveFigure, Unavailable, shown} from './live-figure';
import {OptionSection} from './option-section';

/**
 * Session AF chunk 2 (amendment 3, H8, H84): three more ways your money works on ZIGChain, each with the same anatomy:
 * governance (your stake's vote; the voting itself is on /app/governance), Goal Vaults (a stake you hold, linked to a goal;
 * the feature is on each goal) and "Earn with stablecoins" (what exists for USDC and USDT today, honestly thin, and the
 * fact that every ZIGChain fee is paid in ZIG). Nothing here signs; each links to the page that does, or to the app.
 */
const day = (iso: string) => formatDate(`${iso}T12:00:00Z`, {timeZone: 'UTC'});

export function GovernanceSection() {
  return <OptionSection id="governance" eyebrow="ZIGChain · governance" title="Have a say: governance"
    lede="Proposals change how ZIGChain runs: its rules, its upgrades, which teams may upload contracts. Staked ZIG votes, and you can vote yourself instead of letting your validator vote for you."
    logo={{alt: '', glyph: <EarnGlyphMark/>}}
    tags={[{tone: 'live', text: 'Live on mainnet'}, {tone: 'keys', text: 'You keep the keys'}]}
    facts={[
      {label: 'Best for', value: 'Anyone with staked ZIG who wants a say in the network they hold.'},
      {label: 'Who runs it', value: 'ZIGChain’s governance: proposals, a deposit period, a voting period and a tally, all on the chain.'},
      {label: 'Who holds the funds', value: 'You do. Voting moves nothing: your stake stays where it is.'},
      {label: 'Who can vote', value: 'Anyone with ZIG staked while the vote is open. If you do not vote, your validator’s vote counts for your stake; if you vote, yours counts instead.'},
    ]}
    figures={<div className="earn-figure earn-figure-elsewhere"><dt>Open proposals and their tallies</dt><dd><span className="earn-hint">Read live on the Governance page, with each proposal in plain words and when its vote ends.</span></dd></div>}
    columns={[
      {title: 'Fees', body: <p>A small network fee in ZIG for each vote you sign.</p>},
      {title: 'Lockups', body: <p>None: voting locks nothing. Only staked ZIG counts, and staking has its own unbonding time.</p>},
      {title: 'Minimums', body: <p>Any amount of staked ZIG; your vote weighs as much as your stake.</p>},
      {title: 'Risks', body: <ul className="earn-risks">
        <li>A vote is public on the chain forever, tied to your address.</li>
        <li>Voting does not earn rewards by itself; it protects what you hold by shaping the rules.</li>
        <li>Read the whole proposal: a short title can hide a large change.</li>
      </ul>},
    ]}
    steps={[
      {text: <>Open <Link className="text-link" href="/app/governance">Governance</Link>: each open proposal in plain words, with its deadline.</>},
      {text: 'Choose Yes, No, Abstain or No with veto (a strong no that can also burn the proposal’s deposit).'},
      {text: 'Review, then sign in your wallet.', sign: 'one vote (MsgVote) on that proposal. Nothing moves.'},
      {text: 'You can change your vote until the voting period ends; the last one counts.'},
    ]}
    stepsTime="about 5 minutes per proposal, mostly reading."
    actions={<>
      <Link className="primary" href="/app/governance">Open Governance</Link>
      <VerifiedLink provider="zig-finance" kind="hub-proposals" className="secondary">Proposals on the ZIGChain Hub</VerifiedLink>
    </>}
  />;
}

export function GoalVaultsSection() {
  return <OptionSection id="goal-vaults" eyebrow="ZIGoals · Goal Vaults" title="Put your stake to work for a goal"
    lede="Link stake or stZIG you already hold to one of your goals, and see the goal move with it: what you staked, the rewards waiting, and the growth since you linked it."
    logo={{alt: '', glyph: <EarnGlyphMark/>}}
    tags={[{tone: 'live', text: 'In ZIGoals'}, {tone: 'keys', text: 'You keep the keys'}]}
    facts={[
      {label: 'Best for', value: 'Saving toward something specific with ZIG you stake anyway: a trip, a deposit, a cushion.'},
      {label: 'Who runs it', value: 'ZIGoals shows it; the stake itself is on ZIGChain, with your validator or Valdora.'},
      {label: 'Who holds the funds', value: 'You do. A Goal Vault is a view of your own stake, read-only: it moves nothing and signs nothing.'},
      {label: 'Who can use it', value: 'Anyone with a goal in ZIGoals and a stake on ZIGChain read through a linked wallet.'},
    ]}
    figures={<div className="earn-figure earn-figure-elsewhere"><dt>Your Goal Vaults</dt><dd><span className="earn-hint">Each goal shows its linked stake, read live at one block, with where it comes from and when.</span></dd></div>}
    columns={[
      {title: 'Fees', body: <p>None from ZIGoals. The stake keeps its own fees: your validator’s commission, or Valdora’s.</p>},
      {title: 'Lockups', body: <p>The stake’s own: unstaking takes the network’s unbonding time.</p>},
      {title: 'Minimums', body: <p>None.</p>},
      {title: 'Risks', body: <ul className="earn-risks">
        <li>The goal moves with ZIG’s price and with your stake: it can go down.</li>
        <li>Rewards you claimed and moved away are not counted back in: the chain keeps rewards waiting, not their history.</li>
      </ul>},
    ]}
    steps={[
      {text: <>Open <Link className="text-link" href="/app/goals">Goals</Link> and choose a goal (or create one).</>},
      {text: 'In the goal, link a wallet’s stake or stZIG to it.'},
      {text: 'The goal shows what is staked, the rewards waiting and the growth since you linked it. Nothing to sign.'},
    ]}
    stepsTime="about 2 minutes."
    actions={<Link className="primary" href="/app/goals">Open Goals</Link>}
  />;
}

export function StablecoinsSection({oroswap, vaults, now}: {oroswap: LiveState<OroswapData>; vaults: LiveState<VaultsData>; now: number}) {
  const pool = (id: string) => shown(oroswap, d => { const p = d.pools.find(x => x.id === id); return p ? p.reserves.map(r => tokenAmount(r.amount, r.decimals, r.symbol, {compact: true})).join(' + ') : null; });
  const hint = (id: string) => { const p = oroswap.phase === 'ok' ? oroswap.answer.data.pools.find(x => x.id === id) : null; return p ? <>1 {p.price.base} = {decimal(p.price.value, 5)} {p.price.quote} · fee {bps(p.feeBps)} a swap</> : undefined; };
  return <OptionSection id="stablecoins" eyebrow="USDC and USDT on ZIGChain" title="Earn with stablecoins"
    lede="What exists on ZIGChain for USDC and USDT today, in plain words. It is not much yet, and every network fee is paid in ZIG."
    logo={{alt: '', glyph: <EarnGlyphMark/>}}
    tags={[{tone: 'beta', text: 'Honestly thin today'}, {tone: 'paused', text: 'Fees in ZIG only'}]}
    notice={<>
      <p><b>Two kinds of USDC reach ZIGChain.</b> USDC.inj comes from Injective and is the one Circle and the bridges point new money to. USDC on Noble (USDC.n) still arrives, but {NOBLE_USDC.text.charAt(0).toLowerCase() + NOBLE_USDC.text.slice(1)} <span className="fine">({NOBLE_USDC.source}, read {day(NOBLE_USDC.readOn)})</span> <VerifiedLink provider="zig-finance" kind="circle-noble" className="text-link" mark="compact">Circle’s notice</VerifiedLink></p>
      <p>{ZIG_ROUTES.fees}</p>
    </>}
    facts={[
      {label: 'Best for', value: 'People who hold USDC and want to see their options on ZIGChain before moving anything.'},
      {label: 'What exists', value: <>Valdora’s USDC vaults (<a className="text-link" href="#valdora-vaults">above</a>: USDC.n only, credit risk, up to 60 days to leave); Nawa’s USDC vault (<a className="text-link" href="#nawa">depends on Zignaly</a>); OroSwap pools pairing USDC with ZIG (<a className="text-link" href="#oroswap">swap fees, and half your money becomes ZIG</a>).</>},
      {label: 'USDT', value: ZIG_ROUTES.thin},
      {label: 'Who holds the funds', value: 'In a pool, the pool’s contract (you hold LP tokens); in a vault, its curator, away from the chain.'},
    ]}
    figures={<>
      <LiveFigure id="stable-usdc-inj" label="OroSwap ZIG / USDC.inj pool" now={now} figure={pool('zig-usdc-inj')} hint={hint('zig-usdc-inj')}/>
      <LiveFigure id="stable-usdc-n" label="OroSwap ZIG / USDC.n pool" now={now} figure={pool('zig-usdc')} hint={hint('zig-usdc')}/>
      <LiveFigure id="stable-vaults-asset" label="What the USDC vaults hold" now={now} figure={shown(vaults, d => { const all = Object.values(d.vaults).filter(v => v.status === 'ok'); return all.length ? all.every(v => v.status === 'ok' && v.asset === 'USDC.n') ? 'USDC on Noble (USDC.n), every one' : 'Not all the same: see each vault' : {unavailable: 'UPSTREAM_DOWN'}; })}/>
    </>}
    columns={[
      {title: 'Fees', body: <p>A pool’s swap fee (live above), the vaults’ own fees, and the network fee in ZIG for every step.</p>},
      {title: 'Lockups', body: <p>Pools: none. Vaults: withdrawals are requests, up to 60 days.</p>},
      {title: 'Minimums', body: <p>None set by the apps; you need a little ZIG for fees.</p>},
      {title: 'Risks', body: <ul className="earn-risks">
        <li>A pool with ZIG is not a stablecoin position: half of it follows ZIG’s price (impermanent loss, in the OroSwap section).</li>
        <li>Vaults lend to businesses: they may not repay.</li>
        <li>USDC on Noble is being wound down by Circle; its pause is on {day(NOBLE_USDC.fullyPaused)}.</li>
        <li>Bridges: each hop between networks is software that can fail or be paused.</li>
      </ul>},
    ]}
    steps={[
      {text: 'Bring USDC to ZIGChain as USDC.inj with Skip Go: from Base, Arbitrum or Ethereum, through Injective.', sign: 'two approvals: one in your Ethereum wallet, one in Keplr on Injective.'},
      {text: 'Get a little ZIG for fees (the Start-here path’s “Get ZIG” step shows the ways).'},
      {text: 'Choose: keep USDC.inj in your wallet, add it to the USDC.inj / ZIG pool, or read the vault sections first.'},
    ]}
    stepsTime={<>about 18 minutes for the bridge (Skip Go’s estimate on {day(ZIG_ROUTES.readOn)}), then a few minutes per step.</>}
    illustration={<IllustrationSlot set="skip-go"/>}
    actions={<>
      <VerifiedLink provider="zig-finance" kind="skip-go" className="secondary">Open Skip Go</VerifiedLink>
      <VerifiedLink provider="oroswap" kind="pools" className="secondary">OroSwap pools</VerifiedLink>
      {oroswap.phase === 'unavailable' && <span className="fine">Pools: <Unavailable reason={oroswap.reason} short/></span>}
    </>}
  />;
}
