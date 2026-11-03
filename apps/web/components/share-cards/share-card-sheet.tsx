'use client';
import {useId, useState} from 'react';
import type {ShareCardSpec} from '../../lib/share-cards/kinds';
import {plainErrorMessage} from '../../lib/plain-error';
import './share-cards.css';

/**
 * Session AK Part 8.5: the one share-card sheet. `build` makes the card's words for the current choice (lib/share-cards);
 * the preview shows exactly what the image will carry. Sensitive numbers (amounts, weight, Health values) are off until
 * the person ticks the box, which only shows when there is something for it to add. A Showcase card says "Example". The
 * renderer (lib/share-cards/render.ts) loads only on the tap; nothing is uploaded.
 */
export default function ShareCardSheet({build, heading = 'Share as an image', onClose}: {build: (o: {sensitive: boolean}) => ShareCardSpec; heading?: string; onClose?: () => void}) {
  const id = useId(), [sensitive, setSensitive] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState('');
  const card = build({sensitive});
  async function make() {
    setBusy(true); setStatus(''); setError('');
    try {
      const {makeAndShare} = await import('../../lib/share-cards/render');
      const how = await makeAndShare(card);
      setStatus(how === 'shared' ? 'Handed to your share sheet.' : 'Image saved to your downloads.');
    } catch (cause) { setError(plainErrorMessage(cause, 'The image could not be made on this device.')); } finally { setBusy(false); }
  }
  return <section className="share-sheet" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{heading}</h3>
    <div className="share-sheet-body">
      <figure className="share-sheet-preview" aria-label="What the image shows">
        <p className="share-sheet-eyebrow">{card.eyebrow}</p>
        <p className="share-sheet-title">{card.title}</p>
        {card.lines.map(line => <p key={line} className="share-sheet-line">{line}</p>)}
        <figcaption className="share-sheet-footer">{card.footer}</figcaption>
      </figure>
      <div className="share-sheet-side">
        {card.hasSensitive && <label><input type="checkbox" checked={sensitive} onChange={e => setSensitive(e.target.checked)}/>Include numbers: amounts, weight and Health values</label>}
        <p className="fine">{card.hasSensitive ? 'Off by default, so an image never carries your amounts or Health values unless you choose. ' : ''}Made on this device. Nothing is uploaded; you choose where it goes.{card.example ? ' This card is from the Showcase, so it says Example.' : ''}</p>
        <div className="actions">
          <button type="button" className="primary" disabled={busy} onClick={() => void make()}>{busy ? 'Making the image…' : 'Save or share image'}</button>
          {onClose && <button type="button" className="quiet" onClick={onClose}>Close</button>}
        </div>
        {status && <p role="status" className="fine">{status}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  </section>;
}
