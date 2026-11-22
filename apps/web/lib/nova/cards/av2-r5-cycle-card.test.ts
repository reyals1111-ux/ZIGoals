import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {cycleCard, cycleReadout, cycleRows} from './health-more';
import {showcaseCycle} from '../../cycle/showcase';
import {setCycleChoice} from '../../cycle/words';

/**
 * Session AV lane 2 (r5-body; review B5H-2, LEDGER #383): the NOVA cycle card's visible readout honours "No period" —
 * "Not shown · You chose No period in the cycle log.", never "After null more complete cycles". Text only: the widget's
 * layout and look are unchanged (AR's NOVA composition is protected).
 */
const DAY = '2026-11-17', range = (from: string, to: string) => `${from} – ${to}`;
describe('the cycle card readout', () => {
  test('No period: not shown, in words; the hidden table says the same', () => {
    const card = cycleCard(setCycleChoice(showcaseCycle(DAY), 'noPeriod', true), DAY);
    expect(cycleReadout(card, range)).toEqual({value: 'Not shown', sub: 'You chose No period in the cycle log.', long: false});
    expect(cycleRows(card, d => d).find(r => r[0] === 'Next period, an estimate')?.[1]).toBe('Not shown: you chose No period in the cycle log');
    expect(JSON.stringify(cycleReadout(card, range))).not.toMatch(/null|more complete/);
  });
  test('otherwise as before: the range, or how many cycles are still needed', () => {
    const card = cycleCard(showcaseCycle(DAY), DAY);
    expect(cycleReadout(card, range)).toMatchObject({value: `${card.estimate!.from} – ${card.estimate!.to}`, long: true});
    expect(cycleReadout({...card, estimate: null, need: 2}, range)).toEqual({value: 'Not yet', sub: 'After 2 more complete cycles.', long: false});
  });
  test('the widget reads its readout from cycleReadout (its markup is otherwise unchanged)', () => {
    const src = readFileSync(new URL('../../../components/nova/widgets/cycle.tsx', import.meta.url), 'utf8');
    expect(src).toContain('cycleReadout(card,');
    expect(src).toContain('<span className="nx-readout-value" data-long={readout.long ? \'\' : undefined}>{readout.value}</span>');
  });
});
