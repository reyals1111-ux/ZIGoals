import {describe, expect, it} from 'vitest';
import {consumerLines} from './filter';
import {EARLIER_LINKS, WHATS_NEW_LINKS} from '../../components/for-you/whats-new-card';

/** The regex consumer-first-x1.spec.ts holds Today's text to, below the hero. */
const CHAIN_WORDS = /\bZIG\b|Keplr|Testnet|Contract|[Ss]imulated|Demo records|Staked|Staking|ZIGChain/;

describe("What's new without the chain (R2-6)", () => {
  it('no line names the chain until it is chosen, in the new links and Earlier updates', () => {
    for (const list of [WHATS_NEW_LINKS, EARLIER_LINKS]) for (const l of consumerLines(list, false)) expect(l.label).not.toMatch(CHAIN_WORDS);
    const labels = consumerLines(EARLIER_LINKS, false).map(l => l.label).join(' | ');
    expect(labels).not.toMatch(/Keplr|Staking|\bZIG\b|wallet/);
  });
  it('the earlier lists really had chain lines, and the rest stay in order', () => {
    const kept = consumerLines(EARLIER_LINKS, false);
    expect(kept.length).toBeLessThan(EARLIER_LINKS.length);
    expect(kept.length).toBeGreaterThan(EARLIER_LINKS.length / 2);
    expect(kept).toEqual(EARLIER_LINKS.filter(l => kept.includes(l)));
    expect(kept.map(l => l.label)).toContain('Habits that tick themselves off from Health');
  });
  it('once the chain is chosen every line shows', () => {
    expect(consumerLines(EARLIER_LINKS, true)).toEqual(EARLIER_LINKS);
    expect(consumerLines([], false)).toEqual([]);
  });
});
