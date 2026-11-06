import type {Position} from '../positions';

/**
 * Session AL (Part 15, C-BN-16 / P-BN-81 / GAP-146): "used by me" on an Ecosystem card, from what Wealth already holds.
 * Only a mapping a position itself proves is used: an stZIG holding is Valdora's liquid-staking token. No other position
 * names its project (positions are read by network and asset, not by app), so no other card claims one; nothing is guessed.
 */
export type UsedByMe = {count: number; what: string};
const live = (p: Position) => !p.archivedAt;
export function usedByMe(projectId: string, positions: readonly Position[]): UsedByMe | null {
  if (projectId === 'valdora') {
    const held = positions.filter(p => live(p) && p.asset === 'stZIG' && /[1-9]/.test(p.quantity));
    return held.length ? {count: held.length, what: 'stZIG, Valdora’s liquid-staking token'} : null;
  }
  return null;
}
