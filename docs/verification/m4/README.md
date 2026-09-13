# Milestone 4 evidence

These files distinguish measured local/hosted results from source review, historical comparison and gates that did not run. No file grants upload approval or proves a chain deployment.

| Evidence | Scope |
|---|---|
| [LOCAL_RESULTS.json](LOCAL_RESULTS.json), [TEST_MATRIX.json](TEST_MATRIX.json) | Final implementation local checks and exact collected case names/totals |
| [MINOR_REREVIEW.md](MINOR_REREVIEW.md) | Both test-evidence review repairs and normalized browser test colors |
| [IMPLEMENTATION_HOSTED_RESULTS.json](IMPLEMENTATION_HOSTED_RESULTS.json), [IMPLEMENTATION_PR_CANDIDATE.json](IMPLEMENTATION_PR_CANDIDATE.json) | Integrated476/25/36/8 hosted checks and second independently verified canonical run; exact synthetic source8b0e513 |
| [FINAL_REVIEW.md](FINAL_REVIEW.md), [FINAL_REREVIEW.md](FINAL_REREVIEW.md) | Whole-branch review and single consolidated fix-wave approval |
| [BASELINE.json](BASELINE.json) | Fresh clean merged M3 baseline and actual main-push CI |
| [FIRST_HOSTED_RESULTS.json](FIRST_HOSTED_RESULTS.json) | First actual M4 quality run and two independent canonical jobs, downloaded bytes and local re-verification |
| [FIRST_PR_CANDIDATE.json](FIRST_PR_CANDIDATE.json) | Strict metadata for the first unsigned REPRODUCIBLE candidate; NOT_APPROVED |
| [MAC_COMPATIBILITY.json](MAC_COMPATIBILITY.json) | Non-authoritative normalized Mac build, DEVELOPMENT_ONLY |
| [CROSSHOST_SECTIONS.json](CROSSHOST_SECTIONS.json) | Actual section payload comparison; no inferred remaining root cause |
| [CONTRACT_REVIEW.md](CONTRACT_REVIEW.md) | Fresh independent deployment-focused engineering review; not a professional audit |
| [FRONTEND_REVIEW.md](FRONTEND_REVIEW.md) | Fresh merged baseline security review and strict-RPC followup |
| [RELEASE_TASK_REVIEW.md](RELEASE_TASK_REVIEW.md) | Canonical release tooling task review and minor fixes |
| [HANDOFF_TASK_REVIEW.md](HANDOFF_TASK_REVIEW.md) | Canonical-only preparation integration and Node24 workflow review |
| [ADVISORIES.json](ADVISORIES.json) | Actual pnpm production/full and RustSec results, including maintenance warnings |
| [PREPARED_MANIFEST.json](PREPARED_MANIFEST.json) | Unsigned canonical PR preparation with all live deployment fields null |
| [ALPHA_TASK_REVIEW.md](ALPHA_TASK_REVIEW.md) | Public safety/CSP/hosting task review; records its original minor findings |
| [BROWSER_RESTART.json](BROWSER_RESTART.json) | Full Chrome exit/relaunch on clean M4 package; external boundaries mocked |
| [PERFORMANCE_BEFORE.json](PERFORMANCE_BEFORE.json), [PERFORMANCE_AFTER.json](PERFORMANCE_AFTER.json) | Cold local production samples; not field Core Web Vitals or hosted CPU |
| [LICENSE_INVENTORY.json](LICENSE_INVENTORY.json) | Installed package license metadata, no compliance certification |
| [PUBLICATION.json](PUBLICATION.json) | Prepared local package, actual access blockers, unchanged apex body and no DNS/mail writes |

The [Run 4 report](../../RUN_4_REPORT.md) records final tests, reviews, hosted run links and owner steps. A PR run's actual synthetic merge source differs from its feature head and any later merge. Verify source and bytes using [the release guide](../../deployment/VERIFY_RELEASE_ARTIFACT.md), never a report's prose alone. The separately authorized main-only attestation workflow has not run during M4; no tag or release exists.
