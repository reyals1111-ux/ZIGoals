'use client';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {CARD_ARTS, type CardArt} from '../../lib/card-art/catalog';
import {saveCardArt} from '../../lib/card-art/save';
import {SceneArt} from '../scene-art';
import './goal-art-picker.css';

/**
 * Session AB-Design (owner request 17): "Change artwork" — a picker of the fifteen drawn scenes for one goal card. The
 * choice previews at once; Save goes through AB-Cloud's `setGoalCardArt` (lib/card-art/save.ts) and says "Soon" while
 * that mutator has not landed. The card's size and proportions never change: only the scene inside its art band.
 */
export default function GoalArtPicker({goalKey, name, current, onClose, onPreview}: {goalKey: string; name: string; current: CardArt; onClose: () => void; onPreview: (art: CardArt | null) => void}) {
  const dialog = useRef<HTMLDialogElement>(null), [choice, setChoice] = useState<CardArt>(current), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  const close = () => { onPreview(null); onClose(); };
  async function save() {
    if (!saveCardArt) { setMessage('Saving your artwork arrives with the next release ("Soon"); the preview is yours until you close this.'); return; }
    setBusy(true); setMessage('');
    try { await saveCardArt(goalKey, choice); onClose(); } catch (e) { setMessage(e instanceof Error && e.message ? e.message : 'Could not save the artwork on this device.'); } finally { setBusy(false); }
  }
  return createPortal(<dialog ref={dialog} className="goal-art-dialog" aria-labelledby="goal-art-title" onClose={close} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
    <div className="goal-art-card">
      <div className="goal-art-head"><div><p className="eyebrow">Change artwork</p><h2 id="goal-art-title">{name}</h2></div><button type="button" className="quiet" aria-label="Close change artwork" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="goal-art-grid" role="radiogroup" aria-label="Artwork">
        {CARD_ARTS.map(a => <button key={a.id} type="button" role="radio" aria-checked={choice === a.id} className="goal-art-option" onClick={() => { setChoice(a.id); onPreview(a.id); }}><span className="goal-art-thumb"><SceneArt scene={a.id}/></span><span>{a.label}</span></button>)}
      </div>
      <div className="goal-art-foot">
        {message && <p role="status" className="fine">{message}</p>}
        <div className="goal-art-actions"><button type="button" className="secondary" onClick={() => dialog.current?.close()}>Cancel</button><button type="button" className="primary" disabled={busy} onClick={() => void save()}>{saveCardArt ? 'Save artwork' : 'Save · Soon'}</button></div>
      </div>
    </div>
  </dialog>, document.body);
}
