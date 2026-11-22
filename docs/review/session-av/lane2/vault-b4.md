# Lane 2 — vault-b4 (the B4 Health-restore unit test)

Branch `lane2/vault-b4` from `lane2/batch3`.

## The failure
`apps/web/lib/vault-sync-rules-y.test.ts` › "B4: a Health restore completes but leaves Health sync off; the consent box
asks, with the reason, and takes the focus": `expect(h.restore).toHaveBeenCalledTimes(1)` got 0.

## Bisect
`git bisect start --first-parent 39d56563 675c4fe0`, with the B4 test alone (`-t`) at each step. The sandbox would not run
`git bisect run`, so each step was run and marked by hand: 05ae6029 bad, 2d9ec45b bad, 5b901218 bad, so bisect named
5b901218 (help-page sentences, corpus, shard list only). That commit cannot cause it. Then the "good" end, **675c4fe0, also
failed here**. So no commit between 675c4fe0 and 39d56563 caused this. The test is sensitive to timing and fails when
the machine is under heavy load (load average 11–16 on 4 CPUs while six builders ran).

## Cause
- Unlocking starts `sync()`. Once the account sections are done it runs `runExtras`, which loads
  `lib/vault/extras-sync` on demand (`import()`). A cold load of that module in vitest took about 3.4 s on this machine
  (measured alone).
- `open()` in the test waited a fixed 200 ms (`settle()`), so the post-unlock sync was still running when the test called
  `h.domain.prepare('restore','health')` and `h.domain.confirm()`.
- `guarded()` lets one person's action run at a time and ignores a second one while the first runs (as designed; in the
  real panel those buttons are disabled while busy). Both calls were ignored, so `acceptDomainRestore` was never called.
- Proof that it depends on order: whichever test runs first in the file fails. Run alone, "B4: with Health consent already
  on…" fails the same way. Later tests find the module already loaded and pass.

No app bug: the panel works as designed, and the browser loads that chunk quickly.

## Fix (test setup only, deliberate; no app change)
`apps/web/lib/vault-sync-rules-y.test.ts`, labelled `// Session AV lane 2 (test setup timing, deliberate; vault-b4)`:
- `beforeAll` loads `./vault/extras-sync` once (60 s hook timeout), so no test pays the cold load. The module comes from the
  same file-level module cache and the same `vi.mock` set the component uses.
- `open()` now ends with `idle()`: it waits, in 20 ms `act` steps for at most 5 s, until the panel's `busy` prop is
  `false`, and asserts `expect(h.domain.busy).toBe(false)`. That is one assertion more, and none were removed or changed.

## Tests
- `vault-sync-rules-y.test.ts`: 9/9 pass; each B4 test run alone, cold, passes.
- `apps/web/lib/vault/**`, `apps/web/lib/vault-*.test.ts`, `apps/web/lib/restore/**`: 65 files, 576/578 pass in one run.
  The 2 others timed out under load in files this change does not touch: `vault/backup.test.ts` "large encrypted
  backup…" (5 s default timeout) and `vault/zod-jitless.test.ts`. Each passes when re-run alone (2/2 and 3/3 + 1).
- eslint on the changed test file: clean.

## Stored changes, Help, What's new, Showcase, device keys
None.
