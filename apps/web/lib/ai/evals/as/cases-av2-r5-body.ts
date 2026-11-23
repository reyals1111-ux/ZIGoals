import type {Intent} from './cases';

/**
 * Session AV lane 2 (r5-body; Bevel, Clue, Productive, Tiimo): the questions the round's body and through-the-day features
 * raise, in English and Dutch, answered on the device by lib/ai/local-answers/av2-r5-body.ts. The lead adds them to the
 * corpus (cases.ts) and records their expected facts (expected.json). `never`: words the answer must not hold.
 */
const CYCLE_NEVER = ['fertile', 'ovulat', 'vruchtbaar', 'eisprong', 'phase', 'fase', 'predict', 'you should', 'je moet'];
export const AV2_R5_BODY: readonly Intent[] = [
  {id: 'av2r5-cycle-averages', pillar: 'health', en: ['what is my average cycle length', 'how long are my periods'], nl: ['hoe lang is mijn cyclus gemiddeld', 'hoe lang duurt mijn menstruatie gemiddeld'], never: CYCLE_NEVER},
  {id: 'av2r5-cycle-words', pillar: 'health', en: ['what words do I track in my cycle log', 'which tags are in my cycle log'], nl: ['welke woorden houd ik bij in mijn cycluslog', 'welke tags staan er in mijn cycluslog'], never: CYCLE_NEVER},
  {id: 'av2r5-cycle-glance', pillar: 'health', en: ['what did I log in my last cycle', 'what did I note in this cycle'], nl: ['wat heb ik genoteerd in mijn vorige cyclus', 'wat heb ik bijgehouden in deze cyclus'], never: CYCLE_NEVER},
  {id: 'av2r5-cycle-choices', pillar: 'health', en: ['can I track my cycle without a period', 'can I log perimenopause'], nl: ['kan ik bijhouden zonder menstruatie', 'kan ik de perimenopauze bijhouden'], never: [...CYCLE_NEVER, 'menopause is', 'hormone', 'hormoon']},
  {id: 'av2r5-late-meal', pillar: 'health', en: ['how do late meals go with my sleep', 'how do I sleep after eating late'], nl: ['hoe slaap ik na een late maaltijd', 'hoe slaap ik als ik laat eet'], never: ['because', 'causes', 'hurt', 'you should', 'omdat', 'je moet', 'slecht voor']},
  {id: 'av2r5-habit-parts', pillar: 'habits', en: ['can I get one reminder for each part of the day', 'how do reminders per part of the day work'], nl: ['kan ik een herinnering per dagdeel krijgen', 'hoe werkt een herinnering per dagdeel'], never: ['streak', 'missed', 'reeks', 'gemist']},
  {id: 'av2r5-mood-timeline', pillar: 'health', en: ['can I see my moods on the timeline', 'are my check ins on the timeline'], nl: ['kan ik mijn stemming op de tijdlijn zien', 'staan mijn check ins op de tijdlijn'], never: ['depress', 'anxious', 'angstig', 'symptom']},
];
