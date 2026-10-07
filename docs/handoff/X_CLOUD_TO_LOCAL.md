# Handoff: X-Cloud → X-LOCAL

Session X-Cloud (`feature/session-x-cloud`, [PR #78](https://github.com/reyals1111-ux/ZIGoals/pull/78)) never edits
X-LOCAL's lane (`apps/web/components/zigi/**`, `apps/web/lib/ai/**`, `public/brand/figures/zigi*`, ZIGi docs and specs,
the golden set, Settings' ZIGi group, Help's ZIGi topic, `/api/zigi`). Each item below is something X-Cloud found that
needs a change there: what, where, evidence, suggested fix. Newest last. X-LOCAL's own requests to X-Cloud go in
`docs/handoff/X_LOCAL_TO_CLOUD.md` on `feature/session-x-local-zigi`; X-Cloud reads that file at every gate.

## H1 — Secret-shaped literals in ZIGi's tests (Session X Part 2, 2026-10-07)
**What.** `apps/web/lib/ai/memory.test.ts:49` holds `'AIzaSy…'` with exactly 35 characters after `AIza`: GitHub's secret
scanning pattern for a Google API key matches it (the only literal in the repository that does). It is a fictional value
in the memory refusal test. Line 158 holds an OpenAI-shaped `sk-proj-…` (not GitHub's OpenAI pattern, but a generic
scanner's).

**Evidence.** `scripts/check-secrets.mjs` (extended in Part 2 with provider shapes) finds it as "Google API key"; it
passes today only because `scripts/secret-allowlist.json` pins that one value (file + check + sha256). git history
(`5fb09cb`, `5367eb8`) keeps the literal, so a GitHub alert, if one was raised, needs dismissing as a test value by the
owner.

**Suggested fix (exact, values unchanged at run time):**
- Line 49 → 
  ```ts
  // The sample keys are joined at run time so no key-shaped literal sits in the source (GitHub's secret scanning matched
  // the Google sample; Session X Part 2). The values the test checks are unchanged.
  for (const secret of ['My key is ' + ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz012345'].join('-'), ['AI', 'zaSyA1234567890abcdefghijklmnopqrstuv'].join(''), ['xai', 'abcdefghijklmnopqrstuvwxyz'].join('-'), `0x${'ab'.repeat(32)}`, 'password: hunter22', 'My recovery phrase is apple banana cherry', 'pin = 1234', 'Bearer abcdefghijklmnopqrstuvwxyz123']) {
  ```
- Line 158 →
  ```ts
  expect(refusal({kind: 'remember', text: 'My OpenAI key is ' + ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz012345'].join('-')})).toBe(SECRET_REFUSAL);
  ```
- Then remove the one entry from `scripts/secret-allowlist.json` (if X-LOCAL merges second; otherwise X-Cloud removes it
  when it merges main). A stale entry only prints a warning; it never fails CI.

**The same hygiene, optional (none matches a GitHub pattern today; generic scanners may flag them):**
`apps/web/lib/ai/errors.test.ts:8` (`AIzaSyFAKE…`, `xai-FAKE…`, `sk-or-v1-…`), `apps/web/lib/ai/keys.test.ts:6,25,26,31`
(`sk-test-FAKE…`, `sk-ant-FAKE-…`), `apps/web/lib/ai/export.test.ts:10,20`, `apps/web/lib/ai/chats.test.ts:33,88`,
`apps/web/lib/ai/launcher-record.test.ts:24`, `apps/web/lib/ai/settings.test.ts:31`, `apps/web/lib/ai/voice.test.ts:37,39`,
`apps/web/lib/ai/openrouter-auth.test.ts:34,35`, `apps/web/lib/ai/fixtures/mock-streams.ts:6` (`FAKE_KEY`),
`apps/web/tests/your-ai-captures.spec.ts:20`, `apps/web/tests/zigi-memory.spec.ts:69` (`password: …`). The repository's
convention is the fragment join used in `scripts/secret-patterns.test.mjs` (`"sk-" + "ant-" + …`).
