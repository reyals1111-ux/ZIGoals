# M6 resume state

- Starting clean fetched main: `01ebf00f7a177ab86fb41b52164fa7f5320f644c`.
- Branch: `feat/m6-cpu-efficiency`; existing requested workspace retained.
- Latest pushed checkpoint before this commit: `9cb73aab9f3f02160a56dd1fd65bd724384da922`. This checkpoint adds tested trace sanitizer, owner checklist and current-state docs.
- COMPLETE: baseline, wall CLI, static asset/matcher fix,2000ms cap, SSR/CSP note, sanitized-tail helper and owner comparison procedure. Current status now reflects owner-deployed M5/Workers Paid.
- IN PROGRESS: final integrated acceptance and one independent security/performance review.
- NOT STARTED: matched after build/profile/wall evidence, full gate, final report counts, PR/current-head CI.
- Last tests:19 measurement tests,48 static/config tests,13 sanitizer tests pass (red/green observed); targeted ESLint/config/secret-pattern checks and diff whitespace pass. New browser case and full suite NOT RUN yet.
- Known findings: see baseline JSON and SSR note; no new CPU attribution or live evidence claimed. Source/import/contract/lockfile state preserved except intended static metadata routing. Tail schema with absent metrics yields null, no matching samples is not zero CPU. Helper tested synthetically; no live tail opened.
- Next exact commands: run final lint/typecheck/JS/Next build/config/landingdryrun/secret gate; use production Next loopback3108 for all browser tests + verify-browser-restart. Stop only baseline M6 Wrangler port8791 after rechecking PIDs72268/72282, then build Alpha from this clean checkpoint. Run dryrun/startup once and first-request wall CLI on fresh8791 BEFORE browser/readiness HTTP probes. Run public-alpha/diagnostics/wallet-reload in workerd. Finally Rustfmt/Clippy/tests/schema/generated drift once. Toolchain locations and commands in CPU plan + repository CI; Node24 runtime is required.
- After evidence: summarize local before/after, exact totals and review; commit/push; open unmerged PR and verify current-head CI; checkpoint report/resume before final response. Do not repeat baseline/research/full suites without a real failure or code change.
- Working tree should be clean after checkpoint push. /tmp/zigoals-m6-baseline.* and tracked baseline evidence allow continuation without rerunning them.
- Production mutations: NONE. No deploy, billing/limits/account/DNS/email change, financial action, contract change or external outreach authorized.
- On usage/resource warning: finish current safe atomic change, targeted test, update this file/report, commit/push and stop with exact next command.
