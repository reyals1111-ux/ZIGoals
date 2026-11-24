'use client';
import {lazy, Suspense} from 'react';

/**
 * Session AV lane 2 (owner follow-up 4, 4d A45-1; TIER 3 sync): the account-sync engine as its own chunk. React starts
 * loading it in the app's first render (hydration), so a remembered device reopens as soon as the chunk is in, but no
 * page's first scripts hold it (about 80 kB with its vault code). It renders nothing; pages read it through
 * components/vault-context.ts. If the chunk cannot load (offline before it was ever cached), sync stays off in this tab,
 * as with no account: the records on this device are untouched and the next load tries again.
 */
const Engine = lazy(() => import('./vault-sync-controls').then(m => ({default: m.VaultSyncEngine}), () => ({default: () => null})));

export function VaultSyncLazy() {
  return <Suspense fallback={null}><Engine/></Suspense>;
}
