'use client';
import {Suspense, lazy, useEffect, useState} from 'react';
import {getAppStorage} from '../../lib/showcase-storage';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {POINT_TELL_KEY} from '../../lib/ab-cloud-device-keys';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';

/**
 * Session AB-Cloud Part 6 (ADR-023 C23): the shell's one Point & tell mount. It reads only whether the switch is on
 * (one storage read, no schema) and loads the feedback mode's code only then, so no page carries it while it is off.
 */
const PointTell = lazy(() => import('./point-tell').then(m => ({default: m.PointTell})));
function enabled(): boolean { try { const raw = getAppStorage().getItem(POINT_TELL_KEY); return raw !== null && JSON.parse(raw)?.enabled === true; } catch { return false; } }
export function PointTellMount() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => setOn(enabled());
    const onStore = (event: Event) => { if ((event as CustomEvent<string>).detail === POINT_TELL_KEY) read(); };
    queueMicrotask(read);
    window.addEventListener(ZIGI_STORE_EVENT, onStore); window.addEventListener('storage', read); window.addEventListener(ACCOUNT_CHANGE, read);
    return () => { window.removeEventListener(ZIGI_STORE_EVENT, onStore); window.removeEventListener('storage', read); window.removeEventListener(ACCOUNT_CHANGE, read); };
  }, []);
  return on ? <Suspense fallback={null}><PointTell /></Suspense> : null;
}
