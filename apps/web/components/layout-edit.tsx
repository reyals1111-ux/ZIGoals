'use client';
/**
 * Personal layouts (UI design pass). A page is locked on every load, so scrolling, taps and clicks behave as
 * before. Unlocking marks each movable card with a glass outline, a drag handle and Move buttons (the keyboard
 * and single-pointer alternative to dragging). Regions render their cards in the saved order; nothing wraps a
 * card, so the locked page's DOM matches the default layout. Orders are saved per device (lib/page-layout.ts),
 * except Today's main column and rail, which keep their existing synced placement (controlled regions).
 */
import {cloneElement,createContext,isValidElement,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore,type PointerEvent as ReactPointerEvent,type ReactElement,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {LAYOUT_KEY,columnsFromTops,emptyLayout,moveInList,moveWithinSubset,parseLayout,resetPage,resolveOrder,savedOrder,serializeLayout,setRegionOrder,type Layout} from '../lib/page-layout';
import {isShowcase} from '../lib/showcase-storage';
import {entranceAllowed} from './use-entrance';
import './layout-edit.css';

const EVENT = 'zigoals:layout-change';
let memory: Layout | null = null, cachedRaw: string | null | undefined, cached: Layout = emptyLayout();
const serverLayout = emptyLayout();
/** Showcase keeps its layout in the tab's session storage, like the rest of its data. */
function layoutStorage(): Storage | null { try { return isShowcase() ? window.sessionStorage : window.localStorage; } catch { return null; } }
function snapshot(): Layout {
  if (memory) return memory;
  let raw: string | null = null;
  try { raw = layoutStorage()?.getItem(LAYOUT_KEY) ?? null; } catch { raw = null; }
  if (raw !== cachedRaw) { cachedRaw = raw; cached = parseLayout(raw); }
  return cached;
}
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (!event.key || event.key === LAYOUT_KEY) callback(); };
  window.addEventListener('storage', onStorage); window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, callback); };
}
/** A failed write (blocked or full storage) keeps the new order for this visit only. */
function writeLayout(next: Layout) {
  try { layoutStorage()?.setItem(LAYOUT_KEY, serializeLayout(next)); memory = null; } catch { memory = next; }
  window.dispatchEvent(new Event(EVENT));
}
export function useSavedLayout() { return useSyncExternalStore(subscribe, snapshot, () => serverLayout); }
const motionAllowed = () => { try { return entranceAllowed() && !matchMedia('(forced-colors: active)').matches; } catch { return false; } };

type PageContext = { page: string; unlocked: boolean; setUnlocked: (value: boolean) => void; announce: (message: string) => void };
const LayoutContext = createContext<PageContext | null>(null);
export const useLayoutPage = () => useContext(LayoutContext);

/** Provides the lock state for one page. Today passes `unlocked`/`onUnlockedChange` to share its Customize state, and `onReset` to reset its synced placement too. */
export function LayoutPage({page, children, unlocked: controlled, onUnlockedChange, onReset}: {page: string; children: ReactNode; unlocked?: boolean; onUnlockedChange?: (value: boolean) => void; onReset?: () => void}) {
  const [own, setOwn] = useState(false), [message, setMessage] = useState(''), [mounted, setMounted] = useState(false);
  const unlocked = controlled ?? own;
  const setUnlocked = useCallback((value: boolean) => { if (onUnlockedChange) onUnlockedChange(value); else setOwn(value); }, [onUnlockedChange]);
  const announce = useCallback((text: string) => { setMessage(''); requestAnimationFrame(() => setMessage(text)); }, []);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (unlocked) root.dataset.layoutEditing = page; else if (root.dataset.layoutEditing === page) delete root.dataset.layoutEditing;
    return () => { if (root.dataset.layoutEditing === page) delete root.dataset.layoutEditing; };
  }, [unlocked, page]);
  const value = useMemo(() => ({page, unlocked, setUnlocked, announce}), [page, unlocked, setUnlocked, announce]);
  const reset = () => { writeLayout(resetPage(snapshot(), page)); onReset?.(); announce('This page is back to its default layout.'); };
  return <LayoutContext.Provider value={value}>
    {children}
    {mounted && createPortal(<div className="sr-only" aria-live="polite" role="status" data-layout-announcer="">{message}</div>, document.body)}
    {mounted && unlocked && createPortal(<div className="layout-bar" role="region" aria-label="Arrange this page">
      <p><strong>Arrange this page.</strong> <span>Drag a card by its handle, or use its arrow buttons. Saved on this device.</span></p>
      <div className="layout-bar-actions"><button type="button" className="secondary" onClick={reset}>Reset this page</button><button type="button" className="primary" onClick={() => { setUnlocked(false); announce('Layout locked.'); }}>Done</button></div>
    </div>, document.body)}
  </LayoutContext.Provider>;
}

