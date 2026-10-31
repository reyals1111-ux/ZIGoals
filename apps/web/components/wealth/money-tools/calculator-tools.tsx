'use client';
import {Suspense, lazy, useId, useState} from 'react';

/**
 * Session AK (lane M, items 12 and 18): two more planning tools beside the compound interest calculator. Each loads its
 * own chunk only when the person opens it, so the calculator page weighs what it did.
 */
const FeeDragPanel = lazy(() => import('./fee-drag-panel'));
const FiModelPanel = lazy(() => import('./fi-model-panel'));
export function CalculatorTools() {
  const id = useId(), [open, setOpen] = useState<'fee' | 'fi' | null>(null);
  return <section className="panel money-calc-tools" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>More planning tools</h2>
    <p className="fine">Estimates from the numbers you choose; returns are not guaranteed and nothing here is advice.</p>
    <div className="money-tools-buttons" role="group" aria-label="More planning tools" style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
      <button type="button" className="secondary" style={{minHeight: 44}} aria-expanded={open === 'fee'} aria-controls={`${id}-panel`} onClick={() => setOpen(o => o === 'fee' ? null : 'fee')}>What a yearly fee costs</button>
      <button type="button" className="secondary" style={{minHeight: 44}} aria-expanded={open === 'fi'} aria-controls={`${id}-panel`} onClick={() => setOpen(o => o === 'fi' ? null : 'fi')}>Financial freedom</button>
    </div>
    <div id={`${id}-panel`}><Suspense fallback={<p className="fine">Loading…</p>}>{open === 'fee' && <FeeDragPanel/>}{open === 'fi' && <FiModelPanel/>}</Suspense></div>
  </section>;
}
