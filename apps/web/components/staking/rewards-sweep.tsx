'use client';
import type {Holding} from '../../lib/staking/view';
import {zigText} from '../../lib/staking/view';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H60; R5 rank 4): "Put your rewards to work". For each validator the person stakes
 * with that has rewards waiting, one MsgDelegate of that amount to the same validator: delegating makes the chain pay the
 * waiting rewards out first, so one message restakes them. Nothing is preselected or automatic; each press opens the
 * review screen (the only way to the signer), practice first and the real network under its first-real confirm. Reached
 * from the Staking page and from a Goal Vault's "Put your rewards to work" link (`#rewards-sweep`).
 */
export function RewardsSweep({rewards, delegations, names, busy, onReview, note}: {rewards: readonly Holding[]; delegations: readonly Holding[]; names: ReadonlyMap<string, string>; busy: boolean; onReview: (validator: string, amount: string) => void; note?: string}) {
  const staked = new Set(delegations.map(d => d.validator));
  const ready = rewards.filter(r => /^[1-9]\d*$/.test(r.amount) && staked.has(r.validator));
  return <section id="rewards-sweep" className="staking-sweep" aria-labelledby="staking-sweep-title">
    <h3 id="staking-sweep-title">Put your rewards to work</h3>
    {note && <p role="status" className="fine">{note}</p>}
    {ready.length ? <>
      <p>Restake what is waiting with a validator: one message, and the chain pays those rewards out to you first, so they go straight back to work with the same validator.</p>
      <ul className="staking-sweep-list">{ready.map(r => <li key={r.validator} title={r.validator}>
        <span><strong>{names.get(r.validator) ?? r.name}</strong> · about {zigText(r.amount)} waiting</span>
        <button type="button" className="secondary" disabled={busy} onClick={() => onReview(r.validator, r.amount)}>Restake {zigText(r.amount)}</button>
      </li>)}</ul>
      <p className="fine">The review shows the network fee first; restaking a very small amount can cost more in fee than it adds.</p>
    </> : <p className="fine">No rewards are waiting with a validator you stake with on this network yet{rewards.length ? '' : ' (press Refresh to read them again)'}.</p>}
  </section>;
}
