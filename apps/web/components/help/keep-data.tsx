'use client';
import {useEffect, useState} from 'react';
import {browserStorage, readKeep, requestKeep, type KeepRequest, type KeepState} from '../../lib/install/persist';

const ON_VIEW: Record<KeepState, string> = {
  kept: 'Your browser already keeps ZIGoals’ data on this device.',
  'not-kept': 'Your browser hasn’t promised this yet.',
  unsupported: 'This browser can’t make this promise. Installing ZIGoals and opening it regularly still helps.',
  unknown: '',
};
const AFTER_TAP: Record<KeepRequest, string> = {
  kept: 'Done. Your browser will keep ZIGoals’ data on this device unless someone clears it.',
  'not-kept': 'Your browser didn’t promise this for now. It decides by itself, based on how you use ZIGoals. Installing ZIGoals on your Home Screen and opening it regularly helps.',
  unsupported: ON_VIEW.unsupported,
  unknown: '',
  error: 'Your browser didn’t answer. Nothing changed; you can try again later.',
};

/**
 * "Keep my data on this device" (Session L): asks for persistent storage only when tapped (owner decision L3). On view
 * it only reads the current state: no prompt, no write.
 */
export function KeepData() {
  const [state, setState] = useState<KeepState | null>(null), [answer, setAnswer] = useState<KeepRequest | null>(null), [busy, setBusy] = useState(false);
  useEffect(() => { let live = true; void readKeep(browserStorage()).then(value => { if (live) setState(value); }); return () => { live = false; }; }, []);
  async function keep() {
    setBusy(true);
    try { const value = await requestKeep(browserStorage()); setAnswer(value); if (value === 'kept' || value === 'not-kept' || value === 'unsupported') setState(value); }
    finally { setBusy(false); }
  }
  const message = answer ? AFTER_TAP[answer] : state ? ON_VIEW[state] : '';
  return <div className="keep-data">
    <p>Ask your browser to keep ZIGoals&rsquo; data on this device, even when space runs low. One tap; nothing leaves your device.</p>
    <button type="button" className="primary" disabled={busy || state === 'unsupported'} onClick={() => void keep()}>Keep my data on this device</button>
    <p className="help-status" role="status">{message}</p>
    <p className="fine">This keeps your browser from clearing ZIGoals&rsquo; data when the device runs low on space. It doesn&rsquo;t stop anyone using this device from clearing site data. Safari can also clear the data of sites that haven&rsquo;t been used for a while, so opening ZIGoals regularly matters too.</p>
  </div>;
}
