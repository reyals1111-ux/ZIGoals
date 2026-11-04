'use client';
import './apps-extras.css';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useId, useRef, useState, useSyncExternalStore} from 'react';
import {AppIcon} from '../app-icon';
import {ChecklistMark} from '../checklist/checklist-marks';
import {EarnDockMark} from '../earn-dock/earn-dock-mark';
import {useChainChoice} from '../chain/use-chain-choice';
import {useDeviceRecord} from '../ai/use-device-record';
import {isSensitiveScreen} from '../ai/use-sensitive-screen';
import {usePagesView} from '../pages/use-pages-view';
import {useCompactShell} from '../phone/use-phone-layout';
import {openZigiPanel} from '../zigi-door';
import {openMusicPlayer} from '../music/music-events';
import {hrefShown, isShown} from '../../lib/pages/visibility';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {checklistPrefsOf} from '../../lib/ui-prefs/schema';
import {APPS_EXTRAS, APPS_PREFS, appsExtrasShown, type AppsExtraId} from '../../lib/ui-prefs/apps';
import {SHELL_FRAME} from '../../lib/ai/zigi-look';

/**
 * Session AL (owner decision O3): below 901 px (phones, the tablet rail and a phone turned sideways) nothing floats over
 * the page. One "Apps & extras" button (the phone's top bar; the tablet rail) opens this sheet, on every page, Settings
 * included: ZIGi, NOVA, the Checklist, Tasks, Notes, the Journal, the Agenda, Earn and Music, each only while it is
 * switched on (Settings → Your pages & buttons). ZIGi opens its panel, Music its player, the rest are pages. A native
 * modal dialog: the page behind is inert, Tab stays inside, Escape and the backdrop close it, and the focus returns to
 * the button. Computers keep their floating launchers and render none of this.
 */
