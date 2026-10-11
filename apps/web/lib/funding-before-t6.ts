import type {fundingHealth} from './goal-intelligence';

/**
 * Test support (Session W Part 17, T6-B): the funding output as the due-day rule before T6-B gave it, rebuilt from
 * today's output: what is still due today counted as planned again, the variance, "overdue" and the status recomputed
 * from that, and the two fields phase 4 added (`dueToday`, `planZone`) removed. The golden digests computed on main
 * (funding-day-parity.test.ts, funding-day-edges.test.ts) are compared with this view byte for byte, so any change other
 * than exactly the T6-B rule still fails them. Nothing in the app imports this file.
 */
export function fundingBeforeT6(h: ReturnType<typeof fundingHealth>) {
  const {dueToday, planZone, ...rest} = h;
  void planZone;
  const due = BigInt(dueToday);
  if (due === 0n) return rest;
  const variance = BigInt(rest.variance) - due;
  const status = rest.status === 'REVIEW' || rest.status === 'COMPLETED' || rest.status === 'NO_PLAN' ? rest.status
    : variance < 0n ? 'BEHIND' : variance > 0n ? 'AHEAD' : rest.shortfall === '0' ? 'ON_TRACK' : 'BEHIND';
  return {...rest, plannedThroughToday: (BigInt(rest.plannedThroughToday) + due).toString(), variance: variance.toString(), overdue: variance < 0n, status};
}
