# Stage 8 run-sheet: only the steps that need you

Everything here needs something only you have:
- two real inboxes;
- your desktop and your physical iPhone;
- your Cloudflare, Supabase, Resend and CoinGecko accounts.

Everything else in Stage 8 is already rehearsed by automation. [STAGE8_COVERAGE.md](STAGE8_COVERAGE.md) lists which test proves which row: 25 of 36 rows are proven locally, and you don't need to repeat them. Fill their rows in the acceptance sheet as the last step.

**Total time:** about 4¾ hours. It can be split over several days; each part says when it can be done.

## Before you start
- **Stages 1–7 are done** on the isolated acceptance services. Never use the live Alpha.
- **The final redeploy is done:** [FINAL_ACCTEST_REDEPLOY.md](FINAL_ACCTEST_REDEPLOY.md), once: every changed Worker, the services first and the app last.
- **The sync-writes switch is on in that build:** Session W Part 1 switched it on in the Session W PR (owner decision W1, 2026-10-06; [SYNC_WRITES_ON.md](../product/SYNC_WRITES_ON.md)). In the app: Settings → account sync shows "Also sync my Portfolio (optional)". If the release SHA does not carry the switch, mark rows 15, 15c and 15d "not run: switch off".
- **The market policy window:** the private `MARKET_POLICY` ends at 2026-10-31 16:00 UTC. Around 28 October, install the two-window policy with `node scripts/run11/next-market-policy.mjs` (one policy update and one coordinator deploy); the coordinator takes the next period by itself at the boundary ([ALPHA_PRICES_ROLLOUT.md, Next policy period](ALPHA_PRICES_ROLLOUT.md#next-policy-period)).
- **The owner hardening below is done.**
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

### Session V changes (what you will notice)
- **Trusted Types are enforced** in the app's production build: nothing to do, but if any page shows a blank area or a console error naming "TrustedScriptURL" or "require-trusted-types-for", stop and report the page.
- **ZIGi keeps its own device records** (options, usage, notes, actions, look and feel, reminders, knocks) and chats can be version 2; none of this syncs.
- **Push reminder names are opt-in:** the "Show reminder names" choice is off unless you turn it on; Health-linked and water reminders stay generic.
- **ZIGoals hosted (the relay) is not part of this stack:** it stays off; do not deploy `workers/zigi-relay` for Stage 8.

### Session W changes (what you will notice)
- **Sync writes are on:** row 15 and 15c run as written; row 15d covers sleep, meditation, your links and your pages.
- **New sections in the synced data, written only when you use the feature:** Health v4 (sleep, meditation, daily vitals, quick-log buttons, the wrap-up mood) and settings v3 (your pages, links, chess usernames, the wrap-up). Accounts, debts and milestone dates stay on each device in this release.
- **Timezone phase 4 (Part 17):** Settings → "Your time zone" is written to settings v2 and a Goal plan's zone to finance v4 (both read by #29 and later). Re-run rows B2, B4 and B5 on two devices in different zones with a time zone saved on one of them: the other device follows it after a sync, a plan keeps its own zone, and on a plan's due day Goals says "due today", not behind.
- **New outside services, only on your action:** chess.com and Lichess (only the username you type), Spotify (only once ZIGoals has a Spotify app, MUSIC_ACTIVATION.md). The health-link Worker and the market coordinator's new path are **not** part of this stack (FINAL_ACCTEST_REDEPLOY.md, "Session W changes").

### Session X-Local and Session Y changes (what you will notice)
- **ZIGi comes alive (X-Local):** the launcher animates on every page except Settings (still under Motion Off or reduced motion); auto-accept is off until you switch a kind on. Row 15g checks ZIGi on the Stage 8 stack.
- **A Health restore asks first (Y, B4):** after restoring the Health section, Health sync stays off until you tick it (row 15e).
- **A revoked session forgets the remembered device (Y, A7):** row 14b.
- **The cloud's vault missing or older (Y, B6, B3):** a device shows a message and offers a fresh start or a re-link only behind a confirmation; you should not see this on Stage 8: only a restore of the sync service from an earlier copy causes it ("Delete cloud data" ends the account's cloud for good). Row 15f says why it is not run by hand.

## Before Stage 8 — owner hardening · about 75 min
Session U (owner review change 11). Do these once, before Stage 8, in this order. Every click path is from the vendor's
own documentation, read 2026-10-05 (linked); if a screen differs, follow the vendor's page. Keep every recovery code
and backup code in Bitwarden, as its own item, never in a note, a screenshot or this repository.

**H1. Cloudflare: a new password first.** ([Change password](https://developers.cloudflare.com/fundamentals/user-profiles/change-password-or-email/))
- **Do:** Profile → **Authentication** → **Password** → **Change Password** → a new password from Bitwarden's generator → **Save**.
- **Then:** API tokens made before this keep working; H6 reviews them.

**H2. Cloudflare: two-factor with a mobile app.** ([Two-factor authentication](https://developers.cloudflare.com/fundamentals/user-profiles/2fa/))
- **Do:** **My Profile** → **Authentication** → **Two-Factor Authentication** → **Set up** → **Mobile App Authentication** → **Add**; scan the QR code with your authenticator, enter its code and your password → **Next**.
- **Then:** Cloudflare offers the backup codes: **Download** or **Copy** them straight into a new Bitwarden item (H3).

**H3. Cloudflare: backup codes in Bitwarden.**
- **Do:** if you did not keep them in H2: **My Profile** → **Authentication** → **Two-Factor Authentication** → **Manage** → **Backup codes** → **Regenerate** (this cancels the old ones), then into Bitwarden.
- Cloudflare's page does not say the codes can be shown again later: keep them when they are shown.

**H4. Cloudflare: a security key as a second factor.** (same page)
- **Do:** **Two-Factor Authentication** → **Security Key Authentication** → **Add**, your password → **Next**, then touch your Mac's Touch ID (or a hardware key) and name it.
- Cloudflare describes WebAuthn security keys, built-in ones such as Touch ID included, as a second factor, and recommends at least two factors. Its pages do not describe a passkey that replaces the password; there is nothing more to set up for that.

**H5. Cloudflare: members.** ([Manage members](https://developers.cloudflare.com/fundamentals/manage-members/manage/))
- **Do:** your account → **Members**. Open each member with **Edit**.
- **Pass:** only you, or people you chose, each with the narrowest role they need.

**H6. Cloudflare: API tokens, including the Alpha deploy token.** ([Roll a token](https://developers.cloudflare.com/fundamentals/api/how-to/roll-token/))
- **Do:** **My Profile** → **API Tokens**, then **Manage account** → **Account API tokens**. For each token, read its permissions.
- **Keep** the Alpha deploy token (the GitHub `alpha` environment's `CLOUDFLARE_ALPHA_API_TOKEN`) with exactly the "Current dedicated token policy" in [MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md): Entire Account → Workers Scripts Read + Edit, nothing else. **Delete** (three-dot menu → **Delete**) any token you no longer use, and any made by `wrangler login` that you don't recognise.
- **If in doubt about a token's secrecy:** three-dot menu → **Roll** → **Confirm**: same permissions, new value, the old one stops at once; then update the GitHub secret.
- Cloudflare's tokens can be limited to an account or a zone, not to one Worker (FIX_PLAN F5): see "Owner decisions" in STATUS.

**H7. Cloudflare: the audit log.** ([Audit logs](https://developers.cloudflare.com/fundamentals/account/account-security/audit-logs/))
- **Do:** **Manage Account** → **Audit Logs**. Look through the last 90 days.
- **Pass:** every change is one you or a reviewed workflow made.

**H8. Supabase: MFA on your own dashboard login.** ([Multi-factor authentication](https://supabase.com/docs/guides/platform/multi-factor-authentication))
- **Do:** Supabase dashboard → your account → **Security** (supabase.com/dashboard/account/security) → add an authenticator app.
- Supabase gives **no recovery codes**: add a second authenticator factor on another device instead. Turning MFA on signs out your other dashboard sessions.
- "Require MFA to access organization" exists only on the Pro, Team and Enterprise plans ([enforcement](https://supabase.com/docs/guides/platform/mfa/org-mfa-enforcement)).

**H9. Supabase: no localhost sign-in redirect before any wider launch.** ([Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls))
- **Do:** your project → **Authentication** → **URL Configuration** → Redirect URLs: remove `http://127.0.0.1:3100` (and any other loopback entry). Keep the acceptance app's own URL.
- **When:** before you invite anyone beyond the friends Alpha; it is harmless until then but has no purpose there.

**H10. Supabase: time-boxed sessions, only if your plan has them.** ([Sessions](https://supabase.com/docs/guides/auth/sessions))
- "Time-box user sessions" and "Inactivity timeout" (Authentication → Sessions) are "only available on Pro Plans and up". On the free plan, skip this row and write "not on this plan".

**H11. Resend: MFA.** ([How can I add MFA](https://resend.com/docs/knowledge-base/how-can-i-add-mfa))
- **Do:** resend.com → your **Profile** → **Enable MFA** → scan the QR code → enter the code.

**H12. CoinGecko: 2FA.** ([Account and Security](https://support.coingecko.com/hc/en-us/articles/44946361836185-Account-and-Security))
- **Do:** your CoinGecko account → **Account** → **Login & Security** → turn on 2FA ("Modify 2FA"). The page does not say which kind or whether recovery codes exist: keep whatever it shows in Bitwarden.

**H13. Bitwarden: two-step login.** ([Authenticator app](https://bitwarden.com/help/setup-two-step-login-authenticator/), [recovery code](https://bitwarden.com/help/two-step-recovery-code/))
- **Do:** the Bitwarden web app → **Settings** → **Security** → **Two-step login** → **Authenticator App** → **Manage**, master password, scan, code → **Enable**.
- **Then:** **Two-step login** → **View recovery code**: print it and keep it somewhere safe outside Bitwarden (it is what lets you back in).

**H14. Your Mac: FileVault.** ([Apple: FileVault](https://support.apple.com/guide/mac-help/protect-data-on-your-mac-with-filevault-mh11785/mac))
- **Do:** Apple menu → **System Settings** → **Privacy & Security** → **FileVault** → **Turn On**; choose either iCloud unlock or "Create a recovery key and do not use my iCloud account" and keep that key safe.
- Why: `~/.config/zigoals/` holds the private configs and keys.

**H15. Google: 2-Step Verification** (the account behind your inboxes and devices). ([Google help](https://support.google.com/accounts/answer/185839))
- **Do:** myaccount.google.com → **Security & sign-in** → "How you sign in to Google" → **Turn on 2-Step Verification**, then follow the steps; keep the backup codes in Bitwarden.

**H16. DMARC: tighten from `p=none` in mid-October.** ([Cloudflare: email authentication](https://developers.cloudflare.com/email-service/concepts/email-authentication/), [troubleshooting](https://developers.cloudflare.com/email-service/reference/troubleshooting/))
- Cloudflare's advice: start with `p=none`, read the reports for several weeks, then `p=quarantine`, then `p=reject` once legitimate mail passes, with SPF and DKIM aligned.
- **Do (mid-October, once Resend's code emails pass in the reports):** Cloudflare → the `zigoals.app` zone → **DNS** → **Records** → the `_dmarc` TXT record → change `p=none` to `p=quarantine`. Move to `p=reject` only after another clean period. Reports: **Email** → **DMARC Management** (FINDINGS Q-OPS-01).
- **Pass:** a code email still arrives in Inbox 1 and Inbox 2 after the change.

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

**1b. Erase rehearsal (merged from FINAL_ACCTEST_REDEPLOY).**
- **Do:** [OWNER_RECOVERY_ADMIN.md](OWNER_RECOVERY_ADMIN.md), "Erase an account": steps 1–4 now, on the fictional rehearsal account; step 5 at the Stage 8 serve switch.
- **Pass (Session U, Part 5 item 7):** at the serve step the command also prints `Encrypted vault rows: REMOVED` (the account's encrypted vault rows are gone, Portfolio copy included); before the serve switch it says the rows are not removed yet.
- **Record:** pass or fail per step, the wrangler version and the commit.

## Part 2: sign-in with real email (Desktop A, Inbox 1) · about 25 min
**2. A real code arrives (rows A1–A4, the provider's own part).**
- **Do:** open the acceptance app, go to Settings → Account & sync, enter Inbox 1's address and choose "Send email code".
- **Pass:**
  - the panel says "If this address has an invite, a code is on its way. Check your inbox and spam folder. You can request another in 60 seconds." (Session U: the same answer for every address);
  - the email arrives from your verified sender;
  - it shows a code;
  - the button counts down from "(60s)".
- **Record:** how long delivery took.

**2b. An address without an invite (Session U, A1/A2).**
- **Do:** request a code for an address you own that is not on the invite list.
- **Pass:** exactly the same answer and countdown as row 2; no email arrives; Supabase → Authentication → Users shows no new user.
- **Record:** pass or fail.

**2c. When the email limit is reached (Session U, owner review change 6).**
- **Do:** with Inbox 1, request codes (each after the countdown) until your Supabase email rate limit for the hour is used up (Authentication → Rate limits shows it); request one more.
- **Pass:** that request shows the same answer as row 2 and no email arrives; Help → "I asked for a sign-in code and none arrived" says to wait, check the spam folder and try again later.
- **Record:** pass or fail, and the limit you saw (a number only).

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

**6b. Sign out everywhere (merged from FINAL_ACCTEST_REDEPLOY).**
- **Do:** [OWNER_SIGN_OUT_EVERYWHERE.md](OWNER_SIGN_OUT_EVERYWHERE.md), once, with your own fictional test user.
- **Record:** pass or fail, and the date.

**6c. A revoke also ends the provider session (Session U, A3).**
- **Do:** sign in with Inbox 1 in two browser profiles. In profile 1, Settings → Devices and sessions → "Sign out all other devices…", then "Sign out all other devices" to confirm (on a build without Session W: "Revoke other sessions" after "Refresh sessions", and confirm). Then, in profile 2, open Settings.
- **Pass:** profile 1 says "1 session(s) revoked. They were also signed out at the email provider." (a Session W build puts "Signed out all other devices:" before it and "This device stays signed in." after it); profile 2 is signed out (it asks for an email code again).
- **Record:** pass or fail per line.

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
  3. Tick "I saved this vault recovery secret separately." Leave "Remember on this device — don’t use on shared computers" as it is: in a desktop browser tab it is **not** ticked (F1). Choose "Confirm and create vault".
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
- **Also note:** how the status bar at the very top looks. The app uses Apple's default style; say if it clashes with the navy background.
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
  4. Fill it from Bitwarden with AutoFill. Below it, "Remember on this device — don’t use on shared computers" is **ticked** in the Home Screen app, with its warning (F1). Leave it ticked and choose "Unlock account vault".
- **Pass:**
  - the Goal, Habit and Today widget from step 8 appear;
  - Settings says "This device is remembered";
  - the 250 mL does **not** appear (Desktop A has not consented to Health).
- **Then:**
  1. Add 500 mL on the phone.
  2. On Desktop A, tick the Health box in "Encrypted account sync", then "Sync now".
- **Expected:** Desktop A shows "Unlinked local and cloud records differ…". It holds its own Health entries made before consent, so sync stops for your review instead of merging silently. That is by design.
- **Record:** pass or fail for each line.

**12b. The final write loses its reply (B12; added in Session P).**
- **Do:**
  1. On the phone, with sync on: create a Goal, then straight away turn on airplane mode, so the upload's final reply is lost. The sync panel shows an error; that is expected.
  2. Still offline, create a second Goal.
  3. Turn airplane mode off, open Settings and choose "Sync now".
- **Pass:**
  - "Account records synced and acknowledged", with no "Unlinked…" or "Conflicting…" review;
  - on Desktop A, after its own "Sync now", both Goals are there.
- **Record:** pass or fail per line. If a review appears, record its first words and keep both copies (nothing is lost).

**13. Open again without the secret (F2, F3; changed by Session M).**
- **Do:**
  1. Close the Home Screen app from the app switcher, then open it again.
  2. In Settings choose "Lock account vault", close the app and open it again.
  3. Unlock with the secret, ticking "Remember on this device" again.
- **Pass:**
  - after step 1 the records are there and Settings asks for nothing;
  - after step 2 Settings asks for the recovery secret (locking also forgets this device), and AutoFill fills it.
- **Record:** pass or fail per line. If step 1 asks for the secret, record that: it would mean iOS did not keep the remembered device, and IOS_STORAGE.md needs a note.

**13b. Remembered device on Desktop A, then a key rotation (F2, F3, F4).**
- **Do:**
  1. On Desktop A: "Lock account vault", then unlock with the secret and tick "Remember on this device".
  2. Reload the page, then open the app in a second tab.
  3. Choose "Forget this device", then reload.
  4. Unlock once more, then open "Rotate vault encryption", save the new secret in Bitwarden and activate it.
  5. On the phone, close and reopen the Home Screen app.
- **Pass:**
  - step 2 asks for no secret, in either tab;
  - step 3 keeps the tab open until the reload, which asks for the secret;
  - after step 5 the phone asks for the secret: the old one is refused ("Unlock or integrity check failed"), and the new one works.
- **Record:** pass or fail per line. Never either secret.

**13c. A device remembered before the redeploy (Session U, B1).**
- **Do:** only if the phone was remembered on the Stage 7 build: after the final redeploy, close and reopen the Home Screen app, then close and reopen it once more.
- **Pass:** both times it opens without the secret (the old record is replaced by the new kind on the first open). If the first open asks for the secret once, record it: Safari could not keep the new kind of record, and that browser keeps the old one (owner decision in STATUS, Session U).
- **Record:** pass or fail per open, and the iOS version.

**13d. Lock locks every tab (Session U, B2).**
- **Do:** on Desktop A, with the vault open and remembered, open Settings in two tabs. In tab 1 choose "Lock account vault". Look at tab 2, switch to another app and back, then reload tab 2.
- **Pass:** tab 2 shows "Account records locked." and no longer says "This device is remembered"; it does not reopen on focus; after the reload it asks for the recovery secret.
- **Record:** pass or fail per line.

**14. Camera (C1, C2, C3).**
- **Do:** Health → "Scan or look up a food barcode" → "Scan barcode".
- **Pass:**
  - **C1:** iOS asks for camera permission. Choose Don't Allow: "Camera permission was denied. Manual barcode entry remains available." Typing a barcode still works.
  - **C2:** allow the camera in Settings, scan, then "Stop camera". The food log is unchanged.
  - **C3:** scan a real product. You see the product or "not found". New barcodes are paced at no more than 5 lookups a minute; one asked for too soon waits or is refused with a plain message.
- **Record:** pass or fail per row, and the product category only.

**15. What syncs from the new features (B13; changed by Session U Part 9; needs the switch-ON PR, [SYNC_WRITES_ON.md](../product/SYNC_WRITES_ON.md)).**
- **Before:** both devices have "Sync my Health records" ticked.
- **Do:** on Desktop A: edit a habit and, under "Done automatically from Health", choose water with at least 1 glass; log a glass of water in Health; on another habit, plan a skip for tomorrow (its "History & reflection"); in Wealth → "+ Add asset" → "Import from a CSV file", choose a two-line file (`Name,Asset,Quantity,Kind of asset,Value,Currency` then `Gold,XAU,2,Precious metals,,EUR`); in Health → Diary → "Import a nutrition CSV", choose a one-line file (`Date,Meal,Food,Calories` then today's date, `Breakfast,Oats,380`); on Goals, create a health goal; in Health, start a fast and stop it; on Today's review day, write the weekly review with a few words under "Health" and finish it. Sync now. On Phone B: sync, then open Today, Habits, Goals, Wealth and Health.
- **Pass:**
  - the automatic check-in with its "Done automatically" badge (the rule and its marker travel with Health now), the planned skip (◌ on that day), the Gold holding ("Needs valuation") and the imported meal;
  - the health goal on Goals, the fast in Health → "Recent fasts", and the finished weekly review with its Health words (Settings → Weekly review day → "Last review");
  - the insight cards stay on each device;
  - then, on Phone B, untick "Sync my Health records" and repeat one change of each kind on Desktop A: after "Sync now" the phone receives the review's other words only, none of the Health ones.
- **Record:** pass or fail per record kind. Never the file contents, the review's words or the goal's name.

**15c. Portfolio sync, opt-in (Session U Part 9, ADR-013; needs the switch-ON PR).**
- **Do:** on Desktop A, Portfolio: create a fictional portfolio with one buy. In Settings → account sync, tick "Also sync my Portfolio (optional)" and "Sync now". On Phone B tick it too and "Sync now". Then add a second buy on each device without syncing in between, and sync Desktop A, then the phone.
- **Pass:**
  - after the first round the phone shows the same portfolio; Wealth and Goals on both devices are unchanged;
  - the second round asks on the phone "Choose which one to keep": "Keep the encrypted copy" shows the desktop's buys, and the phone's own Portfolio is kept as a recovery copy;
  - "Delete the Portfolio's encrypted copy…" → "Delete the encrypted copy" on the phone, then "Sync now" on the desktop: the desktop says the copy was deleted on another device and unticks its box; both devices keep their Portfolio.
- **Record:** pass or fail per line.

**15d. Session W: sleep, meditation, your links and your pages sync (two devices; Session W, needs its PR in the release SHA).**
- **Before:** both devices have "Sync my Health records" ticked and have synced once.
- **Do:** on Desktop A: Health → Sleep → log a fictional night (bedtime and wake time, quality 3, the tag "screens"); Health → Meditation → log 5 minutes by hand; Settings → Your pages & buttons → hide Markets and switch Chess on; Settings → My links → add `https://example.com` labelled "Test link". "Sync now" on Desktop A, then on Phone B.
- **Pass:**
  - Phone B's Health shows the night (same duration and quality) and the 5-minute session, each once;
  - Phone B's tab bar and More sheet follow the pages choice (no Markets; Chess in More), and its Today shows the link;
  - then on Phone B untick "Sync my Health records", log another night on Desktop A and sync both: the phone does not receive it, while a second link added on Desktop A does arrive (links sync with settings, not with Health).
- **Record:** pass or fail per line. Never the link's address or the night's notes.

**15b. Push reminder with the app closed (C5; only after [PUSH_ACTIVATION.md](PUSH_ACTIVATION.md) steps 1–5) · about 10 min.**
- **Before:** do it outside the quiet hours (22:00–07:00 on the phone, by default), signed in on the Home Screen app.
- **Do:**
  1. In the Home Screen app, open Settings → "Reminders when closed". The panel "Reminders on this phone, even when ZIGoals is closed." says "Off." Choose "Turn on on this device" and allow notifications when iOS asks.
  2. Read: "Reminders while ZIGoals is closed are on for this device." and the state line "On · reminder times checked today."
  3. In Health → Water, set "Reminder time — on this device" to two minutes from now and choose "Save reminder time" ("Water reminder set for HH:MM on this device."). The app sends the new time to the server by itself.
  4. Close the app fully from the app switcher and wait for the time.
  5. The notification arrives: "ZIGoals", "A reminder from ZIGoals", nothing else. Tap it.
  6. Afterwards: Settings → "Reminders when closed" → "Turn off and delete from the server".
- **Pass:**
  - one notification, at the set minute (the Worker sends up to 10 minutes late, never later);
  - tapping it opens the app on Today, where the usual water reminder card is;
  - no second notification for the same reminder;
  - after step 6: "Turned off. Nothing about this device is kept on the server." and the state line "Off."
- **Record:** pass or fail per line; the iOS version; how many minutes after the set time it arrived; and, if the app happened to be open at a reminder time, whether iOS showed the banner then (ADR-010 lists this as not verified). Never the push address, the Worker's host name or the account.
- **If nothing arrives:** the troubleshooting table in [PUSH_ACTIVATION.md](PUSH_ACTIVATION.md) (quiet hours, the 10-minute rule, the 30-day prune, the keys comparison). Don't retry more than once before reading it.

**14b. A revoked session forgets the remembered device (Session Y, A7).**
- **Do:** with Phone B remembered (row 13), on Desktop A choose "Revoke other sessions". Then open the app on Phone B.
- **Pass:** Phone B asks for the recovery secret and says it was signed out on another device; after signing in and unlocking with the secret, its records are all there and Export everything works.
- **Record:** pass.

**15e. A Health restore asks first (Session Y, B4).**
- **Do:** on Desktop A, delete the Health section from the cloud (Settings → Your account → section review), then restore it.
- **Pass:** the restore completes; "Sync my Health records with this account" is focused and **not** ticked, with a sentence saying Health sync is off in this tab until you tick it; nothing about Health is uploaded until you tick it.
- **Record:** pass.

**15f. The cloud's vault older or missing (Session Y, B6 and B3): not run by hand.**
- **Why:** no action in the app makes it happen. "Delete cloud data" ends the account's cloud for good (every later call
  answers 410, so no new vault can be made on that account); the one cause is a restore of the sync service from an
  earlier copy (the recovery runbook), after which another device may make a new vault.
- **Proof instead:** Miniflare, `scripts/run11/older-vault-recovery.test.mjs` (storage copied, vault rotated, copy
  restored, new vault enrolled, the rotated device refused with nothing changed, then re-linked), and the component
  test `apps/web/lib/vault-sync-rules-y.test.ts` (the notice, no "Create" button, the confirmation before either action).
- **Record:** skipped (not runnable by hand).

**15g. ZIGi on the Stage 8 stack (Session X-Local).**
- **Do:** open ZIGi on Desktop A and Phone B; ask "What are my habits today?" with no AI connected.
- **Pass:** a local answer from your own records, nothing sent anywhere; the launcher rests clear of the first screen's buttons; under Motion Off it is a still image; Settings → ZIGi · your AI shows every auto-accept switch off.
- **Record:** pass.

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
- **Also (merged from FINAL_ACCTEST_REDEPLOY; Session S Part 1):** once the lifecycle Worker serves, the fictional user disappears from Supabase → Authentication → Users within about a minute. If it stays, the identity deletion is pending: check the lifecycle secret's key format.
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
