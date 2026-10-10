import {expect, test} from 'vitest';
import {normalizeSpoken, spokenDiffers} from './normalize';

// Session Z-Local Part 4 (ADR-020 L6): the spoken forms of English and Dutch, read on the device after the words are in.
const cases: [string, string][] = [
  // Wake words and fillers
  ['um, log two glasses of water', 'log 2 glasses of water'],
  ['hey ZIGi, I drank two and a half litres today', 'I drank 2.5 litres today'],
  ['Okay zigi, uh, skip my walk', 'skip my walk'],
  ['euh, ik heb, eh, drie glazen water gedronken', 'ik heb 3 glazen water gedronken'],
  ['you know, I walked a lot today', 'I walked a lot today'],
  // Number words, English
  ['I walked ten thousand steps yesterday', 'I walked 10000 steps yesterday'],
  ['twelve hundred calories', '1200 calories'],
  ['two hundred and fifty grams of rice', '250 grams of rice'],
  ['a hundred and twenty steps', '120 steps'],
  ['twenty-five minutes of reading', '25 minutes of reading'],
  ['log twenty five minutes of meditation', 'log 25 minutes of meditation'],
  ['I weigh seventy two point five kilos', 'I weigh 72.5 kilos'],
  ['ten k steps', '10000 steps'],
  ['two thousand five hundred steps', '2500 steps'],
  // Number words, Dutch
  ['ik heb vijfentwintig minuten gemediteerd', 'ik heb 25 minuten gemediteerd'],
  ['twaalfhonderd calorieën', '1200 calorieën'],
  ['ik weeg tweeënzeventig komma vijf kilo', 'ik weeg 72.5 kilo'],
  ['tweeduizend vijfhonderd stappen', '2500 stappen'],
  ['tienduizend stappen', '10000 stappen'],
  ['drieëndertig minuten', '33 minuten'],
  // Articles before a unit, and ones that stay words
  ['a glass of water', '1 glass of water'],
  ['een glas water', '1 glas water'],
  ['I ate an apple and two bananas', 'I ate 1 apple and 2 bananas'],
  ['one of my habits', 'one of my habits'],
  ['add a habit', 'add a habit'],
  ['een gewoonte toevoegen', 'een gewoonte toevoegen'],
  // Halves, quarters and decimals
  ['ik dronk anderhalve liter water', 'ik dronk 1.5 liter water'],
  ['half a litre of water', '0.5 litre of water'],
  ['an hour and a half of walking', '1.5 hour of walking'],
  ['a quarter of an hour of reading', '15 minutes of reading'],
  ['een kwartier gelezen', '15 minuten gelezen'],
  ['log 1,5 liter water', 'log 1.5 liter water'],
  ['I ran 5,000 steps', 'I ran 5000 steps'],
  // Clock idioms, English
  ['remind me at quarter to eight in the evening', 'remind me at 19:45 in the evening'],
  ['I went to bed at half past eleven and got up at seven', 'I went to bed at 11:30 and got up at 7'],
  ['at seven thirty tonight', 'at 19:30 tonight'],
  ['wake me at ten past six in the morning', 'wake me at 6:10 in the morning'],
  ['at seven o\'clock', 'at 7:00'],
  ['remind me at 7 pm', 'remind me at 7 pm'],
  ['at 7:30 pm', 'at 19:30'],
  // Clock idioms, Dutch
  ['zet een herinnering om half acht \'s avonds', 'zet een herinnering om 19:30 \'s avonds'],
  ['ik ging om kwart over elf naar bed en stond om zeven uur op', 'ik ging om 11:15 naar bed en stond om 7:00 op'],
  ['om tien voor half acht', 'om 7:20'],
  ['vijf over half acht \'s avonds', '19:35 \'s avonds'],
  ['kwart voor negen', '8:45'],
  // Self-corrections
  ['log twenty five minutes of meditation, no wait, thirty', 'log 30 minutes of meditation'],
  ['log 3 glasses, no, 4', 'log 4 glasses'],
  ['ik heb drie kilometer gelopen, nee wacht, vier', 'ik heb 4 kilometer gelopen'],
  ['two glasses, make that three glasses', '3 glasses'],
  ['zet er twee glazen bij, maak er drie van', 'zet er 3 glazen bij'],
  // Ranges and plain questions stay as they are
  ['from 7 to 8 I walked', 'from 7 to 8 I walked'],
  ['I did 3 to 5 reps', 'I did 3 to 5 reps'],
  ['I slept from 11 to 7', 'I slept from 11 to 7'],
  ['How many steps did I walk last week?', 'How many steps did I walk last week?'],
  ['what\'s my weight', 'what\'s my weight'],
  ['skip my walk tomorrow', 'skip my walk tomorrow'],
  ['Delete my Walk habit', 'Delete my Walk habit'],
];
test.each(cases)('normalizeSpoken(%j) → %j', (input, output) => { expect(normalizeSpoken(input)).toBe(output); });
test('the normaliser is idempotent on its own output and says when it changed something', () => {
  for (const [input, output] of cases) { expect(normalizeSpoken(output)).toBe(output); expect(spokenDiffers(input)).toBe(input !== output); }
});
