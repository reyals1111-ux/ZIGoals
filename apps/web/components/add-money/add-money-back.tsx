'use client';
import './add-money.css';
import Link from 'next/link';
import {useEffect, useId, useRef, useState} from 'react';
import type {LinkedWallet} from '../../lib/linked-wallets';
import {useLinkedWallets} from '../wallet/use-linked-wallets';
import {useDeviceRecord} from '../ai/use-device-record';
import {NextSteps} from './next-steps';
import {HONEST_LINE} from '../../lib/onramps/copy';
import {NETWORKS, buyAsset, watchedAssetId, type BuyAssetId, type ProviderId} from '../../lib/onramps/assets';
import {readReturn} from '../../lib/onramps/urls';
import {destinationsFor} from '../../lib/onramps/guard';
import {chainById, type TrackedChain} from '../../lib/wallets/balances/chains';
import {refreshOne} from '../../lib/wallets/balances/read';
import {WALLET_BALANCES, observationOf} from '../../lib/wallets/balances/store';
import {shownUnits} from '../../lib/wallets/balances/units';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {formatDateTime} from '../../lib/visual-format';

/**
 * Session AF (L2b, Part 4, ADR-028 H83; A2.7, P4.4): the page a provider sends the person back to. Its address names only
 * the provider, the asset, the network and the linked wallet's local id (lib/onramps/urls.ts), never an address. It says
 * what happens next (the providers' own published times, labelled as theirs; identity-check times are not published) and
 * watches that one wallet on that one network through the Part 3 readers: once a minute while the tab is visible, for up to
 * two hours, until the amount grows. Then the money shows in Wealth's "What you have", where it stays.
 */
const NEXT: Record<ProviderId, string> = {
  ramp: 'Ramp’s own figures: card, Apple Pay or Google Pay up to 5 minutes; an instant bank transfer 10 to 20 minutes; a manual bank transfer from about 10 minutes (SEPA Instant) to 3 business days. A first purchase starts with an identity check, and Ramp publishes no time for it. Then the network confirms the transfer, which Ramp says can take from seconds to a few hours.',
  banxa: 'Banxa’s own figures: cards, Apple Pay and Google Pay are instant; a SEPA bank transfer takes 1 to 3 business days. A first purchase starts with an identity check, which Banxa says can add to the time.',
};
export const WATCH_EVERY_MS = 60_000, WATCH_FOR_MS = 2 * 60 * 60 * 1000;
const clock = () => Date.now();
/** One read of the watched wallet on the watched chain, then every reader of the balances record refreshes. */
function readOnce(wallet: LinkedWallet, chain: TrackedChain): Promise<void> {
  if (isShowcase()) return Promise.resolve();
  return refreshOne(getAppStorage(), wallet, chain).then(() => { window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: WALLET_BALANCES.key})); });
}
export default function AddMoneyBack() {
  const id = useId(), linked = useLinkedWallets(), balances = useDeviceRecord(WALLET_BALANCES);
  const [ret, setRet] = useState<ReturnType<typeof readReturn> | undefined>(undefined), [watching, setWatching] = useState(false), [baseline, setBaseline] = useState<bigint | null>(null);
  const started = useRef(0);
  useEffect(() => setRet(readReturn(window.location.search)), []);
  const asset = ret ? buyAsset(ret.asset) : undefined, network = ret?.network;
  const wallet = ret ? linked.wallets.find(w => w.id === ret.walletId) : undefined;
  const destination = wallet && network ? destinationsFor(network, [wallet])[0] : undefined;
  const chain = network ? chainById(NETWORKS[network].chainId) : undefined, assetKey = asset && network ? watchedAssetId(asset, network) : null;
  const observation = wallet && chain ? observationOf(balances.data, wallet.id, chain.id) : null;
  const amount = (() => { const a = observation?.assets?.find(x => x.id === assetKey); return a ? BigInt(a.amount) : null; })();
  const decimals = asset && chain ? [chain.native, ...chain.tokens].find(t => t.id === assetKey)?.decimals ?? 0 : 0;
  // The amount when the person came back is the baseline; the money has arrived once a later read is higher.
  useEffect(() => { if (baseline === null && amount !== null && balances.loaded) setBaseline(amount); }, [amount, baseline, balances.loaded]);
  const arrived = baseline !== null && amount !== null && amount > baseline;
  useEffect(() => {
    if (!wallet || !chain || !destination || !balances.loaded || arrived) { setWatching(false); return; }
    const w = wallet, c = chain;
    if (!started.current) started.current = clock();
    setWatching(true);
    void readOnce(w, c);
    const t = window.setInterval(() => { if (clock() - started.current > WATCH_FOR_MS) { window.clearInterval(t); setWatching(false); return; } if (document.visibilityState === 'visible') void readOnce(w, c); }, WATCH_EVERY_MS);
    return () => window.clearInterval(t);
  }, [wallet?.id, chain?.id, destination?.walletId, balances.loaded, arrived]); // eslint-disable-line react-hooks/exhaustive-deps -- one watch per wallet and chain
  if (ret === undefined) return <div className="add-money"><p role="status">Reading where you came back from…</p></div>;
  if (!ret || !asset || !network) return <div className="add-money"><section className="add-money-step panel"><h2>Nothing to watch here</h2><p>This page shows what happens after a purchase. <Link href="/app/wealth/add-money">Start from Add money →</Link></p></section></div>;
  return <div className="add-money">
    <p className="add-money-honest notice" role="note">{HONEST_LINE}</p>
    <section className="add-money-step panel" aria-labelledby={`${id}-next`}>
      <h2 id={`${id}-next`}>What happens next</h2>
      <p>{NEXT[ret.provider]}</p>
      <p>You bought {asset.symbol} on {NETWORKS[network].name}{destination ? <> to {destination.label} <span title={destination.address}>({destination.address.slice(0, 8)}…{destination.address.slice(-4)})</span></> : ''}. If you closed the provider’s page without paying, nothing happened and nothing was charged by ZIGoals (ZIGoals never charges anything).</p>
    </section>
    <section className="add-money-step panel" aria-labelledby={`${id}-watch`} data-balance-watch={arrived ? 'arrived' : watching ? 'watching' : 'idle'}>
      <h2 id={`${id}-watch`}>{arrived ? `Your ${asset.symbol} arrived` : `Watching for your ${asset.symbol}`}</h2>
      {!destination ? <p>That wallet is no longer linked on this device, so ZIGoals cannot watch it. Link it again from More wallets.</p>
        : <>
          <p role="status">{amount === null ? (observation?.error ? `Not read yet: ${observation.error}` : 'Reading your balance…')
            : `${asset.symbol} on ${NETWORKS[network].name}: ${shownUnits(amount.toString(), decimals)}${arrived && baseline !== null ? ` (+${shownUnits((amount - baseline).toString(), decimals)} since you came back)` : ''} · read ${observation?.at ? formatDateTime(observation.at) : '—'}`}</p>
          {arrived ? <p>It now shows in <Link href="/app/wealth#holdings">Wealth → What you have</Link>.</p>
            : <p className="fine">{watching ? 'ZIGoals reads this one address once a minute while this tab is open (for up to two hours), straight from the network’s public service.' : 'The watch has stopped; reopen this page to read again.'} {wallet && chain && <button type="button" className="text-link" onClick={() => void readOnce(wallet, chain)}>Read now</button>}</p>}
        </>}
    </section>
    <NextSteps asset={ret.asset as BuyAssetId} headingId={`${id}-steps`}/>
    <p><Link className="secondary" href="/app/wealth/add-money">Add more money</Link></p>
  </div>;
}