let sheetOpen = false;
const listeners = new Set<() => void>();
export function setAppsExtrasOpen(open: boolean) { if (sheetOpen === open) return; sheetOpen = open; for (const l of listeners) l(); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useAppsExtrasOpen = () => useSyncExternalStore(subscribe, () => sheetOpen, () => false);
const BUTTON = '[data-testid="apps-extras-button"]';

/** Four small stars in a square: "more apps", in the nebula colours (decorative; the button carries the name). */
function AppsGlyph() {
  const id = `ax${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <svg className="apps-extras-glyph" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#63e7ff"/><stop offset=".5" stopColor="#826cff"/><stop offset="1" stopColor="#ff74be"/></linearGradient></defs>
    <g fill="none" stroke={`url(#${id})`} strokeWidth="1.8" strokeLinejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2.2"/></g>
    <path d="M17 13.2l1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1z" fill={`url(#${id})`}/>
  </svg>;
}

/** The sheet's button; the caller places it (the phone top bar or the tablet rail), and only one is ever rendered. */
export function AppsExtrasButton({className = ''}: {className?: string}) {
  const open = useAppsExtrasOpen();
  return <button type="button" className={`apps-extras-button ${className}`.trim()} data-testid="apps-extras-button" aria-label="Apps & extras" aria-haspopup="dialog" aria-expanded={open} onClick={() => setAppsExtrasOpen(true)}>
    <AppsGlyph/><span className="apps-extras-button-word" aria-hidden="true">Apps</span>
  </button>;
}

function Medallion({id}: {id: AppsExtraId}) {
  if (id === 'zigi') return <span className="icon-medallion apps-extras-zigi">
    {/* The locked ZIGi still frame (the launcher's own); a plain image. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={SHELL_FRAME.x1} srcSet={`${SHELL_FRAME.x1} 1x, ${SHELL_FRAME.x2} 2x`} width={30} height={39} alt="" decoding="async"/></span>;
  if (id === 'checklist') return <span className="icon-medallion"><ChecklistMark size={24}/></span>;
  if (id === 'earn') return <span className="icon-medallion"><EarnDockMark size={24}/></span>;
  return <span className="icon-medallion"><AppIcon name={APPS_EXTRAS[id].icon} size={22} luminous/></span>;
}

/** The sheet itself, mounted once by the shell. */
export function AppsExtrasSheet() {
  const compact = useCompactShell(), open = useAppsExtrasOpen(), path = usePathname() ?? '';
  const dialog = useRef<HTMLDialogElement>(null), handoff = useRef(false), titleId = useId(), noteId = useId();
  const view = usePagesView(), chain = useChainChoice(), ui = useUiPrefs(), apps = useDeviceRecord(APPS_PREFS);
  // ZIGi steps aside while a sign-in, unlock or recovery form shows on the page behind (ADR-012 rule 8): read as the
  // sheet opens, before the sheet itself counts as an open dialog.
  const [zigiBlocked, setZigiBlocked] = useState(false);
  const ids = appsExtrasShown({prefs: apps.data, zigi: isShown(view, 'zigi'), music: isShown(view, 'music'), earn: hrefShown(view, '/app/earn', {earn: chain.earnShown}), checklist: checklistPrefsOf(ui.data).launcher});
  // A new page closes the sheet, whatever started the navigation; so does leaving the compact layout.
  useEffect(() => { setAppsExtrasOpen(false); }, [path]);
  useEffect(() => { if (!compact) setAppsExtrasOpen(false); }, [compact]);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) { setZigiBlocked(isSensitiveScreen()); handoff.current = false; el.showModal(); }
    if (!open && el.open) el.close();
  }, [open, compact]);
  if (!compact) return null;
  const done = () => { setAppsExtrasOpen(false); };
  // Closed by Escape, the backdrop, ×, or a choice: the focus goes back to the button, unless a panel takes it over.
  const onClose = () => { setAppsExtrasOpen(false); if (!handoff.current) requestAnimationFrame(() => document.querySelector<HTMLElement>(BUTTON)?.focus({preventScroll: true})); handoff.current = false; };
  const openZigi = () => { if (zigiBlocked) return; handoff.current = true; done(); void openZigiPanel().then(ok => { if (!ok) document.querySelector<HTMLElement>(BUTTON)?.focus({preventScroll: true}); }); };
  const openMusic = () => { handoff.current = true; done(); requestAnimationFrame(() => requestAnimationFrame(openMusicPlayer)); };
  return <dialog ref={dialog} className="apps-extras-sheet" aria-label="Apps & extras" aria-describedby={noteId} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) done(); }}>
    <div className="apps-extras-panel">
      <div className="apps-extras-grabber" aria-hidden="true"/>
      <div className="apps-extras-head">
        <h2 id={titleId}>Apps &amp; extras</h2>
        <button type="button" className="apps-extras-close" aria-label="Close Apps & extras" onClick={done}>×</button>
      </div>
      <p className="apps-extras-note" id={noteId}>Your companion, tools and extras. Choose what shows here in Settings.</p>
      {ids.length ? <ul className="apps-extras-list">
        {ids.map(id => {
          const app = APPS_EXTRAS[id], current = !!app.href && (path === app.href || path.startsWith(`${app.href}/`));
          const copy = <span className="apps-extras-copy"><strong>{app.label}</strong><span>{id === 'zigi' && zigiBlocked ? 'Steps aside while a sign-in or recovery form shows on this page' : app.note}</span></span>;
          return <li key={id}>
            {app.href
              ? <Link href={app.href} prefetch={false} className="apps-extras-item" aria-current={current ? 'page' : undefined} onClick={done}><Medallion id={id}/>{copy}</Link>
              : <button type="button" className="apps-extras-item" aria-disabled={id === 'zigi' && zigiBlocked ? true : undefined} aria-haspopup="dialog" onClick={id === 'zigi' ? openZigi : openMusic}><Medallion id={id}/>{copy}</button>}
          </li>;
        })}
      </ul> : <p className="apps-extras-empty">Every app and extra is switched off. Turn the ones you want back on in Settings.</p>}
      <Link className="apps-extras-settings text-link" href="/app/settings#your-pages" prefetch={false} onClick={done}>Choose what shows here →</Link>
    </div>
  </dialog>;
}
