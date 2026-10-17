'use client';
import {useId, useState} from 'react';
import {useLinkedWallets} from './use-linked-wallets';
import {WalletCardFrame, useAppWallet} from './wallet-card';
import {DISPLAY_CURRENCIES, LinkedWalletError, displayOf, selectedOf, withDisplay, withSelected, type DisplayCurrency} from '../../lib/linked-wallets';
import {shortAddress} from '../../lib/wallet-address';

const KIND_WORDS = {cosmos: 'ZIGChain address', evm: 'EVM address', btc: 'Bitcoin address'} as const;
/**
 * Session AE (Part 6, ADR-027): Today's wallet card with its two choices, kept in the linked-wallets record on this device:
 * which wallet it shows (the app's own, or one linked read-only) and the display currency (ZIG, USD, EUR or BTC) from the
 * prices the app already reads (lib/wallet-display.ts). A price that is missing or old reads "unavailable", never 0. The
 * app's own wallet is practice money (the local demo) or testnet ZIG: neither has a market value, so in USD, EUR or BTC it
 * reads "unavailable" with that reason and no price is asked for (ADR-027: a dollar figure for practice money would
 * contradict "Practice money (no real value)"). The conversion itself (lib/wallet-display.ts) waits for the staking session's
 * real balances. A linked address shows itself, shortened (whole in its title); its balance is not read. The Showcase keeps
 * its simulated wallet and its line; there the switch changes this view only (nothing is written) and no chooser shows.
 */
export default function WalletCardBody({plainWords}: {plainWords: boolean}) {
  const app = useAppWallet(plainWords), linked = useLinkedWallets(), id = useId(), [error, setError] = useState(''), [tour, setTour] = useState<DisplayCurrency>('ZIG');
  const display = linked.showcase ? tour : displayOf(linked.data), chosen = selectedOf(linked.data), wallet = linked.wallets.find(w => w.id === chosen);
  const save = (change: Parameters<typeof linked.write>[0]) => { try { linked.write(change); setError(''); } catch (e) { setError(e instanceof LinkedWalletError ? e.message : 'This device refused to save that choice.'); } };
  const choose = (c: DisplayCurrency) => { if (linked.showcase) setTour(c); else save(r => withDisplay(r, c)); };

  const chooser = linked.wallets.length > 0 && <label className="wallet-card-choice"><span className="sr-only">Wallet shown on this card</span><select value={wallet ? wallet.id : 'app'} onChange={e => save(r => withSelected(r, e.target.value))}>
    <option value="app">This app’s wallet ({app.pill})</option>
    {linked.wallets.map(w => <option key={w.id} value={w.id}>{`${w.label} · ${shortAddress(w.address)}`}</option>)}
  </select></label>;
  const currencies = !wallet && <div className="wallet-card-currency" role="group" aria-label="Show the balance in">
    {DISPLAY_CURRENCIES.map(c => <button key={c} type="button" aria-pressed={display === c} onClick={() => choose(c)}>{c}</button>)}
  </div>;
  const controls = <div className="wallet-card-controls">{chooser}{currencies}{error && <p className="wallet-card-error" role="alert">{error}</p>}</div>;

  if (wallet) return <WalletCardFrame pill="Read-only" value={<strong className="account-value wallet-card-address" title={wallet.address}>{shortAddress(wallet.address)}</strong>}
    lines={<p>{wallet.label} · {KIND_WORDS[wallet.kind]}<br/>Balance tracking arrives with the staking session.</p>} controls={controls}/>;
  if (display === 'ZIG') return <WalletCardFrame pill={app.pill} value={app.zig} lines={<p>{app.line}</p>} controls={controls}/>;
  const shown = <strong className="account-value wallet-card-unavailable" aria-describedby={`${id}-why`}>{display} unavailable</strong>;
  const why = app.local ? 'Practice money has no market value, so it is never shown in another currency.' : 'Testnet ZIG has no market price.';
  return <WalletCardFrame pill={app.pill} value={shown} lines={<p>{app.line}<br/><span id={`${id}-why`}>{why}</span></p>} controls={controls}/>;
}
