# GitHub publication attempt

2026-09-13 UTC: connected GitHub read succeeded. Remote refs contain only `main` at `e2c7ed14cafcad72b5cb0e9206a32eae3081a84c`. Local `feat/m1-foundation` retains all ten M1 commits plus Run2 history.

One write attempt used the connected GitHub integration's create-tree operation for the first unpublished M1 commit, based on the verified remote base tree. It failed:

```text
GitHub API error 403: {"message":"Resource not accessible by integration","documentation_url":"https://docs.github.com/rest/git/trees#create-a-tree","status":"403"}
```

No tree/ref/commit was published by this attempt. No repeated write retry, main rewrite, force push, PR creation or merge occurred. This is a GitHub integration permission denial, not an automatic-approval-review rejection.

Hosted CI was **NOT RUN**. The checked-in workflow and local checks must not be represented as hosted results.

Owner action: grant the connected GitHub app repository Contents write access (and workflow-file write capability if required for the existing CI file), or use the owner's already-authenticated Git client to push `feat/m1-foundation`. Do not paste tokens/passwords into chat. Then open the prepared PR into main, verify full remote history and observe actual GitHub Actions results before merge.
