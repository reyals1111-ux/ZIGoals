# Session L review screenshots (never merged)

Screenshots for [PR #59](https://github.com/reyals1111-ux/ZIGoals/pull/59), taken on 2026-10-02 from a local production build (`PUBLIC_ALPHA_UNDEPLOYED`) of the PR commit given in the PR comment. Chromium stood in for Chrome, at desktop size (1280×720) and as a 390 px iPhone 13 descriptor, with reduced motion.

**About the encrypted-sync offer screenshots.** The offer is visible only once accounts are activated (Stage 7/8). These screenshots use the same local fixtures as `tests/sync-offer-card.spec.ts`: sign-in answers come from a fixture, and no email was sent. They are not device screenshots and make no hosted claim.

| File | Shows |
|---|---|
| `01-sync-offer-*` | The offer right after sign-in on a new account: both choices, and Health as its own unticked choice |
| `02-sync-offer-health-ticked-*` | The same offer with Health ticked |
| `03-turn-on-next-step-*`, `04-turn-on-with-existing-secret-box-*` | After "Turn on encrypted sync (recommended)": the next step, and the existing recovery-secret box ("I saved" is not ticked) |
| `05-settings-reminder-*`, `06-settings-reminder-context-*` | After "Not now": one reminder line in Settings → Account & sync |
| `07-sync-offer-new-device-*` | A device new to an existing vault: "Bring this device up to date" |
| `08-settings-help-link-*` | Settings with the one link to Help |
| `09-help-*` | The whole Help page |
| `10-install-guide-*` | Install on iPhone, with "Keep my data on this device" |
| `11-help-questions-*` | The questions, with one opened |
| `12-home-screen-icon-preview.png` | A preview built from the icon files, **not a device screenshot**. The real look is checked on the owner's iPhone (run-sheet step 9) |
