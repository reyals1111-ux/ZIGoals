'use client';
import {Suspense, lazy, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {CYCLE, cycleOn} from '../../lib/cycle/store';
import {LoadBoundary} from '../load-boundary';
import {Skeleton} from '../ui/skeleton';

const CycleLog = lazy(() => import('./cycle-log'));

/**
 * Session AK (BUILD list 2 #16, lane G1a): the cycle log's place in Health — nothing at all until the person turns it
 * on (Settings → Your pages & buttons → Cycle log); then one fold whose log loads when opened.
 */
export default function CycleEntry({today}: {today: string}) {
  const rec = useDeviceRecord(CYCLE), [open, setOpen] = useState(false);
  if (!rec.loaded || rec.unreadable || !cycleOn(rec.data)) return null;
  return <details className="panel cycle-fold" id="cycle-log" onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
    <summary style={{minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer'}}>Cycle log</summary>
    {open && <LoadBoundary quiet><Suspense fallback={<Skeleton label="Opening…"/>}><CycleLog today={today}/></Suspense></LoadBoundary>}
  </details>;
}
