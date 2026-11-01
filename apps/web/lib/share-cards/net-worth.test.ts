import {describe, expect, test} from 'vitest';
import {EXAMPLE_FOOTER, FOOTER, netWorthCard, netWorthChangeTenths, type NetWorthAmount, type NetWorthMoment} from './kinds';

const eur = (text: string): NetWorthAmount => { const [w, f = ''] = text.split('.'); return {value: BigInt(`${w}${f.padEnd(2, '0')}`), decimals: 2}; };
const money = (m: NetWorthAmount) => new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'EUR'}).format(Number(m.value) / 10 ** m.decimals);
const moment = (over: Partial<NetWorthMoment> = {}): NetWorthMoment => ({currency: 'EUR', now: eur('10420.00'), then: eur('10000.00'), sinceLabel: 'Sep 30, 2026', money, ...over});
const all = (c: {eyebrow: string; title: string; lines: readonly string[]; footer?: string}) => [c.eyebrow, c.title, ...c.lines, c.footer].join(' | ');

describe('BUILD list 2 #17: share a net-worth moment, amounts hidden', () => {
  test('hidden by default: the per cent and words only, never an amount', () => {
    const card = netWorthCard(moment({milestone: {amount: '10000', onLabel: 'Oct 12, 2026'}}));
    expect(card.kind).toBe('net-worth');
    expect(card.lines).toEqual(['Up 4.2% since Sep 30, 2026', 'Passed a milestone I picked, on Oct 12, 2026']);
    expect(all(card)).not.toMatch(/€|10,420|10,000|10420/);
    expect(card.hasSensitive).toBe(true);
    expect(card.title).toBe('A net-worth milestone');
    expect(card.footer).toBe(FOOTER);
  });
  test('amounts only with "Include numbers"', () => {
    const card = netWorthCard(moment({milestone: {amount: '10000', onLabel: 'Oct 12, 2026'}}), {sensitive: true});
    expect(card.lines).toEqual(['Up 4.2% since Sep 30, 2026', 'Passed a milestone I picked, on Oct 12, 2026', 'Milestone: €10,000.00', 'Net worth: €10,420.00', 'On Sep 30, 2026: €10,000.00']);
  });
  test('unknown values are not drawn: no earlier figure, or one at or below zero, gives no per cent', () => {
    expect(netWorthCard(moment({then: null})).lines).toEqual(['Steady steps add up.']);
    expect(netWorthCard(moment({then: eur('0')})).lines).toEqual(['Steady steps add up.']);
    expect(netWorthCard(moment({then: {value: -50000n, decimals: 2}})).lines).toEqual(['Steady steps add up.']);
    const nothing = netWorthCard(moment({now: null, then: null}));
    expect(nothing.hasSensitive).toBe(false);
    expect(netWorthCard(moment({now: null, then: null}), {sensitive: true}).lines).toEqual(['Steady steps add up.']);
  });
  test('the change is exact: down, about the same, mixed decimals, rounding half away from zero', () => {
    expect(netWorthChangeTenths(eur('9870.00'), eur('10000.00'))).toBe(-13n);
    expect(netWorthCard(moment({now: eur('9870.00')})).lines[0]).toBe('Down 1.3% since Sep 30, 2026');
    expect(netWorthCard(moment({now: eur('10004.00')})).lines[0]).toBe('About the same as on Sep 30, 2026');
    expect(netWorthChangeTenths({value: 1005n, decimals: 0}, {value: 100000n, decimals: 2})).toBe(5n); // 1005 vs 1000.00: +0.5 %
    expect(netWorthChangeTenths(eur('10005.00'), eur('10000.00'))).toBe(1n); // 0.05 % → 0.1 %
  });
  test('a Showcase card says Example', () => {
    const card = netWorthCard(moment(), {example: true});
    expect(card.eyebrow).toBe('Example · Net worth · EUR · accounts and debts');
    expect(card.footer).toBe(EXAMPLE_FOOTER);
    expect(card.fileName).toBe('zigoals-example-net-worth-eur-change.png');
  });
});
