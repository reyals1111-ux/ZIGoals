'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {checklistPrefsOf} from '../../lib/ui-prefs/schema';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {CHECKLIST_ROUTE} from '../../lib/af-checklist-keys';
import '../checklist/checklist-setting.css';

/**
 * Session AF (L3; P7.19, ADR-028 H27, H72): the Checklist button's switch, on this device — the lead mounts it in
 * Settings beside "Your pages & buttons". On by default; off hides the floating button and Today's Checklist card on
 * this device, and the page stays reachable from the navigation. A display choice in `zigoals:ui-prefs:v1` (`checklist`),
 * never in the synced pages record (older builds read that record strictly).
 */
export function AfChecklistSection() {
  const prefs = useUiPrefs(), [error, setError] = useState('');
  const on = checklistPrefsOf(prefs.data).launcher, usable = prefs.loaded && !prefs.unreadable;
  return <div className="af-checklist-setting">
    <label className="af-checklist-setting-row"><input type="checkbox" role="switch" checked={usable && on} disabled={!usable} onChange={e => { try { prefs.update(p => ({...p, checklist: {...(p.checklist ?? {}), launcher: e.target.checked}})); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } }}/>
      <span><strong>Checklist button and Today card — on this device</strong><small>Today’s path of starred dots, one tap away above ZIGi on a computer and on Today. Off, the Checklist stays in the menu.</small></span>
    </label>
    <p className="fine"><Link className="text-link" href={CHECKLIST_ROUTE}>Open the Checklist →</Link></p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
