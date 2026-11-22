'use client';
import {createPortal} from 'react-dom';
import './routine-card.css';

/**
 * Session AV lane 2 (habits; LEDGER #183, Fabulous's Picture-in-Picture routine progress): the running routine in a
 * small always-on-top window of this tab (Document Picture-in-Picture, lib/ai/pip.ts, opened by the player's "Small
 * window" tap; Chrome and Edge on computers, where the browser has it): the routine, the step, its timer, Done and Skip
 * — the same actions as the player, which stays in the tab. "Back to the tab" closes it. The Lock Screen's Live Activity
 * and Dynamic Island stay native-only. The window's document has the page's styles, a title and its language (set by the
 * player when it opened).
 */
export default function RoutinePip({win, title, stepLine, step, timer, busy, last, onDone, onSkip, onBack}: {win: Window; title: string; stepLine: string; step: string; timer: string | null; busy: boolean; last: boolean; onDone: () => void; onSkip: () => void; onBack: () => void}) {
  return createPortal(<main className="routine-pip" aria-labelledby="routine-pip-step">
    <p className="eyebrow">{title} · {stepLine}</p>
    <h1 id="routine-pip-step" className="routine-pip-step">{step}</h1>
    {timer && <p className="routine-pip-timer" role="timer" aria-live="off">{timer}</p>}
    <div className="actions">
      <button type="button" className="primary" disabled={busy} onClick={onDone}>{busy ? 'Saving…' : last ? 'Done · finish' : 'Done · next'}</button>
      <button type="button" className="quiet" disabled={busy} onClick={onSkip}>Skip</button>
      <button type="button" className="quiet" onClick={onBack}>Back to the tab</button>
    </div>
  </main>, win.document.body);
}
