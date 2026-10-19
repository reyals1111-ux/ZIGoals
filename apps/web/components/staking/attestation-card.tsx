'use client';
import {useEffect, useMemo, useState, type FormEvent} from 'react';
import {explorerLinksFor} from '@zigoals/ecosystem-registry/links';
import {useDeviceRecord} from '../ai/use-device-record';
import {ATTESTATION_CHAIN_ID, ATTESTATION_KINDS, MAX_NOTE, attestationsWireSchema, commitmentMatches, makeAttestation, type Attestation, type AttestationKind, type AttestationsWire} from '../../lib/staking/attestation';
import {STAKING_JOURNAL, stakingEntriesOf} from '../../lib/staking/journal';
import {STAKING_PREFS, attestationsOn, withAttestations} from '../../lib/staking/prefs';
import {formatDateTime} from '../../lib/visual-format';
import type {StakingSession} from '../../lib/wallets/keplr-session';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 D4, H48): practice badges on-chain, on ZIGChain Testnet only, opt-in and off by
 * default. A badge is a 1 azig send from the person's address to itself; its memo holds only a salted code of the person's
 * note (a commitment) or a random badge number — never the note, a goal's name or a plain hash of either; the note and the
 * salt stay on this device in the staking journal. The press opens the review screen (the only way to the signer), which
 * says what becomes public forever. Badges are read back from the chain on request (GET /api/chain/attestations).
 */
