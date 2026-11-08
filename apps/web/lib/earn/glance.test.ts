import {describe, expect, test} from 'vitest';
import {COMPARE_ROWS, valdoraTags, vaultsTags} from './glance';
import {EARN_SECTIONS} from './options';

/** Session AL fifth pass (C-BN-07): the side-by-side table of Earn's ways to earn. */
describe('Earn comparison (C-BN-07)', () => {
  test('its rows are ways to earn the page lists, in the page\'s own order (never by rate), each with its sources', () => {
    const order = EARN_SECTIONS.map(s => s.id as string), ids = COMPARE_ROWS.map(r => r.id as string);
    for (const id of ids) expect(order, id).toContain(id);
    expect([...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(ids);
    expect(ids).toEqual(['native-staking', 'valdora', 'valdora-vaults', 'oroswap', 'nawa', 'defa', 'permapod', 'zignaly']);
    for (const row of COMPARE_ROWS) { expect(row.sources.length, row.id).toBeGreaterThan(10); expect(row.what.length, row.id).toBeGreaterThan(3); }
    // Information, never advice: no row ranks or recommends.
    expect(JSON.stringify(COMPARE_ROWS)).not.toMatch(/\b(best|recommend|should|top pick|highest)\b/i);
  });
  test('the live labels follow the same reads as the sections', () => {
    expect(valdoraTags(null)[0]).toEqual({tone: 'live', text: 'Live on mainnet'});
    expect(valdoraTags({paused: true})[0]).toEqual({tone: 'paused', text: 'Paused right now'});
    expect(valdoraTags({emergencyMode: true})[0]).toEqual({tone: 'paused', text: 'Emergency mode on'});
    expect(vaultsTags(true)[0]).toEqual({tone: 'paused', text: 'A vault is paused'});
    expect(vaultsTags(false).map(t => t.text)).toEqual(['Live on mainnet', 'A curator holds the money', 'Holds USDC on Noble']);
  });
});
