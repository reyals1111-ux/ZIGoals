'use client';
import {usePathname} from 'next/navigation';
import {pillarOfHref} from '../../lib/pillar-route';
import {LazyPillarArt} from './lazy-pillar-art';
import type {ArtPillar} from './motifs';

/**
 * Session AK (G3): the pillar illustration of the app's one empty state (ui/empty-state.tsx). Unless the empty state names
 * its pillar, the page's own pillar is used (Goals, Habits, Health, Wealth), and the cross-pillar orbit elsewhere. Loaded
 * on use (lazy-pillar-art.tsx); placed by placement.css.
 */
export function EmptyArt({pillar}: {pillar?: ArtPillar}) {
  const path = usePathname();
  return <LazyPillarArt pillar={pillar ?? pillarOfHref(path ?? '') ?? 'orbit'}/>;
}
