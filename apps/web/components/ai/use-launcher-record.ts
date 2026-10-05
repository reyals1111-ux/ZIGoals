'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ACCOUNT_CHANGE, getAccountScope} from '../../lib/account-session';
import {AI_SETTINGS_EVENT, AI_SETTINGS_KEY, DEFAULT_LAUNCHER_RECORD, readLauncherRecord, type LauncherRecord} from '../../lib/ai/launcher-record';
import {getAppStorage} from '../../lib/showcase-storage';

/**
 * The launcher shell's view of the ZIGi device record (ADR-012, follow-up part A): the few fields that decide whether
 * the ZIGi button shows and which app the pill opens, read with the tiny tolerant reader so no Zod schema, key store
 * or chat store ships on every app page. Writes (Hide, Show again) go through the full validated updater, which is
 * imported only when the person asks for one.
 */
export function useLauncherRecord(): {record: LauncherRecord; loaded: boolean; setLauncherHidden: (hidden: boolean) => void} {
  const [state, setState] = useState<{record: LauncherRecord; loaded: boolean}>({record: DEFAULT_LAUNCHER_RECORD, loaded: false});
  const refresh = useCallback(() => {
    try { setState({record: readLauncherRecord(getAppStorage()), loaded: true}); } catch { setState({record: DEFAULT_LAUNCHER_RECORD, loaded: true}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(AI_SETTINGS_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(AI_SETTINGS_EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(AI_SETTINGS_EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  const setLauncherHidden = useCallback((hidden: boolean) => {
    setState(s => ({record: {...s.record, launcherHidden: hidden}, loaded: true}));
    void import('../../lib/ai/settings').then(({updateAiSettings}) => import('../../lib/install/platform').then(({currentInstallContext}) => {
      let installed = false; try { installed = currentInstallContext() === 'installed'; } catch { installed = false; }
      updateAiSettings(getAppStorage(), s => ({...s, launcherHidden: hidden}), installed);
      window.dispatchEvent(new Event(AI_SETTINGS_EVENT));
    })).catch(() => undefined);
  }, []);
  return {...state, setLauncherHidden};
}
/**
 * Account hygiene (ADR-012 decision 9) from the shell: on any account change the chat closes (the caller's onChange)
 * and the in-memory keys are dropped; a scope that ends without a successor (sign-out) has its remembered keys
 * forgotten. The key store is imported only then; a device that never opened ZIGi never loads it.
 */
export function useAccountCleanup(onChange: () => void): void {
  const previous = useRef<string | null | undefined>(undefined), handler = useRef(onChange);
  useEffect(() => { handler.current = onChange; });
  useEffect(() => {
    const read = () => { try { return getAccountScope()?.toLowerCase() ?? null; } catch { return null; } };
    previous.current = read();
    const onAccount = () => {
      const next = read(), before = previous.current;
      previous.current = next;
      if (before === next) return;
      void import('../../lib/ai/keys').then(keys => { keys.dropMemoryKeys(); if (before && !next) return keys.forgetAiKeys(before); }).catch(() => undefined);
      handler.current();
    };
    window.addEventListener(ACCOUNT_CHANGE, onAccount);
    return () => window.removeEventListener(ACCOUNT_CHANGE, onAccount);
  }, []);
}
