'use client';
import {lazy, Suspense, useState} from 'react';
import {LoadBoundary} from '../load-boundary';
import {Skeleton} from '../ui/skeleton';
import {SectionHeading} from '../ui/section-heading';

const ReportBuilder = lazy(() => import('./report-builder'));
/**
 * Session AK (lane S, item 14): Settings → Your data → "Report for a visit". One button here; the form, the report and
 * its charts load when it is pressed. Everything is made on this device from records already here.
 */
export function ReportLauncher() {
  const [open, setOpen] = useState(false);
  return <section className="panel report-launcher" aria-labelledby="report-visit-title">
    <SectionHeading id="report-visit-title" eyebrow="Settings · your data" title="Report for a visit" lede="A printable summary of your own log (sleep, mood and energy, notes, weight, habits) for a doctor or another health professional. You choose the dates and the parts; you print it or save it as a PDF. Nothing is uploaded."/>
    {open ? <LoadBoundary label="The report"><Suspense fallback={<Skeleton label="Opening the report…"/>}><ReportBuilder/></Suspense></LoadBoundary>
      : <button type="button" className="secondary" onClick={() => setOpen(true)}>Make a report</button>}
  </section>;
}
