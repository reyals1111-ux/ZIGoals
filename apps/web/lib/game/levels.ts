/** Levels with nebula names. Level n begins at 50·n² XP (level 1 at 0): a calm curve where the first levels come quickly. */
export const LEVEL_NAMES = ['Spark', 'Ember', 'Glow', 'Orbit', 'Comet', 'Aurora', 'Nova', 'Nebula', 'Pulsar', 'Quasar', 'Galaxy', 'Cosmos'] as const;
export const levelFloor = (level: number) => level <= 1 ? 0 : 50 * level * level;
export function levelOf(xp: number): number { let level = 1; while (levelFloor(level + 1) <= xp && level < 999) level++; return level; }
export const levelName = (level: number) => level <= LEVEL_NAMES.length ? LEVEL_NAMES[level - 1]! : `Cosmos ${level - LEVEL_NAMES.length + 1}`;
export type LevelProgress = {level: number; name: string; xp: number; floor: number; next: number; into: number; span: number; share: number};
export function levelProgress(xp: number): LevelProgress {
  const level = levelOf(xp), floor = levelFloor(level), next = levelFloor(level + 1);
  return {level, name: levelName(level), xp, floor, next, into: xp - floor, span: next - floor, share: Math.min(1, (xp - floor) / (next - floor))};
}
