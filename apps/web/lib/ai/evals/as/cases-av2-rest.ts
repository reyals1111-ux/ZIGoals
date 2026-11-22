import type {Intent} from './cases';

/**
 * Session AV lane 2 (rest): the questions the last "built in part" remainders raise, answered on the device by
 * lib/ai/local-answers/av2-rest.ts in English and Dutch. The lead adds them to the corpus (CORPUS, expected.json) once
 * av2RestAnswer is wired into engine.ts. `never`: what an answer to that question must not be.
 */
export const AV2_REST: readonly Intent[] = [
  {id: 'av2-repeating-projects', pillar: 'tasks', en: ['which projects repeat', 'what are my repeating projects'], nl: ['welke projecten herhalen zich', 'wat zijn mijn terugkerende projecten'], never: ['"add-task"']},
  {id: 'av2-task-versions', pillar: 'tasks', en: ['which tasks have earlier versions', 'are earlier versions of my tasks kept'], nl: ['welke taken hebben eerdere versies', 'zijn er eerdere versies van mijn taken']},
  {id: 'av2-shift-sound', pillar: 'health', en: ['is the left right sound on', 'how loud is the left and right sound'], nl: ['staat het links rechts geluid aan', 'hoe hard is het links en rechts geluid']},
  {id: 'av2-further-nutrient', pillar: 'health', en: ['how much selenium did i have today', 'how much phosphorus did i eat today'], nl: ['hoeveel selenium heb ik vandaag gehad', 'hoeveel fosfor heb ik vandaag gegeten']},
];
