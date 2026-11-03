'use client';
import Link from 'next/link';
import {AI_MEMORY, AI_OPTIONS} from '../../../../lib/ai/store/records';
import {checkMemory} from '../../../../lib/nova/setup-checks';
import {deviceSettingFailureMessage} from '../../../../lib/storage-error-copy';
import {useState} from 'react';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {CheckRow} from '../check-row';
import type {SetupState} from '../use-setup';

/** Planet 6: what NOVA may remember (ZIGi's own notes, one memory for both), and how to review and forget. */
export default function MemoryStep({setup}: {setup: SetupState}) {
  const options = useDeviceRecord(AI_OPTIONS), memory = useDeviceRecord(AI_MEMORY), [error, setError] = useState('');
  const on = options.data.useNotes !== false, count = memory.data.notes?.length ?? 0;
  const set = (value: boolean) => { try { options.update(c => ({...c, useNotes: value})); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } };
  return <>
    <p>NOVA remembers only what you choose: notes you write, or a “Remember this?” card you accept. It infers nothing about you, keeps nothing shaped like a key or a password, and keeps health notes out unless Health is shared.</p>
    <label className="ai-check"><input type="checkbox" checked={on} onChange={e => set(e.target.checked)}/> Use my notes in answers <small>{count ? `${count} note${count === 1 ? '' : 's'} on this device` : 'No notes yet'}</small></label>
    <p>Review, edit, pause, export or forget them on <Link className="text-link" href="/app/zigi/memory">What ZIGi remembers</Link>: NOVA and ZIGi share it. Forgetting a note removes it from this device at once.</p>
    {error && <p role="alert" className="fine">{error}</p>}
    <CheckRow id="memory" setup={setup} run={() => checkMemory(options.data, memory.data, memory.unreadable || options.unreadable)} disabled={!memory.loaded || !options.loaded}/>
  </>;
}
