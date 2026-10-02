# iPhone and Safari: how long data stays, and what ZIGoals does about it

Session L research, 2026-10-02. It answers four questions for the friends Alpha. Every finding names its official source and the date it was read.

- **VERIFIED:** read today in the official source quoted.
- **UNVERIFIED:** the only official source is blocked from this session's network, so it was not read. Do not rely on it.

**Network limits:** this session's network policy blocks webkit.org, developer.mozilla.org, w3.org, whatwg.org and support.apple.com (HTTP 403 from the proxy). Instead:
- MDN pages were read from MDN's official source repository, `github.com/mdn/content`, and its compatibility data, `github.com/mdn/browser-compat-data`.
- The Storage Standard was read from its official source, `github.com/whatwg/storage`.
- Apple's pages were read on developer.apple.com, which is reachable.

## 1. Can Safari delete a site's data after a while without use?
**Yes. VERIFIED.**
- MDN, "Storage quotas and eviction criteria", section "Proactive eviction": "Safari proactively evicts data when cross-site tracking prevention is turned on. If an origin has no user interaction, such as click or tap, in the last seven days of browser use, its data created from script will be deleted. Cookies set by server are exempt from this eviction."
  - Page: <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>.
  - Read from `mdn/content` on 2026-10-02.
- "Data created from script" includes localStorage and IndexedDB, which is where ZIGoals keeps everything on the device.
- The rule counts **days of browser use**, not calendar days.
- The same MDN page also lists eviction when the device is low on storage (least recently used origin first). That kind skips origins with persistent storage granted (see section 3).
- **UNVERIFIED:** the exact original wording and the list of storage types, from WebKit's 2020 post "Full Third-Party Cookie Blocking and More" (webkit.org/blog/10218; blocked).

