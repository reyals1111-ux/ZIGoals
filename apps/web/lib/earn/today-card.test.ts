import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {positionSchema, type Position} from '../positions';
import {DOCK_APPS, dockBadges, dockHref} from './dock';
import {canBringBack, realPositionFrom, todayCardState} from './today-card';
import {dismissTodayCard, setTodayCard} from './records';
import {TodayEarnCard} from '../../components/earn/today-earn-card';

/**
 * Session AF chunk 2 (P1.30, Part 5): when Today's EARN card shows, and the dock's apps and badges. The card is for
 * newcomers: it steps aside once a real position exists (practice never counts, H11), can be dismissed and brought back,
 * and shows nothing before its records are read. Its first paint is one root carrying `hidden`.
 */
const ADDR = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx';
const pos = (network: string, sourceType: string, quantity: string, extra: Record<string, unknown> = {}): Position => positionSchema.parse({providerId: 'native-zig', network, account: ADDR, asset: 'ZIG', denom: 'azig', decimals: 18, verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-19T00:00:00.000Z', provenance: 'test', executionAuthority: 'NONE', id: `${network}:${sourceType}:${quantity}`, sourceType, quantity, liquidity: sourceType === 'NATIVE_STAKING' ? 'BONDED' : 'LIQUID', ...(sourceType === 'NATIVE_STAKING' ? {principal: quantity} : {}), ...extra});

describe('Today’s EARN card', () => {
  const base = {loaded: true, record: {version: 1 as const}, positions: [], journal: []};
  it('shows for a newcomer; waits for its records; a dismissal hides it and can be undone', () => {
    expect(todayCardState(base)).toBe('shown');
    expect(todayCardState({...base, loaded: false})).toBe('loading');
    expect(todayCardState({...base, record: dismissTodayCard({version: 1})})).toBe('dismissed');
    expect(canBringBack(dismissTodayCard({version: 1}))).toBe(true);
    expect(todayCardState({...base, record: setTodayCard('auto')(dismissTodayCard({version: 1}))})).toBe('shown');
    // A record this build cannot read never hides the card on a guess.
    expect(todayCardState({...base, unreadable: true, record: dismissTodayCard({version: 1})})).toBe('shown');
  });
  it('steps aside once a real stake or stZIG exists, or a real delegation was confirmed; practice never counts', () => {
    expect(todayCardState({...base, positions: [pos('zigchain-1', 'NATIVE_STAKING', '1')]})).toBe('has-position');
    expect(todayCardState({...base, positions: [pos('zigchain-1', 'LIQUID_STAKING', '5', {asset: 'stZIG', decimals: 6})]})).toBe('has-position');
    expect(todayCardState({...base, positions: [pos('zig-test-2', 'NATIVE_STAKING', '1')]})).toBe('shown');
    expect(todayCardState({...base, positions: [pos('zigchain-1', 'WALLET_LIQUID', '1')]})).toBe('shown');
    expect(todayCardState({...base, positions: [pos('zigchain-1', 'NATIVE_STAKING', '0')]})).toBe('shown');
    expect(realPositionFrom([], [{chainId: 'zigchain-1', action: 'delegate', state: 'CONFIRMED', wallet: ADDR}])).toBe(true);
    expect(realPositionFrom([], [{chainId: 'zig-test-2', action: 'delegate', state: 'CONFIRMED', wallet: ADDR}])).toBe(false);
  });
  it('first paint: one root, hidden until the records are read (it never flashes)', () => {
    const doc = new JSDOM(renderToStaticMarkup(createElement(TodayEarnCard))).window.document;
    const roots = doc.body.children;
    expect(roots).toHaveLength(1);
    expect(roots[0]!.tagName).toBe('SECTION');
    expect(roots[0]!.hasAttribute('hidden')).toBe(true);
    expect(roots[0]!.getAttribute('data-earn-card')).toBe('loading');
  });
});

describe('the Earn dock’s apps', () => {
  it('the live ecosystem apps in the page’s order, each opening its section; closing, paused and private apps are not in it', () => {
    expect(DOCK_APPS.map(a => a.id)).toEqual(['start-here', 'native-staking', 'valdora', 'oroswap', 'nawa']);
    expect(DOCK_APPS.map(a => dockHref(a.id))).toEqual(['/app/earn#start-here', '/app/earn#native-staking', '/app/earn#valdora', '/app/earn#oroswap', '/app/earn#nawa']);
    for (const id of ['zignaly', 'permapod', 'defa']) expect(DOCK_APPS.map(a => a.id)).not.toContain(id);
    for (const app of DOCK_APPS) if (app.logo) expect(app.logo).toMatch(/^\/ecosystem-logos\/[a-z-]+\.png$/);
  });
  it('badges: the person’s real stake and stZIG only, never practice', () => {
    expect(dockBadges([pos('zigchain-1', 'NATIVE_STAKING', '120'), pos('zigchain-1', 'NATIVE_STAKING', '30'), pos('zig-test-2', 'NATIVE_STAKING', '999'), pos('zigchain-1', 'LIQUID_STAKING', '7', {asset: 'stZIG', decimals: 6})])).toEqual({staked: 150n, stzig: 7n});
    expect(dockBadges([])).toEqual({staked: 0n, stzig: 0n});
  });
});
