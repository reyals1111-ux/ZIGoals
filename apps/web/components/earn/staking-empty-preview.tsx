'use client';
import Link from 'next/link';
import {bps, pct} from '../../lib/earn/format';
import {LiveFigure, shown} from './live-figure';
import {useEarnLive, useMinuteClock} from './use-earn-live';
import './earn.css';

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
  return <div className="panel positions-empty earn-preview" data-earn-preview>
    <h3>A clear view of your wealth — and the way to grow it.</h3>
    <p>Track a public wallet to see liquid funds, stake and rewards together. Allocate existing wealth to your Goals without moving funds.</p>
    <dl className="earn-figures earn-preview-cards">
      <LiveFigure id="preview-native" label="Native staking · yearly rate before a validator’s commission" now={now} figure={shown(chain, d => pct(d.apr.beforeCommission))}/>
      <LiveFigure id="preview-oroswap" label="Liquidity · ZIG / USDC pool fee per swap" now={now} figure={shown(oroswap, d => { const p = d.pools.find(x => x.id === 'zig-usdc'); return p ? bps(p.feeBps) : null; })}/>
    </dl>
    <p className="earn-preview-cta"><Link className="primary" href="/app/earn">Learn and start on Earn →</Link> <span className="fine">Live figures, the risks of each, and the steps in plain words.</span></p>
  </div>;
}
