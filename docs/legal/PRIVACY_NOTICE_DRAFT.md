# ZIGoals privacy notice: DRAFT, for lawyer review, not legal advice

> **Status.** DRAFT, for lawyer review, not legal advice. Written by Session L on 2026-10-02 from [docs/PRIVACY.md](../PRIVACY.md) and the code (sources at the end). It is **not published in the app** (owner decision L4): the app keeps today's wording until a lawyer has reviewed this. Text in **[square brackets]** is for the owner or the lawyer to fill in or decide. Nothing here may promise more than the product does: no encryption on the device, no anonymity, and no "permanent erasure everywhere".
>
> Two states are described. **Today** is the public Alpha: no accounts, and everything stays on the device. **Once accounts open** describes email sign-in and encrypted sync, available only after the owner activates them (Stages 7 and 8 in [docs/run11/ACTIVATION.md](../run11/ACTIVATION.md)). Optional providers (prices, barcode lookup) apply only while the owner has switched them on.

---

## Who we are

ZIGoals is run by **[owner: legal name, address and, if required, representative]**. Privacy questions and requests: **hello@zigoals.app**. General feedback: contact@zigoals.app.

## The short version

- Everything you enter is kept **on your device**, in your browser. It is **not encrypted there**, so keep your device locked.
- We have **no ads, no trackers and no app analytics**.
- **Once accounts open,** encrypted sync is **off until you turn it on**. When it's on, your data is **encrypted on your device before it leaves**. Our server stores that encrypted data plus the details it needs to deliver it. We **cannot read** your plans, habits or health entries.
- **Health** syncs only if you separately agree.
- Your **recovery secret** never leaves your device. We cannot recover your data without it, and signing in by email does not recover it.
- A few optional features ask outside services for **public information only**: a price for a public asset, or a product for a barcode.

## 1. On your device (today and later)

ZIGoals stores your Goals, Wealth positions and plans, Habits, Health records (foods, meals, weight, activity, targets), Today preferences and a local testnet history in your browser's storage on your device.

- **Not encrypted at rest.** Anyone who can use this browser profile, a malicious browser extension, or compromised code on our site could read or change it. Locking the app does not change this.
- **Each website address and each installed app keeps its own copy.** On iPhone, the Home Screen app has storage separate from Safari.
- **Clearing this site's data in your browser deletes it from this device.** It does not remove anything already sent to a public blockchain.
- **Showcase** (demo data) lives in the current tab only and is separate from your records.
- **Exports** you download are files you control. Readable exports are **not encrypted** and contain personal data. Encrypted backups are protected by their own separate secret.
- **The Guide (optional).** If you turn it on in Settings, the Guide reads your records on this device only and shows short notes built from them. It uses no service and sends nothing anywhere; its switch and the notes you dismissed are kept on this device.

## 2. Accounts and encrypted sync (once accounts open)

**Signing in.** You sign in with a one-time code sent to your email.
- **Supabase** (authentication provider) receives your email address. It creates and checks the code and keeps your sign-in identity.
- **Resend** (email delivery) delivers the code email, so it receives your address and that message. [Owner: confirm open and click tracking are off, as ACTIVATION recommends.]
- To slow down abuse, our admission service keeps short-lived counters. They are keyed by a keyed hash (HMAC) of your email address and of your network address group, and their windows last up to 24 hours.
- Your session is held in secure, HttpOnly cookies. Our server keeps:
  - a hash of each session token;
  - its creation time;
  - the device name you choose (default "This browser"),

  so you can see your sessions and revoke them. Revoking a session blocks future access. It does not remove data already downloaded to that device.

**Encrypted sync** is never on by default. You turn it on yourself; it's offered right after you sign in.
- **Encryption.** Your device encrypts your records before sending them. Only your recovery secret, which never leaves your device, can unlock them. We cannot read their content.
- **What our server (Cloudflare) stores and sees:**
  - the encrypted data;
  - your account and vault identifiers, and record identifiers;
  - sizes and times;
  - which part of the app a record belongs to: Goals and Wealth, Habits, Health or settings.

  This is **not metadata anonymity**.
