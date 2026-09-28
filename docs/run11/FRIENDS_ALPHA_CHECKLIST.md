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