const LockIcon = ({open}: {open: boolean}) => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d={open ? 'M8.5 10.5V7.8a3.5 3.5 0 0 1 6.8-1.2' : 'M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor"/></svg>;
/** The one place for the lock on every page: the Shell's status row, right after the demo balance. */
export const LAYOUT_LOCK_SLOT = 'layout-lock-slot';
/** The page's lock: "Unlock layout to rearrange" / "Lock layout". It always renders into the Shell's slot, so it sits in the same spot on every page. */
export function LayoutLockButton() {
  const context = useLayoutPage();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setSlot(document.getElementById(LAYOUT_LOCK_SLOT)); }, []);
  if (!context || !slot) return null;
  const {unlocked, setUnlocked, announce} = context;
  return createPortal(<button type="button" className="layout-lock" data-unlocked={unlocked || undefined} aria-label={unlocked ? 'Lock layout' : 'Unlock layout to rearrange'} title={unlocked ? 'Lock layout' : 'Rearrange this page'} onClick={() => { setUnlocked(!unlocked); announce(unlocked ? 'Layout locked.' : 'Layout unlocked. Use the arrow buttons on a card, or drag its handle, to rearrange.'); }}><LockIcon open={unlocked}/></button>, slot);
}

export type LayoutEntry = {id: string; label: string; node: ReactNode};
type Drag = {id: string; pointerId: number; x: number; y: number; ghost: HTMLElement; el: HTMLElement; dx: number; dy: number; rects: Map<string, DOMRect>; frame: number; scrollY: number};

const itemSelector = (region: string, id: string) => `[data-layout-region="${CSS.escape(region)}"][data-layout-item="${CSS.escape(id)}"]`;
function findItem(region: string, id: string) { return document.querySelector<HTMLElement>(itemSelector(region, id)); }
/** Layout boxes without transforms (an in-flight glide must not skew hit-testing), in page coordinates. */
function layoutRects(region: string, ids: readonly string[]) {
  const map = new Map<string, DOMRect>();
  for (const id of ids) {
    const el = findItem(region, id); if (!el) continue;
    const transform = getComputedStyle(el).transform, m = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
    const r = el.getBoundingClientRect();
    map.set(id, new DOMRect(r.left - m.e + scrollX, r.top - m.f + scrollY, r.width, r.height));
  }
  return map;
}

/**
 * A reorderable region. Items render in the saved (or controlled) order with data-layout-* attributes added to
 * their root element; while the page is unlocked, each item gets controls portalled into it.
 * Uncontrolled regions persist per device; `order`+`onMove` make it controlled (Today's synced placement).
 */
