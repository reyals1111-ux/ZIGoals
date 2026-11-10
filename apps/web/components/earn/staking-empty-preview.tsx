'use client';
import Link from 'next/link';
import {bps, pct} from '../../lib/earn/format';
import {LiveFigure, shown} from './live-figure';
import {useEarnLive, useMinuteClock} from './use-earn-live';
import './earn.css';
import {LazyPillarArt} from '../illustrations/lazy-pillar-art';
import {useDeviceRecord} from '../ai/use-device-record';
import {STAKING_PREFS, networkChoiceOf} from '../../lib/staking/prefs';

/**
 * Session AF (L1): the Staking page's empty state while no position is observed, previewing Earn. Three ways to earn,
 * each with one live figure from its own source (or "unavailable" with the reason) and the door to the Earn page; the
 * Staking page's own "Track a public wallet" sentence stays. The lead mounts it in components/platform/positions-view.tsx
 * in place of the `positions-empty` panel's copy, only while no observed position exists (the full state is unchanged).
 */
export function StakingEmptyPreview() {
  // Two figures, not Valdora's rate: the Staking page reads nothing about Valdora (staking-page.spec, Session I); the
  // stZIG rate lives on Earn, where both sources are shown (H44).
  const now = useMinuteClock(), chain = useEarnLive('chain'), oroswap = useEarnLive('oroswap');
  // Session AL (BN-004, B-005, B-022): the rate is always read from the real network (mainnet). With Practice chosen for
  // staking (the default) and no wallet tracked, the card says so itself, so a mainnet figure never reads as the practice
  // network's. Until the choice is read, the plain mainnet label stands alone.
  const prefs = useDeviceRecord(STAKING_PREFS), practice = prefs.loaded && !prefs.unreadable && networkChoiceOf(prefs.data) === 'practice';
  return <div className="panel positions-empty earn-preview" data-earn-preview data-art="">
    <h3>A clear view of your staked ZIG.</h3>
    <p>Track a public wallet to see liquid funds, stake and rewards together. Allocate existing wealth to your Goals without moving funds.</p>
    <dl className="earn-figures earn-preview-cards">
      <LiveFigure id="preview-native" label="Native staking on the real network (mainnet only) · yearly rate before a validator’s commission · estimate, variable" now={now} figure={shown(chain, d => pct(d.apr.beforeCommission))}/>
      <LiveFigure id="preview-oroswap" label="Liquidity · ZIG / USDC pool fee per swap" now={now} figure={shown(oroswap, d => { const p = d.pools.find(x => x.id === 'zig-usdc'); return p ? bps(p.feeBps) : null; })}/>
    </dl>
    {practice && <p className="positions-network-note" role="note">Mainnet only: these figures are the real ZIGChain network&rsquo;s, read only. Staking below is set to the practice network, which has no real value and its own rate.</p>}
    <p className="earn-preview-cta"><Link className="primary" href="/app/earn#start-here">How staking works, on Earn →</Link> <span className="fine">Live figures, the risks of each, and the steps in plain words. Information, not advice.</span></p>
    <LazyPillarArt pillar="wealth"/>
  </div>;
}
