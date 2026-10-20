'use client';
import Image from 'next/image';
import {DOCK_APPS} from '../../lib/earn/dock';

/**
 * Session AF chunk 2 (Part 5: P5.5, ADR-028 H68): on a phone the Earn dock is not a floating button; its apps are this
 * strip at the top of the Earn page (and a row in More). Each round button jumps to that app's section here. Hidden on
 * computers, where the dock floats on the right edge.
 * Session AF Gate C (design critique, money pages 13): the strip lists the ecosystem apps only (each with its own logo).
 * Start here and ZIGChain staking are the first two of the chip index right under it, so a phone no longer reads two
 * navigations that both begin "Start here"; the floating dock on a computer keeps all five.
 */
const ECOSYSTEM_APPS = DOCK_APPS.filter(app => app.logo !== null);
export function EarnAppsStrip() {
  return <nav className="earn-apps-strip" aria-label="Ecosystem apps">
    <ul>{ECOSYSTEM_APPS.map(app => <li key={app.id}><a href={`#${app.id}`} className="earn-apps-strip-app" data-app={app.id}>
      <span className="earn-dock-app-face" aria-hidden="true"><Image src={app.logo!} alt="" width={30} height={30} loading="lazy" unoptimized/></span>
      <span>{app.label}</span>
    </a></li>)}</ul>
  </nav>;
}
