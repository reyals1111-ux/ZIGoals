'use client';
import './wallet-holdings.css';
import Link from 'next/link';
import {useId, useState} from 'react';
import {useBaseCurrency} from '../platform/wealth-total';
import {wealthMoney} from '../platform/wealth-money';
import {useMarketQuotes} from '../platform/use-market-quotes';
import {useWalletBalances, type WalletChainRow} from './use-wallet-balances';
import {shortAddress} from '../../lib/wallet-address';
import {formatDateTime} from '../../lib/visual-format';
import {priceRequests, totalOf, trackedAsset, valueOf, type Valued} from '../../lib/wallets/balances/pricing';
import {TRACKED_CHAINS} from '../../lib/wallets/balances/chains';
import {shownUnits} from '../../lib/wallets/balances/units';
import type {ObservedAsset} from '../../lib/wallets/balances/store';

/**
 * Session AF (L2b, Part 3, ADR-028 H16, H63, H64; P3.5–P3.10): the linked wallets' balances inside Wealth's "What you have"
 * and as Portfolio's "From your wallets" strip (a lazy chunk on both pages). Chips filter by wallet and by chain; every
 * row says its chain, amount, value in the person's currency (or "unavailable" with the reason, never 0), when it was
 * read and from where; the total adds only the values that are known and says how many are not. ZIGChain's staking
 * positions (staked, rewards waiting, unbonding, stZIG) come from ZIGoals' read-only relay. Read-only: nothing moves,
 * and these rows stay on this device (they are not allocated to Goals; Goal Vaults link a stake to a Goal). With no
 * linked wallet it renders nothing.
 */
