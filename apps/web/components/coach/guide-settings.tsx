'use client';
import {useState} from 'react';
import {GUIDE_LABEL} from '../../lib/coach/copy';
import {localDate} from '../../lib/local-date';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {useGuide} from './use-guide';
import './guide.css';

/** Settings → "Guide on this device" (ADR-011): one switch, off by default; what it reads; where it appears. */
export function GuideSettings() {
  const guide = useGuide();
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const enabled = guide.loaded && !guide.unreadable && guide.data.enabled;
  const toggle = () => {
    setMessage(null);
    try { const next = guide.setEnabled(!enabled, localDate()); setMessage({text: next.enabled ? 'The Guide is on for this device. Its first note appears on Today when there is something to say.' : 'The Guide is off on this device.'}); }
    catch (error) { setMessage({text: `The choice was not saved on this device. ${deviceSettingFailureMessage(error)}`, failed: true}); }
  };
  return <section className="panel guide-settings" id="guide" aria-labelledby="guide-title">
    <p className="eyebrow">GUIDE</p>
    <h2 id="guide-title">Guide on this device.</h2>
    <p>Reads only what you record here, on this device. Nothing is sent anywhere. Turn it off any time.</p>
    <p className="fine">When it is on, Today shows at most one short note a day from your own records, labelled &ldquo;{GUIDE_LABEL}&rdquo;, and your weekly review gets a one-paragraph summary of the week&rsquo;s counts. It never gives money or medical advice, never moves anything, and has no memory beyond this device&rsquo;s records.</p>
    <div className="guide-switch">
      <button type="button" role="switch" aria-checked={enabled} aria-label="Guide on this device" className={enabled ? 'primary' : 'secondary'} disabled={!guide.loaded} onClick={toggle}>{enabled ? 'On' : 'Off'}</button>
      <span className="guide-switch-state">{!guide.loaded ? 'Checking…' : guide.unreadable ? 'This device’s choice could not be read; the switch replaces it.' : enabled ? 'On for this device.' : 'Off, as it starts.'}</span>
    </div>
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </section>;
}
