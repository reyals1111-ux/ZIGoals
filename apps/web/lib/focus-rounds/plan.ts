/**
 * Session AK (BUILD list 2 #15): when the bell rings during a Pomodoro run, as pure steps on timestamps. Every remaining
 * change (each phase's end, the last one being the run's end) is scheduled at once on the audio clock, which keeps time
 * in a background tab where page timers are slowed; so a phase that ends while the tab is hidden still rings on time,
 * and the page catching up later never rings twice. A skipped break moves every later change: the plan is made again
 * and the change rings now. Ending the run early cancels what was still to ring and rings nothing. Nothing is stored.
 */
export type RunShape = {id: string; index: number; phaseStartedAt: number; phases: readonly {kind: 'work' | 'break' | 'long-break'; minutes: number}[]};
/** The moments (ms) of every change still ahead in the run: the end of the phase now and of each one after it. */
export function bellTimes(run: RunShape): number[] {
  const out: number[] = [];
  let t = run.phaseStartedAt;
  for (let i = run.index; i < run.phases.length; i++) { t += run.phases[i]!.minutes * 60_000; out.push(t); }
  return out;
}
export type Scheduled = {runId: string; times: number[]} | null;
export type Step = {ringNow: boolean; cancel: boolean; schedule: number[]; scheduled: Scheduled; quiet: boolean | null};
/** Times this close are the same change (a page tick a little after the bell). */
const SLACK = 1500;
/**
 * The step for a new snapshot of the run (null: no run). `scheduled` is what was planned before; `quiet` says whether
 * the focus sound should be faded (a break) or back (work, or no run); null leaves it as it is.
 */
export function bellStep(scheduled: Scheduled, run: RunShape | null, now: number): Step {
  if (!run) {
    // The run ended: when every change already rang it finished on time; otherwise it was ended early: cancel quietly.
    const ahead = scheduled?.times.some(t => t > now + SLACK) ?? false;
    return {ringNow: false, cancel: ahead, schedule: [], scheduled: null, quiet: scheduled ? false : null};
  }
  const times = bellTimes(run), quiet = run.phases[run.index]!.kind !== 'work';
  if (!scheduled || scheduled.runId !== run.id) return {ringNow: true, cancel: !!scheduled, schedule: times.filter(t => t > now), scheduled: {runId: run.id, times}, quiet};
  // A natural change keeps every later moment where it was planned; a skipped break moves them.
  const same = times.every(t => scheduled.times.some(s => Math.abs(s - t) < SLACK));
  if (same) return {ringNow: false, cancel: false, schedule: [], scheduled, quiet};
  return {ringNow: true, cancel: true, schedule: times.filter(t => t > now), scheduled: {runId: run.id, times}, quiet};
}
