'use client';
import {useEffect, useState} from 'react';

/**
 * Session AH (WE13, J17; T-105, T-117): a small view choice (Cards or Table, a chart's range) remembered on this device
 * only, as a convenience: read after mount (the server and the first paint show the default), written when it changes,
 * and ignored when storage is unavailable or holds something not on the list.
 */
export function useRememberedChoice<T extends string>(key: string, initial: T, allowed: readonly T[]): [T, (next: T) => void] {
  const storageKey = `zigoals:view-choice:${key}`, [value, setValue] = useState<T>(initial);
  useEffect(() => { try { const saved = localStorage.getItem(storageKey); if (saved && (allowed as readonly string[]).includes(saved)) setValue(saved as T); } catch { /* the default */ } }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return [value, (next: T) => { setValue(next); try { localStorage.setItem(storageKey, next); } catch { /* kept for this visit */ } }];
}
