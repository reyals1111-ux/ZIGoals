# Push reminders: owner activation (ADR-010)

**Status (2026-10-08, Session X Part 8):** written with Session P's PR 4 (2026-10-04) and rewritten as one command per step, each mutation between read-only checks. Nothing here has run against a Cloudflare account, a real iPhone or a real push service: the Worker, the key tool, the app route and the checker are proven by local tests only ([STAGE8_COVERAGE.md](STAGE8_COVERAGE.md), row C5), and since Session X by an end-to-end rehearsal in Miniflare: the app's real route, private sync's session registry and the push Worker's real alarm, encrypted delivery, unsubscribe, delete-all, account deletion and retention (`scripts/run11/push-rehearsal.test.mjs`). Lines marked **UNVERIFIED** were read from code or inferred, not observed.

## What this is, and what stays off
- A person who is signed in can turn on, for one device, a notification when a reminder time passes while ZIGoals is closed. By default it is always the same: title "ZIGoals", body "A reminder from ZIGoals". Since Session V Part 13 a person may opt in, on that device, to "Show what a reminder is for in notifications": the device then keeps a table of its reminder names and the service worker composes "Reminder: Stretch" on the device; the server never sees a name. The in-app reminder cards keep working without any of it.
- **Off by default.** Until you set two secrets on the app Worker (step 5), every build answers 503 `PUSH_UNAVAILABLE` at `/api/push`, Settings → "Reminders when closed" shows "Not available in this build.", and the offer line under a reminder time is hidden. The friends Alpha ships like this.
- On an iPhone it works only in the app saved to the Home Screen (iOS 16.4 or later). A Safari tab shows "Add ZIGoals to your Home Screen first."
- It runs in its own Worker, `workers/push-reminders/` (`worker.mjs`; the Durable Object class `PushAccount`, SQLite, one object per account; binding `PUSH_ACCOUNTS`; migration `v1`; compatibility date 2026-09-13). It is outside the six-Worker topology: `activation-check.mjs --private`, `--source` and `--admin` are untouched, and `--push` checks only this Worker.
- Do it on the isolated acceptance services, like every stage of [ACTIVATION.md](ACTIVATION.md). The live Alpha stays off until you decide otherwise.
- What leaves the device, what the server keeps and for how long: "What the server never holds" at the end, and [ADR-010](../architecture/ADR-010-push-reminders.md).

## Prerequisites
- Stage 4 is done: the six private copies exist and `node scripts/run11/activation-check.mjs --private` passes. `--push` reads the private app copy (for the name prefix) and the private sync copy (for the origins) and refuses without them.
- The private app Worker and the private sync Worker are deployed (Stage 7) and sign-in works: push needs a signed-in account, and the app route confirms every session with private sync before it forwards anything.
- Node 24.19.0 and pnpm 11.19.0 (`pnpm run doctor`); the pinned wrangler 4.147.0 through `pnpm --filter @zigoals/web exec wrangler`; your Cloudflare login for that shell, as in [OWNER_RECOVERY_ADMIN.md](OWNER_RECOVERY_ADMIN.md) "One-time setup", step 4.
- Run every command from the checkout root. `pnpm --filter @zigoals/web exec` runs wrangler inside `apps/web`, so config paths are written as `"$PWD/…"`.
- About 45 minutes at the desk, plus step 6 on the iPhone.

## 1. Generate the keys (offline, once)
```sh
node scripts/push/make-vapid-keys.mjs
```
- It makes an ECDSA P-256 pair with WebCrypto, writes the private key as a JWK to `zigoals.vapid.owner.json` in the checkout root (mode 0600; ignored by git through `*.vapid.owner.json`) and prints the public key. It refuses to overwrite an existing file and never prints the private key. `--out <file>` chooses another path; any other argument is refused with the usage line.
- It prints:
  - `Private key written to <path> (mode 0600; keep it out of git: *.vapid.owner.json is ignored).`
  - `Public key (ZIGOALS_PUSH_PUBLIC_KEY): <87 characters>`
  - a `Next:` line pointing at `wrangler secret put VAPID_PRIVATE_KEY` and this file.
- **Record:** the public key, in Bitwarden, together with a copy of the file. The file is one JSON line; that whole line is the value of `VAPID_PRIVATE_KEY` (step 4). Keep the copy: a device's subscription is bound to this key pair ([ADR-010](../architecture/ADR-010-push-reminders.md), "Consequences"), so a new pair would stop reminders on every device until each one turns push off and on again (**UNVERIFIED:** inferred, not observed).
- **Never paste** the private key anywhere but the `secret put` prompt: not in a config, an env file, a report, STATUS, a chat or a screenshot. The public key is not secret, but keep it out of reports too, like the publishable Supabase key.

