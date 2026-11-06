# Known CI intermittents: causes and proposed fixes (Session AL, lane L9)

Source: docs/STATUS.md, Session AK's "Known CI intermittents (this session)", every item not already marked "fixed at
its cause". Each was read at its spec line. Every proposed fix keeps every assertion (none removed, none loosened); the
spec files are outside lane L9, so **the integrator applies them** and proves each by repeat runs (as Session AK did).
Engine crashes are recorded with their diagnosis and not chased.

## Summary
| Item | Reading | Proposed |
|---|---|---|
| `scripts/ci/install-chrome.test.mjs:100` | Test timing: the fake "orphan" can be killed by the 5 s attempt limit before its lock holder starts | Fix 1 (test env only) |
| `zigi-voice-z:221` (WebKit desktop) | Likely product: a hold read as a tap when the hold timer fires after the pointer is released | Fix 2 (app, at the cause) |
| `webkit-earn:19` (WebKit phone) | The cancelled-fetch class (S64/AF16); this spec does not use the shared filter the smoke specs use | Fix 3 (spec) |
| `lib/illustrations/pillar-art.test.ts` | **Not an intermittent:** `pillar-art.css` was 3,075 bytes at `00f3a69d` and trimmed to 3,067 at `c8d0a44d` | Re-label in STATUS; note 5 bytes of headroom |
| `motion-polish:164` | Very likely the same `ERR_ABORTED` goto as `motion-polish:156` (the test that starts at line 156; line numbers have moved since run 41336014813): aborted by the closing sheet's async `history.back()` | Already fixed at cause (`b40c864b`: the `__zigoalsLayer` wait at line 169 before the goto at line 170); if it recurs on another line, read that run's trace |
| `nova-dashboard:232` | Measured mid-entrance | Already fixed at cause (`005ff708`, waits for finite animations, now line 233) |
| `zigi-stress:124`, `zigi-accept-correct:268`, `zigi-states:67`, `webkit-smoke:40` | WebKit class A (navigation after cancelled loads; Playwright/WebKit) | Record only (option below) |
| `zigi-accept-correct:265`, `zigi-memory:171`, `zigi-chat-polish:266` | WebKit class B: `ThreadedCompositor` segfault in `libWPEWebKit-2.0.so` (kernel line, 9.4 GB free) | Record only |
| `ui-evidence:108`, `theme-parity-af:15` | Chromium renderer stall in headless Chromium without a GPU | Record only |
| `hosted-verifier-order:18` (local) | Browser-aborted core chunk (`net::ERR_ABORTED` in 0.03 ms) | Record only; **spec line 39 must add stage 12** (see end) |
| `zigi-emotions:114` | WebKit "ZIGi box empty after a fill" (a Known limitation by owner decision 7) | Record only |
| WebKit job step "Install Playwright's WebKit and the Chrome shards' font" (CI 1583, shards 2–3) | Runner/apt slowness: the step took 36 min on two runners (3 min elsewhere), so the 45 min job limit cancelled the suites a few minutes in | Record only; one re-run (new head). CI 1585 (shard 1): the same — a cache miss after the runner image moved to 20261101 (the cache key holds the image), then azure.archive.ubuntu.com at ~30 kB/s; shards 2–3 finished the install and saved the cache. If it recurs on a cache hit: bounded attempts as in install-chrome.sh |
| `zigi-face-z:313`, `zigi-memory-af:15` (WebKit desktop, CI 1583) | `zigi-memory-af:15` is a recorded WebKit family (STATUS, c5014b60); `zigi-face-z:313` (Apps & extras sheet not visible in 2 s at 768 px) passed in 1577/1579; no segfault line | Record; one re-run; investigate on a second failure |
| `a11y-wcag-x:268` /app/tasks (CI 1579) | **Not an intermittent:** time of day — the Showcase P1 task is due 10:30, its chip read 4.00:1 before then | Fixed at the cause (`bf70befa`) |
| Sandbox-only (`ui-design-pass:105`, `ui-evidence:115`, `wealth-chips-af:13`, `ui-evidence:50`, `zigi-browser-agents:102`) | This 4-vCPU software-GPU sandbox, fonts mapped to Inter | Record only (pass in CI) |

## Fix 1 — `scripts/ci/install-chrome.test.mjs:100` (3 attempts counted instead of 2)
**Cause.** `FAST` sets `ZIGOALS_CHROME_ATTEMPT_SECONDS: '5'`, but the fake's `orphan:<s>` action waits **up to 10 s**
(`seq 1 200` × 0.05 s) for its `setsid python3 hold.py` to take the lock and write its pid. The tests run
`describe.concurrent` beside the whole unit suite; on a slow runner the Python start can pass 5 s, so `timeout -k 1 5`
kills attempt 1 **before the lock is held** (the orphan lives on in its own session). Attempt 2's `wait_for_locks` then
sees no holder and returns at once; the orphan takes the lock; the fake `apt` probe fails ("Could not get lock");
attempt 3's action is empty (`cut -f3` of a two-item plan) and exits 0. Result: `code` 0, `attempts` 3 — exactly the
sighting (`bd11e313`, run 41553336991). The script under test is right; the test's timing is not.

