// Session U Part 5: a stand-in for the Workers runtime module `cloudflare:workers`, for unit tests that import a Worker
// module directly in Node (vitest.config.ts aliases it here). Only the base class is provided: it keeps ctx and env as
// the runtime does. Miniflare and the packaged tests always run the real runtime.
export class WorkerEntrypoint {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
}
