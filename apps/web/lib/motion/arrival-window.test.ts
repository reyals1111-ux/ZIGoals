// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WINDOW_MS, watchArrivalWindow} from './arrival-window';

beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = '<main></main>'; });
afterEach(() => { vi.useRealTimers(); });
const main = () => document.querySelector('main') as HTMLElement;
const loadingFrame = () => { const d = document.createElement('div'); d.className = 'aa-skeleton-page'; d.setAttribute('aria-busy', 'true'); main().append(d); return d; };

describe('the page-arrival watch (Session AK CI-W)', () => {
  it('a page without a loading frame is watched for exactly WINDOW_MS, as before', () => {
    const end = vi.fn(), watch = watchArrivalWindow(main(), end);
    vi.advanceTimersByTime(WINDOW_MS - 1);
    watch.changed();
    expect(end).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(end).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(end).toHaveBeenCalledTimes(1);
  });
  it('while the page shows its loading frame the watch stays open; WINDOW_MS starts when the frame leaves', () => {
    const frame = loadingFrame(), end = vi.fn(), watch = watchArrivalWindow(main(), end);
    vi.advanceTimersByTime(2000);
    watch.changed(); // an insertion while the frame is still up changes nothing
    expect(end).not.toHaveBeenCalled();
    frame.remove();
    main().append(document.createElement('section'));
    watch.changed();
    vi.advanceTimersByTime(WINDOW_MS - 1);
    expect(end).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(end).toHaveBeenCalledTimes(1);
  });
  it('a loading frame that never leaves ends the watch after six seconds', () => {
    loadingFrame();
    const end = vi.fn(), watch = watchArrivalWindow(main(), end);
    vi.advanceTimersByTime(5999);
    watch.changed();
    expect(end).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(end).toHaveBeenCalledTimes(1);
  });
  it('stop (the page unmounts) ends it without calling end', () => {
    loadingFrame();
    const end = vi.fn(), watch = watchArrivalWindow(main(), end);
    watch.stop();
    vi.advanceTimersByTime(10_000);
    expect(end).not.toHaveBeenCalled();
  });
});