**Fix (test environment only; every expectation unchanged).** Give the orphan tests an attempt limit longer than the
fake's own 10 s wait, and move the step limit by the same amount so every computed bound (and every asserted range)
stays the same: bound = step − attempt − kill_after.
```diff
@@ test('an apt-get left holding the dpkg lock is waited for, then the retry succeeds'
-  const r=await install('orphan:2,apt');
+  // The orphan may take seconds to start on a slow runner: the attempt limit outlasts the fake's own 10 s wait for it.
+  const r=await install('orphan:2,apt',{ZIGOALS_CHROME_ATTEMPT_SECONDS:'11'});
@@ test('a lock held past the bound fails clearly, naming its holder, without another attempt'
-  const r=await install('orphan:30,ok',{ZIGOALS_CHROME_LOCK_WAIT_SECONDS:'2'});
+  const r=await install('orphan:30,ok',{ZIGOALS_CHROME_LOCK_WAIT_SECONDS:'2',ZIGOALS_CHROME_ATTEMPT_SECONDS:'11'});
@@ test('with no fixed ceiling, a lock held past the old one is waited for while one full attempt still fits'   (line 100)
-  const r=await install('orphan:9,apt',{ZIGOALS_CHROME_LOCK_WAIT_SECONDS:'',ZIGOALS_CHROME_STEP_SECONDS:'40'});
+  // Bound = 46 - 11 - 1 = 34 s, as with 40 - 5 - 1 before; the attempt limit outlasts the orphan's start (CI on bd11e313).
+  const r=await install('orphan:9,apt',{ZIGOALS_CHROME_LOCK_WAIT_SECONDS:'',ZIGOALS_CHROME_ATTEMPT_SECONDS:'11',ZIGOALS_CHROME_STEP_SECONDS:'46'});
@@ test('with no fixed ceiling, the step limit still ends the wait in time'
-  const r=await install('orphan:30,ok',{ZIGOALS_CHROME_LOCK_WAIT_SECONDS:'',ZIGOALS_CHROME_STEP_SECONDS:'12'});
+  // Bound = 18 - 11 - 1 = 6 s, as with 12 - 5 - 1 before.
+  const r=await install('orphan:30,ok',{ZIGOALS_CHROME_LOCK_WAIT_SECONDS:'',ZIGOALS_CHROME_ATTEMPT_SECONDS:'11',ZIGOALS_CHROME_STEP_SECONDS:'18'});
```
The last test keeps `expect(r.seconds).toBeLessThan(12)` (the wait still ends after about 6 s). `'the lock wait shrinks to
fit the step limit'` (line 94) has the same latent race with its deliberate 2 s attempt, but raising it would also move its
`seconds < 7` check, so it is left as is and recorded. Prove with `pnpm exec vitest run scripts/ci/install-chrome.test.mjs`
20 times, ideally while `stress -c 4` (or a parallel `pnpm test`) loads the machine.

## Fix 2 — `zigi-voice-z:221` (WebKit desktop: no voice hint after a 700 ms hold on the launcher)
**Reading (likely, not yet proven in WebKit; WebKit is not installed in the sandbox).** The launcher decides "hold" only
when its `setTimeout(…, LAUNCHER_HOLD_MS = 350)` fires before `pointerup` clears it
(`apps/web/components/ai/ai-launcher.tsx:186–187`). The spec presses right after `page.goto('/app')`. In WebKit the idle
loads run on a plain 800 ms timer (Safari has no `requestIdleCallback`, line 173) and `pointerdown` itself calls `warm()`
(the chat chunk); while the main thread parses those chunks, the due timer and the queued `pointerup` compete, and WebKit
may deliver the input event first. The hold is then read as a tap: the chat opens (so `panel` is visible) without the
hold's "Tap the mic to talk" hint — the sighting. A real person holding the launcher on a busy Safari can hit the same.

