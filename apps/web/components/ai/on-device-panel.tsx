'use client';
import {useEffect, useState} from 'react';
import {availabilityLine, ON_DEVICE_DOWNLOAD_NOTE, onDeviceAvailability, onDeviceSession, type OnDeviceAvailability} from '../../lib/ai/on-device';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {zigiState} from '../zigi/bus';
import {Switch} from './ai-switch';
import {useDeviceRecord} from './use-device-record';
import './on-device.css';

/**
 * Settings → "Chrome's on-device model" (Session V Part 15): what Chrome says about its model here, the download (only
 * from this button: Chrome needs the click, and the model is large), and the switch that lets ZIGi use it while no AI is
 * connected. A read of the state downloads nothing.
 */
export default function OnDevicePanel() {
  const options = useDeviceRecord(AI_OPTIONS);
  const [state, setState] = useState<OnDeviceAvailability | null>(null), [progress, setProgress] = useState<number | null>(null), [note, setNote] = useState('');
  useEffect(() => { let live = true; void onDeviceAvailability().then(answer => { if (live) setState(answer); }); return () => { live = false; }; }, []);
  if (state === null) return <p className="ai-note" role="status">Asking Chrome…</p>;
  const download = async () => {
    setNote(''); setProgress(0); zigiState.set('loading-model');
    try {
      const session = await onDeviceSession({system: 'You are a helper. Reply with OK.', onProgress: setProgress});
      session.destroy(); setState('available'); setNote('Chrome’s model is ready on this computer.');
    } catch { setNote('Chrome could not get its model ready. It may need more free space; try again later.'); }
    finally { setProgress(null); if (zigiState.get() === 'loading-model') zigiState.set('idle'); }
  };
  const use = (on: boolean) => { try { options.update(current => ({...current, onDevice: on})); setNote(''); } catch { setNote('This choice could not be saved on this device.'); } };
  return <div className="ai-on-device">
    <p className="ai-note" role="status">{availabilityLine(state)}</p>
    {state === 'downloadable' && progress === null && <>
      <p className="ai-note">{ON_DEVICE_DOWNLOAD_NOTE}</p>
      <button type="button" className="secondary" onClick={() => void download()}>Download Chrome’s model</button>
    </>}
    {progress !== null && <div className="ai-on-device-progress"><progress max={1} value={progress} aria-label="Chrome’s model download"/><span>{Math.round(progress * 100)} %</span></div>}
    {state === 'available' && options.loaded && <Switch checked={options.data.onDevice === true} onChange={use} label="Use Chrome’s on-device model" note="While no AI is connected: short answers, rewording ZIGi’s brief, and understanding questions ZIGi’s lookups did not recognise. It runs inside Chrome on this computer; nothing is sent anywhere. Numbers always come from your records, never from the model."/>}
    {note && <p className="ai-note" role="status">{note}</p>}
  </div>;
}
