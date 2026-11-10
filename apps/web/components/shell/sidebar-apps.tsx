'use client';
import './sidebar-apps.css';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useId, useRef, type KeyboardEvent} from 'react';
import {AppIcon} from '../app-icon';
import {navPrefetch} from '../nav-prefetch';
import {isNavActive} from '../app-nav';
import {useDeviceRecord} from '../ai/use-device-record';
import {APPS_EXTRAS, APPS_PREFS, SIDEBAR_APP_IDS, appShown, sidebarFolded, withSidebarFolded} from '../../lib/ui-prefs/apps';

/**
 * Session AL (owner decision O4): the desktop sidebar's "Apps" group, below the main pages: NOVA, Tasks, Notes, the
 * Journal and the Agenda, each while it is switched on (Settings → Your pages & buttons). A button with aria-expanded
 * folds it; the fold is remembered on this device only (`zigoals:apps:v1` `sidebarFolded`). Up and Down move between the
 * header and the links; Tab follows the same order. Computers only (navigation.css hides it below 901 px, where the rail
 * and the "Apps & extras" sheet list these). The main pages, the fold marks, the sky and the planet are unchanged: these
 * entries leave the main list on a computer instead (app-nav.tsx `data-nav-app`). Journey, Life review, Stories and ZIGi
 * stay out (picklist 2 TO9).
 */
export function SidebarApps() {
  const path = usePathname() ?? '', prefs = useDeviceRecord(APPS_PREFS), listId = useId(), group = useRef<HTMLElement>(null);
  // Until the record is read, the server's view: open, every app shown (no layout jump for the usual case).
  const folded = prefs.loaded && sidebarFolded(prefs.data), apps = SIDEBAR_APP_IDS.filter(id => appShown(prefs.data, id));
  if (!apps.length) return null;
  const toggle = () => { try { prefs.update(p => withSidebarFolded(p, !folded)); } catch { /* storage refused: stays as it is */ } };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = Array.from(group.current?.querySelectorAll<HTMLElement>('.sidebar-apps-toggle, .sidebar-apps-list a') ?? []).filter(el => el.getClientRects().length);
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    event.preventDefault();
    items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };
  return <nav ref={group} className="sidebar-apps" aria-label="Apps" data-testid="sidebar-apps-group" data-folded={folded || undefined} onKeyDown={onKeyDown}>
    <button type="button" className="sidebar-apps-toggle" aria-expanded={!folded} aria-controls={listId} onClick={toggle}>
      <span>Apps</span>
      <svg className="sidebar-apps-chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    <ul id={listId} className="sidebar-apps-list" hidden={folded}>
      {apps.map(id => {
        const app = APPS_EXTRAS[id], href = app.href!, current = isNavActive(path, href);
        return <li key={id}><Link href={href} prefetch={navPrefetch(href)} aria-current={current ? 'page' : undefined}><AppIcon name={app.icon} size={18} luminous={current}/><span>{app.label}</span></Link></li>;
      })}
    </ul>
  </nav>;
}
