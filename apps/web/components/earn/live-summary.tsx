'use client';
import {useEffect, useState} from 'react';
import {PositionReadRefused, readPublicPositions, type ReadMode} from '../../lib/position-reader';
import type {Position} from '../../lib/positions';
import {zig} from '../../lib/earn/format';
import {formatDate} from '../../lib/visual-format';
import {useGoals} from '../goal-provider';
import {useLinkedWallets} from '../wallet/use-linked-wallets';
import {Unavailable} from './live-figure';
import {SectionHeading} from '../ui/section-heading';

/**
 * Session AF (L1, ADR-028 H11, H16): "your Earn summary" for a linked or connected ZIGChain wallet, read through ZIGoals'
 * read-only positions relay (/api/positions: one block height, no address logged). While a public build still refuses
 * mainnet addresses (until the relay change of lane L2a), the summary says so with the relay's own sentence, never a
 * guess. Practice (testnet) stake is shown apart and never counts toward money totals (H11). Kept in memory only.
 */
type Read = {address: string; mode: ReadMode; label: string; state: {phase: 'loading'} | {phase: 'ok'; positions: Position[]; at: string} | {phase: 'refused' | 'failed'; message: string}};
const short = (a: string) => `${a.slice(0, 10)}…${a.slice(-6)}`;
function totals(positions: Position[]) {
  const sum = (type: Position['sourceType']) => positions.filter(p => p.sourceType === type).reduce((n, p) => n + BigInt(p.quantity) * 10n ** BigInt(18 - Math.min(18, p.decimals)), 0n).toString();
  const exits = positions.filter(p => p.sourceType === 'NATIVE_UNBONDING' && p.exitDate).map(p => p.exitDate!).sort();
  return {staked: sum('NATIVE_STAKING'), rewards: sum('NATIVE_REWARDS'), unbonding: sum('NATIVE_UNBONDING'), nextExit: exits[0] ?? null};
}
export function useEarnWallets(): {address: string; mode: ReadMode; label: string}[] {
  const linked = useLinkedWallets(), goals = useGoals();
  const out: {address: string; mode: ReadMode; label: string}[] = linked.wallets.filter(w => w.kind === 'cosmos' && /^zig1/.test(w.address)).slice(0, 3).map(w => ({address: w.address, mode: 'MAINNET_READ_ONLY', label: w.label}));
  if (goals.mode === 'testnet' && goals.walletState === 'CONNECTED' && goals.owner && /^zig1/.test(goals.owner)) out.push({address: goals.owner, mode: 'TESTNET_READ_ONLY', label: 'Connected wallet (practice network)'});
  return out;
}
export function LiveSummary({wallets}: {wallets: {address: string; mode: ReadMode; label: string}[]}) {
  const [reads, setReads] = useState<Read[]>([]);
  const key = wallets.map(w => `${w.mode}:${w.address}`).join(',');
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (document.visibilityState !== 'visible') return;
      // A refresh keeps the figures on screen until the new read lands; only the first read shows "reading…".
      setReads(current => current.length === wallets.length && current.every((r, i) => r.address === wallets[i]!.address && r.mode === wallets[i]!.mode) ? current : wallets.map(w => ({...w, state: {phase: 'loading'}})));
      const done = await Promise.all(wallets.map(async (w): Promise<Read> => {
        try { return {...w, state: {phase: 'ok', positions: await readPublicPositions(w.mode, w.address), at: new Date().toISOString()}}; }
        catch (error) { return {...w, state: error instanceof PositionReadRefused ? {phase: 'refused', message: error.message} : {phase: 'failed', message: 'ZIGoals could not read a coherent snapshot of this wallet just now.'}}; }
      }));
      if (alive) setReads(done);
    };
    void run();
    const t = window.setInterval(run, 5 * 60_000);
    return () => { alive = false; window.clearInterval(t); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `wallets` is identified by `key`
  if (!wallets.length) return null;
  return <section id="summary" className="earn-summary panel" aria-labelledby="summary-title">
    <SectionHeading id="summary-title" eyebrow="Your wallets, read-only" title="Your Earn summary" lede="Read through ZIGoals’ read-only relay at one block height. ZIGoals never holds your keys."/>
    <ul className="earn-summary-list">{reads.map(r => <li key={`${r.mode}:${r.address}`} data-mode={r.mode}>
      <p className="earn-summary-who"><b>{r.label}</b> <span className="earn-mono">{short(r.address)}</span> {r.mode === 'TESTNET_READ_ONLY' && <span className="earn-tag" data-tone="beta">Practice: no real value</span>}</p>
      {r.state.phase === 'loading' ? <p className="earn-reading">reading…</p>
        : r.state.phase === 'ok' ? (() => { const t = totals(r.state.positions); return <dl className="earn-figures" data-live-figure="summary" data-state="ok">
          <div className="earn-figure"><dt>Staked{r.mode === 'TESTNET_READ_ONLY' ? ' (practice)' : ''}</dt><dd><strong className="earn-value">{zig(t.staked)}</strong></dd></div>
          <div className="earn-figure"><dt>Rewards waiting to be claimed</dt><dd><strong className="earn-value">{zig(t.rewards)}</strong></dd></div>
          <div className="earn-figure"><dt>Next unbonding ends</dt><dd><strong className="earn-value">{t.nextExit ? formatDate(t.nextExit) : 'Nothing unbonding'}</strong></dd></div>
          <p className="earn-source fine">ZIGoals’ read-only relay · read {formatDate(r.state.at)}</p>
        </dl>; })()
        : <p className="earn-figure" data-live-figure="summary" data-state="unavailable" data-reason={r.state.phase === 'refused' ? 'RELAY_REFUSED' : 'UPSTREAM_DOWN'}><Unavailable reason="UPSTREAM_DOWN" short/> · {r.state.message}</p>}
    </li>)}</ul>
  </section>;
}
