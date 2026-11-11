'use client';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {plainErrorMessage} from '../../../lib/plain-error';
import {askId, askRequests, clearMade, closeMade, dropMade, keepAsMade, makeWidgets, NOVA_STAGE, paramsOf, pruneStage, recordAsk, resizeMade, restoreStage, setHidden, stageWidgets, type AskDevice, type AskSource, type MakeRequest, type NovaAsk, type NovaStage, type StageWidget, type WidgetParams} from '../../../lib/nova/stage/record';
import {addWidget, removeWidget, restoreWidgets, widgetsFor, type NovaRecord, type NovaWidget, type WidgetSize} from '../../../lib/nova/store';
import type {StageCommand} from '../../../lib/nova/summon/summon';
import {announceMade, widgetTitle} from '../../../lib/nova/summon/words';
import {widgetSpec, type WidgetGate} from '../../../lib/nova/widgets/catalog';
import {useDeviceRecord, type DeviceRecordState} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';

/**
 * Session AM (ADR-038 D1–D5, A5): NOVA's stage in the dashboard — the arranged (pinned) widgets of NOVA's own record and
 * the widgets made on request of the stage record, as one list, with everything a person can do to a widget: make it,
 * pin or unpin it, hide it into the dock and bring it back, close it (with Undo) and clear the stage (with Undo). Every
 * change is the person's own (a request, a tap): nothing here writes on its own, and a made widget that outlived its
 * twelve hours is simply no longer listed (the next request drops it from the record).
 */
