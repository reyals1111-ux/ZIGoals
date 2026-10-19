'use client';
import {useState} from 'react';
import type {TimelineBlock} from '../../lib/timeline/build';
import {TimePicker, clockLabel, type BlockActions} from './timeline-block';

/**
 * The day's end (Session AF, L5b; P9.2, R7's Replan from Structured): from the wind-down time (else 20:00), what is still
 * open today — habits not done or skipped, planned meals not logged — each with its own choices: Done (or Log it), Skip
 * today (the habit's own "skipped", which never breaks a streak), or a later time. Nothing moves to tomorrow by itself.
 */
export function ReplanCard({leftovers, actions, busy}: {leftovers: readonly TimelineBlock[]; actions: BlockActions; busy: boolean}) {
  const [picking, setPicking] = useState<string | null>(null);
  if (!leftovers.length) return null;
  return <section className="panel timeline-replan" aria-labelledby="timeline-replan-title">
    <p className="eyebrow">The day’s end</p>
    <h2 id="timeline-replan-title">Still open today</h2>
    <p className="timeline-replan-lede">Nothing moves to tomorrow by itself. Choose for each one.</p>
    <ul className="timeline-replan-list">{leftovers.map(b => <li key={b.id} data-block={b.id}>
      <p><strong>{b.title}</strong><small>{b.start === null ? 'Any time' : clockLabel(b.start)}</small></p>
      <div className="timeline-actions">
        {b.action === 'habit-done' && <button type="button" className="primary" disabled={busy} onClick={() => actions.done(b)} aria-label={`Done: ${b.title}`}>Done</button>}
        {b.action === 'meal-log' && <button type="button" className="primary" disabled={busy} onClick={() => actions.log(b)} aria-label={`Log ${b.title}`}>Log it</button>}
        {b.kind === 'habit' && actions.skip && <button type="button" className="secondary" disabled={busy} onClick={() => actions.skip!(b)} aria-label={`Skip today: ${b.title}`}>Skip today</button>}
        <button type="button" className="quiet" aria-expanded={picking === b.id} onClick={() => setPicking(p => p === b.id ? null : b.id)} aria-label={`A later time for ${b.title}`}>Later today</button>
      </div>
      {picking === b.id && <TimePicker block={b} actions={actions} onClose={() => setPicking(null)} />}
    </li>)}</ul>
  </section>;
}
