import type {Intent} from './cases';

/**
 * Session AW (X6; Happy Scale, Sleep as Android): the questions the group's features raise, in English and Dutch,
 * answered on the device by lib/ai/local-answers/aw-x6.ts under Health's gate. The integrator adds them to the corpus
 * (cases.ts) and records their expected facts (expected.json). `never`: words the answer must not hold — no promise of a
 * result, no advice, no judgement, no calorie figure.
 */
export const AW_X6: readonly Intent[] = [
  {id: 'awx6-weigh-on', pillar: 'health', en: ['what will I weigh on 1 January', 'what would my weight be on January 1?'], nl: ['wat weeg ik op 1 januari', 'wat is mijn gewicht op 1 januari?'], never: ['guarantee', 'you will reach', 'you should', 'kcal', 'je moet', 'gegarandeerd']},
  {id: 'awx6-weight-week', pillar: 'health', en: ['how was my weight this week compared with last week', 'how does my weight this week compare to last week?'], nl: ['hoe was mijn gewicht deze week vergeleken met vorige week', 'hoe verhoudt mijn gewicht deze week zich tot vorige week?'], never: ['well done', 'good job', 'bad', 'goed gedaan', 'slecht', 'kcal']},
  {id: 'awx6-sleep-goal-period', pillar: 'health', en: ['how am I doing on my sleep goal', 'how is my sleep goal over the last 30 days?'], nl: ['hoe gaat het met mijn slaapdoel', 'hoe staat het met mijn slaapdoel over de afgelopen 30 dagen?'], never: ['you should', 'insomnia', 'je moet', 'slapeloosheid']},
];