**Fix at the cause (app, outside lane L9):** on release, a press that lasted the hold time is a hold even if the timer
has not run yet.
```diff
--- a/apps/web/components/ai/ai-launcher.tsx
-          onPointerDown={event => { …; const h = {timer: 0, held: false}; h.timer = window.setTimeout(() => { h.held = true; heldClick.current = true; requestTalk('launcher'); }, LAUNCHER_HOLD_MS); hold.current = h; }}
-          onPointerUp={() => { const h = hold.current; hold.current = null; if (!h) return; window.clearTimeout(h.timer); if (h.held) window.dispatchEvent(new Event(TALK_STOP_EVENT)); }}
+          onPointerDown={event => { …; const h = {timer: 0, held: false, down: performance.now()}; h.timer = window.setTimeout(() => { h.held = true; heldClick.current = true; requestTalk('launcher'); }, LAUNCHER_HOLD_MS); hold.current = h; }}
+          // A busy main thread can deliver the release before the hold timer (WebKit, zigi-voice-z:221): the press's length decides.
+          onPointerUp={() => { const h = hold.current; hold.current = null; if (!h) return; window.clearTimeout(h.timer); if (!h.held && performance.now() - h.down >= LAUNCHER_HOLD_MS) { h.held = true; heldClick.current = true; requestTalk('launcher'); } if (h.held) window.dispatchEvent(new Event(TALK_STOP_EVENT)); }}
```
(`onPointerCancel` unchanged: a cancelled press is never a hold.) Add a unit or Chromium spec that holds the pointer
while the page's main thread is blocked (`page.evaluate(() => { const end = performance.now() + 600; while (performance.now() < end); })`
between `mouse.down` and `mouse.up`) and expects the hint — red before, green after. If the integrator prefers not to touch
the app in this PR, record it again; the spec should not be changed to dispatch synthetic events, because that would stop
testing the real press this test exists for.

## Fix 3 — `webkit-earn:19` (WebKit phone: two cancelled `_rsc` prefetches)
**Cause.** `seedShowcase` (tests/earn-fixtures.ts) opens `/app/settings`, and the test's `page.goto('/app/earn')` cancels
Settings' router prefetches still in flight; WebKit reports each as a page error "`…?_rsc=… due to access control
checks.`" (ADR-017 S64, AF16). `webkit-smoke` and `webkit-phone` filter exactly that shape at that moment through the shared
`tests/webkit-cancelled.ts`; this spec collects every page error unfiltered.

**Fix (spec; the same filter, by shape and moment, nothing else excluded):**
```diff
--- a/apps/web/tests/webkit-earn.spec.ts
+import {webkitCancelled} from './webkit-cancelled';
@@ test('the Earn hub at 390 px in WebKit: …', async ({page, context, baseURL}) => {
-  const errors: string[] = [];
-  page.on('pageerror', e => errors.push(e.message));
+  const timed: {at: number; message: string}[] = [], navigations: number[] = [];
+  page.on('pageerror', e => timed.push({at: Date.now(), message: e.message}));
+  // The router's prefetches and the page's own /api fetches a navigation cancelled (ADR-017 S64; tests/webkit-cancelled.ts).
+  page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navigations.push(Date.now()); });
@@ (before the final expect)
+  const errors = timed.filter(e => !webkitCancelled(e, navigations)).map(e => e.message);
   expect(errors, `probes ${probes}; …`).toEqual([]);
```

## Recorded, not chased
- **WebKit class A** (`zigi-stress:124` goto 60 s; `zigi-accept-correct:268` "internal error"; `zigi-states:67`,
  `webkit-smoke:40`): a navigation that fails after the previous page's loads were cancelled. Both seeds already wait for
  `networkidle` before the next goto (Session AC/AE). A remaining window: in WebKit the launcher's idle-time imports
  (`zigi/alive`, `voice-engine`) start on an 800 ms timer after mount, which can be just after `networkidle` resolves, so a
  goto can still cancel them. Owner option (unchanged from STATUS item 14): a shared spec helper that, before each WebKit
  navigation, waits until `data-app-hydrated` is set and no new `performance` resource entry has appeared for 1 s.
- **WebKit class B:** WebKit's compositor crash (`ThreadedCompositor segfault … libWPEWebKit-2.0.so`), read from the
  failure-only kernel step; not memory, not the product. One re-run.
- **Chromium renderer stall** after an instant programmatic scroll (`ui-evidence:108`, `theme-parity-af:15`): compositor or
  raster stall in headless Chromium without a GPU. One re-run; owner option: a tracing scratch run.
- **`hosted-verifier-order:18`** (local only): a core chunk aborted inside the browser; never in CI.
- **`zigi-emotions:114`:** a Known limitation (owner decision 7).
- **Sandbox-only items:** time budgets at 2 workers on this machine and the Inter font mapping; pass in CI.

## Needed with lane L9's verifier stage 12
`apps/web/tests/hosted-verifier-order.spec.ts:39` pins the local browser stages: it must read
`toEqual([2, 3, 4, 5, 6, 9, 10, 11, 12])` (and its title/comment may name "AL"). Stage 12 skips each part a build lacks.
