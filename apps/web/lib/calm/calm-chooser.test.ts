// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import CalmChooser from '../../components/health/meditation/calm-chooser';
import {HABIT_EXTRAS_KEY} from '../aa-device-keys';

/**
 * Session AV lane 2 (fixb2): the volume slider of the slow left-right sound has its label. The label also holds an
 * <output> with the volume, and an <output> is labelable, so the label once named the output and left the slider without
 * a name (tests/av2-calm-sound.spec.ts found it).
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });

test('the volume slider is the control its label names, not the volume shown beside it', async () => {
  localStorage.setItem(HABIT_EXTRAS_KEY, JSON.stringify({version: 1, calm: {sound: 30}}));
  await act(async () => root.render(h(CalmChooser)));
  const range = element.querySelector<HTMLInputElement>('input[type=range]')!;
  expect(range).toBeTruthy();
  expect(range.value).toBe('30');
  expect([...(range.labels ?? [])].map(l => l.textContent)).toEqual(['Volume of the sound 30']);
  expect((range.labels![0] as HTMLLabelElement).control).toBe(range);
  expect([...(element.querySelector('output')!.labels ?? [])]).toEqual([]);
});
