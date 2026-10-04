'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ACCOUNT_CHANGE, getAccountScope} from '../../lib/account-session';
import {currentInstallContext} from '../../lib/install/platform';
import {AI_SETTINGS_KEY, defaultAiSettings, readAiSettings, turnOffAi, updateAiSettings, type AiSettings} from '../../lib/ai/settings';
import {dropMemoryKeys, forgetAiKeys} from '../../lib/ai/keys';
import {getAppStorage} from '../../lib/showcase-storage';

/**
 * The device's ZIGi settings (zigoals:ai:v1, ADR-012): read after mount from the app storage (per account, Showcase in
 * the tab), re-read on storage events, on account changes and after a save from any component. Never a secret: keys
 * live in lib/ai/keys. An unreadable record reads as "off" and is never rewritten by a read.
 */
export const AI_SETTINGS_EVENT = 'zigoals:ai-settings';
export type AiSettingsStore = {data: AiSettings; loaded: boolean; unreadable: boolean; installed: boolean; update: (change: (current: AiSettings) => AiSettings) => AiSettings; turnOff: () => AiSettings};
export function useAiSettings(): AiSettingsStore {
  const [state, setState] = useState<{data: AiSettings; loaded: boolean; unreadable: boolean; installed: boolean}>({data: defaultAiSettings(), loaded: false, unreadable: false, installed: false});
  const installed = useRef(false);
  const refresh = useCallback(() => {
    try { installed.current = currentInstallContext() === 'installed'; } catch { installed.current = false; }
    try { const read = readAiSettings(getAppStorage(), installed.current); setState({data: read.data, loaded: true, unreadable: read.unreadable, installed: installed.current}); }
    catch { setState({data: defaultAiSettings(installed.current), loaded: true, unreadable: true, installed: installed.current}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(AI_SETTINGS_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(AI_SETTINGS_EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(AI_SETTINGS_EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  const update = useCallback((change: (current: AiSettings) => AiSettings) => {
    const next = updateAiSettings(getAppStorage(), change, installed.current);
    setState(s => ({...s, data: next, loaded: true, unreadable: false}));
    window.dispatchEvent(new Event(AI_SETTINGS_EVENT));
    return next;
  }, []);
  const turnOff = useCallback(() => {
    const next = turnOffAi(getAppStorage(), installed.current);
    setState(s => ({...s, data: next, loaded: true, unreadable: false}));
    window.dispatchEvent(new Event(AI_SETTINGS_EVENT));
    return next;
  }, []);
  return {...state, update, turnOff};
}
/**
 * Account hygiene (ADR-012 decision 9): on any account change the in-memory keys are dropped and the chat closes
 * (the caller's onChange); when a scope ends without a successor (sign-out) its remembered keys are forgotten too.
 * Deletion and erase are handled next to the vault's own erase path.
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
      dropMemoryKeys();
      if (before && !next) void forgetAiKeys(before).catch(() => undefined);
      handler.current();
    };
    window.addEventListener(ACCOUNT_CHANGE, onAccount);
    return () => window.removeEventListener(ACCOUNT_CHANGE, onAccount);
  }, []);
}
