# Session AL: the two moderate Dependabot alerts on main (4 Nov 2026)

Source: `pnpm audit --json` on `17069c7d` (the same two advisories GitHub shows as moderate Dependabot alerts). Nothing was bumped. Each bump needs the owner's approval (CLAUDE.md, "No new dependencies… without owner approval"), so this row closes as **Waits on owner**.

| # | Advisory | Package and locked versions | How it gets in | Reachable by people using the app? | Smallest fixing version |
|---|---|---|---|---|---|
| 1 | GHSA-3g3m-2fjr-6pw4: glob's AbortSignal cancellation can be bypassed, so a traversal keeps reading the filesystem after a timeout | `glob` 10.5.0 and 13.0.6 (vulnerable range `>=9.0.0 <=14.0.1`) | `apps/web > @opennextjs/cloudflare (1.20.12) > glob` and `> @opennextjs/aws > @node-minify/core > glob` | **No.** It runs only during the OpenNext build on the owner's or CI's machine, never in the deployed Worker or the browser. It only matters if a build script relies on cancelling a glob, and none of ours does. | glob `14.0.2` |
| 2 | GHSA-g3hv-75wg-m249: minimatch denial of service through "globparts" amplification | `minimatch` 10.2.6 and 9.0.9 (vulnerable range `>=7.0.0 <11.0.1`) | ESLint tooling (`eslint-config-next > … > @typescript-eslint/typescript-estree > minimatch`) and the same OpenNext build path (`… > @node-minify/core > glob > minimatch`) | **No.** It is used for lint and build only, with patterns from our own config, never from user input. | minimatch `11.0.1` |

## Recommendation
1. **Prefer an upstream bump**, re-checked at approval time: a newer `@opennextjs/cloudflare` whose lock resolves glob ≥ 14.0.2, and a newer `eslint-config-next` / `@typescript-eslint/*` whose lock resolves minimatch ≥ 11.0.1. Check each release's changelog for breaking changes before approving.
2. **If upstream hasn't moved**, add two targeted `overrides` lines in `pnpm-workspace.yaml`, following the existing "In-range audit fix" pattern:
   - `"@opennextjs/cloudflare>glob": ^14.0.2` and `"@node-minify/core>glob": ^14.0.2`
   - `"@typescript-eslint/typescript-estree>minimatch": ^11.0.1` and `"glob>minimatch": ^11.0.1`

   These cross a major version boundary (glob 10/13 → 14, minimatch 9/10 → 11), so each one needs proof:
   - the OpenNext build (`pnpm build:alpha` dry run and `check:alpha`)
   - `pnpm lint`
   - the full CI run
   - Revert whichever one breaks.
3. Risk if left as it is: low. Both are confined to the developer and CI toolchain and are not reachable through the app or the Worker.

**Owner step:** approve option 1 or 2 (or "leave as is") in a future session, which then applies it with the proof above.
