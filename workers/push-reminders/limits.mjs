/**
 * The push Worker's fixed limits and its one payload (ADR-010 "Limits"), in their own module: workerd reads every
 * export of the main module as an entrypoint, so plain values live here and worker.mjs exports only its handler and
 * the Durable Object class.
 */
export const LIMITS={subscriptions:5,schedules:20,sendsPerDay:50,requestsPerHour:60,collapseMs:60_000,staleMs:600_000,refreshMs:30*86_400_000,bodyBytes:8192,tokenMs:6*3_600_000,pauseAfter:3};
/** The one message every reminder carries; the service worker reads only its version. */
export const PAYLOAD='{"v":1}';
