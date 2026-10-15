'use client';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {CARD_ARTS, type CardArt} from '../../lib/card-art/catalog';
import {setGoalCardArt} from '../../lib/goal-extras/store';
import {useGoalExtras} from './use-goal-extras';
import {SceneArt} from '../scene-art';
import './goal-art-picker.css';

/**
 * Session AB-Design (owner request 17): "Change artwork" — a picker of the fifteen drawn scenes for one goal card. The
 * choice previews at once; Save goes through AB-Cloud's `setGoalCardArt` (lib/goal-extras/store.ts, wired at the second
 * merger, Phase 2 Part 12) with the extras' Undo toast, and the choice syncs with the goal's extras. The card's size and
 * proportions never change: only the scene inside its art band.
 */
export default function GoalArtPicker({goalKey, name, current, onClose, onPreview}: {goalKey: string; name: string; current: CardArt; onClose: () => void; onPreview: (art: CardArt | null) => void}) {
  const dialog = useRef<HTMLDialogElement>(null), [choice, setChoice] = useState<CardArt>(current), [message, setMessage] = useState(''), extras = useGoalExtras();
  useEffect(() => { dialog.current?.showModal(); }, []);
  const close = () => { onPreview(null); onClose(); };
  function save() {
    if (!extras.loaded) { setMessage('Your goal details are still opening. Try again in a moment.'); return; }
    if (!extras.writable) { setMessage('Your goal details on this device could not be read, so the artwork was not saved.'); return; }
    setMessage('');
    extras.change(goalKey, e => setGoalCardArt(e, goalKey, choice, new Date().toISOString()), `Artwork changed for ${name}.`);
    close(); // the preview gives way to the saved choice (or to the default again after Undo)
  }
  return createPortal(<dialog ref={dialog} className="goal-art-dialog" aria-labelledby="goal-art-title" onClose={close} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
    <div className="goal-art-card">
      <div className="goal-art-head"><div><p className="eyebrow">Change artwork</p><h2 id="goal-art-title">{name}</h2></div><button type="button" className="quiet" aria-label="Close change artwork" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="goal-art-grid" role="radiogroup" aria-label="Artwork">
        {CARD_ARTS.map(a => <button key={a.id} type="button" role="radio" aria-checked={choice === a.id} className="goal-art-option" onClick={() => { setChoice(a.id); onPreview(a.id); }}><span className="goal-art-thumb"><SceneArt scene={a.id}/></span><span>{a.label}</span></button>)}
      </div>
      <div className="goal-art-foot">
        {message && <p role="status" className="fine">{message}</p>}
        <div className="goal-art-actions"><button type="button" className="secondary" onClick={() => dialog.current?.close()}>Cancel</button><button type="button" className="primary" disabled={!extras.loaded} onClick={save}>Save artwork</button></div>
      </div>
    </div>
  </dialog>, document.body);
}
