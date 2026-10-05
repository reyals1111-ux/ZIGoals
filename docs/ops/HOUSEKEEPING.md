# Housekeeping: stale review branches and old worktrees

> Session U Part 10 (owner review change 12), 2026-10-05. **Owner steps only: no agent deletes a branch or a worktree.**
> Branch list and last-commit dates read from GitHub on 2026-10-05.

The `review/*` branches hold screenshot galleries that were made for one pull request each and were never meant to be
merged. None of the pull requests they belong to is still open (on 2026-10-05 the only open ones are #73, Session T,
and #74, Session U), so they only take up space, and one of them shows a recovery secret (below). Deleting a branch on
GitHub does not touch `main` or any merged pull request.

## 1. Delete `review/session-l-screenshots` first

It contains `session-l/04-turn-on-with-existing-secret-box-{desktop,390}.png`, which shows a full recovery secret of a
throwaway local fixture vault (FINDINGS `Q-SC-05`). The secret opens nothing real, but the branch is public. Session U
masks recovery secrets in screenshot helpers from now on (`apps/web/tests/safe-screenshot.ts`).

## 2. The stale review branches

| Branch | Last commit | Date | What it was for |
|---|---|---|---|
| `review/session-l-screenshots` | `b6dba6b` | 2026-10-02 | Session L (delete first, see above) |
| `review/session-p-screenshots` | `03824b6` | 2026-10-04 | Session P, PR 4 (the Guide card, Settings, the push panel) |
| `review/session-n-screenshots` | `7f51174` | 2026-10-03 | Session N, Landing V5 evidence |
| `review/session-m-screenshots` | `68e2cb2` | 2026-10-03 | Session M, PR #63 |
| `review/session-k-screenshots` | `c8f2e41` | 2026-10-02 | Session K, PR #58 |
| `review/session-i-screenshots` | `0fa3fdc` | 2026-10-02 | Session I |
| `review/polish-g-screenshots` | `faf27fd` | 2026-10-01 | Session G, PR #54 |
| `review/mobile-e-screenshots` | `b8197ff` | 2026-10-01 | Session E, PR #52 |
| `review/qa-sweep-screenshots` | `5bf9e60` | 2026-09-30 | the QA sweep, PR #51 |
| `review/pr47-screenshots` | `4f7c318` | 2026-09-30 | PR #47 |

Session U's own gallery, `review/session-u-today-screens` (Part 8), stays until you have looked at it; delete it the
same way afterwards.

### On GitHub (no terminal)

1. Open the repository → **Code** → the branch menu (it shows `main`) → **View all branches**.
2. Find the branch by name. Check the date matches the table, then select the bin icon on its row.
3. GitHub shows **Restore** on that row for a while afterwards, in case you deleted the wrong one.

### Or in Terminal, one command at a time

From your ZIGoals checkout. Check the name each time before you press Return:

```sh
git push origin --delete review/session-l-screenshots
```

Then the same command once per branch in the table, for example:

```sh
git push origin --delete review/session-p-screenshots
```

Afterwards, `git fetch --prune` removes your Mac's local copies of the deleted remote branches.

## 3. Other branches (your choice, no recommendation)

`main` is protected. The other branches (`codex/*`, `feat/*`, `claude/*`, `docs/*`, `research/*`, `hardening/*`,
`assets/*`, `backup/run11-final-evidence`) are earlier work. Some are still referenced from STATUS or kept as
evidence (`backup/run11-final-evidence`). Keep them unless you know you no longer need one. Never delete
`feature/session-t-your-ai-2026-10-04` or `fix/session-u-2026-10-04` while their pull requests are open.

## 4. Old worktrees on your Mac

A worktree is an extra folder that shares your checkout's history. List them:

```sh
git worktree list
```

The first line is your main checkout: keep it. For each other line you no longer use, first check it holds nothing you
want (for example `git -C <that path> status`), then remove it with its exact path from the list:

```sh
git worktree remove <that path>
```

`git worktree remove` refuses a folder with uncommitted changes; read what it says instead of forcing it. At the end:

```sh
git worktree prune
```

(For the landing, a fresh worktree of the reviewed commit is the recommended way to deploy; see
[LANDING.md](../deployment/LANDING.md). Remove it after the deploy.)
