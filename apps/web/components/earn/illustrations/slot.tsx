'use client';
import {Suspense, lazy, useState, type ComponentType} from 'react';
import {LoadBoundary} from '../../load-boundary';

/**
 * Session AF chunk 2 (P1.18): where an option shows "what you'll see on the app's page". Closed by default; opening it loads
 * that app's pictures as their own chunk (one per app: Valdora's two sets share one), so the Earn page's first load carries
 * none of them. Pages that automation could not read (the ZIGChain Hub, the faucet, Banxa) have no pictures: their steps
 * are in words only.
 */
const pick = <M,>(load: () => Promise<M>, name: keyof M) => lazy(async () => ({default: (await load())[name] as unknown as ComponentType}));
const SETS = {
  'valdora-stake': {app: 'Valdora', count: 4, C: pick(() => import('./valdora'), 'ValdoraStake')},
  'valdora-vault': {app: 'Valdora', count: 3, C: pick(() => import('./valdora'), 'ValdoraVault')},
  'oroswap-swap': {app: 'OroSwap', count: 3, C: pick(() => import('./oroswap'), 'OroswapSwap')},
  'oroswap-pools': {app: 'OroSwap', count: 2, C: pick(() => import('./oroswap'), 'OroswapPools')},
  'keplr-staking': {app: 'Keplr', count: 2, C: pick(() => import('./keplr'), 'KeplrStaking')},
  'skip-go': {app: 'Skip Go', count: 2, C: pick(() => import('./skip-go'), 'SkipGo')},
  'nawa-vaults': {app: 'Nawa', count: 1, C: pick(() => import('./nawa'), 'NawaVaults')},
} as const;
export type IllustrationSet = keyof typeof SETS;
export function IllustrationSlot({set, title}: {set: IllustrationSet; title?: string}) {
  const {app, count, C} = SETS[set];
  const [open, setOpen] = useState(false);
  return <details className="earn-illustration-slot" data-illustration-slot={set} onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) setOpen(true); }}>
    <summary>{title ?? `What you’ll see on ${app}’s page`} <span className="fine">({count === 1 ? 'one picture' : `${count} pictures`})</span></summary>
    {open && <LoadBoundary label="These pictures"><Suspense fallback={<p className="earn-reading">Drawing…</p>}><C/></Suspense></LoadBoundary>}
  </details>;
}
