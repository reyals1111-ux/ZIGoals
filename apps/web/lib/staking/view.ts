import {formatUnits} from '@zigoals/chain-config';
import type {Position} from '../positions';
import type {WireValidator} from '../chain/validators-wire';

/**
 * Session AF (L2 design §4): the plain-words pieces the staking screens show, as pure functions. Every number comes from
 * the chain (a quote, the relay's positions or the validators route); nothing here estimates or ranks by return.
 */
/** "0.05" → "5%"; "0.083249673843021991" → "8.32%" (two places at most, never rounded up to look better). */
export function percentText(unit: string): string {
  if (!/^\d+(\.\d+)?$/.test(unit)) return 'unavailable';
  const [whole = '0', fraction = ''] = unit.split('.');
  const basis = BigInt(whole) * 10000n + BigInt((fraction + '0000').slice(0, 4));
  const int = basis / 100n, rest = basis % 100n;
  return `${int}${rest ? `.${rest.toString().padStart(2, '0').replace(/0$/, '')}` : ''}%`;
}
/** 1814400 → "21 days". */
export const daysText = (seconds: number) => { const days = seconds / 86400; return Number.isInteger(days) ? `${days} day${days === 1 ? '' : 's'}` : `${Math.round(seconds / 3600)} hours`; };
/** An azig amount as ZIG with the thousands grouped: "1,234.5678 ZIG". */
export function zigText(azig: string): string {
  if (!/^\d{1,78}$/.test(azig)) return 'unavailable';
  const [whole = '0', fraction] = formatUnits(azig, 18).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''} ZIG`;
}
/** "about 0.00061 ZIG", for a fee: six significant places are plenty to recognise it in the wallet. */
export function feeText(azig: string): string {
  const exact = formatUnits(azig, 18);
  const [whole = '0', fraction = ''] = exact.split('.');
  if (whole !== '0') return `about ${zigText(azig).replace(/(\.\d{6})\d+/, '$1')}`;
  const lead = fraction.search(/[1-9]/);
  return `about 0.${fraction.slice(0, lead < 0 ? 0 : lead + 3).replace(/0+$/, '') || '0'} ZIG`;
}
export const groupDigits = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export type Holding = {validator: string; name: string; amount: string};
/** The connected address's own observed positions on one network (the relay's reading, the tracker's record). */
export function holdingsOf(positions: readonly Position[], chainId: string, address: string) {
  const mine = positions.filter(p => p.network === chainId && p.account === address && p.providerId === 'native-zig' && p.asset === 'ZIG' && !p.archivedAt);
  const of = (type: Position['sourceType']): Holding[] => mine.filter(p => p.sourceType === type && p.validator && p.quantity !== '0').map(p => ({validator: p.validator!.address, name: p.validator!.name || p.validator!.address, amount: p.quantity}));
  const liquid = mine.find(p => p.sourceType === 'WALLET_LIQUID');
  return {
    observed: mine.length > 0,
    liquid: liquid?.quantity,
    observedAt: liquid?.observedAt,
    provenance: liquid?.provenance,
    delegations: of('NATIVE_STAKING'),
    rewards: of('NATIVE_REWARDS'),
    unbonding: mine.filter(p => p.sourceType === 'NATIVE_UNBONDING' && p.quantity !== '0'),
  };
}
/** How concentrated the bonded stake is: the share the largest `count` bonded validators hold (an honest fact, not advice). */
export function concentrationOf(validators: readonly WireValidator[], count = 4): {count: number; share: string} | null {
  const bonded = validators.filter(v => v.status === 'bonded').map(v => v.votingPowerShare);
  if (bonded.length <= count) return null;
  const top = [...bonded].sort((a, b) => Number(b) - Number(a)).slice(0, count);
  const scale = 10n ** 18n;
  const total = top.reduce((n, s) => { const [w = '0', f = ''] = s.split('.'); return n + BigInt(w) * scale + BigInt((f + '0'.repeat(18)).slice(0, 18)); }, 0n);
  const whole = total / scale, fraction = (total % scale).toString().padStart(18, '0').replace(/0+$/, '');
  return {count, share: `${whole}${fraction ? `.${fraction}` : ''}`};
}
