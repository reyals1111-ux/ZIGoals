# PR 1 (fix/session-p-2026-10-03) review screenshots

Taken on 2026-10-03 from the branch's production build (Chromium 141 standing in for Chrome), never merged.

- `help-invite-only-question-{desktop,phone}.png`, `help-full-{desktop,phone}.png`: Help with the new question
  "I asked for a code and ZIGoals said it's invite-only", opened.
- `settings-invite-only-{desktop,phone}.png`, `settings-invite-only-panel-{desktop,phone}.png`: the account panel after
  asking for a code with an uninvited address (route fixture answering the relay's 403 INVITE_ONLY).
- `landing-hero-{desktop,phone}.png`: the landing's first screen at 1440 × 900 and 390 × 844 with the re-encoded hero.
- `landing-hero-before-65538B.webp` and `landing-hero-after-q85-54908B.webp`: the previous and the shipped hero file;
  `landing-hero-before-after.png` side by side (before left), `landing-hero-before-after-crop-3x.png` a 180 × 180 px
  region of each at 3×. PSNR of the new file against the previous one: 39.2 dB. The owner's eyes decide; the previous
  file is one revert away.

Phone LCP (Lighthouse's mobile throttling, 8 runs each, ms): before 2,376 2,376 2,388 2,400 2,408 2,428 2,460 2,584;
shipped 2,348 2,348 2,356 2,364 2,364 2,368 2,372 2,432.
