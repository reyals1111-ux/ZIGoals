# Studio-4 swap runbook (Part 13, its own session)

Session AK F11 (ADR-036, owner follow-up 1) prepared the swap and proved it with a synthetic delivery. This runbook is
for the separate session that puts the real Studio-4 art in. One PR, merge commits only, the owner merges. Nothing
here deploys.

## 0. Before you start

- The delivery is on `review/studio4-assets` (check: `git ls-remote origin review/studio4-assets`). Nothing to do
  until it exists.
- The importer is proven: `pnpm exec vitest run scripts/zigi` (27 tests; `scripts/zigi/studio4-dry-run.test.mjs`
  runs a synthetic `studio4-deliver/` end to end and leaves nothing behind).
- The art changes how ZIGi looks. The locked ZIGi look and the Checklist (AG Polish 1–3) are PROTECTED: the owner
  reviews the result before the PR leaves Draft. The Checklist's X030 switch needs the owner's own yes (step 6).

## 1. The delivery the importer expects

```
studio4-deliver/
  app/            <code>-<state>.webp (96×126, ≤ 40 kB), -2x.webp (192×253, ≤ 100 kB), -large.webp (480×632, ≤ 200 kB),
                  .anim.webp (the 96×126 app set, ≤ 400 kB), .anim.png (the APNG fallback, 96×126, ≤ 400 kB)
  app-2x-anim/    .anim.webp only, 192×253, ≤ 2.6 MB each (D6: loaded lazily, one clip at a time, never in route JS)
  push/           one …icon….png (192×192) and one …badge….png (96×96), PNG stills, ≤ 40 kB each
  reactions.json  {"R001": "<one of the twelve reaction events>", …}
  SHA256SUMS      <sha256>  app/F001-idle.webp   (paths relative to studio4-deliver/)
  RECEIPT.md      the studio's receipt; a | SHA-256 | Bytes | File | table in it must agree with SHA256SUMS
```

Codes: F001–F023, T001, E001 (the 25 states), X001, X010–X012, X020–X022, X030, X050–X054, R001–R013. Loops loop
(loop count 0), one-shots play once (1), per `LOOPS` in `scripts/zigi/import-studio.mjs`.

The twelve reaction events (`components/zigi/semantic.ts` `REACTION_EVENTS`): `assistant_acknowledged`,
`assistant_unsure`, `assistant_working`, `insight_consistent`, `checkin_low`, `checkin_milestone`, `journey_step`,
`action_undone`, `wrapup_finished`, `feedback_received`, `journal_reflecting`, `companion_hidden`. Any other name is
imported with a WARNING and never plays.

If the studio used other folder or push names, rename the copy to this layout (never the bytes) and note it in the
STATUS entry. If the same clip is in both `app/` and `app-2x-anim/`, the 2× one fills the manifest's `animated` slot
and the app-set copy is verified and reported as `superseded` (the manifest has one animated slot per clip; using the
app set at small sizes would be an app change, ask the owner).

## 2. Commands

```sh
# The delivery, outside the checkout (never committed from there)
git fetch origin review/studio4-assets
mkdir -p /tmp/studio4 && git archive origin/review/studio4-assets | tar -x -C /tmp/studio4
D=/tmp/studio4/studio4-deliver          # adjust if the branch nests it deeper

# 1. Verify only: SHA-256 against SHA256SUMS and RECEIPT.md, names, folders, pixel sizes, loop counts, budgets.
#    Writes nothing. Exit 0 = every file verified; each PROBLEM line is a refusal.
node scripts/zigi/import-studio.mjs "$D" --receipt "$D/SHA256SUMS"

# 2. Rehearse the write into a scratch copy (optional; --repo-root keeps the checkout untouched)
R=$(mktemp -d) && mkdir -p "$R/apps/web/components/zigi" "$R/apps/web/public/brand/figures/zigi"
cp apps/web/components/zigi/manifest.json "$R/apps/web/components/zigi/"
node scripts/zigi/import-studio.mjs "$D" --receipt "$D/SHA256SUMS" --repo-root "$R" --apply
git diff --no-index apps/web/components/zigi/manifest.json "$R/apps/web/components/zigi/manifest.json"; rm -rf "$R"

# 3. The swap itself
node scripts/zigi/import-studio.mjs "$D" --receipt "$D/SHA256SUMS" --apply
```

