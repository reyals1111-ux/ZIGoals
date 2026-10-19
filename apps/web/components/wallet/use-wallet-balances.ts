'use client';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useLinkedWallets} from './use-linked-wallets';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {WALLET_BALANCES, observationOf, writeWalletBalances, withoutWalletBalances, type Observation} from '../../lib/wallets/balances/store';
import {dueReads, refreshOne} from '../../lib/wallets/balances/read';
import {chainsFor, type TrackedChain} from '../../lib/wallets/balances/chains';
import type {LinkedWallet} from '../../lib/linked-wallets';

/**
 * Session AF (L2b, Part 3, ADR-028 H16): the linked wallets' balances in a component (Wealth's "What you have", the
 * Portfolio strip, Add money's balance watch). On open it reads what is due (missing or older than 15 minutes; never in
 * the Showcase, never while the tab is hidden), "Refresh" reads everything again, and every result lands in the device
 * record `zigoals:wallet-balances:v1`, which every reader then shows. The readers themselves are lib/wallets/balances/*;
 * this file only asks them.
 */
export type WalletChainRow = {wallet: LinkedWallet; chain: TrackedChain; observation: Observation | null};
export function useWalletBalances({auto = true, only}: {auto?: boolean; only?: (w: LinkedWallet) => boolean} = {}) {
  const linked = useLinkedWallets(), record = useDeviceRecord(WALLET_BALANCES), [reading, setReading] = useState(false), [error, setError] = useState('');
  const wallets = useMemo(() => linked.wallets.filter(w => !only || only(w)), [linked.wallets, only]);
  const key = wallets.map(w => `${w.id}:${w.address}:${(w.chains ?? []).join(',')}`).join('|');
  const running = useRef(false);
  const refresh = useCallback(async (force = false) => {
    if (running.current || isShowcase() || !wallets.length) return;
    running.current = true; setReading(true); setError('');
    try {
      const storage = getAppStorage(), due = dueReads(wallets, record.data, Date.now(), force);
      await Promise.all(due.map(({wallet, chain}) => refreshOne(storage, wallet, chain).finally(() => window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: WALLET_BALANCES.key})))));
    } catch { setError('Balances could not be read just now; the last readings stay.'); }
    finally { running.current = false; setReading(false); }
  }, [key, record.data]); // eslint-disable-line react-hooks/exhaustive-deps -- `wallets` is identified by `key`
  useEffect(() => {
    if (!auto || !record.loaded || record.unreadable || !wallets.length) return;
    if (document.visibilityState === 'visible') void refresh(false);
  }, [auto, key, record.loaded]); // eslint-disable-line react-hooks/exhaustive-deps -- once per wallet set, after the record loads
  const rows: WalletChainRow[] = wallets.flatMap(wallet => chainsFor(wallet).map(chain => ({wallet, chain, observation: observationOf(record.data, wallet.id, chain.id)})));
  const forget = useCallback((walletId: string) => {
    try { writeWalletBalances(getAppStorage(), r => withoutWalletBalances(r, walletId)); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: WALLET_BALANCES.key})); }
    catch { setError('This device refused to forget those balances.'); }
  }, []);
  return {loaded: linked.loaded && record.loaded, unreadable: record.unreadable, showcase: linked.showcase, wallets, rows, reading, error, refresh, forget};
}
