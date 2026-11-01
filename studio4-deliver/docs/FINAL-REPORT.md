# ZIGi Studio-4 — final report (2026-11-01 17:10)

## What was made
- LOOK v-final (v4), owner-approved at STOP 2 (31 Oct 02:00): Studio-2's ZIGi + four additive layers (arm/hand fur, eye socket/catchlight, readable mouth, render quality). No mesh, rig, gradient, light or world change; the main fur system byte-identical.
- Colour lock to v1: 12 of 13 regions pass (the open mouth fails its line by design).
- Clips: 51 authored and baked (25 states incl. the 14 new own clips, 8 extras incl. X030 cheer, 13 reactions, 5 variants); motion QA 51 pass, 0 fail; logged allowances: R013 (3 landing frames with a minor arm/body contact, to polish later) and the per-clip accel limits of DECISIONS #26.
- Rendered 3557 production frames in 32.0 GPU-hours at 1920x2528 (size test: 960x1264 10.2 s/f; 1440x1896 19.2 s/f; 1920x2528 32.5 s/f).
- Fur in motion (internal check): F001 loop mean frame delta 4.88/255, seam 1.56/255, the frames over twice the median ([23, 24, 25, 26, 27, 28, 29, 98, 99, 100, 101, 102, 103]) are the two whole-body weight shifts of the idle: no popping, no stretching (DECISIONS #30).
- Encoded 51 clips: stills 1x/2x/large, animated 96x126 + APNG, the 192x253 set, the quality ladder, VP9-alpha WebM, review MP4s; over today's budgets: none.
- Delivery: deliver/app (255 files, importer patch) and deliver/app-swap-now (229 files, zero code change), app-2x-anim, quality-ladder, videos, extras/reactions/variants, push, marketing, look, companion, lab, review, docs, tools; SHA256SUMS + RECEIPT.md per folder; verify_delivery.py = the importer rules in Python.
- Marketing (deliver/marketing): the NEUTRAL and proud heroes at 3072x4032 (1024 spp, stage + transparent) and the 11 s 1080x1422 chain clip F004 -> T001 -> F005 -> F001 with motion blur (DECISIONS #52).
- Companion: rules.json (single source), actions-studio4.json, controller.mjs (+ hide, reactions, variants), controller.test.mjs run with Node v26.13.0, controller_ref.py (Python mirror) and the Lab self-test on the same scenarios.json.

## Owner decisions honoured
- Correction 4 scope cut: hands/feet/body geometry frozen to Studio-2 (master hash verified), G5 and the lighting redesign cancelled, max two attempts per look item.
- STOP 3 cancelled: the acting track, previews, render, encode and delivery ran autonomously; failed QA after two attempts shipped as the best passing version and is listed in the handoff.
- The 80 GPU-hour budget and the 60 h rule for the app-set resolution (decision in qa/size-test.txt).

## Where to look
- Review page: http://127.0.0.1:8771/review/ and http://100.124.130.11:8771/review/ (summary table, Studio-2 vs Studio-4 players, ladder, sheets, look history).
- docs/INTEGRATION-HANDOFF.md, docs/IMPORTER-PATCH.md, LOOK-BIBLE.md, DECISIONS.md (every decision, download, licence, revert), STATE.md, checkpoints/current/.

## Open items for the integration session
- Apply the importer constants (14 states, loop codes, extras/variants slots; optional 192x253 animated set with a new budget).
- Add the ten proposed reaction events and the variant rotation; set the optical offset from the measured centroid (handoff section 5).
- Decide the budgets from the ladder; produce the HEVC-alpha MOVs on macOS with tools/mac-hevc-alpha.sh.
- Nothing is marked OWNER_APPROVED or INTEGRATION_TESTED by the studio.