export function LayoutRegion({region, items, allIds, grid = false, page: pageProp, onMove}: {region: string; items: ReadonlyArray<LayoutEntry | null | false | undefined>; allIds?: readonly string[]; grid?: boolean; page?: string; onMove?: (id: string, to: number, order: string[]) => void | Promise<void>}) {
  const context = useLayoutPage(), layout = useSavedLayout();
  const page = pageProp ?? context?.page ?? 'page';
  const key = `${page}:${region}`;
  const entries = items.filter((x): x is LayoutEntry => !!x && isValidElement(x.node));
  const itemIds = entries.map(e => e.id), itemKey = itemIds.join('|');
  const full = useMemo(() => onMove ? itemIds : resolveOrder(allIds ?? itemIds, savedOrder(layout, page, region)), [onMove, itemKey, allIds?.join('|'), layout, page, region]); // eslint-disable-line react-hooks/exhaustive-deps
  const committed = full.filter(id => itemIds.includes(id));
  const [preview, setPreview] = useState<string[] | null>(null);
  const order = preview && preview.length === committed.length && preview.every(id => committed.includes(id)) ? preview : committed;
  const byId = new Map(entries.map(e => [e.id, e]));
  const unlocked = !!context?.unlocked && (pageProp === undefined || pageProp === context.page);
  const flip = useRef<Map<string, DOMRect> | null>(null), drag = useRef<Drag | null>(null), focusAfter = useRef<string | null>(null);
  const stable = useRef({move: (e: PointerEvent) => impl.current.move(e), end: (e: PointerEvent) => impl.current.end(e), cancel: (e: PointerEvent) => impl.current.cancel(e), key: (e: KeyboardEvent) => impl.current.key(e), tick: () => impl.current.tick()}).current;
  const [targets, setTargets] = useState<Map<string, HTMLElement>>(new Map());

  const capture = () => { if (motionAllowed()) flip.current = layoutRects(key, order); };
  const orderKey = order.join('|');
  useLayoutEffect(() => {
    const before = flip.current; flip.current = null;
    if (before) {
      for (const [id, rect] of layoutRects(key, order)) {
        const old = before.get(id), el = findItem(key, id);
        if (!old || !el || el === drag.current?.el) continue;
        const dx = old.left - rect.left, dy = old.top - rect.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        el.animate([{transform: `translate(${dx}px, ${dy}px)`}, {transform: 'translate(0, 0)'}], {duration: 240, easing: 'cubic-bezier(.22,1,.36,1)'});
      }
    }
    if (focusAfter.current) { const target = document.querySelector<HTMLElement>(`[data-layout-control="${CSS.escape(focusAfter.current)}"]`); if (target && !target.hasAttribute('disabled')) { target.focus({preventScroll: false}); focusAfter.current = null; } }
  }, [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Find each card's element while unlocked, so its controls can be portalled into it.
  useLayoutEffect(() => {
    if (!unlocked) { if (targets.size) setTargets(new Map()); return; }
    const next = new Map<string, HTMLElement>();
    for (const id of order) { const el = findItem(key, id); if (el) next.set(id, el); }
    const same = next.size === targets.size && [...next].every(([id, el]) => targets.get(id) === el);
    if (!same) setTargets(next);
  }, [unlocked, targets, order, key]);
  useEffect(() => {
    if (focusAfter.current) { const target = document.querySelector<HTMLElement>(`[data-layout-control="${CSS.escape(focusAfter.current)}"]`); if (target) { target.focus(); focusAfter.current = null; } }
  });
  useEffect(() => () => impl.current.endDrag(false), []);

  const commit = useCallback(async (id: string, to: number, finalOrder: string[]) => {
    if (onMove) await onMove(id, to, finalOrder);
    else writeLayout(setRegionOrder(snapshot(), page, region, moveWithinSubset(full, committed, id, to)));
  }, [onMove, page, region, full, committed]);

  function move(id: string, to: number, control: string) {
    const from = order.indexOf(id), clamped = Math.max(0, Math.min(order.length - 1, to));
    if (from < 0 || clamped === from) return;
    capture(); focusAfter.current = control;
    const next = moveInList(order, id, clamped);
    const label = byId.get(id)?.label ?? 'Card';
    void Promise.resolve(commit(id, clamped, next)).then(() => context?.announce(`Moved ${label} to position ${clamped + 1} of ${order.length}.`)).catch(() => context?.announce(`${label} could not be moved. Your layout was not changed.`));
  }
  function columns() {
    if (!grid) return 1;
    return columnsFromTops(order.map(id => findItem(key, id)?.getBoundingClientRect().top ?? 0));
  }

  // Pointer dragging: mouse from the handle; touch after a long-press on the handle (unlocked only).
  function startPointer(event: ReactPointerEvent, id: string) {
    if (!unlocked || drag.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const el = findItem(key, id); if (!el) return;
    event.preventDefault();
    const x0 = event.clientX, y0 = event.clientY, pointerId = event.pointerId, touch = event.pointerType !== 'mouse';
    let timer = 0, started = false;
    const cleanup = () => { window.clearTimeout(timer); window.removeEventListener('pointermove', pending); window.removeEventListener('pointerup', cleanup); window.removeEventListener('pointercancel', cleanup); };
    const begin = (x: number, y: number) => { if (started) return; started = true; cleanup(); beginDrag(id, el, pointerId, x, y, x0, y0); };
    const pending = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const distance = Math.hypot(e.clientX - x0, e.clientY - y0);
      if (touch) { if (distance > 10) cleanup(); } else if (distance > 4) begin(e.clientX, e.clientY);
    };
    window.addEventListener('pointermove', pending); window.addEventListener('pointerup', cleanup); window.addEventListener('pointercancel', cleanup);
    if (touch) timer = window.setTimeout(() => begin(x0, y0), 350);
  }
  function beginDrag(id: string, el: HTMLElement, pointerId: number, x: number, y: number, x0: number, y0: number) {
    const rect = el.getBoundingClientRect();
    const ghost = el.cloneNode(true) as HTMLElement;
    for (const node of [ghost, ...ghost.querySelectorAll<HTMLElement>('[id],[data-layout-item],[data-layout-control]')]) { node.removeAttribute('id'); node.removeAttribute('data-layout-item'); node.removeAttribute('data-layout-region'); node.removeAttribute('data-layout-control'); }
    ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true; ghost.classList.add('layout-ghost');
    Object.assign(ghost.style, {position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', zIndex: '1000', pointerEvents: 'none', boxSizing: 'border-box'});
    if (!motionAllowed()) ghost.dataset.still = '';
    // Beside the original, so the card keeps the styles its page scopes to it.
    el.parentElement?.append(ghost);
    el.dataset.layoutPlaceholder = '';
    document.documentElement.dataset.layoutDragging = '';
    const state: Drag = {id, pointerId, x, y, ghost, el, dx: x - x0, dy: y - y0, rects: layoutRects(key, order), frame: 0, scrollY};
    drag.current = state;
    ghost.style.translate = `${state.dx}px ${state.dy}px`;
    setPreview(order);
    window.addEventListener('pointermove', stable.move); window.addEventListener('pointerup', stable.end); window.addEventListener('pointercancel', stable.cancel); window.addEventListener('keydown', stable.key, true);
    state.frame = requestAnimationFrame(stable.tick);
    context?.announce(`Picked up ${byId.get(id)?.label ?? 'card'}. Move the pointer and release to drop, or press Escape to cancel.`);
  }
  // Latest render's order for the window listeners.
  const live = useRef({order, grid, key}); live.current = {order, grid, key};
  function target(state: Drag) {
    const {order: current, grid: isGrid} = live.current, px = state.x + scrollX, py = state.y + scrollY;
    const others = current.filter(id => id !== state.id);
    let index = 0;
    for (const id of others) {
      const r = state.rects.get(id); if (!r) continue;
      const before = isGrid ? (py > r.bottom || (py >= r.top && px > r.left + r.width / 2)) : py > r.top + r.height / 2;
      if (before) index++;
    }
    return index;
  }
  function update(state: Drag) {
    state.ghost.style.translate = `${state.dx}px ${state.dy}px`;
    const {order: current, key: regionKey} = live.current, index = target(state), others = current.filter(id => id !== state.id);
    const next = [...others.slice(0, index), state.id, ...others.slice(index)];
    if (next.join('|') !== current.join('|')) { capture(); setPreview(next); requestAnimationFrame(() => { if (drag.current === state) state.rects = layoutRects(regionKey, next); }); }
  }
  const onDragMove = (event: PointerEvent) => {
    const state = drag.current; if (!state || event.pointerId !== state.pointerId) return;
    state.dx += event.clientX - state.x; state.dy += event.clientY - state.y; state.x = event.clientX; state.y = event.clientY;
    update(state);
  };
  function tick() {
    const state = drag.current; if (!state) return;
    // Near the top or bottom edge the page scrolls, faster the closer the pointer gets (at most 14px a frame).
    const edge = 64, speed = state.y < edge ? -Math.min(14, (edge - state.y) / 4) : state.y > innerHeight - edge ? Math.min(14, (state.y - (innerHeight - edge)) / 4) : 0;
    if (speed) { const before = scrollY; window.scrollBy(0, speed); const moved = scrollY - before; if (moved) { state.dy += moved; update(state); } }
    state.frame = requestAnimationFrame(stable.tick);
  }
  function endDrag(save: boolean) {
    const state = drag.current; if (!state) return;
    drag.current = null; cancelAnimationFrame(state.frame);
    window.removeEventListener('pointermove', stable.move); window.removeEventListener('pointerup', stable.end); window.removeEventListener('pointercancel', stable.cancel); window.removeEventListener('keydown', stable.key, true);
    state.ghost.remove(); delete state.el.dataset.layoutPlaceholder; delete document.documentElement.dataset.layoutDragging;
    const final = live.current.order, from = committed.indexOf(state.id), to = final.indexOf(state.id), label = byId.get(state.id)?.label ?? 'Card';
    if (save && to >= 0 && to !== from) {
      void Promise.resolve(commit(state.id, to, final)).then(() => { setPreview(null); context?.announce(`Moved ${label} to position ${to + 1} of ${final.length}.`); }).catch(() => { capture(); setPreview(null); context?.announce(`${label} could not be moved. Your layout was not changed.`); });
    } else { capture(); setPreview(null); context?.announce(save ? `${label} stays at position ${from + 1}.` : `Move cancelled. ${label} is back at position ${from + 1}.`); }
  }
  const onDragEnd = (event: PointerEvent) => { if (drag.current && event.pointerId === drag.current.pointerId) endDrag(true); };
  const onDragCancel = (event: PointerEvent) => { if (drag.current && event.pointerId === drag.current.pointerId) endDrag(false); };
  const onDragKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); endDrag(false); } };
  // Window listeners stay the same functions for a whole drag; they call this render's handlers.
  const impl = useRef({move: onDragMove, end: onDragEnd, cancel: onDragCancel, key: onDragKey, tick, endDrag});
  impl.current = {move: onDragMove, end: onDragEnd, cancel: onDragCancel, key: onDragKey, tick, endDrag};

  const rendered = order.map(id => {
    const entry = byId.get(id)!;
    return cloneElement(entry.node as ReactElement<Record<string, unknown>>, {key: id, 'data-layout-item': id, 'data-layout-region': key});
  });
  const cols = unlocked && grid ? columns() : 1;
  const controls = unlocked ? [...targets].map(([id, el]) => {
    const index = order.indexOf(id), label = byId.get(id)?.label ?? 'card', last = order.length - 1;
    if (index < 0) return null;
    const button = (action: string, text: string, to: number, disabled: boolean, glyph: string) => <button type="button" className="layout-move" data-layout-control={`${key}:${id}:${action}`} aria-label={`Move ${label} ${text}`} title={`Move ${text}`} disabled={disabled} onClick={() => move(id, to, `${key}:${id}:${action}`)}><span aria-hidden="true">{glyph}</span></button>;
    return createPortal(<div className="layout-controls" data-layout-controls="" role="group" aria-label={`Arrange ${label}`}>
      <span className="layout-handle" aria-hidden="true" onPointerDown={event => startPointer(event, id)}><svg viewBox="0 0 16 16" width="16" height="16"><g fill="currentColor"><circle cx="5" cy="3.5" r="1.4"/><circle cx="11" cy="3.5" r="1.4"/><circle cx="5" cy="8" r="1.4"/><circle cx="11" cy="8" r="1.4"/><circle cx="5" cy="12.5" r="1.4"/><circle cx="11" cy="12.5" r="1.4"/></g></svg></span>
      {button('up', 'up', index - cols, index - cols < 0, '↑')}
      {button('down', 'down', index + cols, index + cols > last, '↓')}
      {grid && cols > 1 && button('left', 'left', index - 1, index === 0, '←')}
      {grid && cols > 1 && button('right', 'right', index + 1, index === last, '→')}
    </div>, el, `${key}:${id}`);
  }) : null;
  return <>{rendered}{controls}</>;
}

/** Attributes a region adds to a card's root element. Components used as layout items accept and forward them. */
export type LayoutAttrs = {'data-layout-item'?: string; 'data-layout-region'?: string};
