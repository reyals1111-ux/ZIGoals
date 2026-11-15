import {DAY_GOAL_CHANGES_MAX, DAY_GOAL_MAX, emptyDayGoal, type DayGoal, type DayGoalChange} from './day-goal-core';

/** Session AP: "A day counts as done at N" read from storage without the schema (exactly dayGoalSchema's rules). */
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const needOk = (v: unknown): v is number | null => v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= DAY_GOAL_MAX);
/** A stored value read without the schema: exactly the record's rules (dayGoalSchema), else "every dot" (off). */
export function readDayGoal(raw: string | null | undefined): DayGoal {
  if (!raw) return emptyDayGoal();
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (!v || typeof v !== 'object' || Array.isArray(v) || v.version !== 1 || !Array.isArray(v.changes) || v.changes.length > DAY_GOAL_CHANGES_MAX || Object.keys(v).some(k => k !== 'version' && k !== 'changes')) return emptyDayGoal();
    const changes: DayGoalChange[] = [];
    for (const c of v.changes as unknown[]) {
      const o = c as Record<string, unknown>;
      if (!o || typeof o !== 'object' || Array.isArray(o) || typeof o.from !== 'string' || !DAY.test(o.from) || !needOk(o.need) || Object.keys(o).some(k => k !== 'from' && k !== 'need')) return emptyDayGoal();
      changes.push({from: o.from, need: o.need});
    }
    // Strictly increasing dates: one rule per day, in order (what the write keeps).
    for (let i = 1; i < changes.length; i++) if (changes[i]!.from <= changes[i - 1]!.from) return emptyDayGoal();
    return {version: 1, changes};
  } catch { return emptyDayGoal(); }
}

