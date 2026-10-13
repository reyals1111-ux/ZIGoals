'use client';
import {useEffect, useState} from 'react';
import {HABIT_EXTRAS} from '../../lib/habits-extras/schema';
import {readLifeAreas, type LifeArea} from '../../lib/habits-extras/areas-mirror';
import {getAppStorage} from '../../lib/showcase-storage';
import {useDeviceRecord} from '../ai/use-device-record';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {LIFE_AREAS_KEY} from '../../lib/aa-device-keys';

/** The habit extras record (areas, quit costs, bells, folds) plus the life areas AA-Cloud's store holds (read only). */
export function useHabitExtras() {
  const extras = useDeviceRecord(HABIT_EXTRAS);
  const [areas, setAreas] = useState<LifeArea[]>(() => readLifeAreas(null));
  useEffect(() => {
    const refresh = () => { try { setAreas(readLifeAreas(getAppStorage())); } catch { setAreas(readLifeAreas(null)); } };
    refresh();
    const onSaved = (e: Event) => { const key = (e as CustomEvent<string>).detail; if (!key || key === LIFE_AREAS_KEY) refresh(); };
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key.endsWith(LIFE_AREAS_KEY)) refresh(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, []);
  return {...extras, areas};
}
export type HabitExtrasState = ReturnType<typeof useHabitExtras>;
