# Sign a friend out everywhere at Supabase (owner)

Session S, FIX_PLAN H3, `Q-AUTH-02`. The official pages below were read on 2026-10-04. Nothing here was run against a live project.

## Why there is no script
FIX_PLAN H3 asked for an owner script that signs a user out everywhere "through the admin API, if the dashboard has no per-user action". Supabase's documentation shows that **no such admin call exists**, so a script would have to rely on undocumented side effects. Instead of a script, this page gives the steps.
- **The Auth server's admin routes** cover users, MFA factors, passkeys, links, SSO, OAuth clients and providers. None of them is a session or sign-out route ([supabase/auth `internal/api/api.go`](https://github.com/supabase/auth/blob/master/internal/api/api.go), read 2026-10-04).
- **`auth.admin.signOut` needs "a valid, logged-in JWT"** of that user ([JS reference](https://supabase.com/docs/reference/javascript/auth-admin-signout)). The owner never holds a friend's token.
- **A ban does not sign anyone out:** "A temporary ban only blocks sign-in for its duration and does not revoke existing sessions" ([Managing user data](https://supabase.com/docs/guides/auth/managing-user-data)).
- **A dashboard per-user "sign out" action:** none is described in the documentation. It is **UNVERIFIED**; if you see one under Authentication → Users → the user, use it instead of step 2.

## What a sign-out is
- "When a user signs out, the sessions affected by the sign-out are removed from the database entirely" ([User sessions](https://supabase.com/docs/guides/auth/sessions)).
- After that, requests with the old tokens are refused: `session_not_found` is "Session to which the API request relates no longer exists. This can occur if the user has signed out, or the session entry in the database was deleted in some other way" ([Error codes](https://supabase.com/docs/guides/auth/debugging/error-codes)).
- ZIGoals' private sync asks Supabase about the token on every request, so a removed session stops syncing at once.

## Steps
1. **In ZIGoals first.** The friend, from a trusted device, revokes the other sessions (Settings → Devices and sessions). Revocation blocks the vault even before Supabase acts.
2. **In Supabase → SQL Editor**, with the friend's user ID from Authentication → Users:
   ```sql
   -- Read only: how many sessions the user has.
   select count(*) from auth.sessions where user_id = '<user id>';
   -- The sign-out: removes that user's sessions (their refresh tokens go with them).
   delete from auth.sessions where user_id = '<user id>';
   ```
   - Paste the ID carefully. Never run the `delete` without the `where` clause.
   - The friend can sign in again with a new email code. Nothing else of the account changes.
3. **Verify:**
   - the `select` now returns 0;
   - the friend's other devices are asked to sign in again on their next request.
4. **If the account should go entirely**, delete the user instead. Deleting a user "removes the row from `auth.users`, which cascades to `auth.sessions` and invalidates the user's refresh tokens" ([Managing user data](https://supabase.com/docs/guides/auth/managing-user-data)). For the cloud data, use [OWNER_RECOVERY_ADMIN.md](OWNER_RECOVERY_ADMIN.md), "Erase an account".

## Limits
- Access tokens already issued are stateless JWTs. Supabase's Auth server refuses them once the session is gone (`session_not_found`), but a service that only checks the JWT's signature could accept one until it expires (one hour by default). ZIGoals does not do that.
- Rehearse it once with your own test user during Stage 8 ([OWNER_CHECKLIST.md](../security/review-2026-10/OWNER_CHECKLIST.md) C7).
