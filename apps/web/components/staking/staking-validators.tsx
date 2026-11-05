'use client';
import {Suspense, lazy, useState} from 'react';
import {LoadBoundary} from '../load-boundary';
import './staking.css';

/**
 * Session AL fourth pass (C-BN-01): the validator list with its sorts and filters (lowest commission, best uptime, most
 * stake, commission at most 5 / 7.5 / 10 %) on the Staking page itself, read only and without a wallet — the same list
 * and the same one read as Earn's. It reads nothing until opened.
 */
// CI13 (weights): the list and its live read load when the fold first opens (it read nothing before that either).
const Live = lazy(() => import('./staking-validators-live'));
export function StakingValidators() {
  const [open, setOpen] = useState(false);
  return <details className="panel staking-validators-read" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Compare validators: commission, uptime and stake (real network, read only)</summary>
    <p className="fine">The real network&rsquo;s validators (mainnet), read live, whichever network you stake on below. Sort and filter them by facts; to stake, choose one in the stake form, where you sign in your own wallet.</p>
    {open && <LoadBoundary label="The validator list"><Suspense fallback={<p className="fine" role="status">Loading the validators…</p>}><Live/></Suspense></LoadBoundary>}
  </details>;
}
