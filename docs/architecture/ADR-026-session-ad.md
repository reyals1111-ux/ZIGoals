# ADR-026: Session AD, "The final look": session decisions

Status: **In progress** on `feature/session-ad-final-look`, from `main` `61204c3f` (Merge #87, Session AC; live as Alpha #42),
with the owner's wordmark branch `owner/igoals-wordmark` (`5dfd407`) merged in, in a cloud sandbox. This record holds the
owner's decisions at plan approval and every decision the session took without asking (decide by the project rules and
the safest option). Resume point: `docs/handoff/AD_RESUME.md`. Captures: the orphan branch `review/session-ad-screens`.

## Owner decisions (2026-10-17, plan approval)
- **The brief:** Part 0 records; Part 1 the footer banner, final (the link columns removed once every link is reachable
  elsewhere, the banner ending where the planet ends, the owner's wordmark, the two-line slogan, one opening animation,
  nebula buttons, the music button like ZIGi's); Part 2 Today's hero planets bleeding into the page; Part 3 the theme bar
  made real (Nebula default, Light and Dark previews); Part 4 the owner's picks 8–13; Part 5 carried checks; Gate C once;
  the PR out of Draft with CI green before Sun 18 Oct 01:00 Brussels. No pre-cut; only "lean finish" shortens it.
- **Amendments at approval (owner, pre-approved):**
  1. The footer's opening animation plays **once per visit** (the session flag stays), not on every page view; the test
     checks once, and again only in a new session.
  2. The wordmark's background is removed in the sandbox; only the finished derivatives are committed, and the exact
     steps and parameters are recorded here (F8) so they can be repeated. Any committed script uses repo tools only (sharp).
  3. Roadmap B7 (canonical base64) never makes data written by any build from #32 to #42 unreadable: a frozen-reader
     fixture test over those builds' encoders; a non-canonical but decodable value from our own encoder history is
     accepted and logged, never refused; `TIER 3 (data formats)` with its rollback in plain words.
  4. The Q-SYNC-05 checker runs only while the app is visible and a remembered-device record exists (start,
     focus/visibility change, every 15 minutes while visible); never in the background, no data beyond the existing
     status request.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| F1 | 0 | The branch is `feature/session-ad-final-look` (the owner's name), from `main` `61204c3`; the harness's `claude/charming-hypatia-6z0o94` is left untouched; the new branch has no upstream to `main`. | The owner's instruction, as AC did (ADR-025 E1); nothing can be pushed to `main` by accident. |
| F2 | 0 | The PR opens as a **Draft right after Part 0**: Milestone quality runs on pull requests only (CONTRIBUTING), so every later push gets CI. It leaves Draft only at the finish. | CI evidence for every part without a second run on plain pushes. |
| F3 | all | Builds and browser runs happen one at a time, in this session only (Playwright at most 2 workers); helper agents write code and run typecheck, lint and focused unit files only. | CLAUDE.md "never run builds or test suites in parallel". |
| F4 | 3 | **Theme storage:** a new optional field `theme` (`'nebula' \| 'light' \| 'dark'`) in `zigoals:ui-prefs:v1`; the existing `themeMode` is left as it is. The choice is a device display setting like Motion Off (`zigoals:motion:v1`): it is read from and written to this device's own, unscoped ui-prefs record in every mode (plain, account, Showcase), never synced and never exported. | `themeMode` already holds "dark" on devices that pressed the old Dark button, meaning today's look; re-using it would switch those devices to the new deeper Dark without asking. Older builds ignore an unknown field (the schema is loose). One record per device means the bootstrap can read it before paint. |
| F5 | 3 | **No flash of the wrong theme:** one small inline script in the root layout's `<head>`, carrying the request's CSP nonce (the existing `x-nonce` header), sets `data-theme` on `<html>` and, for Light or Dark, adds that theme's same-origin stylesheet before the body paints. No new CSP source, no Trusted Types sink. `TIER 3 (security headers/CSP)` in its own commit. | The app has no early script today (Motion Off applies after hydration); a nonced inline script is how Next's own scripts already run under this CSP, and `public-alpha.spec` checks every server script carries the nonce. |
| F6 | 1–3 | **Protected baseline:** the brief is the owner's approval for the footer (Part 1) and the hero's edges (Part 2) exactly; the hero artwork, its slogan, its star and the Nebula look stay as they are. Nebula is checked by pixel diffs of the before/after captures. | CLAUDE.md: the accepted baseline changes only with owner approval. |
