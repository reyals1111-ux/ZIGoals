// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ProgressCard} from '../../components/goals/progress-card';
import {progressCardFileName, progressPercent, progressShareCard} from '../../components/goals/progress-card-content';
import {DEFAULT_DISPLAY_LOCALE, setDisplayLocale} from '../visual-format';

// Session AK (6.3 / 8.5): the goal progress share card. Kept beside the what-if tests (this lane's lib/goals/what-if*
// scope) so the root vitest include runs it.
beforeAll(() => setDisplayLocale(DEFAULT_DISPLAY_LOCALE));
const goal = {title: 'Emergency fund', current: 3200, target: 15000, currency: 'EUR', date: '2027-06-30'};

describe('content', () => {
  test('title and percentage by default; amounts and date only when chosen; unknown is not 0%', () => {
    expect(progressShareCard(goal)).toEqual({eyebrow: 'Goal progress', title: 'Emergency fund', lines: ['21% of the way']});
    expect(progressShareCard(goal, {showAmounts: true, showDate: true}).lines).toEqual(['21% of the way', '€3,200.00 of €15,000.00', 'Target date: Jun 30, 2027']);
    expect(progressShareCard({...goal, current: null}, {showAmounts: true}).lines).toEqual(['Progress not recorded yet']);
    expect(progressShareCard({title: 'Read', current: 12, target: 12, unit: 'books'}, {showAmounts: true}).lines).toEqual(['Reached · 100%', '12 books of 12 books']);
    expect([progressPercent(5, 0), progressPercent(-1, 10), progressPercent(30, 10), progressPercent(Number.NaN, 10)]).toEqual([null, null, 100, null]);
    expect(progressCardFileName('Trip to Lisbon!')).toBe('trip-to-lisbon-progress.png');
    expect(progressCardFileName('💰')).toBe('goal-progress.png');
  });
});

describe('the card', () => {
  let host: HTMLDivElement, root: Root;
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  test('the preview is the image\'s words; ticking amounts adds them; the image gets exactly that card', async () => {
    const blob = new Blob(['x']), draw = vi.fn(async () => blob), share = vi.fn(async () => 'saved' as const);
    await act(async () => root.render(createElement(ProgressCard, {goal, draw, share})));
    expect([...host.querySelectorAll('.progress-card-line')].map(p => p.textContent)).toEqual(['21% of the way']);
    const [amounts] = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(amounts!.checked).toBe(false);
    await act(async () => amounts!.click());
    expect([...host.querySelectorAll('.progress-card-line')].map(p => p.textContent)).toEqual(['21% of the way', '€3,200.00 of €15,000.00']);
    await act(async () => host.querySelector<HTMLButtonElement>('button.primary')!.click());
    expect(draw).toHaveBeenCalledWith({eyebrow: 'Goal progress', title: 'Emergency fund', lines: ['21% of the way', '€3,200.00 of €15,000.00']});
    expect(share).toHaveBeenCalledWith(blob, 'emergency-fund-progress.png', 'Emergency fund');
    expect(host.querySelector('[role="status"]')!.textContent).toBe('Image saved to your downloads.');
  });
  test('options that have nothing to show are disabled; a failure is said', async () => {
    const draw = vi.fn(async () => { throw Error('This browser could not draw the image.'); });
    await act(async () => root.render(createElement(ProgressCard, {goal: {title: 'Run', current: null, target: null}, draw, share: vi.fn()})));
    expect([...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].every(b => b.disabled)).toBe(true);
    await act(async () => host.querySelector<HTMLButtonElement>('button.primary')!.click());
    expect(host.querySelector('[role="alert"]')!.textContent).toBe('This browser could not draw the image.');
  });
});
