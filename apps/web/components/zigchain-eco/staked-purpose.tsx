'use client';
import Link from 'next/link';
import {useMemo, useState, useEffect} from 'react';
import type {Position} from '../../lib/positions';
import {stakedPurposeRows, stakedPurposeSummary} from '../../lib/zigchain-eco/purpose-staking';
import './zigchain-eco.css';

/**
 * Session AK (F4, purpose staking): under "What each asset is for", the staked ZIG the person tracks, each staking
 * position with the Goals it is set aside for and when that money could actually be used ("available in 11 days" for
 * ZIG that is unstaking, "usable 21 days after you unstake" for staked ZIG). Allocating it to a Goal is the same
 * allocation as any other asset (on the asset's own page); nothing here signs or moves anything. Renders nothing when
 * no ZIG staking position is tracked, so the chain stays out of sight for people who did not choose it.
 */
export type StakedPurposeProps = {
  positions: readonly Position[];
  allocations: readonly {goalId: string; positionId: string; quantity: string}[];
  goals: readonly {id: string; name: string; status: string}[];
};
const KIND_WORDS = {staked: 'Staked ZIG', unbonding: 'Unstaking ZIG', rewards: 'Rewards waiting'} as const;
export function StakedPurpose({positions, allocations, goals}: StakedPurposeProps) {
  // The clock is read after mount so the server and the first render agree; a minute's precision is plenty for days.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { queueMicrotask(() => setNow(Date.now())); }, []);
  const rows = useMemo(() => now === null ? [] : stakedPurposeRows({positions, allocations, goals, now, unbondingSeconds: 1_814_400}), [positions, allocations, goals, now]);
  if (!rows.length) return null;
  const summary = stakedPurposeSummary(rows);
  return <section className="zeco zeco-card" aria-labelledby="zeco-staked-purpose-title">
    <h3 id="zeco-staked-purpose-title">Staked ZIG and your Goals</h3>
    {summary && <p>{summary}</p>}
    <ul className="zeco-list">{rows.map(r => <li key={r.positionId}>
      <span><strong>{KIND_WORDS[r.kind]}</strong> · {r.amountText} with {r.validatorName}{r.practice ? <> <span className="zeco-practice-tag">Practice</span></> : null}</span>
      <span className="fine">{r.when.charAt(0).toUpperCase() + r.when.slice(1)}. {r.goals.length ? `For ${r.goals.map(g => `${g.name} (${g.amountText})`).join(', ')}.` : 'Not set aside for a Goal.'}</span>
      <Link className="text-link" href={`/app/wealth/asset/${encodeURIComponent(r.positionId)}`}>{r.goals.length ? 'Change its Goals' : 'Set it aside for a Goal'}</Link>
    </li>)}</ul>
    <p className="fine">The unbonding period is the chain’s (21 days on ZIGChain today). Staked ZIG keeps earning; unstaking ZIG earns nothing until it is back.</p>
  </section>;
}
export default StakedPurpose;
