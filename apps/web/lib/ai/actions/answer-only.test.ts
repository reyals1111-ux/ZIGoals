import {describe, expect, test} from 'vitest';
import {answerOnly, isPureQuestion} from './decline';
import {parseReply} from './parse';

/** Session AI (ZI1, G1): a question gets an answer, never a write preview; commands and requests keep their cards. */
const block = (json: string) => `\n\n\`\`\`zigoals-action\n${json}\n\`\`\``;
const WATER = block('{"kind":"log-water","glasses":1,"day":"today"}');
const OPEN = block('{"kind":"open-page","page":"health"}');
describe('pure questions', () => {
  test.each([
    'How much water did I drink?', 'Hoeveel water heb ik gedronken?', 'Explain my P&L', 'Leg mijn winst en verlies uit',
    'Did I sleep enough?', 'Am I on track for my Emergency fund?', 'Which habit am I worst at?', 'Summarise my day', 'Vat mijn dag samen',
    'What is my net worth? And how did it change this week?',
  ])('"%s" only asks', message => expect(isPureQuestion(message)).toBe(true));
  test.each([
    'Can you add a habit called Yoga?', 'Could you log 2 glasses of water?', 'Kun je 2 glazen water loggen?', 'Please log a coffee',
    'log 2 glasses of water', 'I drank 2 glasses of water', 'How much water did I drink? Log another glass.', 'Create a habit called Yoga',
    'mark Read done', '500 ml water, 30 minutes of exercise and a banana',
  ])('"%s" asks for a change', message => expect(isPureQuestion(message)).toBe(false));
});
describe('answerOnly', () => {
  test('a question\'s write card is dropped and the words stand', () => {
    const reply = `You drank 4 glasses today.${WATER}`;
    const out = answerOnly(reply, 'How much water did I drink?');
    expect(out).toBe('You drank 4 glasses today.');
    expect(parseReply(out).proposals).toEqual([]);
  });
  test('a block that only opens a page is kept', () => {
    const out = answerOnly(`Here is your Health page.${OPEN}${WATER}`, 'What did I eat today?');
    expect(parseReply(out).proposals.map(p => p.kind)).toEqual(['open-page']);
  });
  test('a command or a polite request keeps its card, byte for byte', () => {
    for (const message of ['log a glass of water', 'Can you log a glass of water?', 'How much water did I drink? Log another glass.']) {
      const reply = `Logged.${WATER}`;
      expect(answerOnly(reply, message)).toBe(reply);
    }
  });
  test('a reply with no block comes back unchanged', () => expect(answerOnly('You drank 4 glasses.', 'How much water did I drink?')).toBe('You drank 4 glasses.'));
});
