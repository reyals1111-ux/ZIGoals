# Session AD item 10 — WebKit evidence across PR #88's CI runs

The question (Session AC, item 16): does the WebKit navigation stall (a seeding `page.goto` that never settles, traced
in AC to the seeding goto and mitigated) come back? WebKit stays a required job throughout. Every Milestone quality run
of this PR, both WebKit shards (smoke, ZIGi, phone set):

| Run | Head | Shard 1/2 | Shard 2/2 | Stall? | Notes |
|---|---|---|---|---|---|
| 981 | `5c041573` (Part 0) | pass | pass | no | |
| 982 | `a0e01369` | cancelled | cancelled | — | superseded by the next push |
| 983 | `a9505b56` (Parts 1–2) | pass | pass | no | |
| 984 | `cfe0f1e1` (Part 3) | pass | pass | no | |
| 985 | `389bb3f6` | cancelled | cancelled | — | superseded |
| 986 | `c2ca3697` | 2 failed | pass | no | `zigi-accept-correct:260` (Europe/Brussels, create-habit weekdays): "Target crashed" in `page.evaluate` — WebKit's content process crashed; the same case passed in UTC and Asia/Tokyo in the same shard and on every other run. `zigi-memory:105`: the Send button stayed disabled after `fill` for 60 s (test timeout). Neither is the navigation stall; neither recurred on 987. |
| 987 | `ab6f8545` | pass | pass | no | |

Later runs are added at Gate C. Conclusion so far: no navigation stall in any run of this PR; one WebKit process crash
and one input-state timeout on a single run, not repeated. No change to the WebKit setup is made; it stays required.
