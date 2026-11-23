'use client';
import {lazy, Suspense, useEffect, useState} from 'react';
import {LoadBoundary} from '../load-boundary';
import {Skeleton} from '../ui/skeleton';
import {SectionHeading} from '../ui/section-heading';

const ReportBuilder = lazy(() => import('./report-builder'));
// Session AV lane 2, round 6 (r6-body; LEDGER #417): the lines to bring up at the next visit, loaded when the fold opens.
const BringUpList = lazy(() => import('./bring-up-list'));
/**
 * Session AK (lane S, item 14): Settings → Your data → "Report for a visit". One button here; the form, the report and
 * its charts load when it is pressed. Everything is made on this device from records already here.
 */
export function ReportLauncher() {
  const [open, setOpen] = useState(false), [listOpen, setListOpen] = useState(false);
  useEffect(() => { if (location.hash === '#report-visit-title') setListOpen(true); }, []);
  return <section className="panel report-launcher" aria-labelledby="report-visit-title">
    <SectionHeading id="report-visit-title" eyebrow="Settings · your data" title="Report for a visit" lede="A printable summary of your own log (sleep, mood and energy, notes, weight, habits, your numbers, symptoms, supplements and medication) for a doctor or another health professional. You choose the dates and the parts; you print it or save it as a PDF. Nothing is uploaded."/>
    {open ? <LoadBoundary label="The report"><Suspense fallback={<Skeleton label="Opening the report…"/>}><ReportBuilder/></Suspense></LoadBoundary>
      : <button type="button" className="secondary" onClick={() => setOpen(true)}>Make a report</button>}
    <details className="report-bring-up-fold" open={listOpen} onToggle={e => setListOpen((e.currentTarget as HTMLDetailsElement).open)}><summary className="fold-summary">To bring up at your next visit</summary>{listOpen && <LoadBoundary label="Your list"><Suspense fallback={<p className="fine">Opening…</p>}><BringUpList/></Suspense></LoadBoundary>}</details>
  </section>;
}
