# Stage 8 run-sheet: only the steps that need you

Everything here needs something only you have:
- two real inboxes;
- your desktop and your physical iPhone;
- your Cloudflare, Supabase, Resend and CoinGecko accounts.

Everything else in Stage 8 is already rehearsed by automation. [STAGE8_COVERAGE.md](STAGE8_COVERAGE.md) lists which test proves which row: 20 of 31 rows are proven locally, and you don't need to repeat them. Fill their rows in the acceptance sheet as the last step.

**Total time:** about 4½ hours. It can be split over several days; each part says when it can be done.

## Before you start
- **Stages 1–7 are done** on the isolated acceptance services. Never use the live Alpha.
- **Use fictional data only:** no real names, money or health records.
- **Have ready:**
  - your desktop browser (Desktop A);
  - your iPhone with Safari (Phone B);
  - two inboxes you control (Inbox 1, Inbox 2);
  - Bitwarden.
- **Record receipts** in your own copy of [STAGE8_ACCEPTANCE.md](STAGE8_ACCEPTANCE.md), using its receipt template. Never record:
  - email addresses, one-time codes or recovery secrets;
  - account or session IDs, tokens or keys;
  - private Worker host names or IP addresses;
  - screenshots that show any of these.

---

## Part 1: recovery rehearsal (once, at Stage 7) · about 60 min
**1. Stage 7 rehearsal (row D0).**
- **Do:** steps 1–10 of "Stage 7 rehearsal" in [OWNER_RECOVERY_ADMIN.md](OWNER_RECOVERY_ADMIN.md). Use the fictional fixture account and the one rehearsal lifecycle Worker.
- **Pass, in this order:**
  1. `MATCH`;
  2. `Exported … Receipts: 0`;
  3. no ZIGoals reply from another network;
  4. `DRY RUN OK`, then `RECONCILED` ("Re-export digest matches"), then `ALREADY RECONCILED`;
  5. the wrong anchor is refused;
  6. no new Worker, route or subdomain besides the rehearsal Worker.
