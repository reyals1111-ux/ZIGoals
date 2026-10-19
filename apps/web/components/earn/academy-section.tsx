'use client';
import {Suspense, lazy, useCallback, useEffect, useState} from 'react';
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
  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);
  const data: EarnAcademy = record.unreadable ? {version: 1} : record.data;
  const passed = ACADEMY_LESSON_IDS.filter(id => data.lessons?.[id]?.passedAt).length;
  const update = useCallback((change: (current: EarnAcademy) => EarnAcademy) => { try { record.update(change); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } }, [record]);
  return <section id="academy" className="earn-academy panel" aria-labelledby="academy-title" data-passed={passed}>
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
