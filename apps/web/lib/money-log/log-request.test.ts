import {afterEach, describe, expect, test, vi} from 'vitest';
import {LOG_SPENDING_EVENT, requestLogSpending, takeLogSpending} from './log-request';

// Session AV lane 2 (fr-money, FR-L-4): the Wealth hero's "Log spending" and Quick add's Spending row ask Spending to open its form.
describe('a request to open Log spending', () => {
  afterEach(() => { takeLogSpending(); vi.unstubAllGlobals(); });
  test('is taken once: by Spending when it mounts later, never twice', () => {
    expect(takeLogSpending()).toBe(false);
    requestLogSpending();
    expect(takeLogSpending()).toBe(true);
    expect(takeLogSpending()).toBe(false);
  });
  test('tells a Spending already on the page at once', () => {
    const seen: string[] = [], target = new EventTarget();
    target.addEventListener(LOG_SPENDING_EVENT, event => seen.push(event.type));
    vi.stubGlobal('window', target);
    requestLogSpending();
    expect(seen).toEqual([LOG_SPENDING_EVENT]);
    expect(takeLogSpending()).toBe(true);
  });
});
