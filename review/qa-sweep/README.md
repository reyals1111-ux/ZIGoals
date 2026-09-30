# QA sweep 2026-09-30: evidence screenshots (not for merging)

Production build of `main` `d21ba8f` (`PUBLIC_ALPHA_UNDEPLOYED`), before this PR's fixes. Fictional data only; market/food providers answered with 503 fixtures. See `docs/qa/QA_SWEEP_2026-09-30.md` on the PR branch for the findings.

| File | Finding |
|---|---|
| `qa01-weight-72comma5-saved-as-725kg.webp` | QA-01: "72,5" typed into Weight (kg) is saved as 725 kg (Chrome, English UI) |
| `qa01-water-1comma5-logged-as-15ml.webp` | QA-01: "1,5" typed into Water amount is logged as 15 mL |
| `qa02-storage-full-restore-misleading-message.webp` | QA-02: after three large restores, a valid restore fails with "A newer stored version cannot be replaced" |
| `qa03-2mb-limit-check-in-try-again.webp` | QA-03: at the 2 MB Habits limit a check-in says "Try again" |
| `qa04-new-york-2130-due-day-already-behind.webp` | QA-04: 21:30 New York on the due day: already "behind −€500", next contribution a month later |
| `qa06-nl-BE-money-in-en-US-format.webp` | QA-06: nl-BE user sees money in en-US grouping |
| `qa13-manual-etf-called-not-liquid.webp` | QA-13 (fixed in `b675934`): a manual ETF of unknown liquidity was called "not liquid" |
