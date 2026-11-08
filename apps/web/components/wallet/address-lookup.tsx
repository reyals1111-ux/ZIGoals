'use client';
import {useId, useState, type FormEvent} from 'react';
import './wallet-holdings.css';
import {useLinkedWallets} from './use-linked-wallets';
import {useChainChoice} from '../chain/use-chain-choice';
import {FieldError, useFormErrors} from '../primitives/field-error';
import {LinkedWalletError} from '../../lib/linked-wallets';
import {recogniseAddress} from '../../lib/wallets/address-lookup';
import {shortAddress} from '../../lib/wallet-address';

/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-023, C-TK-09): zero-signup address lookup on Wealth. Paste any public address on a
 * chain ZIGoals already reads (ZIGChain, the six EVM chains, Solana, Bitcoin); it is recognised on this device, linked
 * read-only and read by "What you have" above, through the same readers and hosts as every linked wallet. No account, no
 * wallet app, nothing signed. Remove it from the wallet menu's "Linked on this device". Not in the Showcase, and only once
 * the person chose the chain.
 */
export default function AddressLookup() {
  const linked = useLinkedWallets(), chain = useChainChoice(), id = useId(), form = useFormErrors();
  const [open, setOpen] = useState(false), [text, setText] = useState(''), [name, setName] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState('');
  // Chain words only once the person chose the chain (lib/chain-choice.ts): a consumer's Wealth never shows this panel.
  if (!linked.loaded || linked.showcase || !chain.chosen) return null;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setDone('');
    const found = await recogniseAddress(text);
    if (!found.ok) { form.fail({address: found.reason}); return; }
    setBusy(true);
    try {
      const entry = await linked.link({kind: found.kind, wallet: 'address-lookup', label: name.trim() || found.label, address: found.address, via: 'typed'});
      setDone(`${entry.label} ${shortAddress(entry.address)} is linked, read-only. Its balances on ${found.chains} are read in What you have above.`);
      setText(''); setName(''); setOpen(false); form.clear();
    } catch (cause) { form.fail({address: cause instanceof LinkedWalletError ? cause.message : 'The address could not be kept on this device. Nothing was saved.'}); }
    finally { setBusy(false); }
  }
  return <section className="panel xpub-watch address-lookup" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">ANY ADDRESS · READ-ONLY</p>
    <h3 id={`${id}-title`}>Look up an address</h3>
    <p className="fine">No account and no wallet app needed: paste a public ZIGChain, EVM (Ethereum, Arbitrum, Base, OP Mainnet, Polygon, BNB Chain), Solana or Bitcoin address to see its balances here.</p>
    {done && <p role="status" className="fine">{done}</p>}
    {!open ? <button type="button" className="secondary" onClick={() => { setOpen(true); setDone(''); }}>Look up an address</button> :
      <form className="xpub-form" onSubmit={e => void submit(e)} aria-label="Look up an address" noValidate>
        <label htmlFor={`${id}-address`}>Public address</label>
        <input {...form.field('address', {id: `${id}-address`, describedBy: `${id}-help`})} value={text} onChange={e => setText(e.target.value)} maxLength={100} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="zig1…, 0x…, bc1… or a Solana address"/>
        <FieldError {...form.message('address')}/>
        <label>Name (optional)<input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="For example: Savings"/></label>
        <div className="actions"><button type="submit" className="primary" disabled={busy}>{busy ? 'Checking…' : 'Look up'}</button><button type="button" className="secondary" onClick={() => { setOpen(false); form.clear(); }}>Cancel</button></div>
      </form>}
    <p className="fine" id={`${id}-help`}>Public addresses only: never paste a private key or recovery words. The address is checked on this device, then kept here as a read-only linked wallet; its balances are read as every linked wallet’s are (ZIGoals’ read-only relay for ZIGChain, a public node for each other chain), and those see the address and your IP address. A name such as vitalik.eth is not looked up. Remove it from the wallet menu, under Linked on this device.</p>
  </section>;
}
