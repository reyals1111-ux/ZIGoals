/**
 * Session AL (DV-022a, DV-043b, D-208, BUG-019, L-066; P-DV-63/P-DVR-28): one picture per goal in every view. The person's
 * chosen artwork (goal extras `cardArt`) wins everywhere: the card, the Vision board (when no photo or gradient was chosen
 * there) and the goal's own page. Without a choice, the default fits the goal ("Run a 10K" gets the running track, a
 * book goal the library), so the views agree and the art matches the goal.
 */
import {isCardArt, type CardArt} from '../card-art/catalog';
import type {GoalSummary} from '../goal-summary';

const BY_WORD: readonly [RegExp, CardArt][] = [
 [/\b(run|running|10k|5k|marathon|race|jog)/i, 'track'],
 [/\b(read|book|books|library|study|course|exam|learn|language|certificat)/i, 'library'],
 [/\b(bike|bicycle|cycling|cycle)\b/i, 'bicycle'],
 [/\b(cook|recipe|kitchen|dinner|meal|bake)/i, 'kitchen'],
 [/\b(holiday|trip|travel|vacation|country|sail|boat)/i, 'sailboat'],
 [/\b(hike|trail|mountain|climb|peak)/i, 'mountains'],
 [/\b(home|house|flat|apartment|deposit|mortgage)/i, 'home'],
 [/\b(garden|plant|grow)/i, 'garden'],
 [/\b(paint|draw|music|instrument|guitar|piano|art|creative|studio|photo|write|novel)/i, 'studio'],
 [/\b(star|space|telescope|astronom|science)/i, 'telescope'],
 [/\b(city|career|job|promotion|business|launch)/i, 'skyline'],
 [/\b(walk|path|meditat|calm|mind|journal|gratitude|sleep)/i, 'path'],
 [/\b(fund|save|saving|savings|emergency|debt|invest|money|wealth|freedom)/i, 'treasure'],
];

/** The artwork a goal shows when the person chose none: from its name, else the summary's own scene. */
export function defaultGoalArt(g: Pick<GoalSummary, 'name' | 'scene'>): CardArt {
 return BY_WORD.find(([words]) => words.test(g.name))?.[1] ?? g.scene;
}

/** The one artwork for this goal: the person's choice, else the fitting default. */
export function goalArt(g: Pick<GoalSummary, 'name' | 'scene'>, chosen: unknown): CardArt {
 return isCardArt(chosen) ? chosen : defaultGoalArt(g);
}
