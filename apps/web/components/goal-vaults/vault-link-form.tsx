'use client';
import {useId, useState, type FormEvent} from 'react';
import type {LinkedWallet} from '../../lib/linked-wallets';
import {shortAddress} from '../../lib/wallet-address';
import {GoalVaultError, writeGoalVaults, withLink, type VaultPart} from '../../lib/goal-vaults/store';
import {baselineOf, type StakeReading} from '../../lib/goal-vaults/progress';
import {shownUnits} from '../../lib/wallets/balances/units';
import {getAppStorage} from '../../lib/showcase-storage';
import {formatDateTime} from '../../lib/visual-format';

/**
 * Session AF (L2b, Part 6; P6.2): "Link your stake to this goal". The choices are the ZIGChain wallets linked on this
 * device (read-only, mainnet: practice stake never counts) and what counts: the staked ZIG with its rewards, the stZIG,
 * or both. The stake read now becomes the baseline for "since you linked". Nothing moves and nothing is signed.
 */
export function VaultLinkForm({goalId, wallets, readingOf, rate, onRead, onSaved}: {
  goalId: string; wallets: LinkedWallet[];
  readingOf: (walletId: string) => {reading: StakeReading | null; error?: string; busy?: boolean};
  rate: string | null; onRead: (walletId: string) => void; onSaved: (message: string) => void;
}) {
  const id = useId(), [walletId, setWalletId] = useState(wallets[0]?.id ?? ''), [parts, setParts] = useState<VaultPart[]>(['delegations', 'stzig']), [error, setError] = useState('');
  // The wallets arrive after the first render (the device record loads), so an unset choice means the first one.
  const chosen = wallets.find(w => w.id === walletId) ?? wallets[0], state = chosen ? readingOf(chosen.id) : null, reading = state?.reading ?? null;
  if (!wallets.length) return <p className="fine">Link a ZIGChain wallet first (More wallets beside Connect Keplr, or on a phone the Status &amp; wallet sheet). Its stake is then read here, read-only.</p>;
  const toggle = (p: VaultPart) => setParts(list => list.includes(p) ? list.filter(x => x !== p) : [...list, p]);
  function save(event: FormEvent) {
    event.preventDefault();
    if (!chosen || !reading) { setError('Read the stake first, so "since you linked" has a starting point.'); return; }
    try { writeGoalVaults(getAppStorage(), r => withLink(r, {goalId, walletId: chosen.id, parts, baseline: baselineOf(reading, rate)})); setError(''); onSaved(`${chosen.label}'s stake is now working toward this Goal. Nothing moved.`); }
    catch (e) { setError(e instanceof GoalVaultError ? e.message : 'This device refused to save the link.'); }
  }
  return <form className="vault-link-form" aria-label="Link your stake to this goal" onSubmit={save}>
    <label htmlFor={`${id}-wallet`}>Wallet (ZIGChain, read-only)</label>
    <select id={`${id}-wallet`} value={chosen?.id ?? ''} onChange={e => setWalletId(e.target.value)}>{wallets.map(w => <option key={w.id} value={w.id}>{`${w.label} · ${shortAddress(w.address)}`}</option>)}</select>
    <fieldset><legend>What counts toward the Goal</legend>
      <label><input type="checkbox" checked={parts.includes('delegations')} onChange={() => toggle('delegations')}/> Staked ZIG and its rewards waiting</label>
      <label><input type="checkbox" checked={parts.includes('stzig')} onChange={() => toggle('stzig')}/> Valdora stZIG</label>
    </fieldset>
    <p className="fine" role="status">{state?.busy ? 'Reading your stake…' : reading ? `Read ${formatDateTime(reading.at)}: ${shownUnits(reading.stakedAzig.toString(), 18, 4)} ZIG staked · ${shownUnits(reading.rewardsAzig.toString(), 18, 4)} ZIG rewards waiting · ${shownUnits(reading.stzigUnits.toString(), 6, 4)} stZIG.` : state?.error ? `Couldn’t read the chain just now: ${state.error}` : 'Not read yet.'}</p>
    <div className="vault-link-actions">
      <button type="button" className="secondary" onClick={() => chosen && onRead(chosen.id)}>Read the stake</button>
      <button type="submit" className="primary" disabled={!reading || !parts.length}>Link this stake to the Goal</button>
    </div>
    {error && <p role="alert">{error}</p>}
  </form>;
}