Read the output: `refused:` lines (files left out), `superseded:`, `changed:` (Studio-2 files replaced by name),
`orphaned:` (files in the skin folder the delivery does not have; leave them unless the owner says otherwise), the
`WARNING:` lines, and the `push art:` line with the paths to set in step 4.

## 3. Files the swap touches

| File | What changes | Who changes it |
|---|---|---|
| `apps/web/public/brand/figures/zigi/origami-nebula/*` | new and replaced art, byte for byte | the importer |
| `apps/web/components/zigi/manifest.json` | the 25 states' own files (`wears` removed), `extras` slots, `reactionTriggers`, `budgetBytes.animated2x` = 2600000 when 2× clips land | the importer |
| `apps/web/public/icons/zigi-push-icon-192.png`, `zigi-push-badge-96.png` | the push art (never over `zigoals-192.png`, which is the app icon) | the importer |
| `apps/web/public/sw.js` | the one `const PUSH_ART = {…};` line, to the printed paths | by hand (a separate commit) |
| `scripts/zigi/import-studio.mjs` | `export const PUSH_ART`, the same paths | by hand |
| `apps/web/components/zigi/manifest.json` `skins.origami-nebula.opticalOffset` and `apps/web/components/ai/ai-launcher.css` `--zigi-ox` / `--zigi-oy` | the re-measured optical offset (step 5) | by hand |
| `docs/verification/<session>/STUDIO4_RECEIPT.md` | a copy of the delivery's RECEIPT.md plus SHA256SUMS | by hand |
| `docs/product/ZIGI_ASSET_SPEC.md` | the animated row (192×253, 2.6 MB for the 2× set; 96×126 app set 400 kB), the skins table, the slots, the optical centre numbers | by hand |
| the tests in section 4, `docs/STATUS.md` | | by hand |

Art referenced by file name outside the manifest (no edit needed while the names stay; check them by eye after the
swap): `components/ai/zigi-customize.css` (F001 silhouette), `components/path/path.tsx` (`F002-greeting.anim.webp`,
the orbit cheer: if F002 arrives in the 2× set it becomes a up-to-2.6 MB clip there), `components/path/path-zigi.tsx`
(`F006-presenting-large.webp`), `lib/ai/zigi-look.ts` (`SHELL_FRAME`, F001 1×/2×).

## 4. The tests to update, at equal strength

