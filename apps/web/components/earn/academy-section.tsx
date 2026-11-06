'use client';
import {Suspense, lazy, useCallback, useEffect, useRef, useState} from 'react';
import {ACADEMY_LESSON_IDS} from '../../lib/earn/academy-ids';
import {EARN_ACADEMY, type EarnAcademy} from '../../lib/earn/records';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {useDeviceRecord} from '../ai/use-device-record';
import {LoadBoundary} from '../load-boundary';
import {SectionHeading} from '../ui/section-heading';

const AcademyPath = lazy(() => import('./academy-path'));
/**
 * Session AF chunk 2 (P1.27): the Earn Academy's place on the Earn page. The heading and the progress are on the page at
 * once; the lessons and the mini path are their own chunk, loaded after the first paint. Progress is `zigoals:earn-academy:v1`
 * on this device (never synced); passing a lesson earns XP only while the game layer is on (derived, never stored).
 */
const TITLES: Record<string, string> = {staking: 'Staking', 'apr-apy': 'APR and APY', unbonding: 'Unbonding', 'liquid-staking': 'Liquid staking', pools: 'Pools and impermanent loss', custody: 'Copy trading and custody', scams: 'Spotting scams', fees: 'Gas and fees'};
export function AcademySection() {
  const record = useDeviceRecord(EARN_ACADEMY);
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const section = useRef<HTMLElement>(null);
  // Session AL (D9): the mini path (its chunk and the path engine's measuring, which lays out this far section) loads when
  // the Academy comes within about a screen of view (a scroll, a chip, a #academy link), not during the page's first load.
  // Until then the same eight lessons show as the plain list below; a browser without IntersectionObserver loads it at once.
  // CI20 (CI 1561 and 1575, WebKit at 390 px, /app/earn in the Showcase: the plain list was still there after a scroll to
  // the page's end, and no request for the path's chunk was made): an observer reports only while its target is inside its
  // margin, so a scroll that carries the Academy from below that band to above it between two of the browser's checks
  // (the sections above it lay out as they near and change height) is never reported. Reached counts too: any scroll that
  // leaves the Academy's top within about a screen of the bottom edge, or above it, loads the path, so the path is always
  // drawn once the Academy has been reached, in every engine. A plain load at the top still shows the list (D9); the check
  // runs on scrolls and resizes only (the observer's first report covers the mount), so the first load measures nothing.
  useEffect(() => {
    const node = section.current;
    if (!node || typeof IntersectionObserver !== 'function') { queueMicrotask(() => setReady(true)); return; }
    let done = false;
    const load = () => { if (done) return; done = true; setReady(true); observer.disconnect(); document.removeEventListener('scroll', reached, true); window.removeEventListener('resize', reached); };
    const reached = () => { if (node.getBoundingClientRect().top < innerHeight + 900) load(); };
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) load(); }, {rootMargin: '900px 0px'});
    observer.observe(node);
    document.addEventListener('scroll', reached, {capture: true, passive: true});
    window.addEventListener('resize', reached, {passive: true});
    return () => { done = true; observer.disconnect(); document.removeEventListener('scroll', reached, true); window.removeEventListener('resize', reached); };
  }, []);
  const data: EarnAcademy = record.unreadable ? {version: 1} : record.data;
  const passed = ACADEMY_LESSON_IDS.filter(id => data.lessons?.[id]?.passedAt).length;
  const update = useCallback((change: (current: EarnAcademy) => EarnAcademy) => { try { record.update(change); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } }, [record]);
  return <section ref={section} id="academy" className="earn-academy panel" aria-labelledby="academy-title" data-passed={passed}>
    <SectionHeading id="academy-title" eyebrow="Earn Academy · five minutes a lesson" title="Learn it before you earn it"
      lede="Eight short lessons in plain words, each with three questions. Press a dot to open a lesson. Your answers stay on this device."/>
    <p className="earn-start-progress" aria-live="polite"><b>{passed} of 8 lessons passed</b></p>
    {ready
      ? <LoadBoundary label="The Earn Academy"><Suspense fallback={<AcademyList data={data}/>}><AcademyPath record={data} update={update} error={error}/></Suspense></LoadBoundary>
      : <AcademyList data={data}/>}
  </section>;
}
function AcademyList({data}: {data: EarnAcademy}) {
  return <ol className="earn-start-list">{ACADEMY_LESSON_IDS.map(id => <li key={id} data-lesson={id} data-done={data.lessons?.[id]?.passedAt ? true : undefined}><b>{TITLES[id]}</b>{data.lessons?.[id]?.passedAt ? <span className="fine"> · passed</span> : null}</li>)}</ol>;
}
