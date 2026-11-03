// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {RoutineFullscreen, stepEndFeedback} from '../../components/habits/routine-fullscreen';
import {activeIndex, clock, creditedMinutes, idleTimer, pauseTimer, reachedTarget, startTimer, timerElapsedMs, type FullscreenStep} from '../../components/habits/routine-fullscreen-timer';

// Session AK (5.4): the full-screen routine player (its timer, feedback rules and dialog). Kept under lib/routines/share*
// so the root vitest include runs it (component tests live under lib/).
describe('step timer', () => {
  test('counts while running, keeps while paused, credits minutes, knows when the target is reached', () => {
    let t = startTimer(idleTimer(), 1_000);
    expect(timerElapsedMs(t, 61_000)).toBe(60_000);
    t = pauseTimer(t, 61_000);
    expect(timerElapsedMs(t, 999_000)).toBe(60_000);
    t = startTimer(t, 100_000);
    expect(startTimer(t, 200_000)).toBe(t);
    expect(creditedMinutes(t, 130_000)).toBe(1.5);
    expect(reachedTarget(t, 159_999, 2)).toBe(false);
    expect(reachedTarget(t, 160_000, 2)).toBe(true);
    expect(reachedTarget(t, 160_000, null)).toBe(false);
    expect(clock(65_400)).toBe('1:05');
    expect(activeIndex([{status: 'done'}, {status: 'pending'}] as FullscreenStep[])).toBe(1);
    expect(activeIndex([{status: 'done'}, {status: 'skipped'}] as FullscreenStep[])).toBe(-1);
  });
  test('feedback: vibration only with haptics on, a device that has it and motion welcome; the bell only when asked', async () => {
    const vibrate = vi.fn(() => true), ring = vi.fn(async () => true), env = {vibrate, coarse: true};
    expect(await stepEndFeedback({haptics: true, bell: false}, env, () => true, ring)).toEqual({vibrated: true, rang: false});
    expect(await stepEndFeedback({haptics: true, bell: true}, env, () => false, ring)).toEqual({vibrated: false, rang: true});
    expect(await stepEndFeedback({haptics: false, bell: false}, env, () => true, ring)).toEqual({vibrated: false, rang: false});
    expect(await stepEndFeedback({haptics: true, bell: false}, {vibrate: null, coarse: true}, () => true, ring)).toEqual({vibrated: false, rang: false});
    expect(vibrate).toHaveBeenCalledTimes(1); expect(ring).toHaveBeenCalledTimes(1);
  });
});

describe('the dialog', () => {
  let host: HTMLDivElement, root: Root;
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  const steps: FullscreenStep[] = [{id: 'a', title: 'Water', minutes: null, status: 'done'}, {id: 'b', title: 'Stretch', minutes: 5, status: 'current'}, {id: 'c', title: 'Plan', minutes: null, status: 'pending'}];

  test('a modal dialog on the current step: start, pause, Done credits the minutes; Skip, Log all; Escape closes', async () => {
    vi.useFakeTimers({now: 0, toFake: ['Date', 'setInterval', 'clearInterval']});
    const onLogStep = vi.fn(), onSkipStep = vi.fn(), onLogAll = vi.fn(), onClose = vi.fn();
    await act(async () => root.render(createElement(RoutineFullscreen, {title: 'Morning routine', steps, onLogStep, onSkipStep, onLogAll, onClose})));
    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement!.textContent).toBe('Stretch');
    expect(host.querySelector('.eyebrow')!.textContent).toBe('Morning routine · step 2 of 3');
    const button = (text: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === text)!;
    await act(async () => button('Start').click());
    await act(async () => { vi.advanceTimersByTime(90_000); });
    expect(host.querySelector('[role="timer"]')!.getAttribute('aria-label')).toBe('1:30 of 5 minutes');
    await act(async () => button('Pause').click());
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(button('Resume')).toBeTruthy();
    await act(async () => button('Done').click());
    expect(onLogStep).toHaveBeenCalledWith('b', 1.5);
    await act(async () => button('Skip').click());
    expect(onSkipStep).toHaveBeenCalledWith('b');
    await act(async () => button('Log all 2 remaining').click());
    expect(onLogAll).toHaveBeenCalled();
    await act(async () => { dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); });
    expect(onClose).toHaveBeenCalled();
  });
  test('a refused log is said; every step done shows the finish', async () => {
    const onLogStep = vi.fn().mockRejectedValue(Error('Choose a scheduled, active day up to today.'));
    await act(async () => root.render(createElement(RoutineFullscreen, {title: 'R', steps: [{id: 'c', title: 'Plan', minutes: null, status: 'current'}], onLogStep, onSkipStep: vi.fn(), onClose: vi.fn()})));
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'Done')!.click());
    expect(onLogStep).toHaveBeenCalledWith('c', null);
    expect(host.querySelector('[role="alert"]')!.textContent).toContain('Choose a scheduled');
    await act(async () => root.render(createElement(RoutineFullscreen, {title: 'R', steps: steps.map(s => ({...s, status: 'done' as const})), onLogStep, onSkipStep: vi.fn(), onClose: vi.fn()})));
    expect(host.querySelector('h2')!.textContent).toBe('Routine complete');
    expect(host.textContent).toContain('3 of 3 steps done.');
  });
});
