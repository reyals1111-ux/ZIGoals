'use client';
import {useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {CYCLE, OWN_WORDS_MAX, OWN_WORD_MAX} from '../../lib/cycle/store';
import {addOwnWord, allWords, moveWord, removeOwnWord, setCycleChoice, setWordHidden} from '../../lib/cycle/words';

/**
 * Session AV lane 2 (r5-body; Clue's Customize, My Tags, No Period and Perimenopause; LEDGER #380, #383): "What you track"
 * in the cycle log — two plain choices ("No period", "Perimenopause words") and the words offered for a day: hide a
 * built-in one, put them in your order, add your own (up to 30), remove one (its past days keep it). Words to log, never a
 * reading of what they mean. Its own chunk, loaded when the fold opens.
 */
export default function CycleWords() {
  const rec = useDeviceRecord(CYCLE), id = useId(), [draft, setDraft] = useState(''), [error, setError] = useState(''), [said, setSaid] = useState('');
  const list = useRef<HTMLUListElement>(null);
  if (!rec.loaded) return <p className="fine">Reading your words…</p>;
  const write = (fn: Parameters<typeof rec.update>[0], text: string) => { try { rec.update(fn); setSaid(text); return true; } catch { setSaid('Not saved on this device. Nothing was changed.'); return false; } };
  const words = allWords(rec.data), own = words.filter(w => w.own).length;
  // Focus stays on the word's own button after a move (the row moved, so its button is found again by the word's id).
  const move = (wid: string, label: string, by: -1 | 1) => { if (write(r => moveWord(r, wid, by), `${label} moved ${by < 0 ? 'up' : 'down'}.`)) queueMicrotask(() => list.current?.querySelector<HTMLButtonElement>(`[data-word="${wid}"][data-move="${by}"]`)?.focus()); };
  const add = () => {
    const out = addOwnWord(rec.data, draft);
    if (!out.ok) { setError(out.message); return; }
    if (write(() => out.value, `“${draft.trim()}” is in your words.`)) { setDraft(''); setError(''); }
  };
  return <div className="cycle-words">
    <fieldset className="cycle-choices"><legend>Your choices</legend>
      <label className="cycle-plan-choice"><input type="checkbox" checked={rec.data.noPeriod === true} disabled={rec.unreadable} aria-describedby={`${id}-np`} onChange={e => write(r => setCycleChoice(r, 'noPeriod', e.currentTarget.checked), e.currentTarget.checked ? 'No period: the flow buttons and the next-period line are hidden. Your words and notes stay.' : 'The flow buttons and the next-period line show again.')}/><span>No period</span></label>
      <small id={`${id}-np`} className="fine">For tracking your days without a period. The flow buttons and the next-period line are hidden; every word and note you log is kept, and your past periods stay in Your cycles.</small>
      <label className="cycle-plan-choice"><input type="checkbox" checked={rec.data.peri === true} disabled={rec.unreadable} aria-describedby={`${id}-peri`} onChange={e => write(r => setCycleChoice(r, 'peri', e.currentTarget.checked), e.currentTarget.checked ? 'Hot flushes, night sweats, joint aches and brain fog are in your words.' : 'The perimenopause words are no longer offered. Days that have them keep them.')}/><span>Perimenopause words</span></label>
      <small id={`${id}-peri`} className="fine">Adds hot flushes, night sweats, joint aches and brain fog to the words you can log. Nothing is read into them.</small>
    </fieldset>
    <h4 className="cycle-words-title">Words for a day</h4>
    <ul className="cycle-words-list" ref={list}>{words.map((w, i) => <li key={w.id} data-hidden={w.hidden || undefined}>
      <span className="cycle-word-name">{w.label}{w.own && <span className="fine"> (yours)</span>}{w.hidden && <span className="fine"> (hidden)</span>}</span>
      <span className="cycle-word-actions">
        <button type="button" className="quiet" data-word={w.id} data-move="-1" disabled={i === 0} aria-label={`Move ${w.label} up`} onClick={() => move(w.id, w.label, -1)}>↑</button>
        <button type="button" className="quiet" data-word={w.id} data-move="1" disabled={i === words.length - 1} aria-label={`Move ${w.label} down`} onClick={() => move(w.id, w.label, 1)}>↓</button>
        {w.own
          ? <button type="button" className="quiet" onClick={() => write(r => removeOwnWord(r, w.id), `${w.label} is no longer offered. Days that have it keep it.`)}>Remove<span className="sr-only"> {w.label}</span></button>
          : <button type="button" className="quiet" aria-pressed={w.hidden} onClick={() => write(r => setWordHidden(r, w.id, !w.hidden), w.hidden ? `${w.label} shows again.` : `${w.label} is hidden. Days that have it keep it.`)}>Hide<span className="sr-only"> {w.label}</span></button>}
      </span>
    </li>)}</ul>
    <div className="cycle-add-word">
      <label className="field"><span>Add your own word ({own} of {OWN_WORDS_MAX})</span>
        <input value={draft} maxLength={OWN_WORD_MAX} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} onChange={e => { setDraft(e.target.value); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}/>
      </label>
      <button type="button" className="secondary" disabled={rec.unreadable || !draft.trim()} onClick={add}>Add</button>
    </div>
    {error && <p id={`${id}-err`} role="alert" className="fine">{error}</p>}
    <p className="cycle-status" role="status" aria-live="polite">{said}</p>
  </div>;
}
