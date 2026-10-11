'use client';
import {updateDeviceRecord} from '../../lib/device-record';
import {ZIGI} from '../../lib/ai/store/records';
import {ZIGI_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';
import {useDeviceRecord} from './use-device-record';
import './chat-polish.css';

/**
 * First-run tips in ZIGi's empty chat (Session V Part 10): three short lines until the person dismisses them, once per
 * device (`zigoals:zigi:v1` tipsSeen). Nothing is written on view; "Got it" is the only write.
 */
export const TIPS_ID = 'chat-v1';
export const TIPS = ['Type / for commands such as /log or /remember.', 'Press ? (outside the message box) for keyboard shortcuts.', 'ZIGi writes nothing by itself: every change comes as a card you add.'] as const;
export function FirstRunTips() {
  const zigi = useDeviceRecord(ZIGI);
  if (!zigi.loaded || zigi.data.tipsSeen?.includes(TIPS_ID)) return null;
  const dismiss = () => {
    try { updateDeviceRecord(getAppStorage(), ZIGI, current => ({...current, tipsSeen: [...(current.tipsSeen ?? []).filter(t => t !== TIPS_ID), TIPS_ID].slice(-20)})); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: ZIGI_KEY})); }
    catch { /* the tips stay; nothing else changes */ }
  };
  return <aside className="ai-tips" aria-label="Tips">
    <ul>{TIPS.map(tip => <li key={tip}>{tip}</li>)}</ul>
    <button type="button" className="text-link" onClick={dismiss}>Got it</button>
  </aside>;
}
