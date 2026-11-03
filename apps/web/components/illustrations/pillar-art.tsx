import {useId} from 'react';
import {MOTIFS, type ArtPillar} from './motifs';
import './pillar-art.css';

export type {ArtPillar};
/**
 * Session AK (F6): hand-made pillar illustrations for empty states. A planet with a soft halo, a tilted ring that passes
 * behind it and in front of it, a moon on the ring and the pillar's own mark on the planet (motifs.tsx). Shapes only:
 * every colour comes from pillar-art.css (pillar, brand and accent tokens, which Nebula, Light and Dark share), so no
 * theme can break it. Static and decorative (aria-hidden); ids are unique per instance. Load it on use through
 * lazy-pillar-art.tsx, so a page carries none of it until its empty state shows.
 */
export function PillarArt({pillar, size = 112, className = ''}: {pillar: ArtPillar; size?: number; className?: string}) {
  const id = `pa${useId().replace(/[^a-zA-Z0-9]/g, '')}`, url = (name: string) => `url(#${id}-${name})`, Motif = MOTIFS[pillar];
  return <svg className={`pillar-art ${className}`.trim()} data-pillar={pillar} viewBox="0 0 120 96" width={size} height={Math.round(size * .8)} aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-body`} cx=".36" cy=".3" r=".78"><stop offset="0" className="pa-s-light"/><stop offset=".55" className="pa-s-body"/><stop offset="1" className="pa-s-deep"/></radialGradient>
      <radialGradient id={`${id}-halo`}><stop offset=".42" className="pa-s-halo"/><stop offset="1" className="pa-s-halo pa-s-clear"/></radialGradient>
      <linearGradient id={`${id}-ring`} gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="106" y2="0"><stop offset="0" className="pa-s-ring"/><stop offset=".5" className="pa-s-ring-mid"/><stop offset="1" className="pa-s-ring"/></linearGradient>
    </defs>
    <circle className="pa-halo" cx="60" cy="50" r="46" fill={url('halo')}/>
    <path className="pa-ring pa-ring-back" d="M15 59.6A46 13-12 0 1 105 40.4" stroke={url('ring')}/>
    <circle className="pa-planet" cx="60" cy="50" r="24" fill={url('body')}/>
    <path className="pa-rim" d="M41 37a23 23 0 0 1 33-5"/>
    <g className="pa-motif"><Motif/></g>
    <path className="pa-ring" d="M105 40.4A46 13-12 0 1 15 59.6" stroke={url('ring')}/>
    <circle className="pa-moon" cx="96" cy="51" r="4.4"/>
    <path className="pa-spark" d="M24 15q0 5 5 5-5 0-5 5 0-5-5-5 5 0 5-5Zm77-3q0 4 4 4-4 0-4 4 0-4-4-4 4 0 4-4Z"/>
    <circle className="pa-spark" cx="16" cy="80" r="1.4"/>
  </svg>;
}
export default PillarArt;
