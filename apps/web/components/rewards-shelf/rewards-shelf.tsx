'use client';
import {useState} from 'react';
import {REWARDS_SHELF, addReward, canClaim, claimReward, pointsAvailable, pointsSpent, pointsToGo, removeReward, setShelfOn, timesClaimed, undoClaim, MAX_NAME, MAX_PRICE} from '../../lib/rewards-shelf/store';
import {formatNumber} from '../../lib/visual-format';
import {saveFailureMessage, storageUiCode} from '../../lib/storage-error-copy';
import {useDeviceRecord} from '../ai/use-device-record';
import {ConfirmInline} from '../ui/confirm-inline';
import {showToast} from '../ui/undo-toast';
import './rewards-shelf.css';

/** The shelf's own words for a refused entry (a price out of range, too few points); storage's coded reason otherwise. */
const why = (e: unknown) => storageUiCode(e) !== 'SAVE_FAILED' ? saveFailureMessage(e) : e instanceof Error && e.name === 'Error' && !e.message.startsWith('[') ? e.message : 'This was not saved on this device.';
const newId = () => { try { return crypto.randomUUID(); } catch { return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; } };

/**
 * Session AK (COMPETITORS item 19, H3): the rewards shelf, an opt-in part of the game layer on the Journey page. The person
 * lists treats with a point price; the points are the XP the layer already derives from their records; "Claim" marks a
 * treat as enjoyed (with Undo). No penalties and no negative points: what is left never shows below zero, and nothing is
 * ever taken away. Kept on this device (`zigoals:rewards-shelf:v1`).
 */
export default function RewardsShelf({xpTotal}: {xpTotal: number}) {
  const shelf = useDeviceRecord(REWARDS_SHELF), [name, setName] = useState(''), [price, setPrice] = useState(''), [note, setNote] = useState(''), [removing, setRemoving] = useState<string | null>(null);
  if (!shelf.loaded) return null;
  const s = shelf.data, on = !shelf.unreadable && !!s.on, rewards = s.rewards ?? [], left = pointsAvailable(s, xpTotal);
  const save = (change: Parameters<typeof shelf.update>[0], ok: string) => { try { shelf.update(change); setNote(ok); return true; } catch (e) { setNote(why(e)); return false; } };
  const add = () => { if (save(c => addReward(c, {id: newId(), name, price: Number(price), at: new Date().toISOString()}), `${name.trim()} is on your shelf.`)) { setName(''); setPrice(''); } };
  const claim = (rewardId: string, title: string) => {
    const id = newId();
    if (save(c => claimReward(c, rewardId, xpTotal, {id, at: new Date().toISOString()}), `Enjoy it: ${title}.`)) showToast({message: `Claimed: ${title}. Enjoy it.`, undo: () => shelf.update(c => undoClaim(c, id)), undone: 'Claim taken back; the points are yours again.'});
  };
  return <section className="panel rewards-shelf" aria-labelledby="rewards-shelf-title">
    <p className="eyebrow">Optional · your own treats</p>
    <h2 id="rewards-shelf-title">Rewards shelf</h2>
    <label className="game-setting-row"><input type="checkbox" role="switch" aria-checked={on} checked={on} disabled={shelf.unreadable} onChange={e => save(c => setShelfOn(c, e.target.checked), e.target.checked ? 'The shelf is on.' : 'The shelf is off; your treats stay saved.')} /><span><strong>Rewards shelf</strong><small>List treats with a point price. Your points are the XP you already earn; claiming a treat marks it enjoyed. No penalties, no negative points.</small></span></label>
    {on && <>
      <p className="rewards-points">Points to spend: <strong>{formatNumber(left)}</strong> <span className="fine">· {formatNumber(Math.max(0, Math.floor(xpTotal)))} XP earned, {formatNumber(pointsSpent(s))} claimed</span></p>
      {rewards.length ? <ul className="rewards-list" aria-label="Your treats">{rewards.map(r => {
        const ready = canClaim(s, r, xpTotal), times = timesClaimed(s, r.id);
        return <li key={r.id}>
          <span className="rewards-name"><strong>{r.name}</strong><small>{formatNumber(r.price)} points{times ? ` · enjoyed ${times === 1 ? 'once' : `${formatNumber(times)} times`}` : ''}</small></span>
          <span className="actions">
            <button type="button" className={ready ? 'primary' : 'secondary'} disabled={!ready} onClick={() => claim(r.id, r.name)} aria-label={ready ? `Claim ${r.name}` : `Claim ${r.name}: ${formatNumber(pointsToGo(s, r, xpTotal))} points to go`}>{ready ? 'Claim' : `${formatNumber(pointsToGo(s, r, xpTotal))} to go`}</button>
            <button type="button" className="quiet" onClick={() => setRemoving(r.id)} aria-label={`Remove ${r.name}`}>Remove</button>
          </span>
          {removing === r.id && <ConfirmInline tone="neutral" title={`Take ${r.name} off the shelf?`} confirmLabel="Remove" onConfirm={() => { save(c => removeReward(c, r.id), `${r.name} is off the shelf.`); setRemoving(null); }} onCancel={() => setRemoving(null)}><p>What you already enjoyed stays counted.</p></ConfirmInline>}
        </li>;
      })}</ul> : <p className="fine">No treats yet. For example: a film night for 200 points, or a new book for 500.</p>}
      <form className="rewards-add" onSubmit={e => { e.preventDefault(); add(); }}>
        <label className="field">A treat<input value={name} maxLength={MAX_NAME} placeholder="For example: a film night" onChange={e => setName(e.target.value)} /></label>
        <label className="field rewards-price">Points<input value={price} inputMode="numeric" type="number" min={1} max={MAX_PRICE} step={1} onChange={e => setPrice(e.target.value)} /></label>
        <button type="submit" className="secondary" disabled={!name.trim() || !price}>Add to the shelf</button>
      </form>
    </>}
    {note && <p role="status" className="fine">{note}</p>}
  </section>;
}
