# M6 resume state

- Starting clean fetched main: `01ebf00f7a177ab86fb41b52164fa7f5320f644c`.
- Branch: `feat/m6-cpu-efficiency`; existing requested workspace retained.
- Latest pushed checkpoint before this commit: `31430b75a257345025bff996c55b0f1447b34b31`; this commit adds measured baseline + wall CLI. Resolve its own SHA via `git log -1` after pushing.
- COMPLETE: clean main/branch/scaffold; sanitized owner baseline; current source/static routing audit; one clean Alpha baseline build/dryrun; official Wrangler local startup profile; server source-map inventory; repeatable bounded wall CLI with19 targeted tests passing.
- IN PROGRESS: checkpoint audit/tooling, then static routing and conservative CPU cap.
- NOT STARTED: static/cap regression tests and edits; matched after measurements; SSR/CSP note; owner CPU checklist; final full suite/review/PR/CI.
- Last tests: measurement red (missing implementation), then19/19 pass. Baseline Alpha build and dryrun/startup exit0.15 loopback GET samples200. No full suite repeated yet.
- Findings: baseline icon+robots200 with nonce/no-store, absent from29 direct assets; favicon404 without nonce; social assets bypass. First local /app wall261.595ms, median14.188; settings13.07; icon10.13. Startup active19018us,16 samples; not invocation CPU. Source maps include wallet/CosmJS/Zod/Decimal/registry, but do not prove eager execution. Next16.3.5 Turbopack source already carries sriEnabled (do not repeat obsolete webpack-only claims).
- Decision: move icon+robots to public with explicit icon metadata; exact matcher boundaries; static security headers in _headers/Next config. Keep nonce HTML rendering. Cap2000ms pending regression checks; no speculative import refactor.
- Next exact task: add red tests to public-safety.test.ts and check-deployment-configs.test.ts, then implement the above. Before rebuilding, stop only M6 workerd session (port8791); baseline generated package currently in apps/web/.open-next. Repeat measurements with same CLI/port/count/spacing after implementation.
- Evidence: LOCAL_BASELINE_WALL.json, LOCAL_BASELINE_ANALYSIS.json; raw local startup profile/bundle at /tmp/zigoals-m6-baseline.{cpuprofile,bundle}. Build source31430b clean; do not rebuild baseline. No raw production traces collected.
- Working tree should be clean after this checkpoint push. One meaningful cluster maximum uncommitted/unpushed.
- Production mutations: NONE. No deploy, billing/limits/account/DNS/email change, financial action, contract change or external outreach authorized.
- On usage/resource warning: finish current safe atomic change, targeted test, update this file/report, commit/push and stop with exact next command.
