'use client';
import {useCallback, useEffect, useState} from 'react';
import {grantsWireSchema, allowanceWords, grantWords, type Grant, type GrantsWire} from '../../lib/staking/grants';
import {formatDateTime} from '../../lib/visual-format';
import type {StakingSession} from '../../lib/wallets/keplr-session';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16 (a), H45): "Permissions you have given" — the authz grants and fee allowances
 * the connected address has given on this network, read-only through ZIGoals' relay (GET /api/chain/grants, the address
 * not logged), in plain words. A grant can be revoked by a direct (non-Ledger) signer: the press opens the review screen
 * with one MsgRevoke, the only way to the signer. ZIGoals never creates a grant or an allowance; a fee allowance is shown,
 * not ended. Read when the panel opens and after a revoke confirms (`refresh`).
 */
type Read = {phase: 'loading'} | {phase: 'ok'; wire: GrantsWire} | {phase: 'unavailable'; reason: string};
export function GrantsPanel({wallet, busy, refresh, error, onRevoke}: {wallet: StakingSession; busy: boolean; refresh: number; error?: string; onRevoke: (grant: Grant) => void}) {
  const [read, setRead] = useState<Read>({phase: 'loading'});
  const load = useCallback(async () => {
    setRead({phase: 'loading'});
    try {
      const response = await fetch(`/api/chain/grants?${new URLSearchParams({network: wallet.chainId, address: wallet.address})}`, {credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(45_000)});
      if (!response.ok) throw Error(response.status === 429 ? 'Too many reads just now. Try again in a minute.' : 'ZIGoals could not read this just now.');
      const wire = grantsWireSchema.parse(await response.json());
      setRead(wire.status === 'ok' ? {phase: 'ok', wire} : {phase: 'unavailable', reason: wire.reason ?? 'ZIGoals could not read this just now.'});
    } catch (cause) { setRead({phase: 'unavailable', reason: cause instanceof Error && cause.message.length < 200 && !/[{}]/.test(cause.message) ? cause.message : 'ZIGoals could not read this just now.'}); }
  }, [wallet.chainId, wallet.address]);
  useEffect(() => { void load(); }, [load, refresh]);
  return <section className="staking-grants" aria-labelledby="staking-grants-title">
    <h3 id="staking-grants-title">Permissions you have given</h3>
    <p className="fine">A grant lets another address send a kind of message for yours; a fee allowance lets it pay its own fees from your ZIG. ZIGoals never creates either.</p>
    {read.phase === 'loading' ? <p role="status" className="fine">Reading the permissions this address has given…</p>
      : read.phase === 'unavailable' ? <p role="status" className="notice">The permissions could not be read: {read.reason} <button type="button" className="text-link" onClick={() => void load()}>Read again</button></p>
      : <>
        {!read.wire.grants.length && !read.wire.allowances.length && <p>You have given no permissions on this network: no other address can act for this one.</p>}
        {read.wire.grants.length > 0 && <ul className="staking-grants-list" aria-label="Grants">{read.wire.grants.map((grant, i) => <li key={`${grant.grantee}-${grant.msgTypeUrl ?? i}`} title={grant.grantee}>
          <span>{grantWords(grant)}</span>
          {grant.msgTypeUrl && !wallet.isLedger ? <button type="button" className="secondary" disabled={busy} onClick={() => onRevoke(grant)}>Revoke</button>
            : grant.msgTypeUrl ? null : <span className="fine">ZIGoals cannot name this permission, so it cannot revoke it here.</span>}
        </li>)}</ul>}
        {read.wire.grants.length > 0 && wallet.isLedger && <p className="fine">This Keplr account is a Ledger: a revoke cannot be signed here, because ZIGoals&rsquo; signing library has no Ledger format for it. A Keplr account without a Ledger can revoke.</p>}
        {read.wire.allowances.length > 0 && <ul className="staking-grants-list" aria-label="Fee allowances">{read.wire.allowances.map((allowance, i) => <li key={`${allowance.grantee}-${i}`} title={allowance.grantee}><span>{allowanceWords(allowance)}</span><span className="fine">Ending a fee allowance is not offered here.</span></li>)}</ul>}
        <p className="fine">Read from {read.wire.source} at block {read.wire.height}, {formatDateTime(read.wire.observedAt!)}. <button type="button" className="text-link" onClick={() => void load()}>Read again</button></p>
      </>}
    {error && <p role="alert" className="notice">{error}</p>}
  </section>;
}
