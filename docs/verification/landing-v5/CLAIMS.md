# Landing V5 — claims

Every factual claim the V5 page makes, matched to its evidence on `main` at `57275a6` (Alpha deploy #23 source) on
2026-10-02. Claims V5 keeps unchanged from V4 keep their rows in
[`../landing-v4/CLAIMS.md`](../landing-v4/CLAIMS.md); they were re-read against this base and still hold. Editorial and
brand language (slogans, "Shape & Fold Your Own Future", the equation as a philosophy) is not a capability claim.

Verdicts: **holds** (evidence in this repository or read today), **owner decision** (wording the owner approved on
2026-10-02, recorded in the Session N plan), **not device-tested** (true per the source named, but not tried on that
device in this session).

## The five sensitive boundaries (unchanged text, re-checked)

| boundary | the page says | evidence on `57275a6` | verdict |
| --- | --- | --- | --- |
| Audit status | "The public Alpha is unaudited." | `SECURITY.md`: "ZIGoals is an unaudited alpha." | holds |
| Financial execution | "Public Alpha / Financial execution disabled"; "Financial signing and broadcasting are disabled" | `apps/web/lib/app-environment.ts`: `FINANCIAL_EXECUTION_ALLOWED = APP_ENVIRONMENT === "TESTNET_DEPLOYED"`, and the public Alpha builds with `PUBLIC_ALPHA_UNDEPLOYED`; `assertFinancialExecutionAllowed()` throws "Financial actions are unavailable in this build." | holds |
| Goal Manager | "the Goal Manager contract is not deployed"; What's coming: "Today the Goal Manager contract is not deployed." | `docs/STATUS.md`: "Goal Manager / Code ID remain **NOT DEPLOYED**" | holds |
| Mainnet | "Mainnet financial execution is disabled." | same flag: only `TESTNET_DEPLOYED` allows financial actions | holds |
| Accounts and sync | "NOT ACTIVE YET · COMING WITH THE FRIENDS ALPHA" (two privacy rows, FAQ) | `docs/friends-alpha/FRIENDS_GUIDE.md`: "Accounts and encrypted sync are only available after Stage 7/8 activation"; `docs/STATUS.md` (Session L): Stage 8 rehearsal only, no activation | holds; the badge wording is an owner decision |

## New in V5

| the page says | where | evidence | verdict |
| --- | --- | --- | --- |
| "Request an invite to the friends Alpha" opens an email to contact@zigoals.app with the subject "Friends Alpha invite" | hero, final call, FAQ | owner decision N1 (`mailto:contact@zigoals.app?subject=Friends%20Alpha%20invite`); contact@ is already the app's feedback address (`docs/friends-alpha/FRIENDS_GUIDE.md` §6) | owner decision |
| "We reply by email, and invites go to a small group of friends first." | hero, final call, FAQ | owner decision N1 ("a reply by email; a small group") | owner decision |
| "The public Alpha stays open to everyone in the meantime." | FAQ | the public Alpha is live at alpha.zigoals.app (deploy #23, `docs/STATUS.md`); the header and hero still link it | holds |
| Records "stay in the browser on the device you use. No account is needed. What's stored there isn't encrypted and isn't a backup, so lock your device." | Privacy, FAQ | `docs/PRIVACY.md`: "This is local storage, **not encryption**"; FRIENDS_GUIDE §5 "Lock your phone and computer. What's stored on your device isn't encrypted."; V4 FAQ (kept): "No wallet or account is needed for Local Demo." | holds |
| "Export your records or make an encrypted backup file with its own recovery secret. Including Health is your choice." | Privacy | V4's row said the same ("prepare an encrypted backup with a separate recovery secret. Health inclusion is an explicit choice."); FRIENDS_GUIDE §4: "Settings → Keep a protected copy … makes an encrypted backup file" | holds |
| "After you sign in with a code sent to your email, your records are encrypted on your device before they leave it." | Privacy, FAQ | FRIENDS_GUIDE §2: "sign in with a code sent to your email"; `docs/PRIVACY.md`: "The browser encrypts private domain snapshots before transmission" | holds (once sync opens) |
| "The server stores encrypted copies and sees your account, record identifiers, sizes and times, not what you wrote." | Privacy, FAQ | `docs/PRIVACY.md`: "The server receives ciphertext plus account, vault, record identifiers, sizes, timing and domain metadata; this is not metadata anonymity." | holds; the page names the parts a reader would recognise and does not claim metadata anonymity |
| "Health syncs only if you choose it." | Privacy, FAQ | `docs/PRIVACY.md`: "Health upload/decryption requires a separate opt-in."; FRIENDS_GUIDE §2 | holds |
| "Sync shows you a long recovery secret once. Keep it in a password manager. If you lose it and every device, nobody can recover the cloud copy, including us." | Privacy, FAQ | FRIENDS_GUIDE §3: "ZIGoals shows you a long **recovery secret**, once. Save it in a **password manager**." and "Lost the secret and every device? Then the data can't be recovered by anyone, including us." | holds |
| iPhone: "In Safari … tap Share, then Add to Home Screen. The Home Screen app keeps its own data, so start there." | Install, FAQ | `docs/friends-alpha/IOS_STORAGE.md` §2, VERIFIED: Apple WWDC23 session 10120, "Home Screen web apps have … separate cookies and storage from the browser."; the in-app Help (`apps/web/components/help/install-guide.tsx`) gives the same steps | holds |
| Mac: "In Safari … choose File, then Add to Dock." | Install, FAQ | in-app Help (`install-guide.tsx`): "on a Mac: File, then Add to Dock" | holds per the in-app Help; not device-tested |
| "Chrome, Edge or Android: … choose Install in the address bar or the browser menu." | Install, FAQ | owner decision N10 allowed this line only if Chrome reports no installability errors. A production build of `main` (`PUBLIC_ALPHA_UNDEPLOYED`, `next start`), checked with CDP `Page.getInstallabilityErrors` in Chromium 141.0.7390.37 with a persistent (non-incognito) profile, returned `[]` (an incognito context returns only `in-incognito`). The manifest (`/manifest.webmanifest`) has `display: standalone`, `start_url: /app` and 192, 512 and maskable 1024 px icons | holds for Chromium; Edge and a real Android device not tested |
| What's coming: "Staking from your own wallet", "Stablecoins", "On-chain Goals", each "PLANNED · NOT AVAILABLE", with "Not available. Not financial advice. Subject to legal review." | What's coming | owner decision N2 (generic items, no project names, no dates or rates, plus the legal line). The one-line descriptions say only how each would work if built (your own wallet, every step signed by you; only once a reviewed contract exists) | owner decision |
| "No. ZIGoals is an independent project." (affiliation) | FAQ | QA2-05: the V4 answer called ZIGoals "the Goal Layer for ZIGChain", a positioning phrase that reads like an official role; removed. The rest of the answer is unchanged | holds |
| "Until sync opens, records stay on the device where you entered them." | FAQ | accounts and sync not active (boundary row above) | holds |

## Images

The 19 product captures were refreshed from `main`'s Showcase with every `/api/**` call answered by a local 503 (method
in [`ASSET_MANIFEST.md`](ASSET_MANIFEST.md)), so the captions stay literally true: "Fictional Showcase records · no real
funds", "Quotes unavailable during capture · no invented prices" (the Markets cards read "Price unavailable") and
"Fictional manual positions · no wallet observation" (the Staking page's Tracked crypto cards read "SHOWCASE DATA ·
fictional manual example, no wallet observation"). Each alt text was re-read against its new image and still
describes it.

## Words the page does not use

No "earn", APR, APY, TVL, yield, "rewards" as a product promise, returns or "partner(ed)/integrated" as a
relationship. The page keeps three negations that name these ideas in order to deny them: "Never a promise of financial
return", "Listings are information, not partnerships or endorsements" and the affiliation answer ("do not imply
official affiliation, a partnership, endorsement, or a security audit"); the ecosystem capture shows the app's own
"An ecosystem listing is not a ZIGoals partnership, endorsement or security audit." `landing-v5-security.spec.ts`
enforces the list.
