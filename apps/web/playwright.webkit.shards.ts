import {readdirSync} from 'node:fs';

/**
 * Session AN ([TIER 3] (CI)): the WebKit job's four shards, as explicit file lists balanced by measured duration.
 *
 * Playwright's own `--shard` cuts by test count in file order, and WebKit test times vary a lot by file (one
 * `zigi-accept-correct` desktop group is 75 tests and 25 minutes), so on main (run 1634) the three count-cut shards
 * took 32.5, 37.4 and 19.9 minutes. These lists were packed from per-file durations (the median of runs 1634, 1677
 * and 1680, reconstructed from the line reporter's timestamped CI logs, about 156 worker-minutes in all), simulating
 * the job's two workers (desktop groups first, then mobile, each in file order).
 *
 * `partitionProblems` checks that every spec the WebKit config selects is in exactly one list; the config throws on any
 * problem when `WEBKIT_SHARD` is set, and `scripts/ci/webkit-shards.test.ts` runs the same check in `pnpm test`. A new
 * WebKit spec (a `webkit-*` or `zigi-*` file under tests/) therefore fails loudly until it is added here: put it in the
 * list with the fewest measured minutes (`WEBKIT_SHARD_MINUTES`).
 */

/** Selected by name anywhere under tests/ (unchanged from Session Y Part 6). */
export const WEBKIT_TEST_MATCH = /(webkit-[a-z0-9-]+|zigi-[a-z0-9-]+)\.spec\.ts$/;
/** Real-model, conversation and on-device specs stay out of WebKit (unchanged). */
export const WEBKIT_TEST_IGNORE = /zigi-(real-model|conversations|pages-conversations|day-in-the-life|on-device|browser-agents)\.spec\.ts$/;

export const SHARDS_FILE = 'apps/web/playwright.webkit.shards.ts';

/** Paths relative to apps/web/tests/, with forward slashes. */
export const WEBKIT_SHARDS: readonly (readonly string[])[] = [
  // Shard 1, 45.2 worker-min: one worker runs the desktop zigi-accept-correct group (≈25 min, the job's floor), the
  // other its mobile group (≈13 min) and the rest (≈20 min in all), so this shard has slack on its second worker.
  ['webkit-celebration.spec.ts', 'zigi-accept-correct.spec.ts', 'zigi-act.spec.ts', 'zigi-brief-af.spec.ts', 'zigi-memory-af.spec.ts', 'zigi-part-boundary.spec.ts'],
  // Shard 2, 37.5 worker-min.
  ['grok53/shell/zigi-hold-busy.spec.ts', 'zigi-a11y-pass.spec.ts', 'zigi-alive.spec.ts', 'zigi-checklist-af.spec.ts', 'zigi-help-settings.spec.ts', 'zigi-memory.spec.ts', 'zigi-mini-window.spec.ts', 'zigi-page-awareness-af.spec.ts', 'zigi-question-context.spec.ts', 'zigi-simulated-day.spec.ts', 'zigi-states.spec.ts', 'zigi-stress.spec.ts', 'zigi-voice-z.spec.ts'],
  // Shard 3, 37.4 worker-min.
  ['grok53/tasks/ls-006-043-zigi-on-tasks.spec.ts', 'webkit-add-money.spec.ts', 'webkit-governance.spec.ts', 'webkit-smoke.spec.ts', 'webkit-zigi-freeze.spec.ts', 'zigi-aa.spec.ts', 'zigi-chat-backdrop.spec.ts', 'zigi-composer-switch.spec.ts', 'zigi-emotions.spec.ts', 'zigi-knock.spec.ts', 'zigi-local-answers.spec.ts', 'zigi-no-model-ab.spec.ts', 'zigi-personality.spec.ts', 'zigi-phone-rest.spec.ts', 'zigi-plans-af.spec.ts', 'zigi-proactive.spec.ts', 'zigi-safety.spec.ts', 'zigi-send-focus.spec.ts', 'zigi-tools.spec.ts', 'zigi-v2-captures.spec.ts', 'zigi-voice-dictation.spec.ts'],
  // Shard 4, 35.7 worker-min.
  ['grok53/ai/al-zigi-idle.spec.ts', 'webkit-checklist.spec.ts', 'webkit-earn.spec.ts', 'webkit-phone.spec.ts', 'webkit-staking.spec.ts', 'webkit-theme-parity.spec.ts', 'webkit-timeline.spec.ts', 'zigi-auto-accept.spec.ts', 'zigi-chat-polish.spec.ts', 'zigi-context-pack.spec.ts', 'zigi-earn-coach-af.spec.ts', 'zigi-face-z.spec.ts', 'zigi-history-undo.spec.ts', 'zigi-hosted.spec.ts', 'zigi-memory-page.spec.ts', 'zigi-oneline-z.spec.ts', 'zigi-photo.spec.ts', 'zigi-robustness.spec.ts', 'zigi-settings-reserve.spec.ts'],
];

