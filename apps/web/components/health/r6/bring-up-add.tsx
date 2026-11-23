'use client';
import {useState} from 'react';
import {getAppStorage} from '../../../lib/showcase-storage';
import {ZIGI_STORE_EVENT} from '../../../lib/ai/store/keys';
import {showStatus, showUndo} from '../../ui/undo-toast';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #417): "Bring this up at my next visit" — one tap adds a line to the list
 * kept for "Report for a visit" (`zigoals:bring-up:v1`), from a journal entry (its first sentence) or a feeling word,
 * with Undo and a link to the list. The record's code loads on the tap.
 */
export default function BringUpAdd({text, from, day, className = 'quiet'}: {text: string; from: 'journal' | 'checkin'; day: string; className?: string}) {
  const [said, setSaid] = useState('');
  async function add() {
    try {
      const {BRING_UP, BRING_UP_UNREADABLE, BRING_UP_UNREADABLE_UNDO, addBringUpIn, bringUpLineFrom, newBringUpId, takeBackBringUpIn} = await import('../../../lib/clinician-report/bring-up');
      const line = bringUpLineFrom(text), itemId = newBringUpId(), storage = getAppStorage(), tell = () => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: BRING_UP.key})); };
      // Review B6P-4: a list this device cannot read is never written over, in the add or in its Undo.
      if (!addBringUpIn(storage, {text: line, from, day}, itemId, new Date())) { setSaid(''); showStatus(BRING_UP_UNREADABLE, {tone: 'error'}); return; }
      tell();
      setSaid(`Added to “To bring up”: “${line}”.`);
      showUndo({message: `Added to your list to bring up at your next visit: “${line}”.`, restore: () => { if (!takeBackBringUpIn(storage, itemId)) return {undone: BRING_UP_UNREADABLE_UNDO}; tell(); return undefined; }, undone: 'The line is removed from your list.', link: {href: '/app/settings/data#report-visit-title', label: 'Open the list'}});
    } catch (cause) { setSaid(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); }
  }
  return <>
    <button type="button" className={className} onClick={() => void add()}>Bring this up at my next visit</button>
    <span className="sr-only" role="status" aria-live="polite">{said}</span>
  </>;
}