- **Health is synced only after a separate opt-in.** Turning Health sync off later does **not** delete encrypted Health copies already stored. [Lawyer: the "which part of the app" detail can show that someone keeps Health records, though not what they say. Health data may be special-category data.]
- **Remember on this device (optional).** When you tick it while unlocking, your browser stores a key on this device so your account opens here without the recovery secret, until you lock it or choose Forget this device. That key stays on your device and is never sent to us. Anyone who can use that device can then open your account records too. It is ticked for you only in the app installed on your Home Screen. [Lawyer: describe this as local storage of a device-bound key under the device-storage section too.]
- **Reminders while the app is closed (optional, per device).** In Settings → Reminders when closed you can turn on, for one device, a notification when a reminder time passes while the app is closed. It is off until you do, and needs you to be signed in. On iPhone it works only in the app saved to the Home Screen.
  - **What we receive and store:** the address your browser hands out for push messages and the two keys that encrypt them; your time zone and quiet hours; your reminder times as times of day with weekdays (up to 20); a mark per sent reminder and day; counters. Never a habit's name, a count or anything you record. Every message carries the same encrypted, fixed content, and the only text shown is "ZIGoals: A reminder from ZIGoals".
  - **What the push service receives:** the platform that delivers notifications to your device (Apple, Google, Mozilla or Microsoft, depending on your browser) receives the encrypted message and sees that one was sent to your device at that time, not what it says. [Lawyer: their role for this delivery.]
  - **How long:** while your device keeps refreshing it (the app does so about once a day while you use it). A device that has not refreshed for 30 days is deleted. See section 5.
  - **How to turn it off:** Settings → Reminders when closed → "Turn off and delete from the server" deletes this device's data at once. Signing out does the same for that device. "Revoke other sessions", deleting your cloud records and deleting your account delete all of it.
  - [Lawyer: the subscription and the small push-only service worker are stored on the device only after the person's explicit request. ePrivacy Art. 5(3): consent, or a service "explicitly requested"? See LEGAL_CHECKLIST §2, question 9. A water reminder's existence is a fact about the person's health habits.]
- **Recovery.** If you lose your recovery secret and every device that can open your account, your synced data cannot be recovered by anyone, including us. Access to your email does not recover it.

## 3. Optional services that receive public information only

These run only while we have switched them on, and only when you use the feature. Requests go through our server, so the provider sees our server rather than your device.

- **CoinGecko (prices).** Receives the public asset you picked, the quote currency and, for charts, the time range. **Never** your amounts, allocations, Goal names or IDs, wallet address, Habits or Health records. Combinations and timing of public asset choices can still hint at interests. To share price capacity fairly, our price service counts requests per network address group under a pseudonym: it keeps only a keyed hash (HMAC) bucket for each day, under a key it replaces daily, never your address, deletes it after about 48 hours and uses it only for abuse limits.
- **Open Food Facts (barcode lookup).** Receives **only the barcode number** you confirmed. The camera picture stays on your device. Our server keeps the product answer for up to 24 hours, keyed only by the barcode.

**Wallets and the test network.** If you connect a wallet such as Keplr, the app sees the public account you approve. Public ZIGChain services you query can see your IP address and the public account, contract or transaction you ask about. Anything confirmed on a blockchain is public and generally cannot be erased.

### Your own AI, if you connect one (ZIGi · your AI, optional)

ZIGi is a chat inside the app that uses an AI provider **you** choose and pay: an API key of yours (OpenAI, Anthropic, Google Gemini, xAI, OpenRouter), a model on your own computer, or OpenRouter's sign-in. It is off until you connect it. When you send a message, your browser sends your words, the data of the page you are on (only for pages you leave switched on; Health is off unless you switch it on separately) and your own instructions **directly to that provider**, never through our servers. We do not see, store or log these conversations; what the provider does with them is governed by **your** agreement with the provider. Your key stays on your device; chats stay on your device. You can turn ZIGi off, delete the chats and remove the key at any time in Settings. If you use the microphone, either your browser's speech service (Chrome: Google unless on-device recognition is available; Safari: Apple) or your provider receives the audio; the app says which before the first use. ZIGi never changes your records on its own and cannot move money.

## 4. Hosting

Our host, **Cloudflare**, receives ordinary web requests. That includes your IP address, browser details and the page addresses you visit; a goal page's address contains that goal's identifier, but not its name or amounts. Cloudflare keeps infrastructure logs and aggregate statistics under its own terms. Cloudflare may add network error-reporting headers, which are separate from ZIGoals. We add no tracker. [Lawyer: Cloudflare's role and terms.]

## 5. Keeping and deleting

- **On your device:** until you delete it or clear this site's data.
- **Cloud records (once accounts open):** Settings → Account deletion ("Delete cloud records").
  - It removes the active encrypted records from our server and stops your other devices from re-creating them.
  - You can also choose to delete your email sign-in identity at the provider.
  - It does **not** erase copies already on your devices, or files you exported.
  - Encrypted copies can remain in our host's 30-day recovery history. We keep a minimal deletion record (account identifier, dates, which sections) so deleted data cannot come back. (Session U, FINDINGS Q-PRIV-01; for the lawyer: the record's retention, LEGAL_CHECKLIST.)
- **Deleting one synced part:** you can delete a single part, such as Health, from the cloud. Your local records stay on your device.
- **Push reminders (once accounts open):** a device's push data is deleted when you turn reminders off on that device, when you sign out there, when you delete your cloud records or your account, and by itself after 30 days without opening the app on that device.
- **Fixed retention periods** for sign-in records, session records and abuse counters are **not yet set**. [Owner and lawyer: set them; ACTIVATION.md has the operating limits.]

## 6. Security

We use HTTPS and a strict content security policy. Synced data is end-to-end encrypted, with keys that stay on your device. No system is perfectly secure, and these measures do not protect data on a device someone else can use, or from a hostile browser extension. Please report problems privately to **hello@zigoals.app**. Never include codes, your recovery secret, or personal money or health details.

## 7. Your rights

[Lawyer: rights under the applicable law (for example access, correction, deletion, portability and objection), how to exercise them, and the right to complain to a supervisory authority.]

Note for the lawyer: we cannot read synced content, so many requests are best served by the in-app tools: exports, section deletion and account deletion.

## 8. Children

[Lawyer: minimum age and wording.]

## 9. Changes

[Lawyer: how changes are announced, and the date of this version.]

---

## Questions for the lawyer and the owner

1. **Who is the controller?** Name, address, and whether a representative is needed. Which law applies (for example GDPR or UK GDPR)?
2. **Legal bases** for each purpose: the device-only app; sign-in; sync; abuse counters; optional providers; hosting logs.
3. **Processor agreements and international transfers:**
   - **Processors:** Supabase, Resend and Cloudflare (sync storage and hosting).
   - **CoinGecko and Open Food Facts:** they receive only public identifiers, through our server. What is their role?
   - **Regions:** each provider's region (ACTIVATION.md asks the owner to choose them).
4. **Health data.** Health content is end-to-end encrypted and opt-in, but metadata can show that Health records exist. Is explicit consent wording needed, and is the current separate tick enough?
5. **Retention periods:** for sign-in identities, session records (hash, time, device name), abuse counters and provider logs.
6. **Device storage and consent.** Storage on the device is used only to run the app. Does it need a consent banner under the applicable ePrivacy rules? (The app has no trackers or analytics.)
7. **Age limit** for the Alpha.
8. **Publication:** where the final notice is shown in the app (for example Help or Settings) and how friends are told before accounts open.

9. **ZIGi · your AI (added 2026-10-05, [ADR-012](../architecture/ADR-012-your-ai.md)).** The person sends their own data from their browser to a provider they chose and contract with; ZIGoals never receives it. Is ZIGoals a controller, a processor, or neither for that transfer? Does the notice need to name the five providers and link their terms? What must be said about Health data when the person turns "Include Health" on, and about the browser speech services (Google, Apple)? Does "Premium · free during Alpha" create a consumer-law expectation? See [LEGAL_CHECKLIST §8](../business/LEGAL_CHECKLIST.md).

## Sources in the repository (2026-10-02)

| Statement | Where it comes from |
|---|---|
| Device storage, not encrypted at rest; per-origin copies; exports; Showcase; hosting and wallet notes | [docs/PRIVACY.md](../PRIVACY.md) |
| Ciphertext plus account, vault, record identifiers, sizes, timing and domain metadata; Health opt-in; Health copies kept after opt-out; keys in memory | [docs/PRIVACY.md](../PRIVACY.md) (Run #10 addendum); `apps/web/lib/vault/` |
| Encrypted on the device; the recovery secret wraps a random vault key and is never sent to the backend; email cannot recover it | [docs/run10/SYNC_SECURITY_AND_RECOVERY.md](../run10/SYNC_SECURITY_AND_RECOVERY.md) |
| Supabase email code, Resend delivery, tracking off recommendation | [docs/run10/OWNER_ACTIVATION.md](../run10/OWNER_ACTIVATION.md); [docs/run11/ACTIVATION.md](../run11/ACTIVATION.md) |
| Abuse counters: HMAC of email and IP group, windows up to 24 h | `workers/auth-abuse/worker.mjs` (RULES, hash) |
| HttpOnly session cookies; session records with token hash, device name and time | `apps/web/lib/server/private-account.ts`; `workers/private-sync/sessions.mjs` |
| CoinGecko request contents | [docs/PRIVACY.md](../PRIVACY.md); `apps/web/lib/market-assets.ts` |
| Open Food Facts: barcode only, product answer cached up to 24 h by barcode | `apps/web/app/api/food-lookup/route.ts`; `workers/food-lookup/worker.mjs` |
| Account deletion, provider identity option, what it does not erase | `apps/web/components/account-deletion.tsx` |
| Section deletion keeps local records | `apps/web/components/vault-sync-controls.tsx` (message "Cloud section deleted. Local records were kept.") |
| Separate Home Screen storage on iPhone | [docs/friends-alpha/IOS_STORAGE.md](../friends-alpha/IOS_STORAGE.md) |
| Push reminders: what is stored, the fixed text, retention and deletion (added 2026-10-04) | `workers/push-reminders/worker.mjs`; `apps/web/public/push-sw.js`; `apps/web/lib/push/device.ts`; [docs/architecture/ADR-010-push-reminders.md](../architecture/ADR-010-push-reminders.md) |
| The Guide reads records on this device only (added 2026-10-04) | [docs/architecture/ADR-011-coach.md](../architecture/ADR-011-coach.md) |
