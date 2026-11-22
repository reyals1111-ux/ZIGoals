import {afterEach, describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import MealMic from '../../components/health/food-plus/meal-mic';
import {normalizeSpoken} from '../ai/spoken/normalize';
import {recognitionConstructor} from '../ai/voice';

/** Session AV lane 2 (food, LEDGER #85): the meal field's microphone — only where the browser has speech recognition. */
const g = globalThis as unknown as {window?: unknown; navigator?: unknown};
afterEach(() => { delete g.window; });
describe('the meal field\'s microphone', () => {
  it('shows nothing where the browser has no speech recognition', () => {
    expect(renderToStaticMarkup(createElement(MealMic, {onText: () => {}}))).toBe('');
    g.window = {};
    expect(renderToStaticMarkup(createElement(MealMic, {onText: () => {}}))).toBe('');
  });
  it('shows "Speak your meal" and the browser\'s own words where it has it (prefixed or not)', () => {
    class Fake { start() {} stop() {} abort() {} }
    for (const win of [{SpeechRecognition: Fake}, {webkitSpeechRecognition: Fake}]) {
      g.window = win;
      expect(recognitionConstructor(win)).toBe(Fake);
      const html = renderToStaticMarkup(createElement(MealMic, {onText: () => {}}));
      expect(html).toContain('aria-pressed="false"');
      expect(html).toContain('Speak your meal');
      expect(html).toContain('Speech is handled by your browser, not by ZIGoals.');
    }
  });
  it('spoken words are read the spoken way before they reach the field', () => {
    expect(normalizeSpoken('um two eggs and uh a slice of toast')).toBe('2 eggs and a slice of toast');
    expect(normalizeSpoken('um two eggs and a slice of toast')).toBe('2 eggs and a slice of toast');
  });
});
