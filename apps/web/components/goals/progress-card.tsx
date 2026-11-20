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
  // Session AV (Part 4b, CS-5): the reasons an option is unavailable, named once so the toggle and its note agree.
  const noAmounts = goal.current === null || goal.target === null, noDate = !goal.date;
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
      {/* Session AV (Part 4b, CS-5): a disabled option says why beside it, linked by aria-describedby. */}
      <div>
        <label><input type="checkbox" checked={showAmounts} disabled={noAmounts} aria-describedby={noAmounts ? `${id}-no-amounts` : undefined} onChange={e => setShowAmounts(e.target.checked)}/>Amounts</label>
        {noAmounts && <span id={`${id}-no-amounts`} className="fine"> {goal.target === null ? 'No target amount on this goal' : 'No current amount on this goal yet'}</span>}
      </div>
      <div>
        <label><input type="checkbox" checked={showDate} disabled={noDate} aria-describedby={noDate ? `${id}-no-date` : undefined} onChange={e => setShowDate(e.target.checked)}/>Target date</label>
        {noDate && <span id={`${id}-no-date`} className="fine"> No target date on this goal</span>}
      </div>
    </fieldset>
    <p className="progress-card-fine">Made on this device. Nothing is uploaded; you choose where it goes.</p>
    <div className="actions"><button type="button" className="primary" disabled={busy} onClick={() => void make()}>{busy ? 'Making the image…' : 'Save or share image'}</button></div>
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
export default ProgressCard;
