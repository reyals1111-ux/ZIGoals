'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {checklistPrefsOf} from '../../lib/ui-prefs/schema';
import {CHECKLIST_ROUTE} from '../../lib/af-checklist-keys';
import {registerNavExtra} from '../nav-extras';
import {usePhoneActive} from '../phone/use-phone-layout';
import {entranceAllowed} from '../use-entrance';
import {ChecklistMark} from './checklist-marks';
import './checklist-launcher.css';

const SEEN = 'zigoals-checklist-mark-seen';
/**
 * The Checklist's button (Session AF, L3; P7.19, P7.20, ADR-028 H65, H68): ZIGi's and the music button's twin — the same
 * circle, rim, glass and glow, following ZIGi's size — with the Checklist's nebula mark, whose check draws once the first
 * time it is seen in a visit (still under reduced motion and Motion Off). It sits between Music (above) and ZIGi (below);
 * the right-edge stack's slots (`--launcher-slot-*`, music-launcher.css) move Music up while it shows and back when it is
 * switched off. The arrow under it tucks it into the screen's edge; the edge tab brings it back. Phones get no third
 * floating button: the Checklist is in More (the navigation entry this registers), on Today's card and on the Home Screen
 * shortcut. Off in Settings (this device), the button goes; the page stays reachable. Light: one display record read.
 */
export function ChecklistLauncher() {
  const pathname = usePathname() ?? '', phone = usePhoneActive(), prefsRecord = useUiPrefs();
  const [mounted, setMounted] = useState(false), [draw, setDraw] = useState(false);
  const prefs = checklistPrefsOf(prefsRecord.data), ready = mounted && prefsRecord.loaded && !prefsRecord.unreadable;
  const shown = ready && prefs.launcher && !phone && pathname.startsWith('/app');
  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);
  // In the navigation (the sidebar, the phone's More sheet, search) on every device: the page is always reachable.
  useEffect(() => registerNavExtra([CHECKLIST_ROUTE, 'Checklist', 'checklist']), []);
  useEffect(() => {
    if (!shown || prefs.folded) return;
    let seen = true; try { seen = sessionStorage.getItem(SEEN) === '1'; sessionStorage.setItem(SEEN, '1'); } catch { seen = true; }
    if (!seen && entranceAllowed()) { setDraw(true); const t = window.setTimeout(() => setDraw(false), 1400); return () => window.clearTimeout(t); }
  }, [shown, prefs.folded]);
  const setFolded = (folded: boolean) => { try { prefsRecord.update(p => ({...p, checklist: {...(p.checklist ?? {}), folded}})); } catch { /* storage refused: stays as it is */ } };
  if (!shown) return null;
  const here = pathname === CHECKLIST_ROUTE;
  if (prefs.folded) return <button type="button" className="checklist-edge-tab" aria-label="Show the Checklist button" onClick={() => setFolded(false)}><ChecklistMark size={24}/></button>;
  return <div className="checklist-launcher-stack">
    <Link href={CHECKLIST_ROUTE} className="checklist-launcher" aria-label="Open the Checklist: today’s path" aria-current={here ? 'page' : undefined} data-here={here || undefined}><ChecklistMark draw={draw}/></Link>
    <button type="button" className="checklist-launcher-fold" aria-label="Tuck the Checklist button away" data-tip="Tuck away" onClick={() => setFolded(true)}>
      <svg viewBox="0 0 12 22" width="12" height="22" aria-hidden="true" focusable="false"><defs><linearGradient id="checklist-fold-nebula" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#63e7ff"/><stop offset=".5" stopColor="#826cff"/><stop offset="1" stopColor="#c664ff"/></linearGradient></defs><path d="M3 3l6 8-6 8" fill="none" stroke="url(#checklist-fold-nebula)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
  </div>;
}
