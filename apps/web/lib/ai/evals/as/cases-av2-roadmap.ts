import type {Intent} from './cases';

/**
 * Session AV lane 2 (roadmap): the questions the roadmap builder's features raise, answered on the device by
 * lib/ai/local-answers/av2-roadmap.ts in English and Dutch. The lead adds them to the corpus (CORPUS, expected.json) once
 * av2RoadmapAnswer is wired into engine.ts. `never`: what an answer to that question must not be.
 */
export const AV2_ROADMAP: readonly Intent[] = [
  {id: 'av2-chess-results', pillar: 'checklist', en: ['how many chess games have I won against the computer', 'what are my results against the chess engine'], nl: ['hoeveel schaakpartijen heb ik gewonnen tegen de computer', 'wat zijn mijn resultaten tegen de schaakcomputer'], never: ['"add-task"']},
  {id: 'av2-chess-game', pillar: 'checklist', en: ['do I have a chess game in progress', 'is my chess game against the computer still open'], nl: ['heb ik nog een schaakpartij open', 'is mijn schaakpartij nog bezig']},
  {id: 'av2-task-attachments', pillar: 'tasks', en: ['can I add a photo to a task', 'how do I record a voice note on a task'], nl: ['kan ik een foto aan een taak toevoegen', 'hoe neem ik een spraakmemo op bij een taak']},
];
