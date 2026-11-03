'use client';
import {useId, useState} from 'react';
import {progressCardFileName, progressShareCard, type ProgressCardInput} from './progress-card-content';
import {plainErrorMessage} from '../../lib/plain-error';
import './progress-card.css';

/**
 * Session AK (6.3 / 8.5): share a goal's progress as an image made on this device (lib/share-image.ts: a 1080 × 1350
 * canvas, then the device's share sheet or a download; nothing is uploaded). The preview shows exactly the words the
 * image will carry: the title and the percentage, plus amounts or the date only when ticked (both off by default).
 * `draw`/`share` default to lib/share-image.ts, loaded only when the person taps, and can be replaced in tests.
 */
export function ProgressCard({goal, draw, share}: {
  goal: ProgressCardInput;
  draw?: (card: ReturnType<typeof progressShareCard>) => Promise<Blob>;
  share?: (blob: Blob, name: string, title: string) => Promise<'shared' | 'saved'>;
}) {
  const id = useId();
  const [showAmounts, setShowAmounts] = useState(false), [showDate, setShowDate] = useState(false);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState('');
  const card = progressShareCard(goal, {showAmounts, showDate});
  async function make() {
    setBusy(true); setStatus(''); setError('');
    try {
      const lib = draw && share ? null : await import('../../lib/share-image');
      const blob = await (draw ?? lib!.drawShareCard)(card);
      const how = await (share ?? lib!.shareOrSave)(blob, progressCardFileName(goal.title), card.title);
      setStatus(how === 'shared' ? 'Handed to your share sheet.' : 'Image saved to your downloads.');
    } catch (cause) { setError(plainErrorMessage(cause, 'The image could not be made.')); } finally { setBusy(false); }
  }
  return <section className="progress-card" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Share your progress</h3>
    <figure className="progress-card-preview" aria-label="What the image shows">
      <p className="progress-card-eyebrow">{card.eyebrow}</p>
      <p className="progress-card-title">{card.title}</p>
      {card.lines.map(line => <p key={line} className="progress-card-line">{line}</p>)}
      <figcaption className="progress-card-footer">ZIGoals · made on my device</figcaption>
    </figure>
    <fieldset className="progress-card-options"><legend>Include</legend>
      <label><input type="checkbox" checked={showAmounts} disabled={goal.current === null || goal.target === null} onChange={e => setShowAmounts(e.target.checked)}/>Amounts</label>
      <label><input type="checkbox" checked={showDate} disabled={!goal.date} onChange={e => setShowDate(e.target.checked)}/>Target date</label>
    </fieldset>
    <p className="progress-card-fine">Made on this device. Nothing is uploaded; you choose where it goes.</p>
    <div className="actions"><button type="button" className="primary" disabled={busy} onClick={() => void make()}>{busy ? 'Making the image…' : 'Save or share image'}</button></div>
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
export default ProgressCard;