/** Measured worker-minutes per shard (the comments above); a new spec goes to the smallest. */
export const WEBKIT_SHARD_MINUTES: readonly number[] = [45.2, 37.5, 37.4, 35.7];

/** Every spec under `testsDir` that the WebKit config selects, relative and with forward slashes, sorted. */
export function webkitSpecFiles(testsDir: string): string[] {
  return (readdirSync(testsDir, {recursive: true}) as string[])
    .map(f => f.split('\\').join('/'))
    .filter(f => WEBKIT_TEST_MATCH.test(f) && !WEBKIT_TEST_IGNORE.test(f))
    .sort();
}

function shortestShard(minutes: readonly number[]): number {
  return minutes.indexOf(Math.min(...minutes)) + 1;
}

/** Each problem names the file and the fix; an empty list means every selected spec is in exactly one shard. */
export function partitionProblems(
  files: readonly string[],
  shards: readonly (readonly string[])[] = WEBKIT_SHARDS,
  minutes: readonly number[] = WEBKIT_SHARD_MINUTES,
): string[] {
  const problems: string[] = [];
  const where = new Map<string, number[]>();
  shards.forEach((list, i) => list.forEach(f => where.set(f, [...(where.get(f) ?? []), i + 1])));
  const present = new Set(files);
  for (const f of files) {
    const at = where.get(f);
    if (!at) problems.push(`${f} is a WebKit spec in no shard: add it to the shortest list in ${SHARDS_FILE} (shard ${shortestShard(minutes)})`);
    else if (at.length > 1) problems.push(`${f} is in more than one WebKit shard (${at.join(', ')}): keep it in one list in ${SHARDS_FILE}`);
  }
  for (const f of where.keys()) {
    if (!present.has(f)) problems.push(`${f} is listed in WebKit shard ${where.get(f)!.join(', ')} but is not a WebKit spec under tests/: remove it from ${SHARDS_FILE}`);
  }
  if (minutes.length !== shards.length) problems.push(`${SHARDS_FILE} has ${shards.length} shard lists but ${minutes.length} measured durations: give each list one`);
  return problems;
}

/** `WEBKIT_SHARD=n/total`: that shard's files as anchored path patterns, after checking the whole partition. */
export function webkitShardMatch(spec: string, testsDir: string): RegExp[] {
  const m = /^(\d+)\/(\d+)$/.exec(spec);
  const n = Number(m?.[1]), total = Number(m?.[2]);
  if (!m || total !== WEBKIT_SHARDS.length || !(n >= 1 && n <= WEBKIT_SHARDS.length)) {
    throw new Error(`WEBKIT_SHARD="${spec}": expected n/${WEBKIT_SHARDS.length} with n from 1 to ${WEBKIT_SHARDS.length} (the lists in ${SHARDS_FILE})`);
  }
  const problems = partitionProblems(webkitSpecFiles(testsDir));
  if (problems.length) throw new Error(`The WebKit shard lists do not cover each spec exactly once:\n- ${problems.join('\n- ')}`);
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split('/').join('[\\\\/]');
  return WEBKIT_SHARDS[n - 1]!.map(f => new RegExp(`[\\\\/]tests[\\\\/]${escape(f)}$`));
}
