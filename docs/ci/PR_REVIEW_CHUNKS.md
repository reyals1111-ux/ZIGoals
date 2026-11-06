# PR review on large pull requests: chunks and cost (Session AL)

The advisory PR-review Action (`.github/workflows/pr-review.yml`, `scripts/pr-review/review.mjs`; Session AH RM6) sends a
pull request's diff to the Anthropic API and posts one comment. Until Session AL it read at most `MAX_DIFF_CHARS`
(180,000 characters) of the diff: on Session AK's PR #99 that was 45 of 2,258 files, and the comment said nothing useful.

## What it does now
- **A diff of 180,000 characters or less:** exactly as before. One request, one comment.
- **A larger diff:** split into **chunks by area**, at most **`PR_REVIEW_MAX_CHUNKS`** of them (a repository variable;
  unset or invalid means **8**; 1 to 32 accepted), each at most 180,000 characters. One request per chunk, one at a time,
  with the same model (`vars.PR_REVIEW_MODEL`), the same instructions and the same 2,000-token answer limit. The answers are
  merged into **one** comment.
  - **Areas:** `apps/web/<dir>/<sub>` (for example `apps/web/components/ai`, `apps/web/lib/wallets`), `apps/web/<dir>`
    for a file directly in it, `packages/<name>`, `workers/<name>`, otherwise the top folder (`scripts`, `.github`, `docs`,
    …). An area stays in one chunk when it fits; several small areas share a chunk (first fit); an area larger than a chunk
    is split at file boundaries.
  - **Priority when over budget:** code first, then tests (`apps/web/tests/**`, `*.test.*`, `*.spec.*`, fixtures), then
    docs (`docs/**`, `*.md`), then lockfiles and snapshots. What does not fit is **left out and listed** at the top of the
    comment (counts by kind and area, then up to 60 paths), with the sentence "over budget, code was reviewed first, then
    tests, then docs, then lockfiles". A single file larger than one chunk (a generated file) is listed as "larger than
    one chunk".
  - **A part that fails** (HTTP error, or no answer within 5 minutes) is named in the comment; the others still count. If
    every part fails, the job fails as before.
  - Each part's text is cut to its share of the comment (48,000 characters in all), so the comment stays under GitHub's
    65,536-character limit and the left-out list is never cut.
- The job's time limit is 45 minutes (eight parts at up to 5 minutes each; a part usually takes about one). With
  `PR_REVIEW_MAX_CHUNKS` above 8, raise the job's `timeout-minutes` too.

## Cost per run
Tokens are estimated as **characters ÷ 4** (code and diffs often tokenize a little denser; allow ±30 %).

```
cost per run ≈ Σ over parts [ (chars_part + 1,000) ÷ 4 × P_in  +  out_part × P_out ]
             ≤ parts × [ (180,000 + 1,000) ÷ 4 × P_in  +  2,000 × P_out ]
```
- `chars_part`: the part's diff (at most 180,000); 1,000 covers the instructions and the title.
- `out_part`: the answer, at most 2,000 tokens (`max_tokens`).
- `P_in`, `P_out`: the model's price per input and output token (per-million price ÷ 1,000,000).
- `parts`: at most `PR_REVIEW_MAX_CHUNKS` (8). A small PR is one part.
- Every push to a non-Draft PR runs it again (a newer push cancels a run in progress).

**Worked example** (prices per million tokens from Anthropic's published table, cached 2026-10-06; check the current
pricing page before relying on them): a giant PR filling all **8** parts of 180,000 characters is about
8 × 45,250 ≈ **362,000 input tokens** and at most 8 × 2,000 = **16,000 output tokens**.

| `PR_REVIEW_MODEL` | Input ($/M) | Output ($/M) | Giant PR, 8 parts | Small PR, 1 full part |
|---|---|---|---|---|
| Claude Sonnet 5.5 | 2.00 | 10.00 | 0.362 × 2 + 0.016 × 10 ≈ **$0.88** | 0.045 × 2 + 0.002 × 10 ≈ **$0.11** |
| Claude Opus 5.5 | 4.00 | 20.00 | 0.362 × 4 + 0.016 × 20 ≈ **$1.77** | 0.045 × 4 + 0.002 × 20 ≈ **$0.22** |
| Claude Haiku 5.5 | 0.10 | 0.50 | 0.362 × 0.1 + 0.016 × 0.5 ≈ **$0.04** | under **$0.01** |

Before Session AL a giant PR cost one part (the small-PR column) and reviewed about 2 % of it.

**Note on thinking models:** on a model whose thinking is always on (for example Claude Opus 5.5), the reasoning counts
against the same 2,000-token answer limit, so a long diff can end with little or no review text ("No review text came
back."). If that shows in a comment, the owner can choose a model with lower default effort or ask for a larger
`max_tokens` (a separate, owner-approved change; output cost then rises up to that limit).

## Settings and rollback
- Budget: Settings → Secrets and variables → Actions → Variables → `PR_REVIEW_MAX_CHUNKS` (for example `4` for at most
  four requests per run). Leave it unset for 8.
- Rollback: revert the Session AL commit that added the chunking (the Action goes back to one request that reads the
  first 180,000 characters).
