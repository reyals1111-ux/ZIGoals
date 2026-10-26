'use client';
import {useEffect, useState} from 'react';
import {poolPart, vaultPart, POOL_SHARE_DENOMS, VAULT_SHARE_DENOMS, type PoolShareId, type SharesWire, type VaultShareId} from '../../lib/earn/shares';
import type {LiveState} from '../../lib/earn/client';
import type {OroswapData, VaultsData} from '../../lib/earn/live/types';
import {tokenAmount} from '../../lib/earn/format';
import {formatDateTime} from '../../lib/visual-format';
import type {EarnWallet} from './use-earn-positions';

/**
 * Session AH (AF3): your own OroSwap pool shares and USDC vault shares, for each wallet linked for the real network. One
 * read per wallet through ZIGoals' read-only route (/api/earn/shares: eight pinned balances at one block, nothing else),
 * kept in memory only and read again every five minutes while the page is visible. Practice wallets are left out (their
 * shares have no value). LP tokens staked in a farm sit in the farm, not the wallet, and the section says so.
 */
export type ShareRead = {wallet: EarnWallet; state: {phase: 'loading'} | {phase: 'ok'; wire: SharesWire} | {phase: 'failed'; message: string}};
const short = (a: string) => `${a.slice(0, 10)}…${a.slice(-6)}`;
export function useEarnShares(wallets: readonly EarnWallet[]): ShareRead[] {
  const real = wallets.filter(w => w.mode === 'MAINNET_READ_ONLY'), key = real.map(w => w.address).join(',');
  const [reads, setReads] = useState<ShareRead[]>([]);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (document.visibilityState !== 'visible') return;
      setReads(current => current.length === real.length ? current : real.map(wallet => ({wallet, state: {phase: 'loading'}})));
      const done = await Promise.all(real.map(async (wallet): Promise<ShareRead> => {
        try {
          const response = await fetch(`/api/earn/shares?address=${encodeURIComponent(wallet.address)}`, {credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(30_000)});
          if (!response.ok) return {wallet, state: {phase: 'failed', message: response.status === 429 ? 'Too many reads just now; it tries again in five minutes.' : 'ZIGoals could not read your shares at one block height just now.'}};
          const wire = await response.json() as SharesWire;
          return typeof wire?.height === 'string' && wire.pools && wire.vaults ? {wallet, state: {phase: 'ok', wire}} : {wallet, state: {phase: 'failed', message: 'The answer could not be read.'}};
        } catch { return {wallet, state: {phase: 'failed', message: 'ZIGoals could not read your shares just now.'}}; }
      }));
      if (alive) setReads(done);
    };
    if (!real.length) { setReads([]); return; }
    void run();
    const t = window.setInterval(run, 5 * 60_000);
    return () => { alive = false; window.clearInterval(t); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- the wallets are identified by `key`
  return reads;
}

function Shell({reads, kind, children}: {reads: readonly ShareRead[]; kind: 'pool' | 'vault'; children: (wire: SharesWire) => React.ReactNode}) {
  return <div className="earn-mine" data-mine={kind === 'pool' ? 'oroswap' : 'vaults'}>
    <h3 className="earn-subhead">Your {kind === 'pool' ? 'pool shares' : 'vault shares'}</h3>
    <ul className="earn-summary-list">{reads.map(r => <li key={r.wallet.address}>
      <p className="earn-summary-who"><b>{r.wallet.label}</b> <span className="earn-mono">{short(r.wallet.address)}</span></p>
      {r.state.phase === 'loading' ? <p className="earn-reading">reading…</p>
        : r.state.phase === 'failed' ? <p className="earn-figure">{r.state.message}</p>
        : <>{children(r.state.wire)}<p className="earn-source fine">ZIGoals’ read-only route · block {r.state.wire.height} · as of <time dateTime={r.state.wire.observedAt}>{formatDateTime(r.state.wire.observedAt)}</time></p></>}
    </li>)}</ul>
  </div>;
}
export function YourPoolShares({reads, oroswap}: {reads: readonly ShareRead[]; oroswap: LiveState<OroswapData>}) {
  if (!reads.length) return <p className="fine earn-your-share">Your own pool share shows here once you link a ZIGChain wallet for the real network (More wallets, beside Connect Keplr). OroSwap&rsquo;s Portfolio page shows it too.</p>;
  const pools = oroswap.phase === 'ok' ? oroswap.answer.data.pools : [];
  return <><Shell reads={reads} kind="pool">{wire => {
    const held = (Object.keys(POOL_SHARE_DENOMS) as PoolShareId[]).filter(id => wire.pools[id]);
    if (!held.length) return <p>No pool shares in this wallet.</p>;
    return <dl className="earn-figures">{held.map(id => {
      const pool = pools.find(p => p.id === id), part = pool ? poolPart(wire.pools[id]!, pool.totalShare, pool.reserves) : null;
      return <div className="earn-figure" key={id} data-share={id}><dt>{pool?.label ?? id}</dt><dd><strong className="earn-value">{part ? part.map(p => tokenAmount(p.units, p.decimals, p.symbol)).join(' + ') : `${tokenAmount(wire.pools[id]!, 0, 'LP units')} (the pool’s figures are unavailable just now)`}</strong></dd></div>;
    })}</dl>;
  }}</Shell><p className="fine">Your part of each pool’s two tokens, from your LP tokens and the pool’s own figures. LP tokens staked in a farm are held by the farm and are not counted here.</p></>;
}
export function YourVaultShares({reads, vaults}: {reads: readonly ShareRead[]; vaults: LiveState<VaultsData>}) {
  if (!reads.length) return <p className="fine earn-your-share">Your own vault shares show here once you link a ZIGChain wallet for the real network (More wallets, beside Connect Keplr). Each vault&rsquo;s page on Valdora shows them too.</p>;
  const rows = vaults.phase === 'ok' ? vaults.answer.data.vaults : null;
  return <><Shell reads={reads} kind="vault">{wire => {
    const held = (Object.keys(VAULT_SHARE_DENOMS) as VaultShareId[]).filter(id => wire.vaults[id]);
    if (!held.length) return <p>No vault shares in this wallet.</p>;
    return <dl className="earn-figures">{held.map(id => {
      const row = rows?.[id], part = row?.status === 'ok' ? vaultPart(wire.vaults[id]!, row.pricePerShare) : null;
      return <div className="earn-figure" key={id} data-share={id}><dt>{row?.status === 'ok' ? row.label : id}</dt><dd><strong className="earn-value">{part !== null && row?.status === 'ok' ? `${tokenAmount(part, row.decimals, row.asset === 'other' ? 'units' : row.asset)} by the vault’s share price` : `${tokenAmount(wire.vaults[id]!, 6, 'shares')} (the vault’s share price is unavailable just now)`}</strong></dd></div>;
    })}</dl>;
  }}</Shell><p className="fine">What your shares are worth by each vault’s own share price; a withdrawal request already filed may not show here.</p></>;
}
