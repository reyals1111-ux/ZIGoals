Preparation rejection assertions — ADDRESSED: scripts/prepare-deployment.test.mjs:53 defines distinct errors for all five gates, and :69 asserts expectedError; the missing-validator failure can no longer mask source/byte/schema regression.
Incomplete Cookie capture — ADDRESSED: apps/web/tests/public-alpha.spec.ts:8 awaits allHeaders(), :17 drains pending batches and :22 fails on capture errors; :111 waits for network idle before the lifecycle sentinel assertion.
Cookie regression evidence — ADDRESSED: apps/web/tests/public-alpha.spec.ts:29 installs a real HttpOnly sentinel cookie, verifies document.cookie cannot reveal it and requires the shared capture to find the outgoing Cookie value.
Inherited color warning — ADDRESSED: .github/workflows/ci.yml:40 and :54 remove NO_COLOR only for both Playwright invocations; /tmp/zigoals-task2-review-green.log records six passing browser cases without color warnings.
New breakage in fix diff: None.
Out-of-scope observations: Existing middleware deprecation remains the separately documented adapter compatibility limitation; this fix does not change production middleware.
Evidence checked: supplied 9dc2f5f..736f195 diff read once; appended Task 1/2 reports read; m4-preparation-specific-errors.txt records 10 passing preparation tests; browser RED log fails precisely on the hidden Cookie marker and GREEN log records six passing desktop/mobile cases.
Fix round: All requested findings addressed, no new Critical/Important breakage. No test reruns, broad review, checkout edits or git mutations performed.
