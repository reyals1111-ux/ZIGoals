'use client';
import {useEffect, useLayoutEffect} from 'react';
import {hashId} from '../../lib/hash-id';
import {holdInView} from '../settings/keep-jump';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Session AK CI fix (lane: earn-dock:62): Earn's sections below the first screen skip their layout until they near the
 * screen (`content-visibility: auto`, earn.css, F8), so a jump to `/app/earn#valdora` (the dock's fan, a link, a reload)
 * landed on the sections' estimated 1100 px; the sections above then took their real heights (Native staking about
 * 3,000 px, Start here's path another 1,400 px) and pushed the target off the screen, as the browser's scroll anchoring
 * does not always hold it. Settings' pattern (settings-render-all.tsx and keep-jump.tsx), sized to Earn: on a jump, the
 * target's section and every section before it lay out in full (`data-laid-out`, kept for the visit) before the
 * browser scrolls, the target lands under the index, and it is held there while the page's live figures fill in above
 * it (until the page has been still for two seconds, ten at most, or the person scrolls, taps or types). Sections after
 * the target keep skipping their layout, and a load without a fragment is unchanged.
 */
export function EarnJump() {
  useIsoLayoutEffect(() => {
    const sections = document.querySelector<HTMLElement>('.earn-sections');
    if (!sections) return;
    // Lays out the section holding the fragment's target and every section before it; returns the target.
    const layOut = (hash: string) => {
      const id = hashId(hash), target = id ? document.getElementById(id) : null;
      if (!target) return null;
      const own = [...sections.children].find(child => child.contains(target));
      if (own) for (const child of sections.children) { (child as HTMLElement).dataset.laidOut = ''; if (child === own) break; }
      return target;
    };
    let stop = () => {};
    // The hold also ends when the page is scrolled away from the target by anything but the hold itself or the
    // browser's scroll anchoring (both keep the target where it is): find-in-page, a script's scroll, the scrollbar.
    // Otherwise the next section that lays out below would pull the page back to the target. A scroll away moves the
    // target against the scroll; content growing above moves it with the scroll's correction, and is held.
    const hold = (target: HTMLElement | null) => {
      stop();
      if (!target) return;
      const top = target.getBoundingClientRect().top, release = holdInView(target);
      let y = window.scrollY;
      const onScroll = () => {
        const moved = target.getBoundingClientRect().top - top, scrolled = window.scrollY - y;
        y = window.scrollY;
        if (Math.abs(moved) > 4 && Math.abs(scrolled) > 4 && (moved > 0) !== (scrolled > 0) /* opposite directions (the staking guard allows no sign call outside the wallet code) */) stop();
      };
      window.addEventListener('scroll', onScroll, {passive: true});
      stop = () => { release(); window.removeEventListener('scroll', onScroll); stop = () => {}; };
    };
    if (window.location.hash.length > 1) {
      // Opened on a fragment (a reload, or a link from another page): the browser or the router may already have
      // jumped onto the estimates; land on the measured sizes now (instantly), then hold the target there.
      const target = layOut(window.location.hash);
      target?.scrollIntoView({block: 'start', behavior: 'instant'});
      hold(target);
    }
    // A jump within the page (the chips, Start here, the phone's strip, the dock's fan): lay out before the browser
    // scrolls; once it has (hashchange), hold the target.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
      if (!link) return;
      const url = new URL(link.href, window.location.href);
      if (url.pathname === window.location.pathname) layOut(url.hash);
    };
    const onHash = () => hold(layOut(window.location.hash));
    type Nav = {addEventListener: (t: string, f: (e: {destination: {url: string}}) => void) => void; removeEventListener: (t: string, f: (e: {destination: {url: string}}) => void) => void};
    const nav = (window as Window & {navigation?: Nav}).navigation;
    const onNavigate = (event: {destination: {url: string}}) => { const url = new URL(event.destination.url); if (url.hash.length > 1 && url.pathname === window.location.pathname) layOut(url.hash); };
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHash);
    nav?.addEventListener('navigate', onNavigate);
    return () => { stop(); document.removeEventListener('click', onClick, true); window.removeEventListener('hashchange', onHash); nav?.removeEventListener('navigate', onNavigate); };
  }, []);
  return null;
}
