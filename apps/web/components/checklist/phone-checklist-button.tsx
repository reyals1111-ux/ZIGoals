'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useLayoutEffect, useRef, useState} from 'react';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {checklistPrefsOf} from '../../lib/ui-prefs/schema';
import {CHECKLIST_ROUTE} from '../../lib/af-checklist-keys';
import {ChecklistMark} from './checklist-marks';
import './phone-checklist-button.css';

/**
 * Session AG Polish (ADR-030; owner addition of 22 Oct): the phone's one-tap way into the Checklist — a pill in the phone
 * header between the logo and "+", in the footer banner's link-pill style (glass, a nebula border, white words) with the
 * Checklist's nebula check. It opens /app/checklist as the computer's launcher does, is hidden on the Checklist itself
 * (its full-screen layer covers the header anyway) and follows the same "off" setting as the launcher (Settings →
 * Checklist button). Phones only (the header exists only there). S1 builds the rest of the phone's quick access around it.
 */
export function PhoneChecklistButton() {
  const pathname = usePathname() ?? '', prefsRecord = useUiPrefs();
  const prefs = checklistPrefsOf(prefsRecord.data);
  // In the header from the first paint (the launcher is on unless switched off), so it never pushes the header's icons
  // aside once the page has loaded (CI's layout-shift check); it leaves only once the stored settings say "off".
  const off = prefsRecord.loaded && (prefsRecord.unreadable || !prefs.launcher);
  const shown = !off && pathname !== CHECKLIST_ROUTE;
  const compact = useFitsHeader(shown);
  if (!shown) return null;
  // (No prefetch: on a phone every page would otherwise fetch the Checklist's route in the background — more Worker calls on
  // the Alpha, and in WebKit the app's own reads were still in flight when the next page opened, ADR-030 J22.)
  return <Link ref={compact.ref} href={CHECKLIST_ROUTE} prefetch={false} className="phone-checklist-pill" data-compact={compact.on || undefined} data-measured={compact.measured || undefined} aria-label="Open the Checklist"><ChecklistMark size={22}/><span className="phone-checklist-pill-word" aria-hidden="true">Checklist</span></Link>;
}

/**
 * The word goes only when the header has no room for it (a narrow phone with the wallet shortcut, or while the offline
 * pill shows): the pill then keeps its check alone, 44 px, and its name. It comes back once the header's free middle can
 * hold it again. Measured on the header's own size changes, never per frame.
 */
function useFitsHeader(active: boolean) {
  const ref = useRef<HTMLAnchorElement>(null), [on, setOn] = useState(false), [measured, setMeasured] = useState(false), extra = useRef(84);
  useLayoutEffect(() => {
    const pill = ref.current, row = pill?.closest<HTMLElement>('.phone-topbar-row'); if (!active || !pill || !row) return;
    const title = row.querySelector<HTMLElement>('.phone-title'), actions = pill.parentElement;
    // (Until measured, a narrow phone shows the check alone by CSS, so the page as served never scrolls sideways; the word is
    // shown for the first measure, then kept or let go.)
    pill.setAttribute('data-measured', '');
    const measure = () => {
      const wide = !pill.hasAttribute('data-compact');
      if (wide) {
        extra.current = Math.max(40, pill.getBoundingClientRect().width - 44);
        const spill = row.scrollWidth - row.clientWidth, last = actions?.lastElementChild?.getBoundingClientRect(), edge = document.documentElement.clientWidth;
        if (spill > 1 || (last && last.right > edge)) setOn(true);
      } else if ((title?.getBoundingClientRect().width ?? 0) >= extra.current - .5) setOn(false);
    };
    measure(); setMeasured(true);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(row); if (actions) ro?.observe(actions); if (title) ro?.observe(title);
    return () => ro?.disconnect();
  }, [active, on]);
  return {ref, on, measured};
}
