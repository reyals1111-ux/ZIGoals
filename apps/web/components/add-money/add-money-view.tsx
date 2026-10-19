'use client';
import './add-money.css';
import Link from 'next/link';
import {useEffect, useId, useMemo, useState} from 'react';
import {useLinkedWallets} from '../wallet/use-linked-wallets';
import {useBaseCurrency} from '../platform/wealth-total';
import {LaneLink} from './out-link';
import {useRampAssets, type RampState} from './use-ramp-assets';
import {BUY_ASSETS, NETWORKS, buyAsset, offerFor, type BuyAsset, type BuyAssetId, type NetworkId, type ProviderId} from '../../lib/onramps/assets';
import {destinationsFor} from '../../lib/onramps/guard';
import {handOffUrl, returnUrl} from '../../lib/onramps/urls';
import {UNAVAILABLE_WORDS} from '../../lib/onramps/ramp-assets';
import {shortAddress} from '../../lib/wallet-address';
import {displayLocale, formatTime} from '../../lib/visual-format';
import {HONEST_LINE} from '../../lib/onramps/copy';

/**
 * Session AF (L2b, Part 4, ADR-028 H18, H32–H36, H52, H83; A2.1–A2.9, P4.1–P4.5): Add money, five steps on one page.
 * 1 What to buy (plain words, "What's this?"), 2 which network (the recommended cheap one preselected, the fee difference
 * in plain words, Ramp's own network fee where read, and the "your wallet must be on this network" warning), 3 where it
 * arrives (only a linked wallet of that network, or "link a wallet for this network first"), 4 which provider (Ramp with its
 * live figures and "as of"; Banxa: "fees shown on Banxa's page"), 5 continue on the provider's own page in a new tab with
 * public parameters only. ZIGoals sells nothing, never touches the payment or the money, and never frames the provider.
 */
