/**
 * Session AV lane 2 (roadmap, BL-10): the engine's three levels, constants only, so the Play panel can offer them without
 * loading the engine (the search runs in its worker, started when a game begins). Each level is how deep and how long
 * the search may look; the engine stops at whichever comes first and plays the best move of the deepest finished look.
 */
export type EngineLevel = 'easy' | 'medium' | 'hard';
export type LevelLimits = {depth: number; ms: number};
export const ENGINE_LEVELS: readonly {id: EngineLevel; label: string; note: string; limits: LevelLimits}[] = [
  {id: 'easy', label: 'Easy', note: 'looks one move ahead', limits: {depth: 1, ms: 400}},
  {id: 'medium', label: 'Medium', note: 'looks up to three moves ahead, about a second', limits: {depth: 3, ms: 1000}},
  {id: 'hard', label: 'Hard', note: 'looks up to eight moves ahead, up to three seconds', limits: {depth: 8, ms: 3000}},
];
export const limitsOf = (level: EngineLevel): LevelLimits => ENGINE_LEVELS.find(l => l.id === level)!.limits;
export const levelLabel = (level: EngineLevel) => ENGINE_LEVELS.find(l => l.id === level)!.label;
