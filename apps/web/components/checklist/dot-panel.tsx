'use client';
import Link from 'next/link';
import type {DerivedDot} from '../../lib/checklist/derive';
import {formatTime} from '../../lib/visual-format';

const PAGE: Record<string, string> = {habit: 'Habits', goal: 'its Goal', 'goal-step': 'its Goal', health: 'Health', custom: 'your path'};
/**
 * What a dot says when it is pressed and cannot simply be ticked (P7.10): a done dot's time and where its record lives
 * (with Undo for a tick made here, while this page is open); a refusal in the page's own words (a rest day, a closed
 * Goal, a record that is gone), with the way to its page.
 */
export function DotPanel({dot, message, canUndo, onUndo, onClose}: {dot: DerivedDot; message?: string; canUndo: boolean; onUndo: () => void; onClose: () => void}) {
  const page = PAGE[dot.kind] ?? 'its page', when = dot.doneAt ? formatTime(dot.doneAt) : null;
  return <div className="checklist-dot-panel" role="group" aria-label={`${dot.label}: details`}>
    {message ? <p role="alert">{message}</p> : <p><strong>{dot.state === 'done' ? 'Done' : dot.state === 'running' ? 'Running' : 'Waiting'}</strong>{when ? ` at ${when}` : ''}{dot.note ? ` · ${dot.note}` : ''}. {dot.kind === 'custom' ? 'Ticked on your path.' : `It lives on ${page}; the dot follows what ${page} says.`}</p>}
    <div className="checklist-dot-panel-actions">
      {canUndo && <button type="button" className="secondary" onClick={onUndo}>Undo this tick</button>}
      {dot.href && <Link className="quiet" href={dot.href}>Open {page === 'its Goal' ? 'the Goal' : page}</Link>}
      <button type="button" className="quiet" onClick={onClose}>Close</button>
    </div>
  </div>;
}
