import type {Intent} from './cases';

/**
 * Session AV lane 2, round 4 (health; Pillow, Runna, Noom): the questions the round's features raise, in English and
 * Dutch, answered on the device by lib/ai/local-answers/av2-r4-health.ts. The lead adds them to the corpus (cases.ts) and
 * records their expected facts (expected.json). `never`: words the answer must not hold.
 */
export const AV2_R4_HEALTH: readonly Intent[] = [
  {id: 'av2r4-caffeine-sleep', pillar: 'health', en: ['does caffeine go with my sleep', 'do I sleep differently after late coffee'], nl: ['hoe slaap ik na cafeïne', 'hoe slaap ik na koffie in de middag'], never: ['because', 'causes', 'you should', 'omdat', 'je moet']},
  {id: 'av2r4-steps-sleep', pillar: 'health', en: ['how do my steps go with my sleep'], nl: ['hoe gaan mijn stappen samen met mijn slaap'], never: ['because', 'causes', 'omdat']},
  {id: 'av2r4-sleep-timing', pillar: 'health', en: ['when do I sleep on weekends', 'what is my sleep timing'], nl: ['hoe laat slaap ik in het weekend', 'wat is mijn slaapritme'], never: ['disorder', 'stoornis', 'you should', 'je moet']},
  {id: 'av2r4-sleep-tip', pillar: 'health', en: ["what is today's sleep tip", 'give me a sleep tip'], nl: ['wat is de slaaptip van vandaag', 'geef me een slaaptip voor vandaag'], never: ['healthy', 'melatonin', 'gezond']},
  {id: 'av2r4-planned', pillar: 'health', en: ['which workouts are planned this week', 'what is my training plan'], nl: ['welke workouts staan er gepland', 'wat is mijn trainingsplan'], never: ['kcal', 'calorie']},
  {id: 'av2r4-weight-band', pillar: 'health', en: ['am I inside my weight band', 'how is my weight band'], nl: ['zit ik binnen mijn gewichtsband', 'hoe gaat het met mijn gewichtsband'], never: ['burn', 'verbrand', 'BMI', 'ideal']},
  {id: 'av2r4-free-day', pillar: 'health', en: ['when is my free day', 'is a treat day planned'], nl: ['wanneer is mijn vrije dag', 'staat er een vrije dag gepland'], never: ['coins', 'earn', 'burn', 'verbrand']},
  {id: 'av2r4-hr-zones', pillar: 'health', en: ['what were my heart rate zones on my last run', 'how long was I in zone 2'], nl: ['wat waren mijn hartslagzones bij mijn laatste loop', 'hoe lang zat ik in zone 2'], never: ['220 minus', 'kcal', 'you should', 'je moet']},
  {id: 'av2r4-races', pillar: 'health', en: ['what races do I have coming up', 'when is my next race'], nl: ['welke wedstrijden heb ik gepland', 'wanneer is mijn volgende wedstrijd'], never: ['predict', 'voorspel']},
];
