'use client';
import {useState} from 'react';
import {ValidatorsSection} from '../earn/validators-section';
import {useEarnLive, useMinuteClock} from '../earn/use-earn-live';
import './staking.css';

/**
 * Session AL fourth pass (C-BN-01): the validator list with its sorts and filters (lowest commission, best uptime, most
 * stake, commission at most 5 / 7.5 / 10 %) on the Staking page itself, read only and without a wallet — the same list
 * and the same one read as Earn's. It reads nothing until opened.
 */
function Live() {
  const validators = useEarnLive('validators'), now = useMinuteClock();
  return <ValidatorsSection validators={validators} now={now}/>;
}
export function StakingValidators() {
  const [open, setOpen] = useState(false);
  return <details className="panel staking-validators-read" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Compare validators: commission, uptime and stake (real network, read only)</summary>
    <p className="fine">The real network&rsquo;s validators (mainnet), read live, whichever network you stake on below. Sort and filter them by facts; to stake, choose one in the stake form, where you sign in your own wallet.</p>
    {open && <Live/>}
  </details>;
}
