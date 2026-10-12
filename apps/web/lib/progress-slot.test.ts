import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProgressSlot, Slot, registerProgressCard, registerSlotCard, slotCards} from '../components/progress/slot';

const Card = () => createElement('p', null, 'game card');
const Other = () => createElement('p', null, 'other card');

describe('progress slot (Session AA-Cloud Part 1)', () => {
  it('renders nothing until a card is registered', () => {
    expect(renderToStaticMarkup(createElement(ProgressSlot, {page: 'markets'}))).toBe('');
  });
  it('renders registered cards in order, ignores a duplicate, and removes a card again', () => {
    const offA = registerProgressCard('wealth', Card);
    const offDuplicate = registerProgressCard('wealth', Card);
    const offB = registerProgressCard('wealth', Other);
    expect(slotCards('wealth')).toEqual([Card, Other]);
    // The server snapshot is always empty, so a card registered in the browser never causes a hydration mismatch; the
    // browser shows it right after hydration (useSyncExternalStore's client snapshot, checked in progress-slot.client.test.ts).
    expect(renderToStaticMarkup(createElement(ProgressSlot, {page: 'wealth'}))).toBe('');
    offA();
    offDuplicate();
    expect(slotCards('wealth')).toEqual([Other]);
    offB();
    expect(slotCards('wealth')).toEqual([]);
    expect(renderToStaticMarkup(createElement(ProgressSlot, {page: 'wealth'}))).toBe('');
  });
  it('keeps named places apart from pages', () => {
    const off = registerSlotCard('today:game', Card);
    expect(renderToStaticMarkup(createElement(ProgressSlot, {page: 'today'}))).toBe('');
    expect(slotCards('today:game')).toEqual([Card]);
    expect(slotCards('today')).toEqual([]);
    expect(renderToStaticMarkup(createElement(Slot, {place: 'today:game'}))).toBe('');
    off();
  });
});
