'use client';
import {Suspense, lazy} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {TemplatesGlyph} from '../header-art/glyphs/templates';
import {useDeviceRecord} from '../ai/use-device-record';
import {useLocalToday} from '../use-local-today';
import {GUIDED_JOURNEYS} from '../../lib/guided/schema';
import './guided.css';
import '../skeleton/zg-skeleton.css';

// Session AW Part 2 (speed, attempt 2): the page's body (components/guided/guided-body.tsx), asked for as soon as the page
// runs in a browser, so it arrives while the record is read; the skeleton below stands in until both are there.
const bodyChunk = typeof window === 'undefined' ? null : import('./guided-body');
const GuidedBody = lazy(() => bodyChunk ?? import('./guided-body'));

/**
 * /app/guided (Session AJ, item 34, D13, A7): Guided journeys. The person chooses a short program (nothing here
 * recommends one); one step opens each day from the day they started, with a short note and a link that opens the app's
 * own flow. The person ticks a step done themselves; nothing is created for them. Kept on this device
 * (`zigoals:guided-journeys:v1`). No animation beyond a short colour change, and none under reduced motion or Motion Off.
 */
export function GuidedView() {
  const record = useDeviceRecord(GUIDED_JOURNEYS), today = useLocalToday();
  const skeleton = <div className="aa-skeleton zg-skeleton" aria-hidden="true"><i /><i /><i /></div>;
  return <div className="guided-page">
    <PageHeader className="page-heading guided-hero" titleId="guided-title" eyebrow="Guided journeys" title="Small steps, one a day"
      lede="Short journeys and written programmes, built from the app’s own places. Choose one if you like: each day opens a step or a few, with a short note and a link to do it. You tick it done yourself, and nothing is added for you."
      art={<OrbitArt glyph={TemplatesGlyph} spin={-26} />} />
    {!record.loaded ? skeleton : <Suspense fallback={skeleton}><GuidedBody record={record} today={today} /></Suspense>}
  </div>;
}
