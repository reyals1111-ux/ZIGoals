'use client';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {MUSIC_MIX, type MusicMixPrefs} from '../../lib/music/mix-store';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';

/**
 * The mix's record on this device (`zigoals:music-mix:v1`, Session AK) in a component: read after mount, saved on the
 * person's choice. `save` returns false, with `error` in words, when the change was not kept (nothing is written then).
 */
export function useMusicMix() {
  const record = useDeviceRecord(MUSIC_MIX), [error, setError] = useState('');
  const save = (change: (current: MusicMixPrefs) => MusicMixPrefs) => { try { record.update(change); setError(''); return true; } catch (err) { setError(`Not saved on this device. ${deviceSettingFailureMessage(err)}`); return false; } };
  return {data: record.data, loaded: record.loaded, unreadable: record.unreadable, save, error};
}
export type MusicMixState = ReturnType<typeof useMusicMix>;
