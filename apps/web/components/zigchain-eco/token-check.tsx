'use client';
import {useId, useState, type FormEvent} from 'react';
import {checkToken, type TokenCheck} from '../../lib/zigchain-eco/denom-client';
import {KNOWN_TOKENS_READ_ON, KNOWN_TOKENS_SOURCE} from '../../lib/zigchain-eco/denoms';
import {formatDate} from '../../lib/visual-format';
import './zigchain-eco.css';

/**
 * Session AK (F4, IBC and token clarity): "What is this token?" Paste a denom from a wallet or an explorer; ZIGoals names
 * it by the denom only — ZIGChain's curated list, or an IBC route read from the network with its hash checked — and
 * shows the token's own name apart, quoted, as its maker's words. A name that imitates ZIG, stZIG, USDC or another known
 * coin under another denom is called a look-alike. Read-only; nothing is stored; asks only ZIGoals' own route.
 */
export function TokenCheckForm() {
  const id = useId();
  const [network, setNetwork] = useState<'zigchain-1' | 'zig-test-2'>('zigchain-1');
  const [denom, setDenom] = useState(''), [busy, setBusy] = useState(false), [result, setResult] = useState<TokenCheck | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try { setResult(await checkToken(network, denom)); } finally { setBusy(false); }
  };
  return <div className="zeco">
    <form className="zeco-form" onSubmit={submit} aria-describedby={`${id}-help`}>
      <p id={`${id}-help`} className="fine">Paste a token’s full denom (it starts with ibc/, coin.zig1 or zig1). ZIGoals names it by its denom, never by the name its maker chose.</p>
      <label>Network<select value={network} onChange={e => setNetwork(e.target.value as typeof network)}><option value="zigchain-1">ZIGChain</option><option value="zig-test-2">ZIGChain practice network (test tokens)</option></select></label>
      <label>Token denom<input value={denom} onChange={e => setDenom(e.target.value)} spellCheck={false} autoCapitalize="off" autoComplete="off" maxLength={140} placeholder="ibc/… or coin.zig1…"/></label>
      <p className="zeco-actions"><button type="submit" className="secondary" disabled={busy || !denom.trim()}>{busy ? 'Checking…' : 'Check this token'}</button></p>
    </form>
    <div role="status" aria-live="polite">
      {result?.phase === 'unavailable' && <p className="notice">{result.reason}</p>}
      {result?.phase === 'ok' && <article className="zeco-card" aria-label="What this token is">
        <p><strong>{result.view.identity}</strong></p>
        {result.view.warning && <p className="zeco-warning">{result.view.warning}</p>}
        {result.view.ownName && <p className="fine">Its own name, as its maker wrote it: <q>{result.view.ownName}</q></p>}
        <p className="fine">Denom: <span className="zeco-denom">{result.view.denom}</span></p>
        {result.view.maker && result.view.maker !== result.view.denom && <p className="fine">Made by: <span className="zeco-denom">{result.view.maker}</span></p>}
        {result.view.source && <p className="fine">{result.view.source}</p>}
        {result.wire?.traceMismatch && <p className="fine">The network gave a route for this token that did not match its hash, so it was not used.</p>}
        {result.wire?.height && <p className="fine">Read at block {result.wire.height}.</p>}
      </article>}
    </div>
    <p className="fine">Known tokens: {KNOWN_TOKENS_SOURCE}, read {formatDate(KNOWN_TOKENS_READ_ON)}.</p>
  </div>;
}
export default TokenCheckForm;
