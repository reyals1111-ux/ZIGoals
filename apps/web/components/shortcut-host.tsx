'use client';
import {useEffect} from 'react';
import {askZigi} from './ai/ask';

/**
 * Home Screen shortcuts (Session AA-Cloud Part 7, the manifest's `shortcuts`): `/app?shortcut=quick-add` opens Quick add,
 * `?shortcut=water` brings Today's one-tap water button into view and focus (nothing is logged until it is tapped), and
 * `?shortcut=ask` opens ZIGi through its public ask (an empty composer; nothing is sent). Session AK (Part 3): Health's
 * `?shortcut=weight#weight` focuses the weight field (nothing is saved until the person saves it); "Today" is `/app/today`. "Check in a habit" is simply
 * `/app/habits`. The parameter is removed once it has been acted on, so a reload does not repeat it. Mounted by the shell.
 */
export function ShortcutHost() {
  useEffect(() => {
    const url = new URL(window.location.href), which = url.searchParams.get('shortcut');
    if (!which) return;
    url.searchParams.delete('shortcut');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    let tries = 0;
    const act = () => {
      tries += 1;
      if (which === 'ask') { askZigi(''); return; }
      const target = which === 'quick-add' ? [...document.querySelectorAll<HTMLButtonElement>('.quick-add-trigger')].find(b => b.offsetParent !== null) : which === 'water' ? document.querySelector<HTMLButtonElement>('button[aria-label$=" of water"]') : which === 'weight' ? document.querySelector<HTMLInputElement>('.health-fit-panel input:not([type=hidden]):not([disabled])') : null;
      if (target) { if (which === 'quick-add') target.click(); else { target.scrollIntoView({block: 'center'}); target.focus(); } return; }
      if (tries < 20) window.setTimeout(act, 150);
    };
    window.setTimeout(act, 100);
  }, []);
  return null;
}
