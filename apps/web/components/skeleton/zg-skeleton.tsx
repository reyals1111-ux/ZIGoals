import {Skeleton} from '../ui/skeleton';
import './zg-skeleton.css';

/**
 * Session AK (F6): the app's one placeholder (ui/skeleton.tsx: a polite status with the words for screen readers, a
 * card-shaped shape of what is coming) with the motion-safe nebula sheen of zg-skeleton.css.
 */
export function ZgSkeleton({className = '', ...props}: Parameters<typeof Skeleton>[0]) {
  return <Skeleton {...props} className={`zg-skeleton ${className}`.trim()}/>;
}
