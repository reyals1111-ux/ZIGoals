'use client';
import {lazy, Suspense, useState} from 'react';

/**
 * Session AK (F4): the token check on the Ecosystem page, behind one button so its code loads only on use.
 */
const TokenCheckForm = lazy(() => import('./token-check'));
export function TokenCheckFold() {
  const [open, setOpen] = useState(false);
  return <section className="panel" aria-labelledby="token-check-title">
    <h2 id="token-check-title">What is this token?</h2>
    <p>Anyone can make a token on ZIGChain and call it anything, even “ZIG”. Check a token by its denom before you trust its name.</p>
    {open ? <Suspense fallback={<p className="fine">Loading…</p>}><TokenCheckForm/></Suspense>
      : <button type="button" className="secondary" onClick={() => setOpen(true)}>Check a token</button>}
  </section>;
}
export default TokenCheckFold;
