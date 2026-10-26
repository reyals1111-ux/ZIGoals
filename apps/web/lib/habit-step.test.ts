import {expect, test} from 'vitest';
import {habitStep} from './habit-step';

test('Session AH (HA9): one tap is a sensible share of the habit', () => {
  expect(habitStep({measurement: {kind: 'count', unit: 'steps'}, target: 8000} as never)).toBe(1000);
  expect(habitStep({measurement: {kind: 'count', unit: 'glasses'}, target: 8} as never)).toBe(1);
  expect(habitStep({measurement: {kind: 'count', unit: 'push-ups'}, target: 30} as never)).toBe(1);
  expect(habitStep({measurement: {kind: 'quantity', unit: 'liters'}, target: 2} as never)).toBe(0.25);
  expect(habitStep({measurement: {kind: 'quantity', unit: 'mL'}, target: 2000} as never)).toBe(250);
  expect(habitStep({measurement: {kind: 'duration', unit: 'minutes'}, target: 30} as never)).toBe(5);
  expect(habitStep({measurement: {kind: 'duration', unit: 'minutes'}, target: 10} as never)).toBe(1);
  expect(habitStep({measurement: {kind: 'duration', unit: 'hours'}, target: 2} as never)).toBe(0.25);
  expect(habitStep({measurement: {kind: 'custom', unit: 'pages'}, target: 20} as never)).toBe(1);
});
