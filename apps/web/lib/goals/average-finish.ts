/**
 * Session AL fifth pass (G-045, AL-XP-BADGES-002): an average goal finishes as achieved only when its rule is met over
 * its window; otherwise its one ending is "Close as not reached" (status `closed`), which keeps its days and never puts it
 * on the Hall of achievements or fires a celebration. A missed "at most 2 h" with 2.3 h entered was marked finished and
 * listed on the Hall.
 */
import {setAverageStatus, type AverageGoals} from '../average-goals/store';

export type AverageEnding = {status: 'completed' | 'closed'; action: string; done: string; celebrate: boolean};

/** The one way an active average goal can end now, from `met` (lib/average-goals/progress.ts averageProgress). */
export function averageEnding(met: boolean | null): AverageEnding {
  return met === true
    ? {status: 'completed', action: 'Mark as finished', done: 'Marked as finished. It is on the Hall of achievements.', celebrate: true}
    : {status: 'closed', action: 'Close as not reached', done: 'Closed as not reached. Its days stay; it is not on the Hall of achievements.', celebrate: false};
}

/** Ends the goal the only way its rule allows: a missed (or still empty) average is closed, never completed. */
export function endAverageGoal(state: AverageGoals, id: string, met: boolean | null, at: string): AverageGoals {
  return setAverageStatus(state, id, averageEnding(met).status, at);
}