## 2. The private push copy
1. Copy the template and close it to others:
   ```sh
   cp workers/push-reminders/wrangler.local.jsonc workers/push-reminders/wrangler.acctest.owner.jsonc
   chmod 600 workers/push-reminders/wrangler.acctest.owner.jsonc
   ```
   `*.acctest.owner.jsonc` is ignored by git. The copy must stay inside the checkout, a small regular file, mode 0600, like the six Stage 4 copies. `make-private-configs.mjs` has no option for it: this is the one copy you edit by hand, and `--push` checks the result.
2. Edit the copy. Change only these:
   - `name`: `<prefix>-push-reminders`, where `<prefix>` is the private app copy's name (`apps/web/wrangler.run11.acctest.owner.jsonc`) without `-run11`.
   - `vars.AUTH_ORIGIN`: exactly the private sync copy's `AUTH_ORIGIN` (`https://<project-ref>.supabase.co`).
   - `vars.APP_ORIGIN`: exactly the private sync copy's `APP_ORIGIN` (the isolated app origin: `https://` and the host, nothing after it).
   - `vars.VAPID_SUBJECT`: keep `mailto:hello@zigoals.app` (a `mailto:` address or an https origin; it goes into every signed push token as the sender's contact).
   - **Exactly one public address**, either
     - `"workers_dev": true` and no `routes`: the Worker answers at `https://<name>.<your workers.dev subdomain>.workers.dev`; or
     - `"workers_dev": false` and one route on your own zone, `"routes": [{"pattern": "push.<your zone>", "custom_domain": true}]` or a `zone_name` route. No wildcard, no path.
   - Optional, only when the troubleshooting table says so: `vars.PUSH_ALLOWED_HOSTS`.
3. Leave everything else as the template has it: `main`, `compatibility_date`, the binding and the migration, `observability.enabled: false`, `preview_urls: false`, no `account_id`, no other binding or trigger. Never put a key, secret, token or password in `vars`, and never `ISOLATED_FIXTURE` (the test clock): `--push` refuses each.

## 3. Check it
```sh
node scripts/run11/activation-check.mjs --push
```
- It contacts nothing and prints no value.
- PASS: `PASS: the push template is isolated; the private push copy is an ignored 0600 file with the app Worker's prefix, exact https origins matching private sync, no placeholders, no credentials, no test clock, the reviewed object class and date, and exactly one public address. Values not printed.`
- Otherwise one line per problem, naming the field, for example `push: APP_ORIGIN must match private sync.` or `push: exactly one public address: a route on your zone (custom_domain or zone_name, no wildcard) with workers_dev false, or workers_dev true without routes.` Fix the copy and run it again. A file problem (`missing`, `not mode 0600`, `not ignored by git`, `outside the checkout`) is reported first.
- Run `--private` again afterwards: it must still pass, unchanged.

## 4. The push Worker: secrets, then deploy (three mutations, each between read-only checks)
As at Stage 7: `wrangler secret put` uploads to Cloudflare and creates the Worker if it does not exist yet, so this is part of an approved release, not local preparation. Values are typed at the prompt (`Enter a secret value:`), never passed as arguments. Set the config path once for this shell:
```sh
PUSH_CONFIG="$PWD/workers/push-reminders/wrangler.acctest.owner.jsonc"
```
**4a. Before (read only).** The Worker must not exist yet, or you are about to change one you already have:
```sh
pnpm --filter @zigoals/web exec wrangler deployments list --config "$PUSH_CONFIG"
```
Expect an error that the Worker does not exist (**UNVERIFIED:** the exact wording). If it lists deployments, stop and find out why first.

**4b. Bundle only (uploads nothing):**
```sh
pnpm --filter @zigoals/web exec wrangler deploy --config "$PUSH_CONFIG" --dry-run --outdir /tmp/zigoals-push-dry
```
Look at the bundle as you did for the six: one Durable Object class (`PushAccount`), no other binding, no route other than the one you chose.

**4c. Mutation: `AUTH_PUBLIC_KEY`.**
```sh
pnpm --filter @zigoals/web exec wrangler secret put AUTH_PUBLIC_KEY --config "$PUSH_CONFIG"
```
The same publishable (anon) key that private sync has as `AUTH_PUBLIC_KEY`. Publishable, but named like a key, so it is supplied as a secret. Never the service-role key. **After (read only):**
```sh
pnpm --filter @zigoals/web exec wrangler secret list --config "$PUSH_CONFIG"
```
It lists names only (never values): `AUTH_PUBLIC_KEY`.

**4d. Mutation: `VAPID_PRIVATE_KEY`.**
```sh
pnpm --filter @zigoals/web exec wrangler secret put VAPID_PRIVATE_KEY --config "$PUSH_CONFIG"
```
The one line of `zigoals.vapid.owner.json`, pasted whole (`{"kty":"EC","crv":"P-256","d":"…","x":"…","y":"…"}`). The Worker answers 503 `HOSTED_CONFIGURATION_REQUIRED` until this parses as a P-256 private JWK. **After (read only):** the same `secret list` shows `AUTH_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, nothing else.

**4e. Mutation: deploy.**
```sh
pnpm --filter @zigoals/web exec wrangler deploy --config "$PUSH_CONFIG"
```
It prints the Worker's name, the `v1` migration for `PushAccount` and its address (**UNVERIFIED:** the exact wording). That address, as `https://` plus the host and nothing else, is `ZIGOALS_PUSH_ORIGIN` in step 5. **After (read only), both:**
```sh
pnpm --filter @zigoals/web exec wrangler deployments list --config "$PUSH_CONFIG"
curl -sS -H "Origin: <APP_ORIGIN>" https://<push origin>/v1/push/key
```
- `deployments list`: one deployment, one version at 100 %.
- `curl` (the key route needs the `Origin` header equal to `APP_ORIGIN` and no sign-in):
  - `{"publicKey":"<the 87 characters from step 1>"}`: good.
  - `{"error":"HOSTED_CONFIGURATION_REQUIRED"}` (503): a var or secret is missing or malformed. `AUTH_ORIGIN` must be `https://<ref>.supabase.co`; `AUTH_PUBLIC_KEY` and `APP_ORIGIN` must exist; `VAPID_PRIVATE_KEY` must parse; `VAPID_SUBJECT` must be `mailto:` or https; `PUSH_ALLOWED_HOSTS`, if set, must be hosts.
  - `{"error":"ORIGIN_DENIED"}` (403): the header is not exactly `APP_ORIGIN`.
  - `{"error":"NOT_FOUND"}` (404): the path.
- **Record:** the date, the wrangler version and the commit. Never the Worker's address in a report: it is a private Worker host name.

## 5. The app: two secrets, then compare the keys (two mutations, each between read-only checks)
The app route `/api/push` turns on when both values exist. It is a flag read at request time, so no deploy follows ([ADR-010](../architecture/ADR-010-push-reminders.md), "Rollback"; **UNVERIFIED** on a hosted account). Set them on the private app config, the same file that holds `ZIGOALS_AUTH_PUBLIC_KEY`:
```sh
APP_CONFIG="$PWD/apps/web/wrangler.run11.acctest.owner.jsonc"
```
The route also needs the Stage 4 var `ZIGOALS_SYNC_ORIGIN` (a `workers.dev` origin): through it the route confirms each session with private sync before it forwards anything.

**5a. Before (read only), all three:**
```sh
curl -sSI https://<app origin>/app | grep -i '^x-zigoals-build'
curl -sS https://<app origin>/api/push
pnpm --filter @zigoals/web exec wrangler secret list --config "$APP_CONFIG"
```
- `x-zigoals-build`: the release commit you deployed (the app you are about to change is the one you think it is).
- `/api/push`: 503 `{"error":"PUSH_UNAVAILABLE","message":"Reminders while ZIGoals is closed are not available in this build."}`.
- `secret list`: names only; neither `ZIGOALS_PUSH_ORIGIN` nor `ZIGOALS_PUSH_PUBLIC_KEY` yet.

**5b. Mutation: `ZIGOALS_PUSH_ORIGIN`.**
```sh
pnpm --filter @zigoals/web exec wrangler secret put ZIGOALS_PUSH_ORIGIN --config "$APP_CONFIG"
```
The exact https origin of the deployed push Worker (step 4e): scheme and host, no path, no trailing slash. **After (read only):** `secret list` shows `ZIGOALS_PUSH_ORIGIN`; `curl -sS https://<app origin>/api/push` still answers 503 `PUSH_UNAVAILABLE` (the key is not set yet).

**5c. Mutation: `ZIGOALS_PUSH_PUBLIC_KEY`.**
```sh
pnpm --filter @zigoals/web exec wrangler secret put ZIGOALS_PUSH_PUBLIC_KEY --config "$APP_CONFIG"
```
The 87 characters from step 1, nothing else. **After (read only): compare.** Both must print the same `{"publicKey":"…"}`:
```sh
curl -sS https://<app origin>/api/push
curl -sS -H "Origin: <APP_ORIGIN>" https://<push origin>/v1/push/key
```
- A difference means the app hands browsers one key while the Worker signs with another: the push services then refuse every send. Set `ZIGOALS_PUSH_PUBLIC_KEY` again from step 1.
- Still 503 `PUSH_UNAVAILABLE` from the app: one of the three values is missing or malformed (the origin not an exact https origin, the key not 87 base64url characters, the sync origin not on `workers.dev`).
- Then open Settings in a signed-in desktop browser: "Reminders on this phone, even when ZIGoals is closed." shows "Off." and the button "Turn on on this device" instead of "Not available in this build." Under a reminder time, the line "Get this on your phone even when ZIGoals is closed → Settings" appears.
- **Record:** that the two keys matched, and the date.

## 6. Stage 8: the iPhone
Run step 15b of [STAGE8_OWNER_RUNSHEET.md](STAGE8_OWNER_RUNSHEET.md) (row C5 of [STAGE8_ACCEPTANCE.md](STAGE8_ACCEPTANCE.md)): the Home Screen app receives one "A reminder from ZIGoals" at a set time with the app closed; tapping it opens Today; then "Turn off and delete from the server". Local tests prove the Worker, the encryption and the client. Only this step proves a real iPhone, Safari's permission prompt and Apple's push service.

## 7. Turning it off again (each mutation between read-only checks)
**7a. Before (read only):** `secret list` on the app config shows the two push secrets; `curl -sS https://<app origin>/api/push` answers the public key.

**7b. Mutation: off for everyone, without a deploy (the app secrets, origin first).**
```sh
pnpm --filter @zigoals/web exec wrangler secret delete ZIGOALS_PUSH_ORIGIN --config "$APP_CONFIG"
```
**After (read only):** `curl -sS https://<app origin>/api/push` answers 503 `PUSH_UNAVAILABLE`. Every build now says so; the panel shows "Not available in this build."; a device that had it on gets the same answer at its daily refresh and keeps its setting for when it comes back.
```sh
pnpm --filter @zigoals/web exec wrangler secret delete ZIGOALS_PUSH_PUBLIC_KEY --config "$APP_CONFIG"
```
**After (read only):** `secret list` on the app config shows neither push secret.

**7c. Mutation: the server's copies go with the Worker.** Subscriptions and schedules stay in the Worker's objects until you delete it:
```sh
pnpm --filter @zigoals/web exec wrangler delete --config "$PUSH_CONFIG"
```
**After (read only):** `pnpm --filter @zigoals/web exec wrangler deployments list --config "$PUSH_CONFIG"` answers that the Worker does not exist (**UNVERIFIED:** the exact wording).

- `wrangler delete` ("Delete a Worker from Cloudflare") and `wrangler secret delete` ("Delete a secret from a Worker") exist in the pinned wrangler 4.147.0 (their `--help`, read locally 2026-10-08); their effect on a real account is **UNVERIFIED:** not yet observed. The dashboard (Workers & Pages) does the same by hand, as the recovery rehearsal's teardown does.
- Delete the app secrets first, then the Worker. The other way round, the devices' daily refresh fails quietly in between (nothing is shown; the setting stays).
- A service worker a device registered stays until that person turns push off or clears site data. It has no `fetch` handler and no cache, so it changes nothing in the app.
- The key file and its Bitwarden copy can stay for a later activation. A new activation after deleting them starts at step 1.

## Troubleshooting
| What you see | Where | Why | What to do |
|---|---|---|---|
| "Not available in this build." | the Settings panel; the offer line under a reminder time is hidden | `GET /api/push` answered 503 `PUSH_UNAVAILABLE`: `ZIGOALS_PUSH_ORIGIN` or `ZIGOALS_PUSH_PUBLIC_KEY` is missing or malformed on the app Worker, or `ZIGOALS_SYNC_ORIGIN` is not a `workers.dev` origin | step 5. "Not available in Showcase." is by design |
| "This browser's push service is not one ZIGoals sends to yet." | after "Turn on on this device" | the Worker answered 400 `ENDPOINT_NOT_ALLOWED`: the browser's push endpoint is not on the built-in list in `workers/push-reminders/hosts.mjs` (`*.push.apple.com`, `fcm.googleapis.com`, `*.notify.windows.com`, `updates.push.services.mozilla.com`, each from an official page read 2026-10-04 and again 2026-10-05). An endpoint with an explicit port is refused too (Session U). Chrome's staging GCM endpoint is `jmt17.google.com`, which is not built in (its staging Web Push endpoint is `fcm.googleapis.com`) | add the host to `vars.PUSH_ALLOWED_HOSTS` in the private copy (comma-separated exact hosts or `*.suffix`; never an IP address, a port or a path), run `--push`, redeploy the Worker (step 4's last command), and record the host, its source and the date in STATUS |
| "Blocked in your device settings." or "Notifications are blocked for ZIGoals in your device settings. Allow them there, then try again." | the panel | the notification permission was refused, or the OS blocks it; nothing was sent | allow notifications for ZIGoals in the device's settings (on iOS under Settings → Notifications; **UNVERIFIED** path), then "Turn on on this device" again |
| "Add ZIGoals to your Home Screen first." | the panel, on an iPhone or iPad | a browser tab: Web Push exists there only in the Home Screen app | install it ([FRIENDS_GUIDE.md](../friends-alpha/FRIENDS_GUIDE.md) §1) and open it from its icon |
| "Off. Sign in to your account first." | the panel | no signed-in account on this device | sign in |
| "Reminders while ZIGoals is closed could not be set up right now. Try again later." | after "Turn on on this device" | the app route could not reach private sync or the push Worker (503 `ACCOUNT_STATUS_UNAVAILABLE` or `PUSH_SERVICE_UNAVAILABLE`), or the Worker refused with 503 `HOSTED_CONFIGURATION_REQUIRED` or 403 `ORIGIN_DENIED` | step 4's `curl`; `ZIGOALS_PUSH_ORIGIN` exact; `APP_ORIGIN` equal to the app's own origin |
| "Too many changes in a short time. Try again in an hour." | the panel | 60 requests per account per clock hour (429) | wait; the daily refresh is one request, a changed reminder time one more |
| "This account already has reminders on five devices. Turn them off on one device first." | the panel | at most 5 subscriptions per account | as it says |
| "Too many reminder times: at most 20 can be sent while ZIGoals is closed." | the panel | at most 20 schedules per account; the app itself keeps the 20 earliest times and says so | fewer reminder times on that device |
| Nothing arrives | the phone | in order of likelihood: quiet hours (default 22:00–07:00 in the device's zone; nothing is sent inside them, and a reminder time inside them is refused by the app with "… falls inside your quiet hours …"); the alarm ran more than 10 minutes late, and a late reminder is never sent; fewer than 60 s since the last send to that device; the 50-a-day cap for the account; three failed sends paused the device until its next refresh; a device not refreshed for 30 days was deleted at an alarm; the push service answered 404 or 410 and the subscription was deleted (the app subscribes again at its next open); the browser dropped its subscription and the device turned itself off (the panel says "Off."); the two keys differ (step 5) | open the app on that device (the refresh, once a day while used and after a reminder time changes, re-sends its times and clears a pause); check the panel says "On · reminder times checked today."; try a time outside quiet hours; compare the keys |

## What the server never holds
Per account, in one Durable Object (SQLite):
- at most 5 subscriptions: `endpoint`, `p256dh`, `auth`, `zone`, `quiet_from`, `quiet_to`, `created_at`, `refreshed_at`, `last_sent_at`, `failures`, `paused`;
- at most 20 schedules: `time` (HH:MM), `zone`, `weekdays` (a mask, Monday = 1 … Sunday = 64), `next_due`;
- a sent mark per schedule and local day; a daily send counter; an hourly request counter.

Marks and counters are pruned after two days. A subscription not refreshed for 30 days is deleted at the next alarm (the app refreshes once a day while used, and after a reminder time changes: `apps/web/components/push/push-sync.tsx`). "Turn off and delete from the server" and sign-out delete this device; "Sign out all other devices…", cloud deletion and account deletion delete the whole account's push data (`delete-all`), the deletions even from a device that never turned push on (Session X Part 8).

Never: a title, a count, a habit name, a kind, any content, an IP address, a user agent, whether the app is open, or logs (`observability.enabled: false`). Every message is the same encrypted `{"v":1}`; the words "ZIGoals" and "A reminder from ZIGoals" live in `apps/web/public/push-sw.js` on the device, and the opted-in reminder names only in that device's own table (`zigoals-push-labels-v1`), read by the service worker there. The platform's push service (Apple, Google, Mozilla or Microsoft, by browser) sees that a message for the device arrived at these times, with an encrypted body, not what it says.

## Not verified here (2026-10-04; still so on 2026-10-08)
- Anything against a hosted Cloudflare account: what `deploy`, `secret put`, `secret delete` and `delete` print; that the app flag applies without a deploy.
- A real iPhone, Safari's permission prompt and Apple's push service (step 6 is the proof).
- The effect of replacing the key pair on devices that are already on.
- Whether the Cloudflare dashboard can show an object's rows, to look at what the server holds.
