'use client';
import Image from 'next/image';
import {DOCK_APPS} from '../../lib/earn/dock';
import {EarnGlyphMark} from './earn-glyph';

/**
 * Session AF chunk 2 (Part 5: P5.5, ADR-028 H68): on a phone the Earn dock is not a floating button; its apps are this
 * strip at the top of the Earn page (and a row in More). Each round button jumps to that app's section here. Hidden on
 * computers, where the dock floats on the right edge.
 */
export function EarnAppsStrip() {
  return <nav className="earn-apps-strip" aria-label="Ecosystem apps">
    <ul>{DOCK_APPS.map(app => <li key={app.id}><a href={`#${app.id}`} className="earn-apps-strip-app" data-app={app.id}>
      <span className="earn-dock-app-face" aria-hidden="true">{app.logo ? <Image src={app.logo} alt="" width={30} height={30} loading="lazy" unoptimized/> : <EarnGlyphMark/>}</span>
      <span>{app.label}</span>
    </a></li>)}</ul>
  </nav>;
}