const PROVIDERS: {id: ProviderId; name: string; entity: string; site: 'ramp-site' | 'banxa-site'}[] = [
  {id: 'ramp', name: 'Ramp Network', entity: 'Ramp Swaps (Ireland) Ltd, authorised by the Central Bank of Ireland on 2 Dec 2025 (ESMA’s interim MiCA register, file of 16 Oct 2026).', site: 'ramp-site'},
  {id: 'banxa', name: 'Banxa', entity: 'EU Internet Ventures B.V., authorised by the AFM (Netherlands) on 8 Oct 2025 (ESMA’s interim MiCA register, file of 16 Oct 2026).', site: 'banxa-site'},
];
const money = (n: number, currency: string) => new Intl.NumberFormat(displayLocale(), {style: 'currency', currency, maximumFractionDigits: 2}).format(n);
function rampAsset(ramp: RampState, code: string | undefined) {
  return ramp.phase === 'ready' && ramp.data.status === 'ok' && code ? ramp.data.assets.find(a => a.code === code) : undefined;
}
export default function AddMoneyView() {
  const linked = useLinkedWallets(), currency = useBaseCurrency(), ramp = useRampAssets(currency), id = useId();
  const [assetId, setAssetId] = useState<BuyAssetId | null>(null), [network, setNetwork] = useState<NetworkId | null>(null), [walletId, setWalletId] = useState<string | null>(null), [provider, setProvider] = useState<ProviderId>('ramp'), [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const asset = assetId ? buyAsset(assetId) : undefined, offer = asset && network ? offerFor(asset, network) : undefined;
  const destinations = useMemo(() => network ? destinationsFor(network, linked.wallets) : [], [network, linked.wallets]);
  const destination = destinations.find(d => d.walletId === walletId) ?? (destinations.length === 1 ? destinations[0] : undefined);
  const choose = (a: BuyAsset) => { setAssetId(a.id); setNetwork(a.recommended); setWalletId(null); };
  const handOff = asset && network && destination && origin ? (() => { try { return handOffUrl({provider, asset: asset.id, network, address: destination.address, walletId: destination.walletId, origin, currency}); } catch { return null; } })() : null;
  const live = (code?: string) => rampAsset(ramp, code);
  const asOf = ramp.phase === 'ready' && ramp.data.status === 'ok' ? formatTime(ramp.data.asOf) : null;
  return <div className="add-money">
    <p className="add-money-honest notice" role="note">{HONEST_LINE}</p>

    <section className="add-money-step panel" aria-labelledby={`${id}-s1`}>
      <h2 id={`${id}-s1`}><span className="add-money-n">1</span> What do you want to buy?</h2>
      <p className="add-money-hint">Choose one. Next come the network, where it arrives and the provider, then the provider&rsquo;s own page.</p>
      <div className="add-money-tiles" role="group" aria-label="What to buy">{BUY_ASSETS.map(a => <div key={a.id} className="add-money-tile" data-selected={a.id === assetId || undefined}>
        <button type="button" aria-pressed={a.id === assetId} onClick={() => choose(a)} data-asset={a.id}><strong>{a.name}</strong><span>{a.plain}</span></button>
        <details><summary>What’s this?</summary><p>{a.more}</p></details>
      </div>)}</div>
    </section>

    {asset && <section className="add-money-step panel" aria-labelledby={`${id}-s2`}>
      <h2 id={`${id}-s2`}><span className="add-money-n">2</span> Which network?</h2>
      <p>{asset.recommendation}</p>
      <div className="add-money-options" role="group" aria-label="Network">{asset.offers.map(o => {
        const n = NETWORKS[o.network], fee = live(o.ramp?.value)?.networkFee;
        return <button key={o.network} type="button" aria-pressed={o.network === network} data-network={o.network} onClick={() => { setNetwork(o.network); setWalletId(null); }}>
          <strong>{n.name}{o.network === asset.recommended && <span className="add-money-badge">Recommended</span>}</strong><span>{n.plain}</span>
          {typeof fee === 'number' && asOf && <small>Ramp’s network fee here: {money(fee, currency)} (Ramp’s figure, as of {asOf})</small>}
        </button>;
      })}</div>
      {network && <p className="add-money-warning" role="note" data-network-warning><strong>Your wallet must be on this network: {NETWORKS[network].name}.</strong> {asset.symbol} sent to an address on another network can be lost for good. Choose the same network on the provider’s page.</p>}
    </section>}

    {asset && network && <section className="add-money-step panel" aria-labelledby={`${id}-s3`}>
      <h2 id={`${id}-s3`}><span className="add-money-n">3</span> Where should it arrive?</h2>
      {!linked.loaded ? <p>Reading your linked wallets…</p> : linked.showcase ? <p>The Showcase keeps its simulated wallet. Exit the Showcase to link a wallet and add money.</p>
        : destinations.length ? <div className="add-money-options" role="group" aria-label="Your wallet on this network">{destinations.map(d => <button key={d.walletId} type="button" aria-pressed={destination?.walletId === d.walletId} onClick={() => setWalletId(d.walletId)}>
            <strong>{d.label}</strong><span title={d.address}>{shortAddress(d.address)}{network === 'cosmos-hub' ? ' · the same key’s Cosmos Hub address' : ''}</span>
          </button>)}</div>
        : <div className="add-money-link-first" data-link-first><p><strong>Link a wallet for {NETWORKS[network].name} first.</strong> {NETWORKS[network].walletKind === 'evm' ? 'An Ethereum-style wallet (MetaMask, Rabby, Coinbase Wallet, Trust, OKX or Phantom)' : NETWORKS[network].walletKind === 'solana' ? 'A Solana wallet (Phantom, for example)' : NETWORKS[network].walletKind === 'btc' ? 'A Bitcoin address you watch' : 'Keplr (its ZIGChain address gives the same key’s Cosmos Hub address)'} links from <b>More wallets</b> beside Connect Keplr, or on a phone from the Status &amp; wallet sheet. ZIGoals only offers an address you linked, so the money cannot go to the wrong network.</p></div>}
    </section>}

    {asset && network && destination && <section className="add-money-step panel" aria-labelledby={`${id}-s4`}>
      <h2 id={`${id}-s4`}><span className="add-money-n">4</span> Which provider?</h2>
      <div className="add-money-options add-money-providers" role="group" aria-label="Provider">{PROVIDERS.filter(p => p.id === 'ramp' ? offer?.ramp : offer?.banxa).map(p => {
        const r = p.id === 'ramp' ? live(offer?.ramp?.value) : undefined;
        return <button key={p.id} type="button" aria-pressed={provider === p.id} data-provider={p.id} onClick={() => setProvider(p.id)}>
          <strong>{p.name}</strong><span>{p.entity}</span>
          {p.id === 'ramp' ? (ramp.phase === 'loading' ? <small>Reading Ramp’s fees…</small>
            : ramp.phase === 'ready' && ramp.data.status === 'ok' ? <small data-ramp-figures>{r && !r.enabled ? `Ramp does not offer ${asset.symbol} on ${NETWORKS[network].name} right now. ` : ''}Ramp’s fees: {ramp.data.fees.minFeePercent}% to {ramp.data.fees.maxFeePercent}% of the amount, at least {money(ramp.data.fees.minFeeAmount, currency)}{r?.minPurchaseAmount != null ? `; buy at least ${money(r.minPurchaseAmount, currency)}` : ''}. Ramp’s figures, as of {asOf}; the final price is on Ramp’s page.</small>
            : <small>Ramp’s fees are unavailable just now ({ramp.phase === 'ready' && ramp.data.status === 'unavailable' ? UNAVAILABLE_WORDS[ramp.data.reason] : 'ZIGoals could not read them'}); Ramp shows them on its page before you pay.</small>)
            : <small>Fees are shown on Banxa’s page before you pay.{asset.symbol === 'ATOM' ? ' Banxa does not sell ATOM in the UK or the US (Banxa’s table).' : ''}</small>}
        </button>;
      })}</div>
    </section>}

    {asset && network && destination && handOff && <section className="add-money-step panel" aria-labelledby={`${id}-s5`}>
      <h2 id={`${id}-s5`}><span className="add-money-n">5</span> Continue on {provider === 'ramp' ? 'Ramp' : 'Banxa'}’s page</h2>
      <p>{handOff.prefilled ? `It opens in a new tab with ${asset.symbol} on ${NETWORKS[network].name} and your address ${shortAddress(destination.address)} filled in. Check both there before you pay.` : `It opens ${provider === 'ramp' ? 'Ramp' : 'Banxa'}’s own site with nothing filled in (ZIGoals’ partner ID is not set up yet): choose ${asset.symbol} on ${NETWORKS[network].name} there and paste your address.`}</p>
      {!handOff.prefilled && <p className="add-money-address"><span>Your {NETWORKS[network].name} address</span> <code>{destination.address}</code></p>}
      <p className="add-money-warning"><strong>{NETWORKS[network].name} only.</strong> On the provider’s page, the network must say {NETWORKS[network].name}.</p>
      <div className="add-money-actions">
        <LaneLink id={handOff.prefilled ? (provider === 'ramp' ? 'ramp-hosted' : 'banxa-site') : (provider === 'ramp' ? 'ramp-site' : 'banxa-site')} href={handOff.url} className="primary">Continue on {provider === 'ramp' ? 'Ramp' : 'Banxa'}</LaneLink>
        <Link className="secondary" href={returnUrl({provider, asset: asset.id, network, walletId: destination.walletId, origin}).replace(origin, '')}>I’ve finished: watch for it →</Link>
      </div>
      <p className="fine">{HONEST_LINE}</p>
    </section>}
  </div>;
}
