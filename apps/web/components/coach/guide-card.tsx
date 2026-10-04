'use client';
import Link from 'next/link';
import {useState} from 'react';
import {GUIDE_LABEL} from '../../lib/coach/copy';
import type {Nudge} from '../../lib/coach/guide';
import {isShowcase} from '../../lib/showcase-storage';
import './guide.css';

/**
 * Today's Guide card (ADR-011): one nudge a day from the person's own records, always labelled. "Not today" hides
 * this nudge until tomorrow (longer for a streak or an insight); "Turn off the Guide" goes to the switch in Settings.
 */
export function GuideCard({nudge, today, onNotToday}: {nudge: Nudge; today: string; onNotToday: (id: string, today: string) => void}) {
  const [error, setError] = useState('');
  return <article className="panel for-you-card guide-card" aria-label="Guide">
    <p className="eyebrow">{GUIDE_LABEL}</p>
    <h2>{nudge.heading}</h2>
    <p className="guide-body">{nudge.body}{isShowcase() && <> <span className="fine">Showcase example.</span></>}</p>
    <div className="actions">
      {nudge.action && <Link className="secondary" href={nudge.action.href}>{nudge.action.label}</Link>}
      <button type="button" className="quiet" onClick={() => { setError(''); try { onNotToday(nudge.id, today); } catch (e) { setError(e instanceof Error ? e.message : 'This note could not be hidden on this device.'); } }}>Not today</button>
      <Link className="guide-off" href="/app/settings#guide">Turn off the Guide</Link>
    </div>
    {error && <p role="alert">{error}</p>}
  </article>;
}