## 2. Are Home Screen web apps different, and is their storage separate from Safari's?
**Their storage is separate. VERIFIED.**
- **Apple, WWDC23 session 10120 "What's new in web apps"** (transcript on <https://developer.apple.com/videos/play/wwdc2023/10120/>, read 2026-10-02): "Websites that have been added to the Home Screen on iOS and iPadOS, with the standalone display mode, will become a Home Screen web app. Home Screen web apps have a standalone, app-like experience on iOS, with separate cookies and storage from the browser."
- **Apple, Safari 17.2 release notes** (developer.apple.com, read 2026-10-02): "Added support for copying cookies when saving a website to the Home Screen on iOS and iPadOS."
  - Cookies are copied, so a signed-in session can carry over.
  - Nothing says that other storage is copied. **So records made in Safari do not appear in the Home Screen app.** Step 10 of the [Stage 8 run-sheet](../run11/STAGE8_OWNER_RUNSHEET.md) checks this on the owner's iPhone.
- **Apple, Safari 26 release notes:** "Added support for any website to become a web app on iOS or iPadOS."
- **Apple, Safari 16.4 release notes:** "Added support for third-party browsers to offer Add to Home Screen from the Share menu."

**Whether they are exempt from the 7-day rule: UNVERIFIED.**
- WebKit's 2020 post (blocked here) is widely quoted as saying that Home Screen web apps are not part of Safari and count their own days of use. If so, a Home Screen app that is used is not cleared.
- MDN's page does not say this, and no Apple page read today says it.
- Treat it as likely but unconfirmed.

## 3. What do `navigator.storage.persist()` and `estimate()` do in current Safari?
**Support. VERIFIED.**
- MDN browser-compat-data (read 2026-10-02):
  - `StorageManager.persist()` and `persisted()`: Safari 15.2, with iOS the same;
  - `estimate()`: Safari 17.
- Apple's Safari 17 release notes: "Added complete support for the Storage API", "Added support for StorageManager.estimate()" and "Added support for calculating quota based on disk space."

**What `persist()` means. VERIFIED.**
- WHATWG Storage Standard (read from `whatwg/storage` on 2026-10-02):
  - "persistent buckets cannot be cleared without consent by the user";
  - under storage pressure a user agent "should clear … local storage buckets whose mode is 'best-effort'".
- MDN: "Safari and most Chromium-based browsers … automatically approve or deny the request based on the user's history of interaction with the site and do not show any prompts to the user."
- So a tap gets an answer of true or false, with no system prompt.

**Quotas. VERIFIED (MDN):**
- In Safari, each origin may use about 60% of the disk.
- A site saved to the Home Screen gets that same browser-app quota.
- All origins together may use up to 80%.

**Unknown, and UNVERIFIED:**
- **Whether persistence protects against the 7-day rule.** MDN ties persistence only to storage-pressure eviction. Nothing read today says a granted `persist()` stops the 7-day deletion.
- **Safari's exact rules for granting `persist()`.**

## 4. What this means for ZIGoals
**Today's Alpha: data lives only on this device.**
- **In Safari, without installing:**
  - Goals, Habits, Health and Wealth sit in localStorage and IndexedDB.
  - If someone doesn't open ZIGoals for seven days of Safari use, Safari may delete all of it (section 1).
  - A habit app is usually opened daily, but a holiday is enough.
- **Installed to the Home Screen:**
  - The app keeps its own storage (section 2), and is used as an app.
  - Whether its use is counted separately from Safari's is UNVERIFIED.
  - Either way it is the better home for the data.
- **"Keep my data on this device" (`persist()`)** protects against clearing when the phone is short of space. It is not shown to protect against the 7-day rule (section 3), so the app never claims that.
- **People who started in Safari** find an empty app after installing. Moving their records once is the one case where an optional backup helps: download it in Safari, restore it in the app. Nothing makes backups routine.

**Once accounts open (encrypted sync):**
- The cloud copy is end-to-end encrypted and does not depend on Safari keeping local data.
- If the device copy is cleared (by the 7-day rule, a full phone, a new phone, or deleting the app), the person:
  1. signs in with an email code;
  2. unlocks with the recovery secret;
  3. sync brings everything back.
- Login cookies are set by the server, so the 7-day rule spares them (section 1). The recovery secret is still needed to unlock, because the vault key is kept in memory only.
- **The one thing to keep safe is the recovery secret, ideally in a password manager.** Without it and without any device copy, the data cannot be recovered by anyone.

## 5. Recommended guidance (owner principle)
**For friends** (Help page, and the [friends guide](FRIENDS_GUIDE.md)):
1. **Install ZIGoals on your Home Screen before you start, and open it from there.** In Safari tap Share, then "Add to Home Screen". The app keeps its own copy of your data.
2. **In Help, tap "Keep my data on this device" once.** Your iPhone may then keep ZIGoals' data even when space runs low.
3. **When accounts open, turn on encrypted sync once.** It's offered right after you sign in. From then on every device you unlock stays up to date automatically: no backups, no transfers.
4. **Keep your recovery secret in a password manager.** Your email code signs you in, but only the recovery secret unlocks your data.
5. **Backups are an optional extra safety net,** and the one-time way to move records you already made in Safari into the installed app.

**In the app (Session L):**
- **Help shows the install guide.**
  - It detects only whether ZIGoals runs as an installed app, and whether this is an iPhone or iPad browser that offers "Add to Home Screen".
  - It uses only feature detection, never guesses beyond it, and never shows a nag elsewhere.
- **Help has "Keep my data on this device".** It calls `persist()` only on that tap, and reads `persisted()` without prompting. It shows the honest result: kept, not promised, or not supported.
- **Nothing is written to storage just by viewing.**

**Not done here (follow-ups):**
- **A "remember this device" unlock,** so the recovery secret is not needed after every restart. That is a vault-cryptography change, and an owner decision.
- **Re-checking the two UNVERIFIED items** in sections 2 and 3 from webkit.org, from a network that allows it.

## Sources (all read 2026-10-02)
| Source | Where | Status |
|---|---|---|
| MDN, Storage quotas and eviction criteria | developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria (read from `mdn/content`) | VERIFIED |
| MDN, StorageManager `persist()`, `persisted()`, `estimate()` | developer.mozilla.org/en-US/docs/Web/API/StorageManager (read from `mdn/content`) | VERIFIED |
| MDN browser-compat-data, `api/StorageManager.json` and `css/at-rules/media.json` (display-mode) | github.com/mdn/browser-compat-data | VERIFIED |
| WHATWG Storage Standard | storage.spec.whatwg.org (read from `whatwg/storage`) | VERIFIED |
| Apple, WWDC23 "What's new in web apps" (transcript) | developer.apple.com/videos/play/wwdc2023/10120/ | VERIFIED |
| Apple, Safari 16.4, 17, 17.2 and 26 release notes | developer.apple.com/documentation/safari-release-notes | VERIFIED |
| Apple, "Configuring Web Applications" (Home Screen title defaults to `<title>`; `apple-mobile-web-app-title`) | developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html (archived) | VERIFIED (archived doc) |
| WebKit, "Full Third-Party Cookie Blocking and More" (2020) | webkit.org/blog/10218 | UNVERIFIED: blocked |
| WebKit, "Updates to Storage Policy" (2023) | webkit.org/blog/14403 | UNVERIFIED: blocked |
