/**
 * Session X Part 5a: which navigation links skip Next's link prefetching. Every prefetch is a Worker invocation on the
 * Alpha (on #32 a resting Today page made 23 of them on a computer and 11 on a phone), so a destination stops
 * prefetching only where navigating to it measured no slower without it: on both layouts, in every run, its median time
 * from the tap to the new page's heading stayed within 5 % of the default (production build, 4x CPU slowdown, 12–16 rounds;
 * scripts/perf/prefetch-navigation.mjs, docs/performance/SESSION_X_PERFORMANCE.md). Today, Health, Staking and Activity
 * were slower in at least one run and keep prefetching; Chess and anything unmeasured keep the default too.
 */
const WITHOUT_PREFETCH: ReadonlySet<string> = new Set(['/app/goals', '/app/habits', '/app/wealth', '/app/markets', '/app/portfolio', '/app/ecosystem', '/app/settings']);
/** `false` for a destination measured not to need prefetching, else `undefined` (Next's default). */
export function navPrefetch(href: string): false | undefined {
  const [path = ''] = href.split(/[?#]/);
  return WITHOUT_PREFETCH.has(path) ? false : undefined;
}
