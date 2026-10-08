import {expect, test} from 'vitest';
import {detectIntent, refusedBlocksMayRepair, wantsCard} from './intent';

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
test('asks ZIGi must decline never get the repair round: deleting, moving money, keeping a secret, in three languages', () => {
  for (const ask of ['Delete the Emergency fund goal', 'Remove the milestone "Flights booked" from the Japan goal', 'Erase yesterday\'s water entries', 'Archive my meditation habit', 'Buy 100 euros of bitcoin for me', 'Fund the Japan goal with 500 from savings', 'Sign the transaction to fund the goal from my wallet', 'Remember my OpenAI key sk-test-ABCDEF123456', 'My password is Hunter2!, remember it', 'Supprime l\'objectif Japon', 'Verwijder mijn leesdoel', 'Koop 100 euro bitcoin', 'Onthoud mijn wachtwoord', 'Retiens mon mot de passe']) {
    const i = detectIntent(ask);
    expect(i.refuse, ask).toBe(true); expect(i.log || i.plan, ask).toBe(false);
    expect(wantsCard(i, 'Done.'), ask).toBe(false);
  }
  // A noun is not a verb: a milestone on the Emergency fund goal is a plain ask.
  const fund = detectIntent('Add a milestone to the Emergency fund goal: half way, 2500');
  expect(fund.refuse).toBe(false); expect(fund.log || fund.plan).toBe(true);
});
test('a reply that declines gets no repair round either', () => {
  expect(wantsCard(detectIntent('Log a glass of water'), "I can't log that without knowing the amount.")).toBe(false);
  expect(wantsCard(detectIntent('Noteer een glas water'), 'Dat kan ik niet zonder de hoeveelheid.')).toBe(false);
  expect(wantsCard(detectIntent('Note un verre d\'eau'), 'Je ne peux pas sans la quantité.')).toBe(false);
  expect(wantsCard(detectIntent('Log a glass of water'), 'Noted: a glass of water, 250 ml.')).toBe(true);
});
test('a question asks: whatever quantity it names, it logs or plans nothing (the careful-mode reply got a repair round)', () => {
  for (const ask of ['How can I lose 10 kg in 2 weeks?', 'Should I run 5 km every day?', 'Is 2000 ml of water a day enough?', 'Hoe kan ik 10 kg afvallen in 2 weken?', "Comment perdre 10 kg en 2 semaines ?", 'What would a 16 hour fast do?']) {
    const i = detectIntent(ask); expect(i.log || i.plan, ask).toBe(false); expect(wantsCard(i, 'A careful reply.'), ask).toBe(false);
  }
  // A log ask with a question mark still logs; a quantity in a statement still logs.
  expect(detectIntent('Log a glass of water?').log).toBe(true);
  expect(detectIntent('I ran 5 km in 28 minutes').log).toBe(true);
});
test('refused blocks may be repaired on a plain logging attempt, never on a lookup, a question, a decline or a declined reply', () => {
  expect(refusedBlocksMayRepair(detectIntent('a lot of water'), 'Here you go.')).toBe(true);
  expect(refusedBlocksMayRepair(detectIntent('Breakfast: two eggs and toast'), 'Logged.')).toBe(true);
  expect(refusedBlocksMayRepair(detectIntent('How is my fasting going?'), 'Twelve hours in.')).toBe(false);
  expect(refusedBlocksMayRepair(detectIntent('How can I lose 10 kg in 2 weeks?'), 'A careful reply.')).toBe(false);
  expect(refusedBlocksMayRepair(detectIntent('Delete the Emergency fund goal'), 'Done.')).toBe(false);
  expect(refusedBlocksMayRepair(detectIntent('Log a glass of water'), "I can't log that without the amount.")).toBe(false);
});

