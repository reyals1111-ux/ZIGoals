'use client';
import {Suspense, useState, type ReactNode} from 'react';
import {LoadBoundary} from '../../load-boundary';
import {Skeleton} from '../../ui/skeleton';
import './compare.css';

/**
 * Session AK (lane S): a fold whose content's code loads only when the person opens it (a closed <details> renders
 * nothing inside, so its lazy() import is not fetched). A failed load stays inside the fold (LoadBoundary).
 */
export function OnDemandFold({summary, label, className = '', children, defaultOpen = false}: {summary: ReactNode; label: string; className?: string; children: ReactNode; defaultOpen?: boolean}) {
  const [open, setOpen] = useState(defaultOpen);
  return <details className={`panel ondemand-fold ${className}`.trim()} open={open || undefined} onToggle={event => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
    <summary className="ondemand-fold-summary">{summary}</summary>
    {open && <LoadBoundary label={label}><Suspense fallback={<Skeleton label={`Opening ${label}…`} block/>}>{children}</Suspense></LoadBoundary>}
  </details>;
}
