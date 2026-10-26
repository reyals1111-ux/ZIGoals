import {expect, test} from 'vitest';
import {suggestedHealthLink} from '../components/habits/health-link-field';

// Session AH (TR9/HA2): a new habit in steps, water or meditation minutes starts linked to Health's own log.
test('steps, water in the Health unit and meditation minutes suggest their link; other habits none', () => {
  expect(suggestedHealthLink({title: 'Fictional walk', unit: 'steps', target: '8000', measurement: 'count'}, 'ml')).toEqual({measure: 'steps', exerciseId: '', rule: 'at-least', target: '8000'});
  expect(suggestedHealthLink({title: 'Water', unit: 'mL', target: '2000', measurement: 'count'}, 'ml')?.measure).toBe('water');
  expect(suggestedHealthLink({title: 'Water', unit: 'mL', target: '2000', measurement: 'count'}, 'fl-oz-us')).toBeNull();
  expect(suggestedHealthLink({title: 'Meditate', unit: 'minutes', target: '10', measurement: 'duration'}, 'ml')?.measure).toBe('meditationMinutes');
  expect(suggestedHealthLink({title: 'Read', unit: 'minutes', target: '30', measurement: 'duration'}, 'ml')).toBeNull();
  expect(suggestedHealthLink({title: 'Drink water', unit: 'glasses', target: '8', measurement: 'count'}, 'ml')).toBeNull();
});
