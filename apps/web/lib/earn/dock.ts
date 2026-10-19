import type {Position} from '../positions';

/**
 * Session AF chunk 2 (Part 5: P5.1–P5.5, ADR-028 H12, H65, H68): the Earn dock's round buttons, in the Earn page's own
 * order (never by rate): the network's own staking, then the live ecosystem apps a person can use today with their
 * official logos (public/ecosystem-logos, the Ecosystem page's files). Each opens that app's section of the Earn page
 * (`/app/earn#<id>`), where "Open <app>" starts guide mode. Apps that are closing, paused or private are not in the dock;
 * their sections stay on the page. A badge shows the person's own position where ZIGoals can read one (staked ZIG,
 * stZIG), never a rate.
 */
export type DockApp = {id: string; label: string; logo: string | null; badge: 'staked' | 'stzig' | null};
export const DOCK_APPS: readonly DockApp[] = Object.freeze([
  {id: 'start-here', label: 'Start here', logo: null, badge: null},
  {id: 'native-staking', label: 'ZIGChain staking', logo: null, badge: 'staked'},
  {id: 'valdora', label: 'Valdora', logo: '/ecosystem-logos/valdora.png', badge: 'stzig'},
  {id: 'oroswap', label: 'OroSwap', logo: '/ecosystem-logos/oroswap.png', badge: null},
  {id: 'nawa', label: 'Nawa', logo: '/ecosystem-logos/nawa.png', badge: null},
]);
export const dockHref = (id: string) => `/app/earn#${id}`;
/** The person's own real-network holdings for the badges, in base units (azig; stZIG units). Practice never counts (H11). */
export function dockBadges(positions: readonly Position[]): {staked: bigint; stzig: bigint} {
  let staked = 0n, stzig = 0n;
  for (const p of positions) {
    if (p.network !== 'zigchain-1' || !/^\d+$/.test(p.quantity)) continue;
    if (p.sourceType === 'NATIVE_STAKING' && p.asset === 'ZIG') staked += BigInt(p.quantity);
    if (p.sourceType === 'LIQUID_STAKING' && p.asset === 'stZIG') stzig += BigInt(p.quantity);
  }
  return {staked, stzig};
}
