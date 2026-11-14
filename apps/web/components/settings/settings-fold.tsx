'use client';
import './settings-fold.css';
import {Suspense, createContext, lazy, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from 'react';
const FoldedShowcase = lazy(() => import('./settings-folded-showcase'));
import {hashId} from '../../lib/hash-id';
import {SETTINGS_FOLDS_KEY, SETTINGS_GROUP_IDS, foldSummary, foldedAtStart, groupForHash, groupForTarget, loadOpen, openOf, saveOpen, showcaseGroupOpen, type SettingsGroupId} from '../../lib/settings-folds';
import {PHONE_QUERY} from '../phone/use-phone-layout';
import {isShowcase} from '../../lib/showcase-storage';

/**
 * Session AL (D-088, N-BN-10, DV-266, D-005, N-BN-05): each of Settings' six groups folds from its heading, and "Fold all"
 * beside the sticky index shortens the page to six headings. Every group is open by default, so nothing a person or a
 * spec reaches moves or hides until someone folds it. A jump (an index link, any #anchor, Search, Help, a deep link)
 * opens the group that holds its target before the browser scrolls there. Phones keep their own list
 * (components/phone/phone-settings.tsx). Session AP (D-088 completed): on a computer or a tablet every group starts
 * folded but the ones this device keeps open and the one a jump lands in (lib/settings-folds.ts, localStorage).
 */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Folds = {folded: ReadonlySet<SettingsGroupId>; chain: boolean; toggle: (id: SettingsGroupId) => void; setAll: (fold: boolean) => void; reveal: (id: string | null) => boolean};
const FoldContext = createContext<Folds | null>(null);
const NONE: Folds = {folded: new Set(), chain: false, toggle: () => {}, setAll: () => {}, reveal: () => false};
const useFolds = () => useContext(FoldContext) ?? NONE;

function deviceStore(): Storage | null { try { return window.localStorage; } catch { return null; } }
const onPhone = () => { try { return window.matchMedia(PHONE_QUERY).matches; } catch { return false; } };
/** The id of the Settings group around an element, read from the page. */
/** Lands on a jump's target at once. */
const land = (id: string | null) => (id ? document.getElementById(id) : null)?.scrollIntoView({block: 'start', behavior: 'instant'});
const groupOf = (id: string) => document.getElementById(id)?.closest('.settings-page .settings-group')?.id ?? null;
const bodyId = (id: string) => `${id}-body`;

export function SettingsFolds({chain, children}: {chain: boolean; children: ReactNode}) {
  const [folded, setFolded] = useState<ReadonlySet<SettingsGroupId>>(() => new Set());
  const saved = useRef(false), reanchor = useRef(false);

  // After hydration (the server and the first paint have every group open): on a computer or a tablet, every group folds
  // but the ones this device keeps open and the one a jump lands in. Before paint, so a folded group never flashes open.
  useIsoLayoutEffect(() => {
    try { window.sessionStorage.removeItem(SETTINGS_FOLDS_KEY); } catch { /* AL's tab-only key, gone with the tab anyway */ }
    if (onPhone()) return;
    const target = groupForHash(window.location.hash, groupOf);
    const next = foldedAtStart(loadOpen(deviceStore()), target, showcaseGroupOpen(deviceStore(), isShowcase()) ? ['settings-app'] : []);
    if (!next.length) return;
    reanchor.current = target !== null;
    setFolded(new Set(next));
  }, []);
  // The groups folded above a jump's target moved it: land on it again, at once (KeepSettingsJump then holds it there).
  useIsoLayoutEffect(() => {
    if (!reanchor.current) return;
    reanchor.current = false;
    const id = hashId(window.location.hash);
    land(id);
  }, [folded]);
  // Saves each change after the first render (the start above saved what it changed itself).
  useEffect(() => { if (saved.current) saveOpen(deviceStore(), openOf(folded)); else saved.current = true; }, [folded]);

  /** Opens the group that holds `id` when it is folded. The DOM opens now, so the browser's own scroll that follows finds
   *  the target; React's state catches up. True when it was folded. */
  const reveal = useCallback((id: string | null) => {
    const group = groupForTarget(id, groupOf), el = group ? document.getElementById(group) : null;
    if (!group || !el?.hasAttribute('data-folded')) return false;
    el.removeAttribute('data-folded');
    document.getElementById(bodyId(group))?.removeAttribute('hidden');
    setFolded(prev => { const next = new Set(prev); next.delete(group); return next; });
    return true;
  }, []);
  // A jump (the address on arrival, a link, the router, back and forward) opens its target's group; a target drawn a moment
  // later (ZIGi's sections load on demand) opens it and is landed on once it arrives (settings-late-jump.ts, loaded only for
  // such a jump). CI 1726: a same-page jump to a part of ZIGi's section that is not drawn yet waits for it too.
  const late = useRef<(() => void) | null>(null), gone = useRef(false);
  const jump = useCallback((id: string | null) => {
    if (!id || onPhone()) return;
    if (document.getElementById(id)) { if (reveal(id)) requestAnimationFrame(() => land(id)); return; }
    late.current?.();
    void import('./settings-late-jump').then(m => { if (!gone.current) late.current = m.watchLateJump(id, reveal); }, () => undefined);
  }, [reveal]);
  // A frame later on arrival, so the folds above are in place before the target's group is opened.
  useEffect(() => { gone.current = false; const f = requestAnimationFrame(() => jump(hashId(window.location.hash))); return () => { gone.current = true; cancelAnimationFrame(f); late.current?.(); }; }, [jump]);

  useEffect(() => {
    const here = (url: URL) => url.pathname === window.location.pathname && url.hash.length > 1;
    // Capture: before the link's own scroll (an index link, a Help or Search link to a section, any #anchor here).
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
      if (!link) return;
      const url = new URL(link.href, window.location.href);
      if (here(url)) jump(hashId(url.hash));
    };
    // The router's own pushes (Search, a Link) where the browser reports navigations; it fires before the scroll.
    type Nav = {addEventListener: (t: string, f: (e: {destination: {url: string}}) => void) => void; removeEventListener: (t: string, f: (e: {destination: {url: string}}) => void) => void};
    const nav = (window as Window & {navigation?: Nav}).navigation;
    const onNavigate = (event: {destination: {url: string}}) => { try { const url = new URL(event.destination.url); if (here(url)) jump(hashId(url.hash)); } catch { /* not a URL we handle */ } };
    // Anything else (back and forward, a typed fragment): the browser already tried to scroll, so scroll once it is open.
    const onHash = () => jump(hashId(window.location.hash));
    document.addEventListener('click', onClick, true);
    nav?.addEventListener('navigate', onNavigate);
    window.addEventListener('hashchange', onHash);
    return () => { document.removeEventListener('click', onClick, true); nav?.removeEventListener('navigate', onNavigate); window.removeEventListener('hashchange', onHash); };
  }, [jump]);

  const toggle = useCallback((id: SettingsGroupId) => setFolded(prev => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; }), []);
  const setAll = useCallback((fold: boolean) => setFolded(new Set(fold ? SETTINGS_GROUP_IDS : [])), []);
  const value = useMemo<Folds>(() => ({folded, chain, toggle, setAll, reveal}), [folded, chain, toggle, setAll, reveal]);
  return <FoldContext.Provider value={value}>{children}</FoldContext.Provider>;
}