/** What a made widget may read (D5): each page-data area's switch as NOVA's on-device answers see it; null until NOVA's chat engine has read them. */
export type StageGates = Readonly<Record<WidgetGate, boolean>>;
export type StageAsk = {text: string; by: AskSource; device: AskDevice; kept: boolean};
export type StageApi = {
  loaded: boolean;
  shown: StageWidget[]; docked: StageWidget[];
  /** Widgets made a moment ago: they materialise (art direction §4) and the star sends its beam. */
  fresh: ReadonlySet<string>;
  paramsFor: (id: string) => WidgetParams;
  /** Whether a made widget may read its records: true (open), false (its switch is off), null (not known yet). */
  gateOpen: (widget: StageWidget) => boolean | null;
  gates: StageGates | null; setGates: (gates: StageGates | null) => void;
  asks: readonly NovaAsk[];
  record: DeviceRecordState<NovaStage>;
  make: (requests: readonly MakeRequest[], ask?: StageAsk) => boolean;
  again: (ask: NovaAsk) => void;
  command: (command: Exclude<StageCommand, {kind: 'arrangement'}>) => boolean;
  close: (id: string) => void; pin: (id: string) => void; unpin: (id: string) => void; hide: (id: string) => void; show: (id: string) => void; resize: (id: string, size: WidgetSize) => void; clear: () => boolean;
  noteAsk: (ask: StageAsk, widgets?: readonly MakeRequest[]) => void;
};
const FRESH_MS = 1700;
export function useStage({nova, save, canShow, announce, arranging = false}: {
  /** While the person arranges the stage, the pinned widgets lead in their own order. */
  arranging?: boolean;
  nova: NovaRecord; save: (change: (r: NovaRecord) => NovaRecord, done?: string) => boolean; canShow: (id: string) => boolean; announce: (words: string) => void;
}): StageApi {
  const record = useDeviceRecord(NOVA_STAGE), data = record.data;
  const [now, setNow] = useState(() => Date.now()), [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set()), [gates, setGates] = useState<StageGates | null>(null);
  const freshTimer = useRef(0);
  // The twelve hours are read against a clock that moves every ten minutes while the page is visible (no per-second work).
  useEffect(() => {
    let timer = 0;
    const tick = () => { setNow(Date.now()); timer = window.setTimeout(tick, 600_000); };
    const visible = () => { window.clearTimeout(timer); if (document.visibilityState !== 'hidden') tick(); };
    timer = window.setTimeout(tick, 600_000);
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', visible); window.clearTimeout(freshTimer.current); };
  }, []);
  const pinned = useMemo(() => widgetsFor(nova, canShow), [nova, canShow]);
  const sizeOf = useCallback((id: string): WidgetSize => widgetSpec(id)?.size ?? 'M', []);
  const {shown, docked} = useMemo(() => stageWidgets(data, pinned, now, sizeOf, canShow, arranging ? 'pinned-first' : 'made-first'), [data, pinned, now, sizeOf, canShow, arranging]);
  const latest = useRef({pinned, shown, docked, data});
  latest.current = {pinned, shown, docked, data};
  const update = useCallback((change: (r: NovaStage) => NovaStage): boolean => {
    try { record.update(change); return true; } catch (e) { announce(plainErrorMessage(e, 'This change could not be saved on this device.')); return false; }
  }, [record, announce]);
  const markFresh = useCallback((ids: readonly string[]) => {
    setNow(Date.now()); setFresh(new Set(ids));
    window.clearTimeout(freshTimer.current);
    freshTimer.current = window.setTimeout(() => setFresh(new Set()), FRESH_MS);
  }, []);

  const noteAsk = useCallback((ask: StageAsk, widgets: readonly MakeRequest[] = []) => {
    if (!ask.kept) return;
    const at = new Date();
    update(r => recordAsk(r, {id: askId(at), at, text: ask.text, widgets, device: ask.device, by: ask.by}));
  }, [update]);
  const make = useCallback((requests: readonly MakeRequest[], ask?: StageAsk): boolean => {
    const wanted = requests.filter(q => canShow(q.id));
    if (!wanted.length) { if (ask) noteAsk(ask); return false; }
    const at = new Date(), pinnedIds = new Set(latest.current.pinned.map(w => w.id));
    const ok = update(r => {
      const next = makeWidgets(pruneStage(r, at.getTime()), wanted, at, pinnedIds);
      return ask?.kept ? recordAsk(next, {id: askId(at), at, text: ask.text, widgets: wanted, device: ask.device, by: ask.by}) : next;
    });
    if (!ok) return false;
    markFresh(wanted.map(q => q.id));
    const total = new Set([...latest.current.shown.map(w => w.id), ...wanted.map(q => q.id)]).size;
    announce(announceMade(wanted, total));
    return true;
  }, [canShow, update, markFresh, announce, noteAsk]);
  const again = useCallback((ask: NovaAsk) => { make(askRequests(ask)); }, [make]);

  const isPinned = (id: string) => latest.current.pinned.some(w => w.id === id);
  const onStage = (id: string) => latest.current.shown.some(w => w.id === id) || latest.current.docked.some(w => w.id === id);
  const sizeNow = (id: string): WidgetSize => [...latest.current.shown, ...latest.current.docked].find(w => w.id === id)?.size ?? sizeOf(id);
  const close = useCallback((id: string) => {
    const title = widgetTitle(id), beforeStage = latest.current.data, beforePinned: NovaWidget[] = latest.current.pinned.map(w => ({id: w.id, size: w.size, slot: w.slot})), wasPinned = isPinned(id);
    if (wasPinned && !save(r => removeWidget(r, id))) return;
    if (!update(r => closeMade(r, id))) return;
    showUndo({message: `${title} left the stage.`, undone: `${title} is back.`, restore: () => {
      if (wasPinned && !save(r => restoreWidgets(r, beforePinned))) throw Error('This could not be put back on this device.');
      if (!update(r => restoreStage(r, beforeStage))) throw Error('This could not be put back on this device.');
    }});
   
  }, [save, update]);
  const pin = useCallback((id: string) => {
    if (isPinned(id)) return;
    const size = sizeNow(id);
    if (save(r => addWidget(r, id, size), `${widgetTitle(id)} is pinned. It stays on the stage.`)) update(r => dropMade(r, id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, update]);
  const unpin = useCallback((id: string) => {
    if (!isPinned(id)) return;
    const size = sizeNow(id);
    if (update(r => keepAsMade(r, id, size, new Date()))) save(r => removeWidget(r, id), `${widgetTitle(id)} is unpinned. It stays until you close it or the day moves on.`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, update]);
  const hide = useCallback((id: string) => { if (update(r => setHidden(r, id, true))) announce(`${widgetTitle(id)} is in the dock.`); }, [update, announce]);
  const show = useCallback((id: string) => { if (update(r => setHidden(r, id, false))) { markFresh([id]); announce(`${widgetTitle(id)} is back on the stage.`); } }, [update, markFresh, announce]);
  const resize = useCallback((id: string, size: WidgetSize) => { update(r => resizeMade(r, id, size)); }, [update]);
  const clear = useCallback((): boolean => {
    const before = latest.current.data, pinnedIds = new Set(latest.current.pinned.map(w => w.id));
    const any = latest.current.shown.some(w => !w.pinned) || latest.current.docked.some(w => !w.pinned);
    if (!any) return false;
    if (!update(r => clearMade(r, pinnedIds))) return false;
    showUndo({message: 'The stage is clear. What you pinned stays.', undone: 'Your widgets are back.', restore: () => { if (!update(r => restoreStage(r, before))) throw Error('This could not be put back on this device.'); }});
    return true;
  }, [update]);
  const command = useCallback((c: Exclude<StageCommand, {kind: 'arrangement'}>): boolean => {
    switch (c.kind) {
      case 'clear': return clear();
      case 'close': if (!onStage(c.id)) return false; close(c.id); return true;
      case 'hide': if (!latest.current.shown.some(w => w.id === c.id)) return false; hide(c.id); return true;
      case 'pin': if (isPinned(c.id)) return false; if (!onStage(c.id)) make([{id: c.id}]); pin(c.id); return true;
      case 'unpin': if (!isPinned(c.id)) return false; unpin(c.id); return true;
    }
   
  }, [clear, close, hide, pin, unpin, make]);

  const paramsFor = useCallback((id: string) => paramsOf(data, id), [data]);
  const gateOpen = useCallback((w: StageWidget): boolean | null => {
    const gate = widgetSpec(w.id)?.gate;
    if (w.pinned || !gate) return true;
    return gates === null ? null : gates[gate];
  }, [gates]);
  return {loaded: record.loaded, shown, docked, fresh, paramsFor, gateOpen, gates, setGates, asks: (data.asks ?? []) as readonly NovaAsk[], record, make, again, command, close, pin, unpin, hide, show, resize, clear, noteAsk};
}
