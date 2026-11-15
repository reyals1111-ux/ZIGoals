import {isValidElement, type ReactElement, type ReactNode} from 'react';
import {describe, expect, it} from 'vitest';
import {gaugeOf, litFigures} from '../../components/nova/chat/nova-readout';

/**
 * Session AM-2 (conversation console): an answer in NOVA's conversation is a read-out. Its figures are lit for the eye
 * only (the characters stay as they are), and one part of a whole in an on-device answer is drawn as a ring. The ring
 * never invents a figure: no part of a whole in the words, no ring.
 */
const text = (node: ReactNode): string => Array.isArray(node) ? node.map(text).join('') : isValidElement(node) ? text((node as ReactElement<{children?: ReactNode}>).props.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';

describe('the read-out lights figures without changing the words', () => {
  it('keeps every character', () => {
    for (const words of ['Next bill: Rent, €950.00, due in 16 days (Tue, Dec 1); 3 more after it.', 'You spent 427.99 EUR this month: 62 % of your plan.', 'No figures here.', '']) expect(text(litFigures(words))).toBe(words);
  });
  it('marks a number with its currency sign and its percent sign as one figure', () => {
    const parts = litFigures('Rent, €950.00, is 62% of it') as ReactNode[];
    expect(parts.filter(isValidElement).map(text)).toEqual(['€950.00', '62%']);
  });
});

describe('the ring shows only a part of a whole the words name', () => {
  it('reads "4 of 7", with a unit between, in Dutch, and a percentage', () => {
    expect(gaugeOf('Habits this week: 4 of 7 done today.')).toEqual({part: 4 / 7, label: '4/7'});
    expect(gaugeOf('Room to spend this week: 46.31 EUR of 200.00 EUR.')).toEqual({part: 46.31 / 200, label: '23%'});
    expect(gaugeOf('3 van 5 gedaan')).toEqual({part: 0.6, label: '3/5'});
    expect(gaugeOf('1,000 mL of 2,000 mL')).toEqual({part: 0.5, label: '50%'});
    expect(gaugeOf('You set aside 12.7% for goals.')).toEqual({part: 0.127, label: '12.7%'});
  });
  it('draws nothing when the words name no part of a whole', () => {
    for (const words of ['7 habits: Read, Walk.', 'Next bill: Rent, €950.00, due in 16 days.', '8 of 3 makes no whole', '5 of 0', '140% of plan', 'Step 2 of the guide is long: of 30 pages', ''])
      expect(gaugeOf(words), words).toBeNull();
  });
});
