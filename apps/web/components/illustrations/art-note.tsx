'use client';
import type {ReactNode} from 'react';
import {LazyPillarArt} from './lazy-pillar-art';
import type {ArtPillar} from './motifs';

/**
 * Session AK (G3): an empty state that is one line inside a card (a hint where the card's content will be) with its pillar
 * illustration beside it; narrower than 480 px the art sits above the words, smaller (placement.css). The art loads on use.
 */
export function ArtNote({pillar, children, className = ''}: {pillar: ArtPillar; children: ReactNode; className?: string}) {
  return <div className={`pillar-art-inline pillar-art-note ${className}`.trim()}>{children}<LazyPillarArt pillar={pillar} size={64}/></div>;
}