const PART_WORDS: Record<string, string> = {'azig:staked': 'staked', 'azig:rewards': 'rewards waiting', 'azig:unbonding': 'unbonding'};
const assetLabel = (a: ObservedAsset) => PART_WORDS[a.id] ? `${a.symbol} ${PART_WORDS[a.id]}` : a.symbol;
type Line = {row: WalletChainRow; asset: ObservedAsset; value: Valued};
export default function WalletHoldings({variant = 'wealth'}: {variant?: 'wealth' | 'portfolio'}) {
  const balances = useWalletBalances();
  // Nothing at all until a wallet is linked (and never in the Showcase, which asks no market for anything): this chunk
  // arrives after the page, so an empty block would push the sections below it while someone is using them.
  if (balances.showcase || !balances.loaded || !balances.wallets.length) return null;
  return <Holdings variant={variant} balances={balances}/>;
}
function Holdings({variant, balances}: {variant: 'wealth' | 'portfolio'; balances: ReturnType<typeof useWalletBalances>}) {
  const currency = useBaseCurrency(), id = useId();
  const [walletFilter, setWalletFilter] = useState('all'), [chainFilter, setChainFilter] = useState('all');
  const observations = balances.rows.flatMap(r => r.observation ? [r.observation] : []);
  const market = useMarketQuotes(priceRequests(observations, currency));
  const shownRows = balances.rows.filter(r => (walletFilter === 'all' || r.wallet.id === walletFilter) && (chainFilter === 'all' || r.chain.id === chainFilter));
  const lines: Line[] = shownRows.flatMap(row => (row.observation?.assets ?? []).filter(a => a.amount !== '0').map(asset => ({row, asset, value: valueOf(row.chain.id, asset, market.quotes, currency, market.now || Date.now())})));
  const total = totalOf(lines.map(l => l.value));
  const empty = shownRows.filter(r => r.observation?.assets && r.observation.assets.every(a => a.amount === '0'));
  const failed = shownRows.filter(r => r.observation?.error), unread = shownRows.filter(r => !r.observation);
  const missing = shownRows.flatMap(r => (r.observation?.missing ?? []).map(symbol => `${symbol} on ${r.chain.name}`));
  const priceTimes = lines.flatMap(l => l.value.state === 'value' && l.value.quote?.fetchedAt ? [Date.parse(l.value.quote.fetchedAt)] : []).filter(Number.isFinite);
  const walletChips: [string, string][] = [['all', 'All wallets'], ...balances.wallets.map(w => [w.id, w.label] as [string, string])];
  const chainIds = new Set(balances.rows.map(r => r.chain.id));
  const chainChips: [string, string][] = [['all', 'All chains'], ...TRACKED_CHAINS.filter(c => chainIds.has(c.id)).map(c => [c.id, c.name] as [string, string])];
  const count = (pred: (r: WalletChainRow) => boolean) => balances.rows.filter(pred).reduce((n, r) => n + (r.observation?.assets ?? []).filter(a => a.amount !== '0').length, 0);
  return <section className="wallet-holdings panel" aria-labelledby={`${id}-title`} data-variant={variant}>
    <header className="wallet-holdings-head">
      <div><p className="eyebrow">READ-ONLY · NOTHING MOVES</p><h3 id={`${id}-title`}>{variant === 'portfolio' ? 'From your wallets' : 'Your linked wallets'}</h3></div>
      <div className="wallet-holdings-actions">
        <button type="button" className="secondary" onClick={() => { void balances.refresh(true); void market.refresh(); }} disabled={balances.reading}>{balances.reading ? 'Reading…' : '↻ Refresh balances'}</button>
        {variant === 'portfolio' ? <Link className="text-link" href="/app/wealth#holdings">Open in Wealth →</Link> : <Link className="text-link" href="/app/wealth/add-money">+ Add money</Link>}
      </div>
    </header>
    <div className="picker-tabs holdings-filters" role="group" aria-label="Show wallet">{walletChips.map(([key, label]) => <button key={key} type="button" aria-pressed={walletFilter === key} onClick={() => setWalletFilter(key)}>{label} <span className="what-you-have-count">{count(r => key === 'all' || r.wallet.id === key)}</span></button>)}</div>
    <div className="picker-tabs holdings-filters" role="group" aria-label="Show chain">{chainChips.map(([key, label]) => <button key={key} type="button" aria-pressed={chainFilter === key} onClick={() => setChainFilter(key)}>{label} <span className="what-you-have-count">{count(r => key === 'all' || r.chain.id === key)}</span></button>)}</div>
    <p className="wallet-holdings-total" data-wallet-total>
      <span>Linked wallets</span> <strong>{total.known ? `≈ ${wealthMoney(total.cents, currency)}` : 'Value unavailable'}</strong>
      {total.unavailable > 0 && <small> · {total.unavailable} {total.unavailable === 1 ? 'value' : 'values'} unavailable (not counted)</small>}
      {priceTimes.length > 0 && <small> · prices as of {formatDateTime(new Date(Math.min(...priceTimes)).toISOString())}</small>}
    </p>
    {lines.length > 0 && <ul className="wallet-holdings-list">{lines.map(({row, asset, value}) => {
      const tracked = trackedAsset(row.chain.id, asset);
      return <li key={`${row.wallet.id}|${row.chain.id}|${asset.id}`} className="wallet-holding" data-chain={row.chain.id}>
        <div className="wallet-holding-main"><strong>{assetLabel(asset)}</strong><span>{tracked?.name ?? asset.symbol} · {row.chain.name}</span></div>
        <div className="wallet-holding-amount"><strong>{shownUnits(asset.amount, asset.decimals)} {asset.symbol}</strong>
          {value.state === 'value' ? <span>≈ {wealthMoney(value.cents, value.currency)}</span> : <span className="wallet-holding-unavailable" title={value.reason}>Value unavailable · {value.reason}</span>}</div>
        <p className="wallet-holding-source fine">{row.wallet.label} · <span title={row.wallet.address}>{shortAddress(row.wallet.address)}</span> · read {row.observation?.at ? formatDateTime(row.observation.at) : '—'}{row.observation?.height ? ` · ${row.chain.kind === 'solana' ? 'slot' : 'block'} ${row.observation.height}` : ''}{row.chain.kind === 'zigchain' ? ' · ZIGoals’ read-only relay' : row.chain.kind === 'bitcoin' ? ' · mempool.space · confirmed' : ' · PublicNode'}</p>
      </li>;
    })}</ul>}
    {empty.length > 0 && <p className="fine">Read with nothing held: {empty.map(r => `${r.chain.name} (${r.wallet.label})`).join(', ')}.</p>}
    {missing.length > 0 && <p className="fine">Not read this time: {missing.join(', ')}.</p>}
    {failed.map(r => <p key={`${r.wallet.id}|${r.chain.id}`} className="notice wallet-holding-error" role="status">{r.chain.name} ({r.wallet.label}): {r.observation!.error}{r.observation!.at ? ` The reading from ${formatDateTime(r.observation!.at)} is kept.` : ''}</p>)}
    {unread.length > 0 && <p className="fine">{balances.reading ? 'Reading your wallets…' : `Not read yet: ${unread.map(r => `${r.chain.name} (${r.wallet.label})`).join(', ')}.`}</p>}
    {balances.error && <p role="alert">{balances.error}</p>}
    <p className="fine wallet-holdings-note">{shownRows.some(r => r.chain.kind === 'solana') ? 'Solana tokens are read from your standard (associated) token accounts. ' : ''}Your browser asks PublicNode and mempool.space directly for these addresses’ balances; ZIGChain goes through ZIGoals’ read-only relay. These rows stay on this device and are not allocated to Goals.{walletFilter !== 'all' && <> <button type="button" className="text-link" onClick={() => balances.forget(walletFilter)}>Forget this wallet’s balances</button></>}</p>
  </section>;
}
