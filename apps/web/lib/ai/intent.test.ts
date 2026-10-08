import {expect, test} from 'vitest';
import {detectIntent, wantsCard} from './intent';

test('a logging ask is read as one in three languages, with fillers and self-corrections', () => {
  for (const ask of ['Log a glass of water', 'I had my usual oatmeal and two glasses of water', 'Weight this morning 78.4 kg', 'uh log two glasses no wait three glasses of water', 'so I ran for like thirty minutes', 'Noteer twee glazen water', 'Ik heb vandaag 2 liter water gedronken', "J'ai bu un verre d'eau, note-le", 'Slept 23:00 to 06:45', 'Twenty push-ups', 'Breakfast: two eggs, toast and a coffee']) {
    expect(detectIntent(ask).log, ask).toBe(true); expect(detectIntent(ask).lookup, ask).toBe(false);
  }
});
test('a planning ask is read as one; a lookup is a lookup; a vague ask wants a question back', () => {
  for (const ask of ['Create a habit: stretch for 10 minutes on weekday mornings', 'Help me shape a goal for a new laptop, 1500 euros by next June', 'Remind me to meditate at 7:30 every day', 'Start a 30 day reading challenge', 'Maak een gewoonte: elke dag 10 minuten rekken', 'Crée une habitude : lire 20 pages chaque soir']) expect(detectIntent(ask).plan || detectIntent(ask).log, ask).toBe(true);
  for (const ask of ['How much water have I had today?', 'What is my current walk streak?', 'Hoeveel minuten heb ik deze maand gemediteerd?', "Combien d'eau ai-je bu hier ?", 'Which habits are left today', 'Did my sleep affect my habits this week?']) { const i = detectIntent(ask); expect(i.lookup, ask).toBe(true); expect(i.log, ask).toBe(false); expect(i.plan, ask).toBe(false); }
  for (const ask of ['Log it', 'Add a habit', 'Change my goal', 'Remind me', 'Noteer het', 'Note-le']) expect(detectIntent(ask).vague, ask).toBe(true);
});
test('the repair round is for a log or plan intent answered without a card and without a question back', () => {
  expect(wantsCard(detectIntent('Log a glass of water'), 'Done, I noted a glass of water.')).toBe(true);
  expect(wantsCard(detectIntent('Log a glass of water'), 'How big was the glass, 250 ml?')).toBe(false);
  expect(wantsCard(detectIntent('Log it'), 'What would you like me to log?')).toBe(false);
  expect(wantsCard(detectIntent('How much water today?'), '750 ml so far.')).toBe(false);
  expect(wantsCard(detectIntent('Hi ZIGi'), 'Hello!')).toBe(false);
});
