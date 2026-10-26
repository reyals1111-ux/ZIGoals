'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useLinkedWallets} from './use-linked-wallets';
import {WalletCardFrame, useAppWallet} from './wallet-card';
import {LinkedWalletError, selectedOf, withSelected} from '../../lib/linked-wallets';
import {shortAddress} from '../../lib/wallet-address';

const KIND_WORDS = {cosmos: 'ZIGChain address', evm: 'EVM address', btc: 'Bitcoin address', solana: 'Solana address'} as const;
/**
 * Session AE (Part 6, ADR-027): Today's wallet card with its choice of wallet, kept in the linked-wallets record on this
 * device: the app's own, or one linked read-only. A linked address shows itself, shortened (whole in its title); Session AF
 * (L2b): its balances are read and shown in Wealth's "What you have" (the card links there; the card itself reads nothing).
 * Session AH (TR7, owner amendment 6): the app's own wallet is practice money (the local demo) or testnet ZIG, and neither
 * has a market value, so the USD, EUR and BTC buttons could only ever read "unavailable". They are gone: the card shows
 * ZIG and says why other currencies are not shown (ADR-027 G16: a dollar figure for practice money would contradict
 * "Practice money (no real value)"). An older stored display choice is kept in the record, unread. The Showcase keeps its
 * simulated wallet and its line.
 */
export default function WalletCardBody({plainWords}: {plainWords: boolean}) {
  const app = useAppWallet(plainWords), linked = useLinkedWallets(), [error, setError] = useState('');
  const chosen = selectedOf(linked.data), wallet = linked.wallets.find(w => w.id === chosen);
  const save = (change: Parameters<typeof linked.write>[0]) => { try { linked.write(change); setError(''); } catch (e) { setError(e instanceof LinkedWalletError ? e.message : 'This device refused to save that choice.'); } };

  const chooser = linked.wallets.length > 0 && <label className="wallet-card-choice"><span className="sr-only">Wallet shown on this card</span><select value={wallet ? wallet.id : 'app'} onChange={e => save(r => withSelected(r, e.target.value))}>
    <option value="app">This app’s wallet ({app.pill})</option>
    {/* Gate C security review: a linked wallet's name is page-supplied, so each linked option says "Linked" first and can
        never pass for the app's own wallet above it. */}
    {linked.wallets.map(w => <option key={w.id} value={w.id}>{`Linked · ${w.label} · ${shortAddress(w.address)}`}</option>)}
  </select></label>;
  const controls = (chooser || error) && <div className="wallet-card-controls">{chooser}{error && <p className="wallet-card-error" role="alert">{error}</p>}</div>;

  if (wallet) return <WalletCardFrame pill="Read-only" value={<strong className="account-value wallet-card-address" title={wallet.address}>{shortAddress(wallet.address)}</strong>}
    lines={<p>{wallet.label} · {KIND_WORDS[wallet.kind]}<br/>Its balances, read-only, are in <Link href="/app/wealth#holdings">Wealth → What you have</Link>. <Link href="/app/wealth/add-money">+ Add money</Link></p>} controls={controls}/>;
  return <WalletCardFrame pill={app.pill} value={app.zig} lines={<p>{app.line}<br/><span className="wallet-card-why">{app.why}</span></p>} controls={controls}/>;
}
