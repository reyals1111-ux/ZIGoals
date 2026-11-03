import {Skeleton} from '../ui/skeleton';

/**
 * Session AK (F6): the app's one placeholder (ui/skeleton.tsx: a polite status with the words for screen readers, a
 * card-shaped shape of what is coming) with the motion-safe nebula sheen of zg-skeleton.css. Session AK (G3): every
 * Skeleton now wears the sheen, so this is the same placeholder under the name the F6 surfaces use.
 */
export function ZgSkeleton(props: Parameters<typeof Skeleton>[0]) {
  return <Skeleton {...props}/>;
}