- **Record:** pass or fail for runbook steps 3–8, the wrangler version, the commit and the date.
- **If it fails:** stop. Hosted recovery is not relied on (the runbook's "Fallback").

## Part 2: sign-in with real email (Desktop A, Inbox 1) · about 25 min
**2. A real code arrives (rows A1–A4, the provider's own part).**
- **Do:** open the acceptance app, go to Settings → Account & sync, enter Inbox 1's address and choose "Send email code".
- **Pass:**
  - the email arrives from your verified sender;
  - it shows a code;
  - the button counts down from "(60s)".
- **Record:** how long delivery took.

**3. Wrong code (A1).**
- **Do:** type `000000` and choose "Verify email code".
- **Pass:** "Account access was not confirmed. Check the code and try again." The panel still offers sign-in.

**4. Too soon (A4).**
- **Do:** reload the page, then choose "Send email code" again within 60 seconds of the first one.
- **Pass:** "Please wait before requesting another code." No second email arrives.

**5. Reused code (A3).**
- **Do:**
  1. Wait for the countdown to end, request a code, and sign in with it.
  2. Choose "Sign out".
  3. Request a new code, but type the *previous* one.
- **Pass:** refused with the same message, then the newest code works.
- **Then:** sign out again.

**6. Expired code (A2).**
- **Do:** request a code and leave it unused until after the expiry time set in your Supabase project's email sign-in settings. Then type it.
- **Pass:** refused with the same message, and a new code works after the countdown.
- **Tip:** do other parts while you wait.

## Part 3: turn on sync from the new offer (Desktop A, Inbox 1) · about 10 min
**7. The sync offer.**
- **Do:** sign in. Right under the sign-in panel the card "Keep your devices in sync automatically" appears.
- **Check it says:**
  - end-to-end encrypted, nobody else can read it;
  - turn it on once, no backups by hand;
  - keep the recovery secret in a password manager.
- **Pass:**
  - the "Also sync my Health records (optional)" box is **not** ticked;
  - nothing else on the page moved focus or blocked you.

**8. Turn it on.**
- **Do:**
  1. Leave Health unticked for now and choose "Turn on encrypted sync (recommended)".
  2. Copy the recovery secret shown below straight into a new Bitwarden item.
  3. Tick "I saved this vault recovery secret separately." and choose "Confirm and create vault".
- **Pass:** "Account records synced and acknowledged", and the card is gone.
- **Record:** pass. Never the secret.
- **Then:** create a fictional Goal, a Habit and one Today widget, and add 250 mL of water in Health.

## Part 4: your iPhone (Phone B) · about 35 min
**9. Install to the Home Screen.**
- **Do:**
  1. In Safari, open the acceptance app.
  2. Tap Share, then "Add to Home Screen".
  3. Look at the suggested name and icon, and tap Add.
- **Pass:**
  - the name is "ZIGoals";
  - the icon is the origami Z on deep navy;
  - opening it from the Home Screen shows no Safari toolbar.
- **Record:** the iOS version, and pass or fail per item.

**10. The installed app has its own storage (iOS fact check).**
- **Do:**
  1. In Safari (not the installed app), add a fictional Habit called "Safari only".
  2. Open the Home Screen app.
- **Pass:** "Safari only" is **not** there. Apple documents that Home Screen apps keep storage separate from Safari.
- **Record:** pass or fail. A fail changes the advice in [IOS_STORAGE.md](../friends-alpha/IOS_STORAGE.md), so tell the next session.

**11. "Keep my data on this device".**
- **Do:** in the Home Screen app, open Help and choose "Keep my data on this device".
- **Pass:** a clear answer: kept, not promised, or not supported.
- **Record:** which answer.

**12. Sync on a new device (B2, B3 and the offer on a phone).**
- **Do:**
  1. In the Home Screen app, sign in with Inbox 1. The card "Bring this device up to date" appears.
  2. Tick "Also sync my Health records (optional)".
  3. Choose "Turn on encrypted sync (recommended)". The recovery-secret field gets focus.
  4. Fill it from Bitwarden with AutoFill, and choose "Unlock account vault".
- **Pass:**
  - the Goal, Habit and Today widget from step 8 appear;
  - the 250 mL does **not** appear (Desktop A has not consented to Health).
- **Then:**
  1. Add 500 mL on the phone.
  2. On Desktop A, tick the Health box in "Encrypted account sync", then "Sync now".
- **Expected:** Desktop A shows "Unlinked local and cloud records differ…". It holds its own Health entries made before consent, so sync stops for your review instead of merging silently. That is by design.
- **Record:** pass or fail for each line.

**13. Unlock again (expected behaviour today).**
- **Do:** close the Home Screen app from the app switcher, then open it again.
- **Pass:**
  - Settings asks for the recovery secret again;
  - AutoFill fills it;
  - the records come back.
- **Record:** pass, and how easy AutoFill was. Today the secret is needed after every restart; see the STATUS follow-up.

**14. Camera (C1, C2, C3).**
- **Do:** Health → "Scan or look up a food barcode" → "Scan barcode".
- **Pass:**
  - **C1:** iOS asks for camera permission. Choose Don't Allow: "Camera permission was denied. Manual barcode entry remains available." Typing a barcode still works.
  - **C2:** allow the camera in Settings, scan, then "Stop camera". The food log is unchanged.
  - **C3:** scan a real product. You see the product or "not found". New barcodes are paced at no more than 5 lookups a minute; one asked for too soon waits or is refused with a plain message.
- **Record:** pass or fail per row, and the product category only.

## Part 5: providers (Desktop A) · about 15 min
**15. One real market refresh (C4).**
- **Do:**
  1. Note your CoinGecko usage on its dashboard.
  2. In Wealth, refresh one supported asset once.
  3. Note the usage again.
- **Pass:** usage rises by at most the cost your `MARKET_POLICY` allows for that read, and a second refresh within the cache time adds nothing.
- **Record:** before and after numbers.

## Part 6: hosted recovery (fictional accounts only) · about 90 min
Follow [OWNER_RECOVERY_ADMIN.md](OWNER_RECOVERY_ADMIN.md), in this order:

**16. Export after a deletion (D1).**
- **Do:**
  1. Create a fictional account with Inbox 2.
  2. Delete it in the app (Settings → Account deletion).
  3. Run `recovery-admin.mjs export` for it the same day.
- **Pass:** a 0600 file and a digest.
- **Record:** the date. Keep the digest in Bitwarden only.

**17. Custody (D2).**
- **Do:** store the file and the digest as two separate Bitwarden items, plus the offline encrypted image. Then run `verify` on each copy.
- **Pass:** `MATCH` twice.

**18. Point-in-time recovery (D3).**
- **Do:** restore the lifecycle authority to an earlier point, with it deployed in `RECOVERY_MODE=reconcile`.
- **Pass:** the app's private sync refuses with 503 while it stays in reconcile.

**19. Dry run and reconcile (D4).**
- **Do:** set the anchor, then `dry-run`, then `reconcile` (type the UUID and the digest when asked).
- **Pass:** `DRY RUN OK`, then `RECONCILED`, then "Re-export digest matches".

**20. Old device refused (D5).**
- **Do:** open the fictional account on a device that was offline during the deletion.
- **Pass:** refused (410). Nothing comes back.

**21. Back to serve (D6).**
- **Do:** only by your explicit decision after steps 16–20: an approved deploy with `RECOVERY_MODE=serve`, with the anchor vars removed in the same change.
- **Record:** the decision and the date.

## Part 7: before inviting friends · about 15 min
**22. Quotas (E1).**
- **Do:** check usage against the free tiers in the Cloudflare, Supabase, Resend and CoinGecko dashboards.
- **Pass:** comfortable headroom.

**23. Spend controls (E2).**
- **Do:** confirm that no paid upgrade or automatic reload is enabled anywhere.
- **Pass:** none.

## Part 8: finish the acceptance sheet · about 10 min
**24.** For each row marked PROVEN-LOCAL in [STAGE8_COVERAGE.md](STAGE8_COVERAGE.md) that you did not repeat, write "PROVEN-LOCAL, see STAGE8_COVERAGE.md" plus the green CI run of the reviewed commit.

**25.** Commit only a sanitized summary: pass or fail per row and receipt IDs.

## If something fails
- Write a receipt and stop that part.
- Don't retry a provider step more than once.
- Don't change settings to make a step pass.
