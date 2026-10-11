import {expect, test} from 'vitest';
import {INFLATION, LOUD, SHAME, toneProblem} from './proactive/calm';
import {CARE_LABEL, CARE_NOTES, carefulNote, detectRisk, RISK_TOPICS} from './safety';
import {buildSystemPrompt, SAFETY_RULES} from './context/specialists';
import {PAGE_AREAS} from './settings';

// Session V Part 11: careful mode. The person's words only; the most serious topic wins; everyday phrases stay calm.
test('the topics, most serious first, in the person\'s words', () => {
  const cases: [string, ReturnType<typeof detectRisk>][] = [
    ['I keep thinking about suicide', 'self-harm'], ['I want to hurt myself', 'self-harm'], ['everyone would be better off without me', 'self-harm'],
    ['Ich habe Selbstmord-Gedanken', 'self-harm'], ['I starve myself and I want to die', 'self-harm'],
    ['I have been purging after meals', 'eating-disorder'], ['Is pro-ana a good idea', 'eating-disorder'], ['ik heb een eetstoornis', 'eating-disorder'],
    ['Make me a 700 kcal per day plan', 'very-low-intake'], ['I only eat 400 calories', 'very-low-intake'], ['keep it under 650 calories please', 'very-low-intake'],
    ['lose 3 kg in a week', 'rapid-weight-loss'], ['How do I drop 20 lbs in 3 weeks', 'rapid-weight-loss'], ['lose two stone in a month', 'rapid-weight-loss'],
    ['a 3 day fast', 'extreme-fasting'], ['fasting for 60 hours', 'extreme-fasting'], ['not eating for a week', 'extreme-fasting'],
    ['I ate 2100 calories', null], ['under 2000 kcal a day', null], ['lose 2 kg in 3 weeks', null], ['lose 6 kg in two months', null], ['a 16 hour fast', null],
    ['fasting for 18 hours', null], ['I killed it at the gym', null], ['my legs are dying after that run', null], ['fast walk', null], ['', null],
  ];
  for (const [text, topic] of cases) expect(detectRisk(text), text).toBe(topic);
});
test('the notes ZIGi shows are calm and carry no numbers; only self-harm may say "now"', () => {
  for (const topic of RISK_TOPICS) {
    const note = CARE_NOTES[topic];
    expect(note, topic).not.toMatch(/\d/);
    expect(LOUD.test(note) || SHAME.test(note) || INFLATION.test(note), topic).toBe(false);
    if (topic !== 'self-harm') expect(toneProblem(note), topic).toBeNull();
    expect(note, topic).toMatch(/doctor|someone you trust|crisis line/);
  }
  expect(CARE_NOTES['self-harm']).toContain('emergency number');
  expect(CARE_LABEL).toBe('A note from ZIGi, made on this device');
});
test('careful mode for one message: no numbers, targets or plans; a professional or trusted person; emergency help for self-harm', () => {
  for (const topic of RISK_TOPICS) {
    const note = carefulNote(topic);
    expect(note).toMatch(/^Careful mode: /);
    expect(note).toContain('Give no numbers, targets, calorie or weight figures, meal or fasting plans');
    expect(note).toContain('a doctor, a registered dietitian or someone they trust');
    expect(note).toContain('local emergency number');
  }
  expect(carefulNote('self-harm')).toContain('crisis line now');
  // Every specialist carries the general rules, whatever the page.
  for (const area of PAGE_AREAS) expect(buildSystemPrompt({area, context: null, customInstructions: '', providerName: 'Mock'})).toContain(SAFETY_RULES);
});
test('the subscription bridge copies careful mode as its own paragraph; without it the prompt is T\'s, unchanged', async () => {
  const {bridgePrompt} = await import('./bridge');
  const plain = bridgePrompt({context: null, question: 'Hi', customInstructions: 'Be brief'});
  expect(bridgePrompt({context: null, question: 'Hi', customInstructions: 'Be brief', careful: ''})).toBe(plain);
  const careful = bridgePrompt({context: null, question: 'How can I lose 10 kg in 2 weeks?', customInstructions: 'Be brief', careful: carefulNote('rapid-weight-loss')});
  expect(careful).toContain(`My own instructions: Be brief\n\n${carefulNote('rapid-weight-loss')}\n\nNo page data is attached.`);
});