Found by applying the synthetic delivery to a scratch copy of `apps/web` and running every ZIGi, brand and service
worker unit test there (F11; the fixture's clips are tiny, so the byte-budget lines only fail with real art).

The three that pin today's art and always change:

1. **`apps/web/lib/ai/zigi-assets.test.ts`** (fails 3 of 6). Restate for the 25 states: `DELIVERED` becomes every
   state; the format/size/budget test accepts an animated WebP at 192×253 within `budgetBytes.animated2x` or at 96×126
   within `budgetBytes.animated` (by its header, not its name), the APNG at 96×126 within `animated`, frames ≥ 24
   for every clip, `seen.size` = the exact number of files; "every state resolves" asserts each state's own five files
   (no `wears`) and the chain still ending at idle; "the Studio-4 slots exist and are empty" becomes "every slot the
   delivery filled is a clip whose files exist and pass the same header checks, every slot it did not fill is still
   `null`, and each `reactionTriggers` value is `null` or one of the twelve reaction events". Same exactness, new data.
2. **`apps/web/lib/zigi-studio4/slots.test.ts`** (fails 3 of 4). "all empty today" becomes "filled": the fourteen
   states carry their own files, `cheerOf(skin)` is the X030 clip, `variantsOf(skin)` lists X050–X054 in order,
   `reactionArtOf(skin)` equals the delivered triggers, `studio4SlotProblems(raw)` stays `[]`. The X030 test's first
   assertion becomes `{source: 'studio4-x030', clip: <the manifest's cheer>}`; keep its synthetic "a still only →
   today's clip" case. The durations test fails on `reactionArtOf(skin, named)` (R004 has landed): build its
   base skin from a copy with the reactions set to `null`, so its `[]` assertions keep their meaning.
3. **`apps/web/lib/brand-assets.test.ts`** (`twos.length` 28 → the exact new count: 68 if every new code ships a
   `-2x` still; the twin rule unchanged).

Also failing in the rehearsal, restate the same way: **`apps/web/lib/ai/zigi-idle.test.ts`** (3 tests: the idle pool
adds X010–X012 with their weights; recompute the exact counts in the base-share and no-repeat tests from the new
pool, keep the rules) and **`apps/web/lib/zigi-studio4/variants.test.ts`** ("no variant in any pool" becomes the
exact pools: speaking X050, listening X051 X053, thinking X052, celebrate-small X054).

Conditional:

- **`apps/web/lib/zigi-studio4/push-art.test.ts`** when `push/` is delivered (both tests fail once `sw.js` changes):
  the expected `PUSH_ART` becomes the new paths; the 192×192 and 96×96 checks, "every notification reads the slot"
  and "no other image path" stay.
- **`apps/web/lib/ai/zigi-manifest.test.ts`** line 29 (every animated file ≤ `budgetBytes.animated`): with real 2×
  clips over 400 kB it fails; compare a 192×253 clip with `budgetBytes.animated2x`, everything else unchanged.
- **`apps/web/tests/zigi-alive.spec.ts`** (Playwright): the optical-centre test (step 5) and the clip names it plays
  (`F001-idle.anim.webp`, `F003-insight`, `T001-thinking|F004-listening` in the rotation, which X010–X012 now join;
  fix the seeded picks, not the rules). Run it and `tests/zigi-emotions.spec.ts` in the browser slot.

Every changed assertion goes in the STATUS entry with why ("the art arrived"), as every session does.

## 5. Re-measure the optical offset

The offset is where ZIGi's alpha-weighted centre sits in its box (`docs/product/ZIGI_ASSET_SPEC.md`, "Optical
centre"). Today x +0.023, y −0.090, from Studio-2's `F001-idle.webp`. The importer never changes it.

1. Production build, `/app`, Chrome, reduced motion (the poster shows). In the console, for each of
   `F001-idle.webp`, `F001-idle-2x.webp`, `F001-idle-large.webp`:
   ```js
   const f = new Image(); f.src = '/brand/figures/zigi/origami-nebula/F001-idle.webp'; await f.decode();
   const c = Object.assign(document.createElement('canvas'), {width: f.naturalWidth, height: f.naturalHeight}), g = c.getContext('2d'); g.drawImage(f, 0, 0);
   const d = g.getImageData(0, 0, c.width, c.height).data; let sx = 0, sy = 0, sa = 0;
   for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const a = d[(y * c.width + x) * 4 + 3]; sx += (x + .5) * a; sy += (y + .5) * a; sa += a; }
   ({x: +(0.5 - sx / sa / c.width).toFixed(3), y: +(0.5 - sy / sa / c.height).toFixed(3)})
   ```
2. The three sizes agree within 0.002 (Studio-2 did); if not, ask the studio, do not average a bad frame.
3. Write the result to `manifest.json` `skins.origami-nebula.opticalOffset` and to `--zigi-ox` / `--zigi-oy` in
   `components/ai/ai-launcher.css` (`lib/ai/zigi-manifest.test.ts` pins them equal).
4. Check the fill: Studio-2's figure fills 83 % of its frame, so the launcher's box is 1.18× (52 px in the 56 px
   circle). If Studio-4's fill differs, the box needs the owner's look first.
5. `tests/zigi-alive.spec.ts` "ZIGi sits on its optical centre…" must pass at S, M, L × 1×, 2× (within 0.75 px and
   0.01 of the manifest). Record the new numbers and the date in ZIGI_ASSET_SPEC.md.

## 6. The X030 cheer on the Checklist (owner's yes first)

`components/zigi/studio4.ts` `checklistCelebrationArt(skin)` returns the X030 clip once it lands, else today's
`CELEBRATION_CLIP`; `components/checklist/day-celebration.tsx` still plays `CELEBRATION_CLIP` directly (PROTECTED).
Switching it is a look change on the Checklist: show the owner first. (STATUS's AG Polish line naming
`components/checklist/celebration-zigi.ts` is out of date: that file went in AG Polish 2 Part 7.)

## 7. Commits and checks

Suggested commits: the art and manifest (importer output only); the push slot (`sw.js` + importer constant +
push-art test); the optical offset (manifest + CSS + spec); the tests; the docs; the STATUS entry last. Then
`pnpm typecheck`, `pnpm lint`, `pnpm test`, the route weights (the clips are static files, never route JS; the
weights must not move), and the ZIGi specs in the browser slot. Owner list in STATUS: review the look, the X030
switch, merge, deploy.
