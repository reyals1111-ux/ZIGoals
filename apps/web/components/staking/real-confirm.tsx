'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';

/**
 * Session AF (L2 design §4): the first switch to the real network asks once, explicitly. The answer is kept on this
 * device (zigoals:staking-prefs:v1 realConfirmedAt) and asked again only after it is removed (Settings → Your data, or
 * the account's erase). Escape or Not now keeps the practice network.
 */
export function RealConfirm({onConfirm, onCancel, error}: {onConfirm: () => void; onCancel: () => void; error?: string}) {
  const ref = useRef<HTMLDialogElement>(null), [understood, setUnderstood] = useState(false);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null, dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (understood) onConfirm(); };
  return <dialog ref={ref} className="wealth-sheet staking-sheet staking-real-confirm" aria-labelledby="staking-real-title" onCancel={event => { event.preventDefault(); onCancel(); }}>
    <header><div><p className="eyebrow">REAL · ZIGChain mainnet (zigchain-1)</p><h2 id="staking-real-title">This is real money</h2></div></header>
    <form className="wealth-sheet-body staking-sheet-body" onSubmit={submit}>
      <p>Actions here move your own ZIG on ZIGChain mainnet. ZIGoals never holds keys and cannot undo a signed transaction.</p>
      <p>Each action still opens a review screen first, and you sign it in your own wallet.</p>
      <label className="staking-check"><input type="checkbox" checked={understood} onChange={event => setUnderstood(event.target.checked)}/> I understand</label>
      {error && <p role="alert" className="notice">{error}</p>}
      <div className="staking-sheet-actions">
        <button type="button" className="secondary" onClick={onCancel}>Not now</button>
        <button type="submit" className="primary" disabled={!understood}>Continue on the real network</button>
      </div>
    </form>
  </dialog>;
}