/** One group: its heading is the fold's button (inside the h2, so the heading level stays); a one-line summary of what
 *  it holds shows while it is folded. The group keeps its id, role and name (tests/settings-groups.spec.ts). */
export function SettingsFoldGroup({id, title, icon, children}: {id: SettingsGroupId; title: string; icon?: ReactNode; children: ReactNode}) {
  const {folded, chain, toggle, reveal} = useFolds();
  const isFolded = folded.has(id), [showcaseOn, setShowcaseOn] = useState(false);
  useEffect(() => { setShowcaseOn(isShowcase()); }, []);
  const body = useRef<HTMLDivElement>(null);
  // `hidden="until-found"`: find in page and the browser's own fragment jumps still reach a folded group's words and open
  // it (where a browser does not know the value, it is plain `hidden`). Set here, not by React, which only knows true/false.
  useIsoLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    if (isFolded) el.setAttribute('hidden', 'until-found'); else el.removeAttribute('hidden');
  }, [isFolded]);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const open = () => { reveal(id); };
    el.addEventListener('beforematch', open);
    return () => el.removeEventListener('beforematch', open);
  }, [id, reveal]);
  return <div className="settings-group" id={id} role="group" aria-labelledby={`${id}-title`} data-folded={isFolded ? '' : undefined}>
    <h2 className="settings-group-title settings-fold-heading" id={`${id}-title`}>
      <button type="button" className="settings-fold-toggle" aria-expanded={!isFolded} aria-controls={bodyId(id)} aria-describedby={isFolded ? `${id}-summary` : undefined} onClick={() => toggle(id)}>
        {icon}{title}<svg className="settings-fold-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
    </h2>
    {isFolded && <p className="settings-fold-summary" id={`${id}-summary`}>{foldSummary(id, {chain})}</p>}
    {/* Session AP (D20): Settings → Load Showcase Demo is a new person's first step (the friends' guide says so), so while the
        group that holds the Showcase card is folded its summary carries the same button (only one is ever visible). */}
    {isFolded && id === 'settings-app' && !showcaseOn && <Suspense fallback={null}><FoldedShowcase/></Suspense>}
    <div className="settings-fold-body" id={bodyId(id)} ref={body}>{children}</div>
  </div>;
}

/** "Fold all" / "Open all", at the end of the sticky index row. */
export function SettingsFoldAll() {
  const {folded, setAll} = useFolds();
  // Session AP (D-088 completed): "Open all" while any group is folded (Settings now starts folded, sometimes with one group
  // open), "Fold all" once every group is open.
  const some = folded.size > 0;
  const onClick = () => {
    setAll(!some);
    // Folding from far down the page: show the six headings from the first, not the page's clamped end.
    if (!some) requestAnimationFrame(() => {
      const first = document.getElementById(SETTINGS_GROUP_IDS[0]);
      if (first && first.getBoundingClientRect().top < 0) first.scrollIntoView({block: 'start'});
    });
  };
  return <button type="button" className="quiet settings-fold-all" aria-controls={SETTINGS_GROUP_IDS.map(bodyId).join(' ')} onClick={onClick}>{some ? 'Open all' : 'Fold all'}</button>;
}
