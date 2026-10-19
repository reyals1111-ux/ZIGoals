import type {Position} from '../positions';
import type {EarnPath} from './records';
import type {JournalFact} from './start-here';

/**
 * Session AF chunk 2 (P1.30, H29): when Today's EARN card shows. It is for newcomers: shown until the person holds a real
 * position (stake or stZIG on ZIGChain, as the tracked wallets or the staking journal show it), unless they dismissed it
 * on this device (`zigoals:earn-path:v1` todayCard). Brought back from the Earn page or Settings (todayCard 'auto').
 * Practice stake never counts as a position (H11). Nothing shows before the record is read, so the card never flashes.
 */
export type TodayCardInput = {loaded: boolean; unreadable?: boolean; record: EarnPath; positions: readonly Position[]; journal: readonly JournalFact[]};
export function realPositionFrom(positions: readonly Position[], journal: readonly JournalFact[]): boolean {
  const held = positions.some(p => p.network === 'zigchain-1' && (p.sourceType === 'NATIVE_STAKING' || p.sourceType === 'LIQUID_STAKING') && /^\d+$/.test(p.quantity) && BigInt(p.quantity) > 0n);
  return held || journal.some(e => e.chainId === 'zigchain-1' && e.action === 'delegate' && e.state === 'CONFIRMED');
}
export function todayCardState({loaded, unreadable, record, positions, journal}: TodayCardInput): 'shown' | 'loading' | 'dismissed' | 'has-position' {
  if (!loaded) return 'loading';
  if (!unreadable && record.todayCard === 'dismissed') return 'dismissed';
  if (realPositionFrom(positions, journal)) return 'has-position';
  return 'shown';
}
/** Whether the card has stepped aside for good reasons the person can undo from the Earn page: only a dismissal is undoable. */
export const canBringBack = (record: EarnPath) => record.todayCard === 'dismissed';
