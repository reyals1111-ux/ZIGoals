# Notifications on the public Alpha: owner activation (Session AK, ADR-036 Q3)

**Status (Session AK, 31 Oct):** built and tested locally (Worker tests in Miniflare, the app's plan, composer, route and
Settings card), **switched off**. Nothing here has run against a Cloudflare account or a real phone. The Settings card says
"Notifications are being switched on" until you finish step 5. ADR-010's account reminders (`docs/run11/PUSH_ACTIVATION.md`)
are separate and stay as they are; on a device, turning on the new card replaces them (ADR-036 Q15).

## What this is
- A device turns notifications on with one tap in Settings → Notifications. **No account is needed.**
- The device sends the device push Worker (`workers/push-device/`) only: a random id, a random secret (kept as a
  SHA-256), its push endpoint, its time zone, its quiet hours and the **minutes of the day it should wake**, plus a few
  one-off minutes and minutes to skip. Never a habit's name, an amount, a kind of reminder or anything the person records.
- At each wake the Worker sends a push **with no payload** (VAPID only, no encryption needed). The phone's service worker
  reads the device's own snapshot and writes the text there ("Walk · Read · Water: 1.2 L to go"), or a calm summary when
  nothing is due (Chrome and Safari require a visible notification for every push).
- "Done" and "Snooze 1 h" work from the notification; the app applies them the next time it opens, with Undo.
- On iPhone and iPad it works only in ZIGoals added to the Home Screen (iOS 16.4 or later); the card shows the guide.

## Before you start
- Node 24.19.0, pnpm 11.19.0, the pinned wrangler through `pnpm --filter @zigoals/web exec wrangler`, your Cloudflare
  login in that shell.
- About 20 minutes, plus a phone for step 6.

## 1. Make the keys (offline, once)
```sh
node scripts/push/make-vapid.mjs
```
- It writes the private key to `~/.zigoals/push-device.vapid.json` (mode 0600, **outside the repository**; it refuses a
  path inside the checkout and never overwrites) and prints only the public key. Keep a copy of the file in Bitwarden: a
  new key pair would stop notifications on every device until each one turns them off and on again.
- **Record:** the public key (87 characters). It is public by design.
- **Never paste** the private key anywhere but the `secret put` prompt in step 3.

## 2. The Worker's private config
```sh
cp workers/push-device/wrangler.local.jsonc workers/push-device/wrangler.alpha.owner.jsonc
chmod 600 workers/push-device/wrangler.alpha.owner.jsonc
```
`*.owner.jsonc` is ignored by git. Edit only:
- `name`: `zigoals-alpha-push-device`.
- `vars.APP_ORIGIN`: `https://alpha.zigoals.app`.
- `vars.VAPID_SUBJECT`: keep `mailto:hello@zigoals.app`.
- `vars.KILL_SWITCH`: keep `"on"` for now (step 5 turns it off).
- Exactly one public address: `"workers_dev": true` (it answers at `https://zigoals-alpha-push-device.<your subdomain>.workers.dev`)
  or one custom-domain route such as `push.zigoals.app`.
Leave `main`, the two Durable Object bindings (`PUSH_DEVICES`, `PUSH_BUDGET`), the `v1` migration,
`observability.enabled: false` and `preview_urls: false` as they are. Never put a key or secret in `vars`.

## 3. Deploy the Worker and its secret
```sh
pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/workers/push-device/wrangler.alpha.owner.jsonc"
```
```sh
pnpm --filter @zigoals/web exec wrangler secret put VAPID_PRIVATE_KEY --config "$PWD/workers/push-device/wrangler.alpha.owner.jsonc"
```
Paste the file's one line at the prompt. **Check:** `curl -s -H 'Origin: https://alpha.zigoals.app' https://<worker address>/v1/key`
answers `{"publicKey":"…","paused":true}` and the key equals step 1's.

## 4. Tell the app where the Worker is (the runtime secret)
```sh
pnpm --filter @zigoals/web exec wrangler secret put ZIGOALS_PUSH_DEVICE_ORIGIN --config apps/web/wrangler.alpha.jsonc
```
Value: the Worker's origin from step 3 (`https://…`, nothing after the host). This changes no committed file.

## 5. Switch on (one commit, then a normal Alpha deploy)
- In `apps/web/config/public-integrations.json` set `"pushDeviceEnabled": true` and `"pushVapidPublicKey": "<step 1's public key>"`.
  The schema refuses `true` without the key.
- Merge, then deploy the Alpha through the Manual Alpha workflow as usual.
- Turn the Worker's kill switch off: set `vars.KILL_SWITCH` to `"off"` in the owner config and deploy the Worker again
  (step 3's first command). **To pause everything at once later:** set it back to `"on"` and deploy; registrations and
  sends stop, deletions keep working.

## 6. Verify on a phone
1. Android (Chrome): open the Alpha, Settings → Notifications → **Turn on notifications** → allow. iPhone: add to the
   Home Screen first, open it from there, then the same.
2. **Send a test notification**: one arrives within a minute ("Nothing is due right now" or a summary).
3. Give a habit a reminder two minutes ahead; the notification names it only if "Show what a reminder is for in
   notifications" is on (ZIGi settings), otherwise it says "1 habit due". Tap **Done**; open the app: the habit is done,
   with an Undo toast.
4. **Turn off and delete from the server**; the test button is gone and the Worker answers 404 for that device.
5. The hosted verifier's push stage reports the Worker's key (it skips while the switch is off).

## Cost: inside Cloudflare's free plan (A5)
Free-plan limits (Workers and Durable Objects pages, read 31 Oct; `docs/research/session-ak/FORMATS.md` (e)): 100,000 Worker
requests a day, 100,000 Durable Object requests a day (alarms count), 100,000 rows written a day, 13,000 GB-s, 5 GB stored,
10 ms CPU per invocation. A wake costs one alarm, one budget call, about four rows written (the device record before and
after the send, the budget counter, `setAlarm`) and one outbound push with no encryption (only an ES256 signature, reused
for 6 hours per push service).

| | 100 devices | 1,000 devices | Free limit |
|---|---|---|---|
| Wakes a day (about 10 per device) | 1,000 | 10,000 | — |
| Durable Object requests (alarms + budget + registrations) | ~2,300 | ~23,000 | 100,000 |
| Rows written | ~4,500 | ~45,000 | 100,000 |
| Worker requests (registrations, tests, deletions) | ~400 | ~4,000 | 100,000 |
| Stored | ~0.1 MB | ~1 MB | 5 GB |

The daily budget (`globalSendsPerDay`, 20,000) keeps rows written under 100,000 even at 2,000 busy devices; past that the
Worker answers registrations with "try later" and skips sends rather than failing (`workers/push-device/limits.mjs`). Each
device is also capped at 24 notifications a day and one a minute.

## What the server never holds
Names, kinds, counts, amounts, habits, goals, IP addresses, user agents, logs. A device record holds: the id, the
secret's SHA-256, the endpoint, the zone, quiet hours, wake minutes, one-off and skip minutes, counters. It leaves on
"Turn off", on Erase everything (the device asks with its own secret before it forgets it), after 30 days without a
refresh, on a 404/410 from the push service and after five failed sends in a row.

## Roll back
Set `pushDeviceEnabled` back to `false` (one commit and deploy) and the kill switch to `"on"`. Devices keep their
records until they refresh, turn off or reach 30 days; nothing is sent meanwhile.
