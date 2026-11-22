import type {Intent} from './cases';

/**
 * Session AV lane 2 (habits pillar): the questions the habits pillar's new features raise, answered on the device from
 * each feature's own pure function (lib/ai/local-answers/av2-habits.ts), in English and Dutch. The lead adds them to the
 * corpus (cases.ts) and records their expected answers. `never`: what the answer must not contain.
 */
export const AV2_HABITS: readonly Intent[] = [
  // Habit options (LEDGER #45, #49, #50, #52, #57)
  {id: 'av2-habits-whenever', pillar: 'habits', en: ['which habits have no schedule', 'which habits can I do whenever'], nl: ['welke gewoontes hebben geen vaste dagen', 'welke gewoontes hebben geen schema']},
  {id: 'av2-habits-never-twice', pillar: 'habits', en: ['which habits have never miss twice on', 'which habits keep my streak through a missed day'], nl: ['bij welke gewoontes staat nooit twee keer missen aan', 'welke gewoontes hebben de tweedagenregel']},
  {id: 'av2-habits-unlogged', pillar: 'habits', en: ['which habits count an unlogged day as skipped', 'which habits count days i dont log as skipped'], nl: ['welke gewoontes tellen een niet gelogde dag als overgeslagen']},
  {id: 'av2-habits-difficulty', pillar: 'habits', en: ['how much xp does a hard habit give', 'what difficulty are my habits'], nl: ['hoeveel xp geeft een zware gewoonte', 'wat is de moeilijkheid van mijn gewoontes'], never: ['Level']},
  // Areas' week and milestones (LEDGER #53), the monthly theme (LEDGER #55)
  {id: 'av2-habits-areas-week', pillar: 'habits', en: ['how are my areas doing this week', 'what are my area milestones this week'], nl: ['hoe gaan mijn levensgebieden deze week', 'wat zijn de mijlpalen van mijn gebieden deze week']},
  {id: 'av2-habits-month-theme', pillar: 'habits', en: ['what is this month\'s theme', 'what is the theme of this month'], nl: ['wat is het thema van deze maand', 'wat is het maandthema']},
  // Hidden prompts and exercises (LEDGER #56)
  {id: 'av2-habits-hidden', pillar: 'journal', en: ['which prompts have I hidden', 'what questions did I hide'], nl: ['welke vragen heb ik verborgen', 'welke oefeningen heb ik verborgen']},
  // The evening check-in (LEDGER #60, #61, #68)
  {id: 'av2-habits-day-logged', pillar: 'health', en: ['did i log today', 'which days did i not log'], nl: ['heb ik vandaag ingecheckt', 'welke dagen heb ik niet gelogd']},
  {id: 'av2-habits-own-words', pillar: 'health', en: ['what are my own feeling words'], nl: ['welke eigen gevoelswoorden heb ik']},
  // Trends against your usual (LEDGER #66)
  {id: 'av2-habits-usual-mood', pillar: 'health', en: ['how is my mood compared to usual', 'how is my energy compared to normal'], nl: ['hoe is mijn stemming vergeleken met normaal', 'hoe is mijn energie vergeleken met normaal']},
  // Today's written practice (LEDGER #71, #77)
  {id: 'av2-habits-todays-practice', pillar: 'health', en: ['what is today\'s meditation', 'what is the meditation of the day'], nl: ['wat is de meditatie van vandaag', 'wat is de oefening van vandaag']},
  // Calm visuals behind a sitting (LEDGER #79, #80), Move gently (LEDGER #81)
  {id: 'av2-habits-calm-visual', pillar: 'health', en: ['what visual is behind my meditation', 'which scene shows when i sit'], nl: ['welke achtergrond heb ik bij het mediteren', 'welk beeld staat er bij mijn meditatie']},
  {id: 'av2-habits-stretch-minutes', pillar: 'health', en: ['how many minutes did i stretch this week', 'did i stretch this week'], nl: ['hoeveel minuten heb ik deze week gerekt', 'heb ik deze week gerekt'], never: ['kcal', 'calories burned']},
  // Your own mood words and symbols (LEDGER #178)
  {id: 'av2-habits-mood-words', pillar: 'health', en: ['what are my mood words', 'what are my own mood words'], nl: ['wat zijn mijn stemmingswoorden', 'wat zijn mijn woorden voor de stemmingen']},
  // Meditation milestones (LEDGER #186)
  {id: 'av2-habits-meditation-milestones', pillar: 'health', en: ['which meditation milestones have i reached', 'what are my meditation milestones'], nl: ['welke meditatiemijlpalen heb ik bereikt', 'wat zijn mijn mijlpalen bij het mediteren']},
  // A habit's strength over the year, months and quarters (LEDGER #187, #190)
  {id: 'av2-habits-strength-year', pillar: 'habits', en: ['how has my habit strength changed this year', 'what is the strength of my habits over the year'], nl: ['hoe is de sterkte van mijn gewoontes dit jaar veranderd', 'wat is de sterkte van mijn gewoontes over het jaar']},
  // Meditation timer presets (LEDGER #184)
  {id: 'av2-habits-timer-presets', pillar: 'health', en: ['which meditation timer presets do i have', 'what are my meditation presets'], nl: ['welke timerpresets heb ik voor meditatie', 'wat zijn mijn meditatie presets']},
  // A rolling window, a few times in any few days (LEDGER #185)
  {id: 'av2-habits-rolling', pillar: 'habits', en: ['which habits are 3 times in any 10 days', 'how are my habits with a rolling window doing'], nl: ['welke gewoontes zijn 3 keer in elke 10 dagen', 'hoe gaan mijn gewoontes met een schuivend venster']},
];
