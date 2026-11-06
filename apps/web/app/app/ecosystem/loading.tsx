import {Skeleton} from '../../../components/ui/skeleton';

/**
 * Session AL (BN-132; P-BN-52): while the Ecosystem page loads, its own placeholder shows at once (a title and two cards,
 * "Opening the ecosystem directory…" for screen readers), never the page you came from, such as Staking's.
 */
export default function Loading() {
  return <Skeleton page label="Opening the ecosystem directory…"/>;
}
