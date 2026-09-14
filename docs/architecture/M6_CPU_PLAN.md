# M6 CPU efficiency plan

**Historical implementation plan; rollout closed.** M6 is **COMPLETED + MERGED + DEPLOYED + OWNER-VERIFIED LIVE**, source `0c953a00d9f3e615289ae286549c74298b95dbdc`, Worker version `00799604-7999-4ef4-b75f-268d8a459f6f`. The original execution scope below ended at an unmerged PR; the owner subsequently merged, deployed and verified it. See the [completed report](../RUN_6_REPORT.md) and [owner post-deploy evidence](../verification/m6/OWNER_POST_DEPLOY.json). Future-tense steps below are retained as the original plan, not outstanding tasks or authorization to repeat them.

Scope is bounded performance hardening of the existing Next/OpenNext app. Preserve per-response nonce CSP, current UX, local privacy, explicit reconnect and financial refusal. User authorizes conservative implementation decisions without additional design approval; no production mutation. Work directly in the requested checkout/branch. No migration, dependency upgrade or speculative refactor.

## Cluster 0 — durable scaffold and owner baseline

Create resume/report/plan and sanitized CPU_BASELINE.json first, validate JSON/medians, commit/push.

## Cluster 1 — audit and repeatable measurement

Read source middleware/layout/route and asset dispatch, generated Worker composition and current official documentation. Build the baseline once for local startup/bundle evidence. Inspect official `wrangler check startup` before use; separate startup profile from invocation CPU and local wall timing. Implement a bounded route-wall measurement CLI and a strict allowlist tail sanitizer if the documented event schema supports it. Tests use loopback/synthetic events; no raw trace persistence. Save sanitized baseline results and source identities. Checkpoint before optimization.

## Cluster 2 — supported low-risk corrections

Prove exact static routes can bypass dynamic nonce work without matching app/subpaths; use exact matcher/config routing, keep required static response headers. Test negative/bypass cases before minimal implementation. Audit browser-only heavy imports from generated server bundles; change only a demonstrated unnecessary cost with preserved hydration/behavior. Evaluate a conservative Paid CPU cap above the observed539ms spike; test config constraints and document timeout behavior. Reject speculative migrations/static CSP rewriting. Checkpoint with targeted checks.

## Cluster 3 — final evidence and handoff

Build optimized output, run one matched local comparison, write SSR/CSP analysis and post-deploy CPU checklist with honest uncertainties. Full final gate once: deployment/landingdryrun,lint/types/JS,Nextbuild,browser/restart,Alphabuild/dryrun/workerd,Rustfmt/Clippy25tests/schema,secret/source integrity. No Rust/dependency changes planned; no repeated advisory research unless affected. One independent security/performance review; address correctness findings, no unnecessary cosmetic review loops. Open PR against main, observe exact-head CI, leave unmerged. Update resume/report before every checkpoint and push each cluster.

## Acceptance

Sanitized owner evidence; intentional static exclusions verified in actual local workerd; dynamic security boundaries intact; repeatable wall/CPU evidence distinctly labelled; justified cap; exact test totals and source-pinned before/after without production improvement claims. Owner must deploy separately and then measure the exact deployed version before claiming CPU benefit.
