'use client';
import {Suspense, useState, type ReactNode} from 'react';
import {LoadBoundary} from '../load-boundary';

/**
 * Session AV lane 2 (journal): a fold inside a Journal panel whose content loads only when it is opened (a closed
 * <details> renders nothing inside, so the lazy() part is not fetched), with the Journal's disclosure marker and a
 * 44 px summary. A failed load stays inside the fold.
 */
export function JournalFold({summary, label, className = '', children, open: startOpen = false, id}: {summary: ReactNode; label: string; className?: string; children: ReactNode; open?: boolean; id?: string}) {
  const [open, setOpen] = useState(startOpen);
  return <details id={id} className={`journal-fold ${className}`.trim()} open={open || undefined} onToggle={event => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
    <summary>{summary}</summary>
    {open && <LoadBoundary label={label}><Suspense fallback={<p className="fine">Opening {label}…</p>}>{children}</Suspense></LoadBoundary>}
  </details>;
}
