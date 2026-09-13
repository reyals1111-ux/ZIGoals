# Milestone 2 review record

Task reviews and scoped fix reviews are complete. Final whole-branch review is pending. No findings were parked or ruled out. This is an internal implementation review, not an independent security audit.

## Transaction recovery re-review

### Finding Verdicts

- **Important: receipt recovery lacked a practical aggregate attribute and text-byte budget** — ADDRESSED. `apps/web/lib/receipt-reconciliation.ts:67` caps the entire receipt at 512 attributes, while `apps/web/lib/receipt-reconciliation.ts:68` and `apps/web/lib/receipt-reconciliation.ts:72` enforce a 64 KiB aggregate UTF-8 budget across event types, attribute keys, and values. Array lengths are counted before attribute traversal at `apps/web/lib/receipt-reconciliation.ts:87`. Oversized receipts still reject and therefore reconcile as uncertain through the existing catch path. New tests cover aggregate attribute count, ASCII bytes, multibyte UTF-8 bytes, event-type bytes, and an ordinary within-budget receipt at `apps/web/lib/receipt-reconciliation.test.ts:125`.
- **Minor: definite failure copy named only deposits and withdrawals** — ADDRESSED. The message now says “The action was not applied,” which applies to create, deposit, withdraw, and close at `apps/web/lib/transaction.ts:91`; the focused assertion is at `apps/web/lib/transaction.test.ts:204`.

### New Breakage in the Fix Diff

None. The aggregate validator avoids encoding strings whose character count already exceeds the remaining budget, then checks actual UTF-8 byte length, so multibyte strings cannot bypass the cap (`apps/web/lib/receipt-reconciliation.ts:72`). The fix report names the covering red cases and shows a green 52-test targeted run plus successful typecheck, scoped lint, and diff check; tests were not rerun during this re-review.

### Out-of-Scope Observations

None. Controller-owned dependency and explorer integration was independently verified at `b2fd958` and was not reopened in this scoped round.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ecosystem re-review

Important — public coordination notes: ADDRESSED. `packages/ecosystem-registry/src/providers.json:149` removes the owner-email/outreach instruction; the Zignaly owner-requested wording is also removed. Data and rendered-page absence regressions preserve the actual integration gates (`packages/ecosystem-registry/src/registry.test.ts:192`, `apps/web/lib/ecosystem-ui.test.ts:70`).
Minor — exact contract evidence: ADDRESSED. OroSwap's four records now cite the matching mainnet/testnet deployment manifests (`packages/ecosystem-registry/src/providers.json:220`, `packages/ecosystem-registry/src/providers.json:242`); every PermaPod contract cites its configuration source (`packages/ecosystem-registry/src/providers.json:361`). Representative mapping tests verify chain, URL and complete evidence record (`packages/ecosystem-registry/src/registry.test.ts:206`).
Minor — visible provenance review dates: ADDRESSED. Each displayed relationship now includes its validated date in a semantic time element (`apps/web/components/strategy-transparency.tsx:48`), with a rendered-markup assertion (`apps/web/lib/ecosystem-ui.test.ts:66`).
New breakage in fix diff: None found; no Critical, Important or Minor finding.
Out-of-scope code observations: None.
Check: fix report names the covering registry/UI tests and includes red output (9 failed/30 passed) and green output (39 passed); the added assertions correspond to the repaired behaviors. No tests rerun.
Check: reported typecheck and diff check exit 0. ESLint exits 0 with the explicitly documented React auto-detection environment warning; the controller retains the full-root lint follow-up, not treated here as source breakage introduced by these fixes.
Check: inspected only `review-fed5c84..2a9ac70.diff` once, plus requested brief/reports; citation lookup used the cached diff. No implementation, index, HEAD or branch mutation; only this requested review report was written.
Fix round: All findings addressed, no new Critical/Important breakage. Task-scoped spec compliance and code quality approved; whole-branch integration review remains separate.

Full-root lint subsequently passed without the scoped React detection warning.
