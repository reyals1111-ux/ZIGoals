# Friends Alpha: owner acceptance checklist

Short, tickable version of Stage 8 ("Real acceptance and private recovery") in [ACTIVATION.md](ACTIVATION.md). Do it only after Stages 1–7 are done on the isolated, activated services. It is not a substitute for them.

**Setup**
- [ ] Use fictional data only: no real names, finances or health records.
- [ ] Two inboxes you control (A and B). Never a friend's address.
- [ ] Two devices: a desktop browser and a physical phone. No emulator.
- [ ] Note the exact app commit and Worker versions under test.
- [ ] Keep a written log: date, device, step, pass/fail. Screenshots must not show codes, secrets or email addresses.

**Sign-in (inbox A, desktop)**
- [ ] A wrong code is rejected.
- [ ] An expired code is rejected.
- [ ] A reused code is rejected.
- [ ] Requesting codes too fast shows the cooldown.
- [ ] Sign-out works, and the old session is refused afterwards (revocation).

**Vault and sync (A on desktop and phone)**
- [ ] Create the vault. Save the recovery secret offline, away from the devices.
- [ ] Attach existing local data on one device.
- [ ] Goals, Wealth, Habits and settings sync both ways between desktop and phone.
- [ ] Health syncs only after you explicitly allow it, and stops when you withdraw consent.
- [ ] Edit on both devices while one is offline. Reconnect. The conflict review appears and keeps both versions.
- [ ] A correction and a funding entry replay once, never twice.
- [ ] The vault locks after inactivity. Switching to account B shows none of A's records.

**Keys and deletion**
- [ ] Rotate the vault key. Save the new recovery secret first. The old key is refused afterwards.
- [ ] Delete one section in the cloud. Local records stay, and nothing restores without review.
- [ ] A stale device (not used since rotation or deletion) is refused.
- [ ] An encrypted backup restores on a clean browser profile.

**Phone-only**
- [ ] Camera permission prompt, then cancel: the manual food entry still works.
- [ ] Scan a physical barcode.

**Providers and recovery**
- [ ] One real, bounded market refresh works and stays within the configured budget.
- [ ] Hosted lifecycle recovery / point-in-time restore works as a separate exercise.

**Before inviting friends**
- [ ] Record sanitized, source-bound receipts: commit, versions, pass/fail, no personal data.
- [ ] Recheck account-wide quotas and usage (Cloudflare, Supabase, Resend, CoinGecko).
- [ ] Decide the friend count and a stop rule if usage or errors rise.

## 14 Nov 2026 (Session AP): new checks for this release
Do these on the build you will invite friends to (after PR #101 and #102 are merged and deployed; see [OWNER_STEPS.md](../friends-alpha/OWNER_STEPS.md)). Use a fresh browser profile unless a line says Showcase. Computer lines at about 1440 px wide, phone lines on the physical phone.

**Send feedback**
- [ ] Help → Send feedback: tick "Add details about this device to the email". The box shows browser, system, window, motion, installed app, time zone, app version, theme and screen size. Nothing else: no account, device id or records.
- [ ] "Copy these details" says "Copied. Paste it wherever you write to us." and the paste matches the box. With the box emptied it says "There is nothing to copy: the details are empty."
- [ ] "Email feedback to contact@zigoals.app" opens your mail app; nothing is sent until you send it there.
- [ ] Phone: Settings lists "Send feedback".

**Your first five (fresh profile)**
- [ ] Finish the short setup. Today shows "YOUR FIRST FIVE" / "Five small steps, about two minutes." with "1 of 5 done".
- [ ] Add a goal, a habit, a meal and a money record from its links. Each ticks itself; the card leaves when all five are done.
- [ ] In a second fresh profile, "Not now, hide this" hides it, and it stays hidden after a reload. It never shows in the Showcase.

**Settings folded (computer)**
- [ ] Settings opens with every group folded (heading and one line). Open two groups, reload: the same two are open.
- [ ] "Open all" opens every group, then "Fold all" folds them. A deep link (for example `/app/settings#day-goal`) opens its own group.
- [ ] Phone: Settings keeps its own list (unchanged).

**Bento (computer)**
- [ ] On Today, Goals, Habits, Health and Wealth, "Layout: List · Bento" sits in the page header. Bento shows the same cards as tiles; Today's hero and slogan look the same in both.
- [ ] Each page remembers its own choice after a reload. Phones show no switch.

**Launchers stepping aside (computer)**
- [ ] Showcase, Today at 1440 px: scroll down. When ZIGi, Music, the Checklist or the Earn dock would cover the right column, they slide toward the edge, without flicker. Pointing at one, or tabbing to it, brings it back. Focus never jumps.
- [ ] With Motion Off (or reduced motion), they swap at once, with no slide. Your own "tuck away" choice still wins. Phones: no change.

**A day counts as done at N**
- [ ] Settings → Your app → "A day counts as done at": "Every dot (default)" is chosen. Choose 4: the line says "From today, a day counts as done at 4 dots (or every dot on a shorter day)."
- [ ] With six planets today, light four: the Checklist says "4 of 6 planets today" and the streak flame lights (its label says "today complete"). Earlier days in the streak do not change.
- [ ] Back to "Every dot": the line says "A day counts as done when every dot is lit."

**Also new (Session AO)**
- [ ] Settings → Your app → "My day ends at": midnight is the default; choose 2:00 and read the line under it. The clock cases (Brussels and Tokyo) are proven by `apps/web/tests/ao/day-ends.spec.ts`; set it back to midnight.
- [ ] Habits → Perfect days opens; Wealth → "Your wealth over time" shows lines by source; the goal creator's template search finds goals (130) and the habit form's finds habits (122).

**Weather proxy (only if you deployed it)**
- [ ] [WEATHER_PROXY_ACTIVATION.md](WEATHER_PROXY_ACTIVATION.md) step 3 passes: a second nearby request says `x-weather-cache: hit`, another origin gets 403, the 61st request in a minute gets 429.
- [ ] The app does not call it yet (the NOVA lane wires the client later). Nothing to check in the app.

**Before inviting friends (added)**
- [ ] The hosted verifier passes on the deployed build (`EXPECTED_COMMIT=<SHA> node scripts/verify-hosted-alpha.mjs <new dir>`): 12 stages, or 13 with PR #101 (NOVA).
- [ ] Write the stop rule down before the first invite (OWNER_STEPS.md, step 12).