const KIND_WORDS: Record<AttestationKind, {label: string; means: string}> = {
  commitment: {label: 'A commitment', means: 'Seal a promise you keep private: the chain gets only a salted code of your note, and you can prove it later.'},
  badge: {label: 'A badge', means: 'Mark something you achieved: the chain gets only a random badge number; what it stands for stays here.'},
};
type Back = {phase: 'idle'} | {phase: 'reading'} | {phase: 'ok'; wire: AttestationsWire} | {phase: 'unavailable'; reason: string};
export function AttestationCard({wallet, busy, error, onReview}: {wallet: StakingSession; busy: boolean; error?: string; onReview: (attestation: Attestation) => void}) {
  const prefs = useDeviceRecord(STAKING_PREFS), journal = useDeviceRecord(STAKING_JOURNAL);
  const [kind, setKind] = useState<AttestationKind>('commitment'), [note, setNote] = useState(''), [problem, setProblem] = useState('');
  const [back, setBack] = useState<Back>({phase: 'idle'}), [proofs, setProofs] = useState<Record<string, boolean>>({});
  const on = prefs.loaded && !prefs.unreadable && attestationsOn(prefs.data);
  const mine = useMemo(() => stakingEntriesOf(journal.data).filter(e => e.action === 'attest' && e.chainId === ATTESTATION_CHAIN_ID && e.wallet === wallet.address), [journal.data, wallet.address]);
  useEffect(() => {
    let live = true;
    void Promise.all(mine.map(async e => [e.operationId, !!(e.memo && e.attestation?.salt && e.attestation.note && await commitmentMatches(e.memo, e.attestation.salt, e.attestation.note))] as const)).then(pairs => { if (live) setProofs(Object.fromEntries(pairs)); });
    return () => { live = false; };
  }, [mine]);
  const turn = (value: boolean) => { try { prefs.update(p => withAttestations(p, value)); setProblem(''); } catch { setProblem('This device did not save your choice. Nothing changed.'); } };
  const review = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    try { onReview(await makeAttestation(kind, note)); setProblem(''); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'This badge could not be made.'); }
  };
  const readBack = async () => {
    setBack({phase: 'reading'});
    try {
      const response = await fetch(`/api/chain/attestations?${new URLSearchParams({network: ATTESTATION_CHAIN_ID, address: wallet.address})}`, {credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(45_000)});
      if (!response.ok) throw Error(response.status === 429 ? 'Too many reads just now. Try again in a minute.' : 'ZIGoals could not read this just now.');
      const wire = attestationsWireSchema.parse(await response.json());
      setBack(wire.status === 'ok' ? {phase: 'ok', wire} : {phase: 'unavailable', reason: wire.reason ?? 'ZIGoals could not read this just now.'});
    } catch (cause) { setBack({phase: 'unavailable', reason: cause instanceof Error && cause.message.length < 200 && !/[{}]/.test(cause.message) ? cause.message : 'ZIGoals could not read this just now.'}); }
  };
  const onChain = back.phase === 'ok' ? new Map(back.wire.items.map(i => [i.memo, i])) : null;
  return <section className="staking-badges" aria-labelledby="staking-badges-title">
    <h3 id="staking-badges-title">Practice badges on-chain</h3>
    <p className="fine">Practice network only (ZIGChain Testnet, no real value). Off unless you turn it on.</p>
    <p>A badge is a tiny transaction from your address to itself (1 azig, the smallest amount) whose memo holds a code. Anyone can see it forever, with your address and the time. The code is a salted fingerprint of your note or a random number, never your words, so nobody can read what it means; this device keeps the note to prove it.</p>
    {!prefs.loaded ? null : !on ? <button type="button" className="secondary" disabled={prefs.unreadable} onClick={() => turn(true)}>Turn on practice badges</button> : <>
      <form className="staking-badges-form" onSubmit={review} aria-label="New practice badge">
        <fieldset className="staking-choices"><legend>What is it?</legend>
          {ATTESTATION_KINDS.map(k => <label key={k} className="staking-choice"><input type="radio" name="staking-badge-kind" value={k} checked={kind === k} onChange={() => setKind(k)}/><span><strong>{KIND_WORDS[k].label}</strong><span>{KIND_WORDS[k].means}</span></span></label>)}
        </fieldset>
        <label className="field">Your note (stays on this device, never sent)<input value={note} onChange={e => setNote(e.target.value)} maxLength={MAX_NOTE} autoComplete="off" placeholder="For example: thirty days of walking"/></label>
        <button type="submit" className="primary" disabled={busy || !note.trim()}>Review badge</button>
      </form>
      <p className="fine"><button type="button" className="text-link" onClick={() => turn(false)}>Turn practice badges off</button></p>
    </>}
    {mine.length > 0 && <>
      <ul className="staking-badges-list" aria-label="Your practice badges">{mine.map(e => {
        const found = onChain?.get(e.memo ?? ''), links = e.hash ? explorerLinksFor(e.chainId, 'transaction', e.hash) : [];
        return <li key={e.operationId}>
          <span><strong>{e.attestation?.note ?? 'A badge from this device'}</strong> · {e.attestation?.kind === 'badge' ? 'badge' : 'commitment'} · {e.state === 'CONFIRMED' ? 'confirmed' : e.state.toLowerCase().replaceAll('_', ' ')} · <time dateTime={e.at}>{formatDateTime(e.at)}</time></span>
          {e.attestation?.kind === 'commitment' && proofs[e.operationId] && <span className="fine">Your note and its salt on this device match this code.</span>}
          {onChain && <span className="fine">{found ? `Found on the chain at block ${found.height}.` : 'Not found on the chain (yet).'}</span>}
          {links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">Check it on {link.name} ↗</a>)}
        </li>;
      })}</ul>
      <p className="fine"><button type="button" className="text-link" onClick={() => void readBack()} disabled={back.phase === 'reading'}>{back.phase === 'reading' ? 'Reading…' : 'Check them on the chain'}</button>{back.phase === 'ok' && ` Read from ${back.wire.source}, ${formatDateTime(back.wire.observedAt!)}.`}{back.phase === 'unavailable' && ` Unavailable: ${back.reason}`}</p>
    </>}
    {(problem || error) && <p role="alert" className="notice">{problem || error}</p>}
  </section>;
}
