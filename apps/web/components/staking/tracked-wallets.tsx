'use client';
import {useId, useState, type FormEvent} from 'react';
import {usePlatform} from '../platform/use-platform';
import {useDeviceRecord} from '../ai/use-device-record';
import {useShowcase} from '../showcase-controls';
import {showStatus, showUndo} from '../ui/undo-toast';
import {FieldError, useFormErrors} from '../primitives/field-error';
import './tracked-wallets.css';
import '../settings/erase-everything.css'; // the shared warning style of a destructive button
import {plainErrorMessage} from '../../lib/plain-error';
import {WALLET_NAMES, WALLET_NAME_MAX, checkWalletName, nameOf, removeTrackedWallet, restoreTrackedWallet, trackedWallets, withName, type TrackedWallet} from '../../lib/staking/tracked-wallets';

/**
 * Session AL (BN-085, BN-112): the wallets this device tracks (public, read-only), each with Rename and Remove, on
 * Staking and in Settings → Wallet & network. Remove asks first, says what goes and offers Undo; a wallet that still
 * funds a Goal is not removed (the reason names the Goal). Tracking never gave ZIGoals any authority over a wallet, so
 * removing it changes nothing on the chain.
 */
const NETWORK_WORDS: Record<string, string> = {'zigchain-1': 'ZIGChain mainnet', 'zig-test-2': 'ZIGChain Testnet'};
const short = (a: string) => a.length > 20 ? `${a.slice(0, 10)}…${a.slice(-6)}` : a;
export function TrackedWallets({heading = 'h3'}: {heading?: 'h2' | 'h3'}) {
  const store = usePlatform(), names = useDeviceRecord(WALLET_NAMES), showcase = useShowcase(), id = useId();
  const [renaming, setRenaming] = useState<string | null>(null), [draft, setDraft] = useState(''), [confirming, setConfirming] = useState<string | null>(null);
  const [problem, setProblem] = useState<{key: string; text: string} | null>(null);
  const form = useFormErrors();
  if (!store.loaded) return null;
  const wallets = trackedWallets(store.data), H = heading;
  const keyOf = (w: TrackedWallet) => `${w.network}:${w.account}`;
  const label = (w: TrackedWallet) => nameOf(names.data, w.network, w.account) || short(w.account);
  function saveName(event: FormEvent, w: TrackedWallet) {
    event.preventDefault();
    const checked = checkWalletName(draft);
    if (!checked.ok) { form.fail({name: checked.error}); return; }
    try { names.update(n => withName(n, w.network, w.account, checked.name)); setRenaming(null); form.clear(); showStatus(checked.name ? `The wallet is now called ${checked.name}.` : 'The wallet shows its address again.'); }
    catch (cause) { form.failForm(plainErrorMessage(cause, 'The name could not be saved on this device.')); }
  }
  async function remove(w: TrackedWallet) {
    const before = store.data, shown = label(w);
    const out = removeTrackedWallet(before, w.network, w.account);
    if (!out.ok) { setProblem({key: keyOf(w), text: out.reason}); setConfirming(null); return; }
    try {
      await store.update(latest => { const again = removeTrackedWallet(latest, w.network, w.account); if (!again.ok) throw Error(again.reason); return again.next; });
      setConfirming(null); setProblem(null);
      showUndo({message: `${shown} is no longer tracked.`, restore: () => store.update(latest => restoreTrackedWallet(latest, before, w.network, w.account)), undone: `${shown} is tracked again.`});
    } catch (cause) { setProblem({key: keyOf(w), text: plainErrorMessage(cause, 'The wallet could not be removed. Nothing was changed.')}); setConfirming(null); }
  }
  return <section className="tracked-wallets" aria-labelledby={`${id}-t`}>
    <H id={`${id}-t`}>Tracked wallets</H>
    {!wallets.length ? <p className="fine">No public wallet is tracked on this device. Add one with Track Wallet on Staking.</p> : <>
      <p className="fine">Public addresses this device reads, read-only. Names stay on this device. Removing one stops reading it here and changes nothing on the chain.</p>
      <ul className="tracked-wallets-list">{wallets.map(w => { const k = keyOf(w); return <li key={k} className="tracked-wallet">
        <div className="tracked-wallet-text"><strong>{label(w)}</strong><span className="fine"><span title={w.account}>{short(w.account)}</span> · {NETWORK_WORDS[w.network] ?? w.network}</span></div>
        {showcase ? null : renaming === k ? <form className="tracked-wallet-form" onSubmit={e => saveName(e, w)} aria-label={`Name for ${short(w.account)}`}>
            <label className="field">Wallet name (up to {WALLET_NAME_MAX} characters; empty shows the address)<input {...form.field('name')} value={draft} maxLength={WALLET_NAME_MAX + 20} onChange={e => setDraft(e.target.value)} autoFocus/></label>
            <FieldError {...form.message('name')}/>
            <div className="actions"><button type="submit" className="secondary">Save name</button><button type="button" className="quiet" onClick={() => { setRenaming(null); form.clear(); }}>Cancel</button></div>
            {form.formError && <p role="alert" className="field-error">{form.formError}</p>}
          </form>
          : confirming === k ? <div className="tracked-wallet-confirm" role="group" aria-label={`Remove ${label(w)}?`}>
            <p>Stop tracking {label(w)}? Its {w.positions} observed {w.positions === 1 ? 'position' : 'positions'} and quantity history leave this device. You can add it again at any time.</p>
            <div className="actions"><button type="button" className="danger" onClick={() => void remove(w)}>Remove wallet</button><button type="button" className="secondary" onClick={() => setConfirming(null)}>Keep it</button></div>
          </div>
          : <div className="actions tracked-wallet-actions">
            <button type="button" className="secondary" aria-label={`Rename ${label(w)}`} onClick={() => { setRenaming(k); setConfirming(null); setDraft(nameOf(names.data, w.network, w.account)); form.clear(); }}>Rename</button>
            <button type="button" className="quiet" aria-label={`Remove ${label(w)}`} onClick={() => { setConfirming(k); setRenaming(null); setProblem(null); }}>Remove</button>
          </div>}
        {problem?.key === k && <p role="alert" className="field-error">{problem.text}</p>}
      </li>; })}</ul>
    </>}
  </section>;
}
export default TrackedWallets;
