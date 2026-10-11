'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {IMPORT_UNDO_KEY, emptyImportUndo, type ImportRecord, type ImportUndo} from '../../lib/import/undo-schema';
import {dismissImport, forgetImport, liveImports, readImportUndo, recordImport, startOverImportUndo, updateImportUndo} from '../../lib/import/undo-store';

export const IMPORT_UNDO_EVENT = 'zigoals:import-undo-change';
type State = {data: ImportUndo; unreadable: boolean; loaded: boolean};
/**
 * This device's import undo ledger (W3, I1): read after mount, refreshed on storage events and account changes,
 * written only by the import panels and the undo buttons. Unreadable bytes mean "nothing to undo" and are never
 * rewritten; imports still work, and "Start over…" is the person's explicit choice.
 */
export function useImportUndo() {
  const [state, setState] = useState<State>({data: emptyImportUndo(), unreadable: false, loaded: false});
  const refresh = useCallback(() => {
    try { const read = readImportUndo(getAppStorage()); setState({data: read.data, unreadable: read.unreadable, loaded: true}); }
    catch { setState({data: emptyImportUndo(), unreadable: true, loaded: true}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(IMPORT_UNDO_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(IMPORT_UNDO_EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(IMPORT_UNDO_EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  const change = useCallback((fn: (current: ImportUndo) => ImportUndo) => {
    const next = updateImportUndo(getAppStorage(), new Date(), fn);
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(IMPORT_UNDO_EVENT));
    return next;
  }, []);
  const record = useCallback((entry: Omit<ImportRecord, 'expiresAt'>) => change(current => recordImport(current, entry)), [change]);
  const forget = useCallback((id: string) => change(current => forgetImport(current, id)), [change]);
  const dismiss = useCallback((id: string) => change(current => dismissImport(current, id)), [change]);
  const startOver = useCallback(() => {
    const next = startOverImportUndo(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(IMPORT_UNDO_EVENT));
  }, []);
  const live = state.loaded ? liveImports(state.data, new Date()) : [];
  return {...state, live, record, forget, dismiss, startOver};
}
export type ImportUndoStore = ReturnType<typeof useImportUndo>;
