'use client';
import {useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {WALLET_BALANCES} from '../../lib/wallets/balances/store';
import {LINKED_WALLETS} from '../../lib/linked-wallets';
import {IMPORTS, importables, markImported, type Importable} from '../../lib/portfolio/wallet-import';
import {addTransaction, removeTransaction} from '../../lib/portfolio/store';
import type {Portfolio} from '../../lib/portfolio/schema';
import {localDate} from '../../lib/local-date';
import {formatExactNumber} from '../../lib/visual-format';
import type {Run} from './transaction-form';

/**
 * Session AI (B3, WE20): the balances your linked wallets last reported, imported into a real portfolio as read-only rows
 * marked "from wallet" (one transfer in per asset, no price: its cost stays unknown until you add one in a buy you record
 * yourself). "Update" sets an imported row to the wallet's latest amount. Read-only: nothing is signed or sent.
 */
export function WalletImportPanel({portfolio, run}: {portfolio: Portfolio; run: Run}) {
  const balances = useDeviceRecord(WALLET_BALANCES), linked = useDeviceRecord(LINKED_WALLETS), imports = useDeviceRecord(IMPORTS), [note, setNote] = useState('');
  const list = useMemo(() => importables(Object.values(balances.data.observations ?? {}), imports.data, portfolio.id), [balances.data, imports.data, portfolio.id]);
  if (!balances.loaded || !linked.loaded || portfolio.kind !== 'real' || !list.length) return null;
  const label = (walletId: string) => (linked.data.wallets ?? []).find(w => w.id === walletId)?.label || 'a linked wallet';
  const bring = (item: Importable) => {
    if (!item.coin) return;
    const id = item.imported ?? crypto.randomUUID(), at = new Date().toISOString(), date = (item.at ?? at).slice(0, 10) <= localDate() ? (item.at ?? at).slice(0, 10) : localDate();
    const ok = run(data => addTransaction(item.imported ? removeTransaction(data, portfolio.id, item.imported) : data, portfolio.id, item.coin!, {id, kind: 'transfer-in', quantity: item.quantity, date, note: `From wallet ${label(item.walletId)} · read ${date}`, createdAt: at}), item.imported ? `${item.symbol} updated from ${label(item.walletId)}.` : `${item.symbol} imported from ${label(item.walletId)}.`, 'The wallet row was not saved.');
    if (ok) { try { imports.update(r => markImported(r, id, {walletId: item.walletId, chainId: item.chainId, assetId: item.assetId, portfolioId: portfolio.id, at})); setNote(''); } catch { setNote('The row was saved; its "from wallet" mark could not be kept on this device.'); } }
  };
  return <section className="portfolio-wallet-import" aria-labelledby={`${portfolio.id}-wallet-import`}>
    <h3 id={`${portfolio.id}-wallet-import`}>From your wallets (read-only)</h3>
    <ul>{list.map(i => <li key={`${i.walletId}|${i.chainId}|${i.assetId}`}>
      <span><strong>{formatExactNumber(i.quantity)} {i.symbol}</strong> · {label(i.walletId)}{i.imported ? ' · imported, from wallet' : ''}</span>
      {i.coin ? <button type="button" className="secondary" onClick={() => bring(i)}>{i.imported ? 'Update from the wallet' : 'Import as a transfer in'}</button> : <small>No price identity for {i.symbol}; left out.</small>}
    </li>)}</ul>
    <p className="fine">The amounts your wallets last reported, as transfers in without a price: the cost stays unknown until you record what you paid. Imported rows are marked &ldquo;from wallet&rdquo; and change only from here.</p>
    {note && <p role="status">{note}</p>}
  </section>;
}
