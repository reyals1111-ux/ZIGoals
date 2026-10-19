'use client';
import {useEffect, useMemo, useState} from 'react';
import {STAKING_NETWORKS} from '@zigoals/chain-config/networks';
import {PositionReadRefused, readPublicPositions, type ReadMode} from '../../lib/position-reader';
import type {Position} from '../../lib/positions';
import {STAKING_JOURNAL, stakingEntriesOf} from '../../lib/staking/journal';
import {readStakingSession} from '../../lib/wallets/keplr-session';
import {minHeightFor, type JournalFact, type WalletRead} from '../../lib/earn/start-here';
import {useDeviceRecord} from '../ai/use-device-record';
import {useGoals} from '../goal-provider';
import {useLinkedWallets} from '../wallet/use-linked-wallets';

/**
 * Session AF (L1, ADR-028 H11, H16): the ZIGChain wallets the Earn page reads, read-only, through ZIGoals' positions relay
 * (/api/positions: one block height, no address logged), shared by the summary, the Start-here path and the Earn dock so
 * each wallet is read once. The wallets are those linked on this device (the real network), the wallet connected for
 * Goals on the practice network, and — chunk 2 — the wallet connected on the Staking page in this tab, on the network it
 * was connected for. Right after a signed staking action the relay is asked for that block or later (`minHeight`, from
 * the staking journal). Kept in memory only; read again every five minutes while the page is visible.
 */
export type EarnWallet = {address: string; mode: ReadMode; label: string; via: 'linked' | 'goals' | 'staking'};
export type PositionRead = EarnWallet & {state: {phase: 'loading'} | {phase: 'ok'; positions: Position[]; at: string} | {phase: 'refused' | 'failed'; message: string}};
const CHAIN: Record<ReadMode, string> = {MAINNET_READ_ONLY: 'zigchain-1', TESTNET_READ_ONLY: 'zig-test-2'};
function session(): EarnWallet[] {
  let storage: Storage | null = null;
  try { storage = window.sessionStorage; } catch { storage = null; }
  const out: EarnWallet[] = [];
  for (const network of ['real', 'practice'] as const) {
    const s = readStakingSession(storage, network);
    if (s && s.chainId === STAKING_NETWORKS[network].chainId) out.push({address: s.address, mode: network === 'real' ? 'MAINNET_READ_ONLY' : 'TESTNET_READ_ONLY', label: network === 'real' ? 'Connected on Staking (real network)' : 'Connected on Staking (practice network)', via: 'staking'});
  }
  return out;
}
export function useEarnWallets(): EarnWallet[] {
  const linked = useLinkedWallets(), goals = useGoals();
  const [connected, setConnected] = useState<EarnWallet[]>([]);
  useEffect(() => { queueMicrotask(() => setConnected(session())); }, []);
  const linkedKey = linked.wallets.map(w => `${w.kind}:${w.address}:${w.label}`).join(',');
  return useMemo(() => {
    const out: EarnWallet[] = linked.wallets.filter(w => w.kind === 'cosmos' && /^zig1/.test(w.address)).slice(0, 3).map(w => ({address: w.address, mode: 'MAINNET_READ_ONLY', label: w.label, via: 'linked'}));
    if (goals.mode === 'testnet' && goals.walletState === 'CONNECTED' && goals.owner && /^zig1/.test(goals.owner)) out.push({address: goals.owner, mode: 'TESTNET_READ_ONLY', label: 'Connected wallet (practice network)', via: 'goals'});
    for (const w of connected) if (!out.some(o => o.address === w.address && o.mode === w.mode)) out.push(w);
    return out;
    // linkedKey identifies linked.wallets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedKey, goals.mode, goals.walletState, goals.owner, connected]);
}
/** The staking journal's entries as the detectors need them (personal, device-only; read, never written here). */
export function useStakingFacts(): {loaded: boolean; journal: JournalFact[]} {
  const record = useDeviceRecord(STAKING_JOURNAL);
  return useMemo(() => ({loaded: record.loaded, journal: record.unreadable ? [] : stakingEntriesOf(record.data).map(e => ({chainId: e.chainId, action: e.action, state: e.state, wallet: e.wallet, ...(e.height ? {height: e.height} : {})}))}), [record.loaded, record.unreadable, record.data]);
}
export function usePositionReads(wallets: EarnWallet[], journal: readonly JournalFact[]): PositionRead[] {
  const [reads, setReads] = useState<PositionRead[]>([]);
  const heights = wallets.map(w => minHeightFor(journal, w.address, CHAIN[w.mode]) ?? '').join(',');
  const key = `${wallets.map(w => `${w.mode}:${w.address}`).join(',')}|${heights}`;
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (document.visibilityState !== 'visible') return;
      // A refresh keeps the figures on screen until the new read lands; only the first read shows "reading…".
      setReads(current => current.length === wallets.length && current.every((r, i) => r.address === wallets[i]!.address && r.mode === wallets[i]!.mode) ? current : wallets.map(w => ({...w, state: {phase: 'loading'}})));
      const done = await Promise.all(wallets.map(async (w): Promise<PositionRead> => {
        const minHeight = minHeightFor(journal, w.address, CHAIN[w.mode]);
        try { return {...w, state: {phase: 'ok', positions: await readPublicPositions(w.mode, w.address, minHeight ? {minHeight} : {}), at: new Date().toISOString()}}; }
        catch (error) { return {...w, state: error instanceof PositionReadRefused ? {phase: 'refused', message: error.message} : {phase: 'failed', message: 'ZIGoals could not read a coherent snapshot of this wallet just now.'}}; }
      }));
      if (alive) setReads(done);
    };
    void run();
    const t = window.setInterval(run, 5 * 60_000);
    return () => { alive = false; window.clearInterval(t); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `wallets` and the heights are identified by `key`
  return reads;
}
/** The reads as the Start-here detectors take them. */
export const walletReads = (reads: readonly PositionRead[]): WalletRead[] => reads.map(r => ({address: r.address, chainId: CHAIN[r.mode], state: r.state.phase === 'ok' ? 'ok' : r.state.phase === 'loading' ? 'loading' : 'unavailable', ...(r.state.phase === 'ok' ? {positions: r.state.positions} : {})}));
