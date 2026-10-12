'use client';
import {Suspense, lazy} from 'react';
import {ZigiPartBoundary} from './part-boundary';
import {knockLines, SNOOZE_LABELS, type KnockCandidate, type SnoozeChoice} from '../../lib/ai/knock/rules';
import {isShowcase} from '../../lib/showcase-storage';
import {ZigiAvatar} from './zigi-avatar';
const KnockCheckIn = lazy(() => import('./knock-check-in'));
/**
 * The knock as the person sees it (Session AA-Local Gate A, ADR-022 B41): the markup of Sessions W–Z's knock, moved verbatim
 * into a chunk that loads only when a knock is due, so the shell carries none of it. Every decision stays in knock.tsx.
 */
export function KnockView({current, phone, side, titleId, mode, note, choices, onDoIt, onSnoozeMode, onBack, onNotToday, onSnooze, onDismiss, onNavigate}: {
  current: KnockCandidate; phone: boolean; side: 'right' | 'left'; titleId: string; mode: 'ask' | 'snooze' | 'check-in'; note: string; choices: readonly SnoozeChoice[];
  onDoIt: () => void; onSnoozeMode: () => void; onBack: () => void; onNotToday: () => void; onSnooze: (choice: SnoozeChoice) => void; onDismiss: () => void; onNavigate: () => void;
}) {
  const lines = knockLines(current);
  return <section className={`zigi-knock${phone ? ' zigi-knock-phone' : ''}`} data-side={side} aria-labelledby={titleId}>
    <div className="zigi-knock-head">
      <ZigiAvatar state="reminder" size={44} decorative/>
      <div className="zigi-knock-copy">
        {isShowcase() && <p className="zigi-knock-label">Showcase · fictional</p>}
        <h2 id={titleId}>{lines.title}</h2>
        <p>{lines.line}</p>
      </div>
      <button type="button" className="zigi-knock-close" aria-label="Close ZIGi's reminder" onClick={onDismiss}>×</button>
    </div>
    <p className="zigi-knock-live" role="status">{`ZIGi: ${lines.title}. ${lines.line}.`}</p>
    {mode === 'ask' && <div className="zigi-knock-actions">
      <button type="button" className="primary" onClick={onDoIt}>{current.kind === 'habit' ? 'Do it now' : lines.action}</button>
      <button type="button" className="secondary" onClick={onSnoozeMode}>Snooze</button>
      <button type="button" className="quiet" onClick={onNotToday}>Not today</button>
    </div>}
    {mode === 'snooze' && <div className="zigi-knock-actions" role="group" aria-label="Snooze for">
      {choices.map(choice => <button key={choice} type="button" className="secondary" onClick={() => onSnooze(choice)}>{SNOOZE_LABELS[choice]}</button>)}
      <button type="button" className="quiet" onClick={onBack}>Back</button>
    </div>}
    {mode === 'check-in' && <ZigiPartBoundary label="The check-in"><Suspense fallback={<p className="ai-note" role="status">Loading…</p>}><KnockCheckIn habitId={current.id} title={current.title} onNavigate={onNavigate}/></Suspense></ZigiPartBoundary>}
    {note && <p role="alert" className="zigi-knock-note">{note}</p>}
  </section>;
}
