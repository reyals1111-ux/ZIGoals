'use client';
import {useEffect, useId, useState} from 'react';
import {getAppStorage} from '../../lib/showcase-storage';
import {readDeviceRecord, updateDeviceRecord} from '../../lib/device-record';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {POINT_TELL, POINT_TELL_KEY, setPointTellEnabled} from '../../lib/point-tell/store';

/** Session AB-Cloud Part 6 (ADR-023 C23): Settings → Help & diagnostics, the Point & tell switch. */
const enabled = () => { try { return readDeviceRecord(getAppStorage(), POINT_TELL).data.enabled === true; } catch { return false; } };
export function PointTellSetting() {
  const id = useId(), [on, setOn] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const read = () => setOn(enabled());
    const onStore = (event: Event) => { if ((event as CustomEvent<string>).detail === POINT_TELL_KEY) read(); };
    queueMicrotask(read);
    window.addEventListener(ZIGI_STORE_EVENT, onStore); window.addEventListener(ACCOUNT_CHANGE, read);
    return () => { window.removeEventListener(ZIGI_STORE_EVENT, onStore); window.removeEventListener(ACCOUNT_CHANGE, read); };
  }, []);
  const change = (value: boolean) => {
    try { updateDeviceRecord(getAppStorage(), POINT_TELL, r => setPointTellEnabled(r, value)); setOn(value); setError(''); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: POINT_TELL_KEY})); }
    catch { setError('The switch could not be saved in this browser.'); }
  };
  return <>
    <p>Point at any part of a page and leave a numbered note on it, then copy, download or email your notes. They stay on this device.</p>
    <label className="checkbox" htmlFor={id}><input id={id} type="checkbox" checked={on} onChange={e => change(e.target.checked)} />Show the Point &amp; tell button</label>
    <p className="fine">The pin button sits above the music button (above the tabs on phones). Tap it, then tap the part you mean; with a keyboard, Tab to the part and press Enter. Esc cancels.</p>
    {error && <p role="alert" className="alert">{error}</p>}
  </>;
}
