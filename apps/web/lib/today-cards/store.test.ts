import {describe, expect, test} from 'vitest';
import {emptyTodayCards, shownCards, TODAY_CARDS_KEY, todayCardsSchema, toggleCard} from './store';

describe('Today cards kept on this device (Session AA-Cloud Part 8)', () => {
  test('its own versioned key; empty by default', () => {
    expect(TODAY_CARDS_KEY).toBe('zigoals:today-cards:v1');
    expect(shownCards(emptyTodayCards())).toEqual([]);
  });
  test('a card is added at the end and taken away again; the order is the person\'s', () => {
    let s = toggleCard(emptyTodayCards(), 'forecasts');
    s = toggleCard(s, 'balance');
    expect(shownCards(s)).toEqual(['forecasts', 'balance']);
    expect(shownCards(toggleCard(s, 'forecasts'))).toEqual(['balance']);
  });
  test('a newer build\'s card and fields are kept and ignored, never an error', () => {
    const s = todayCardsSchema.parse({version: 1, cards: ['coach', 'balance', 'balance'], later: {x: 1}});
    expect(shownCards(s)).toEqual(['balance']);
    expect(toggleCard(s, 'calculator')).toMatchObject({cards: ['coach', 'balance', 'balance', 'calculator'], later: {x: 1}});
  });
  test('refuses another version and odd names', () => {
    expect(todayCardsSchema.safeParse({version: 2, cards: []}).success).toBe(false);
    expect(todayCardsSchema.safeParse({version: 1, cards: ['<script>']}).success).toBe(false);
  });
});
