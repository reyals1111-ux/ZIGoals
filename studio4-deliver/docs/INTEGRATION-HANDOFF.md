# INTEGRATION HANDOFF — ZIGi Studio-4 (2026-11-01)

Studio-4 delivers Studio-2's ZIGi with the owner-approved LOOK v-final (arm/hand fur, eye, mouth, render quality) and all 25 app states,
the extras, the 13 reactions and the variant pack, as a pure file swap plus constants-only app changes. Nothing here was marked owner-approved
by the studio; OWNER_APPROVED and INTEGRATION_TESTED are the integration session's to set.

## 1. What is in `deliver/`

| Folder | Files | What it is |
|---|---|---|
| `app/` | 255 + reactions.json + SHA256SUMS + RECEIPT.md | every clip in contract shape: stills 1x 96x126, 2x 192x253, large 480x632 (WebP) and the animated WebP 96x126 + APNG fallback; loops encoded with loop count 0, one-shots 1. Passes the importer WITH `docs/IMPORTER-PATCH.md`. |
| `app-swap-now/` | 229 | the subset today's importer takes with zero code change: the eleven states, X001/X010/X011/X020-X022, every still, the one-shot reactions and one-shot new states (accepted, not wired); the loop clips the importer does not list ship stills only here. Run `node scripts/zigi/import-studio.mjs deliver/app-swap-now --receipt deliver/app-swap-now/SHA256SUMS --apply`. |
| `app-2x-anim/` | 102 | the 192x253 animated set under the same names (needs `PIXELS.animated` = [192, 253] and a budget decision). |
| `quality-ladder/` | see ladder.csv | animated 96x126 and 192x253 at 24/16 fps x q90/80/70 (+12 fps q70 and APNG), large stills q85/q95, bytes per file. |
| `videos/` | webm-480, webm-192, webm-96, review-mp4 | VP9-alpha WebM at 480x632 (the sharp one for the Lab and marketing), 192x253 and 96x126, each alpha-verified by decoding (sizes.json alpha_check), and the review MP4s on navy. HEVC-alpha MOV: `tools/mac-hevc-alpha.sh` (macOS, not run here). |
| `extras/ reactions/ variants/` | posters + MP4s | the new slots' clips with their posters (large stills) and review MP4s. |
| `push/` | 3 PNG | notification icon 512/192 and the 96 badge (+ a 24 px check). |
| `marketing/` | stills + chain clip | 4K hero stills (NEUTRAL, proud) on the reflective stage and the 1080p chain clip. |
| `look/ companion/ lab/ review/ docs/ tools/` | | LOOK v-final files and bible, the companion rules/contract/controller/tests, the Lab, the review page, these documents, the encode/verify tools. |

Move it: zip `deliver/` and check every `SHA256SUMS` (`sha256sum -c SHA256SUMS` inside each folder). The importer compares names by basename.

## 2. Sizes and budgets (measured)

Budgets today: 1x 40,000; 2x 100,000; large 200,000; animated 400,000. The 192x253 animated picks assume the proposed cap of 2600000 bytes.

| Code | Clip | Kind | ms | frames | 1x | 2x | large | anim 96 (pick) | anim 192 (pick) | APNG 96 |
|---|---|---|---|---|---|---|---|---|---|---|
| F001 | idle | loop | 5600 | 134 | 9462 | 25818 | 101386 | 341654 (96x126-16-80) | 2356876 (192x253-24-90) | 353957 |
| F004 | listening | loop | 1600 | 38 | 9478 | 26558 | 103490 | 182302 (96x126-24-90) | 669326 (192x253-24-90) | 385473 |
| F005 | speaking | loop | 1600 | 38 | 9464 | 26158 | 99720 | 182560 (96x126-24-90) | 656784 (192x253-24-90) | 379995 |
| F007 | attention | loop | 2400 | 58 | 9494 | 25846 | 100196 | 286938 (96x126-24-90) | 1001358 (192x253-24-90) | 154474 |
| T001 | thinking | loop | 2400 | 58 | 9478 | 20378 | 78432 | 241740 (96x126-24-90) | 862270 (192x253-24-90) | 134515 |
| F010 | reading-your-data | loop | 1600 | 38 | 9460 | 26584 | 103374 | 189900 (96x126-24-90) | 671706 (192x253-24-90) | 386524 |
| F011 | writing-proposal | loop | 1600 | 38 | 9506 | 26592 | 103690 | 187572 (96x126-24-90) | 671270 (192x253-24-90) | 385327 |
| F023 | loading-model | loop | 1600 | 38 | 9484 | 25926 | 101266 | 181804 (96x126-24-90) | 658644 (192x253-24-90) | 380200 |
| F002 | greeting | one-shot | 2500 | 60 | 9534 | 25616 | 97422 | 302616 (96x126-24-90) | 1024368 (192x253-24-90) | 156756 |
| F003 | insight | one-shot | 3000 | 72 | 9454 | 25806 | 96814 | 345338 (96x126-24-90) | 1189074 (192x253-24-90) | 183147 |
| F006 | presenting | one-shot | 3000 | 72 | 9426 | 24718 | 95020 | 345104 (96x126-24-90) | 1192914 (192x253-24-90) | 184916 |
| F009 | celebrate | one-shot | 2500 | 60 | 9478 | 23526 | 88638 | 291762 (96x126-24-90) | 1009546 (192x253-24-90) | 154122 |
| F012 | success | one-shot | 1800 | 43 | 9488 | 25302 | 96540 | 206910 (96x126-24-90) | 731230 (192x253-24-90) | 114886 |
| F019 | wave-goodbye | one-shot | 1400 | 34 | 9482 | 25156 | 95756 | 168382 (96x126-24-90) | 574824 (192x253-24-90) | 336700 |
| E001 | error | one-shot | 4000 | 96 | 9482 | 25136 | 95514 | 359176 (96x126-24-80) | 1664880 (192x253-24-90) | 251793 |
| F008 | sleepy | loop | 6000 | 144 | 9474 | 23880 | 90962 | 356436 (96x126-16-80) | 2452878 (192x253-24-90) | 372295 |
| F013 | proud | one-shot | 2800 | 67 | 9484 | 25750 | 98642 | 328746 (96x126-24-90) | 1155868 (192x253-24-90) | 173988 |
| F014 | curious | one-shot | 3000 | 72 | 9524 | 24960 | 96186 | 339404 (96x126-24-90) | 1219144 (192x253-24-90) | 185563 |
| F015 | surprised | one-shot | 1500 | 36 | 9452 | 23774 | 90568 | 168012 (96x126-24-90) | 577818 (192x253-24-90) | 341480 |
| F016 | confused | one-shot | 3000 | 72 | 9446 | 25566 | 96722 | 348670 (96x126-24-90) | 1210540 (192x253-24-90) | 182304 |
| F017 | empathetic | one-shot | 3500 | 84 | 9484 | 25492 | 96862 | 300498 (96x126-24-80) | 1416294 (192x253-24-90) | 219300 |
| F018 | encouraging | one-shot | 2800 | 67 | 9438 | 25008 | 94230 | 312274 (96x126-24-90) | 1113846 (192x253-24-90) | 171368 |
| F020 | reminder | one-shot | 2400 | 58 | 9468 | 25954 | 99274 | 287142 (96x126-24-90) | 1003680 (192x253-24-90) | 154493 |
| F021 | offline | loop | 4000 | 96 | 9474 | 25822 | 101288 | 360942 (96x126-24-80) | 1696466 (192x253-24-90) | 255381 |
| F022 | peek | loop | 4000 | 96 | 9460 | 26468 | 104542 | 366812 (96x126-24-80) | 1709730 (192x253-24-90) | 250550 |
| R001 | acknowledge | one-shot | 2000 | 48 | 9474 | 26284 | 103288 | 231182 (96x126-24-90) | 843940 (192x253-24-90) | 128670 |
| R002 | unsure | one-shot | 3000 | 72 | 9446 | 24740 | 93974 | 328214 (96x126-24-90) | 1190420 (192x253-24-90) | 183589 |
| R003 | working | loop | 4000 | 96 | 9528 | 25788 | 100358 | 365788 (96x126-24-80) | 1673786 (192x253-24-90) | 251679 |
| R004 | surprised | one-shot | 2500 | 60 | 9480 | 23698 | 89490 | 276756 (96x126-24-90) | 967834 (192x253-24-90) | 149485 |
| R005 | supportive | one-shot | 4000 | 96 | 9460 | 25000 | 96412 | 342596 (96x126-24-80) | 1622782 (192x253-24-90) | 252686 |
| R006 | encourage | one-shot | 2500 | 60 | 9514 | 25290 | 95710 | 289706 (96x126-24-90) | 1006918 (192x253-24-90) | 151590 |
| R007 | oops | one-shot | 3000 | 72 | 9416 | 24856 | 94924 | 337904 (96x126-24-90) | 1215522 (192x253-24-90) | 184922 |
| R008 | goodbye | one-shot | 3000 | 72 | 9430 | 25350 | 95966 | 350430 (96x126-24-90) | 1220034 (192x253-24-90) | 188312 |
| R009 | thanks | one-shot | 2500 | 60 | 9480 | 25300 | 97744 | 284148 (96x126-24-90) | 1013174 (192x253-24-90) | 155420 |
| R010 | reading | loop | 4000 | 96 | 9460 | 26690 | 104204 | 364956 (96x126-24-80) | 1698310 (192x253-24-90) | 252395 |
| R011 | offline-wait | loop | 4000 | 96 | 9482 | 26286 | 101674 | 366036 (96x126-24-80) | 1698804 (192x253-24-90) | 255553 |
| R012 | back-online | one-shot | 2000 | 48 | 9452 | 27308 | 104906 | 230898 (96x126-24-90) | 842924 (192x253-24-90) | 128789 |
| R013 | hide | one-shot | 2000 | 48 | 9448 | 24890 | 94546 | 173362 (96x126-24-90) | 579022 (192x253-24-90) | 340333 |
| X001 | greeting-in-place | one-shot | 2500 | 60 | 9476 | 25436 | 97572 | 293908 (96x126-24-90) | 1019478 (192x253-24-90) | 156094 |
| X010 | idle-glance | loop | 5000 | 120 | 9484 | 25808 | 101360 | 376678 (96x126-24-70) | 2125746 (192x253-24-90) | 317566 |
| X011 | idle-settle | loop | 5000 | 120 | 9464 | 25830 | 101416 | 378022 (96x126-24-70) | 2126976 (192x253-24-90) | 319753 |
| X012 | idle-logo | loop | 5000 | 120 | 9480 | 25842 | 101372 | 386254 (96x126-24-70) | 2085842 (192x253-24-90) | 313463 |
| X020 | gaze-chat-input | loop | 2000 | 48 | 9480 | 26354 | 103066 | 229778 (96x126-24-90) | 846110 (192x253-24-90) | 126829 |
| X021 | gaze-viewer | loop | 2000 | 48 | 9450 | 25948 | 102128 | 231632 (96x126-24-90) | 841224 (192x253-24-90) | 127884 |
| X022 | gaze-target | loop | 2000 | 48 | 9448 | 26038 | 101262 | 234576 (96x126-24-90) | 839016 (192x253-24-90) | 127432 |
| X030 | cheer | one-shot | 2500 | 60 | 9420 | 25754 | 95902 | 288402 (96x126-24-90) | 1006432 (192x253-24-90) | 153757 |
| X050 | speaking-b | loop | 1600 | 38 | 9478 | 25948 | 100154 | 185304 (96x126-24-90) | 655278 (192x253-24-90) | 377392 |
| X051 | speaking-c | loop | 5000 | 120 | 9422 | 24968 | 94736 | 364960 (96x126-24-70) | 1999354 (192x253-24-90) | 304997 |
| X052 | listening-b | loop | 1600 | 38 | 9512 | 26466 | 102858 | 185750 (96x126-24-90) | 673996 (192x253-24-90) | 385304 |
| X053 | thinking-b | loop | 4000 | 96 | 9422 | 20740 | 78394 | 387324 (96x126-24-90) | 1414250 (192x253-24-90) | 215738 |
| X054 | celebrate-small | one-shot | 2000 | 48 | 9454 | 23654 | 88592 | 229610 (96x126-24-90) | 793588 (192x253-24-90) | 121675 |


Over today's budgets: none.

**Budget recommendation (measured on 51 clips).** The 400 KB animated budget and the 200 KB large still are part of why ZIGi looks soft in the app today. Clips load lazily one at a time,
so one cap of 2.6 MB per animated file (`clips.PROPOSED_ANIM_2X_BUDGET`, the rule every 2x pick was made under) lets the app show the 192x253 set at 24 fps q90: 51 of 51 clips are 24q90 under it, the largest is F008 at 2.45 MB, the median 1.02 MB.
A two-tier cap would be 2.6 MB for clips of 4 s and longer (largest 2.45 MB) and 1.5 MB otherwise (largest 1.42 MB). 36 of the 51 clips would also fit the current 400 KB at a lower rung (`fits_contract_budget` in sizes.json), at 12-16 fps and q70-80.
The ladder gives the exact bytes per quality step so the integration session can pick with the owner.

## 3. The duration contract and the frame-duration scheme

| Code | Clip | Kind | Contract ms | Frames at 24 fps | Entry | Exit |
|---|---|---|---|---|---|---|
| F001 | idle | loop | 5600 | 134 | NEUTRAL | NEUTRAL |
| F002 | greeting | one-shot | 2500 | 60 | mid-stride, half a body-width to screen-left (documented entry pose, as in Studio-2: it walks to the mark by frame 18) | NEUTRAL |
| F003 | insight | one-shot | 3000 | 72 | NEUTRAL | NEUTRAL |
| F004 | listening | loop | 1600 | 38 | NEUTRAL | NEUTRAL |
| F005 | speaking | loop | 1600 | 38 | NEUTRAL | NEUTRAL |
| F006 | presenting | one-shot | 3000 | 72 | NEUTRAL | NEUTRAL |
| F007 | attention | loop | 2400 | 58 | NEUTRAL | NEUTRAL |
| F008 | sleepy | loop | 6000 | 144 | NEUTRAL | NEUTRAL |
| F009 | celebrate | one-shot | 2500 | 60 | NEUTRAL | NEUTRAL |
| T001 | thinking | loop | 2400 | 58 | NEUTRAL | NEUTRAL |
| E001 | error | one-shot | 4000 | 96 | NEUTRAL | NEUTRAL |
| F010 | reading-your-data | loop | 1600 | 38 | NEUTRAL | NEUTRAL |
| F011 | writing-proposal | loop | 1600 | 38 | NEUTRAL | NEUTRAL |
| F012 | success | one-shot | 1800 | 43 | NEUTRAL | NEUTRAL |
| F013 | proud | one-shot | 2800 | 67 | NEUTRAL | NEUTRAL |
| F014 | curious | one-shot | 3000 | 72 | NEUTRAL | NEUTRAL |
| F015 | surprised | one-shot | 1500 | 36 | NEUTRAL | NEUTRAL |
| F016 | confused | one-shot | 3000 | 72 | NEUTRAL | NEUTRAL |
| F017 | empathetic | one-shot | 3500 | 84 | NEUTRAL | NEUTRAL |
| F018 | encouraging | one-shot | 2800 | 67 | NEUTRAL | NEUTRAL |
| F019 | wave-goodbye | one-shot | 1400 | 34 | NEUTRAL | NEUTRAL |
| F020 | reminder | one-shot | 2400 | 58 | NEUTRAL | NEUTRAL |
| F021 | offline | loop | 4000 | 96 | NEUTRAL | NEUTRAL |
| F022 | peek | loop | 4000 | 96 | NEUTRAL | NEUTRAL |
| F023 | loading-model | loop | 1600 | 38 | NEUTRAL | NEUTRAL |
| X001 | greeting-in-place | one-shot | 2500 | 60 | NEUTRAL | NEUTRAL |
| X010 | idle-glance | loop | 5000 | 120 | NEUTRAL | NEUTRAL |
| X011 | idle-settle | loop | 5000 | 120 | NEUTRAL | NEUTRAL |
| X012 | idle-logo | loop | 5000 | 120 | NEUTRAL | NEUTRAL |
| X020 | gaze-chat-input | loop | 2000 | 48 | NEUTRAL | NEUTRAL |
| X021 | gaze-viewer | loop | 2000 | 48 | NEUTRAL | NEUTRAL |
| X022 | gaze-target | loop | 2000 | 48 | NEUTRAL | NEUTRAL |
| X030 | cheer | one-shot | 2500 | 60 | NEUTRAL | NEUTRAL |
| R001 | acknowledge | one-shot | 2000 | 48 | NEUTRAL | NEUTRAL |
| R002 | unsure | one-shot | 3000 | 72 | NEUTRAL | NEUTRAL |
| R003 | working | loop | 4000 | 96 | NEUTRAL | NEUTRAL |
| R004 | surprised | one-shot | 2500 | 60 | NEUTRAL | NEUTRAL |
| R005 | supportive | one-shot | 4000 | 96 | NEUTRAL | NEUTRAL |
| R006 | encourage | one-shot | 2500 | 60 | NEUTRAL | NEUTRAL |
| R007 | oops | one-shot | 3000 | 72 | NEUTRAL | NEUTRAL |
| R008 | goodbye | one-shot | 3000 | 72 | NEUTRAL | NEUTRAL |
| R009 | thanks | one-shot | 2500 | 60 | NEUTRAL | NEUTRAL |
| R010 | reading | loop | 4000 | 96 | NEUTRAL | NEUTRAL |
| R011 | offline-wait | loop | 4000 | 96 | NEUTRAL | NEUTRAL |
| R012 | back-online | one-shot | 2000 | 48 | NEUTRAL | NEUTRAL |
| R013 | hide | one-shot | 2000 | 48 | NEUTRAL | off-frame (screen-right) |
| X050 | speaking-b | loop | 1600 | 38 | NEUTRAL | NEUTRAL |
| X051 | speaking-c | loop | 5000 | 120 | NEUTRAL | NEUTRAL |
| X052 | listening-b | loop | 1600 | 38 | NEUTRAL | NEUTRAL |
| X053 | thinking-b | loop | 4000 | 96 | NEUTRAL | NEUTRAL |
| X054 | celebrate-small | one-shot | 2000 | 48 | NEUTRAL | NEUTRAL |

Animated WebP frame durations are ms // N with the remainder spread as +1 ms on the first frames, so the total equals the contract ms exactly; 16 fps variants use
every 1.5th frame and 12 fps every 2nd with the same rule. Loops are NEUTRAL-seamed (frame 1 = NEUTRAL = the last frame + 1); one-shots start at NEUTRAL (F002 greeting excepted: its documented walk-in entry is Studio-2 behaviour, kept) and hold
NEUTRAL for their last frames; R013 (hide) starts at NEUTRAL and ends outside the frame (last frame alpha 0). An `X031-hide-left` mirror is proposed, not made.

## 4. Importer patch, manifest, reactions

See `docs/IMPORTER-PATCH.md` (constants only). Proposed manifest additions (`skins.origami-nebula`):

```json
{
 "states": {
  "reading-your-data": {
   "1x": "/brand/figures/zigi/origami-nebula/F010-reading-your-data.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F010-reading-your-data.anim.webp",
   "durationMs": 1600
  },
  "writing-proposal": {
   "1x": "/brand/figures/zigi/origami-nebula/F011-writing-proposal.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F011-writing-proposal.anim.webp",
   "durationMs": 1600
  },
  "success": {
   "1x": "/brand/figures/zigi/origami-nebula/F012-success.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F012-success.anim.webp",
   "durationMs": 1800
  },
  "proud": {
   "1x": "/brand/figures/zigi/origami-nebula/F013-proud.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F013-proud.anim.webp",
   "durationMs": 2800
  },
  "curious": {
   "1x": "/brand/figures/zigi/origami-nebula/F014-curious.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F014-curious.anim.webp",
   "durationMs": 3000
  },
  "surprised": {
   "1x": "/brand/figures/zigi/origami-nebula/F015-surprised.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F015-surprised.anim.webp",
   "durationMs": 1500
  },
  "confused": {
   "1x": "/brand/figures/zigi/origami-nebula/F016-confused.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F016-confused.anim.webp",
   "durationMs": 3000
  },
  "empathetic": {
   "1x": "/brand/figures/zigi/origami-nebula/F017-empathetic.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F017-empathetic.anim.webp",
   "durationMs": 3500
  },
  "encouraging": {
   "1x": "/brand/figures/zigi/origami-nebula/F018-encouraging.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F018-encouraging.anim.webp",
   "durationMs": 2800
  },
  "wave-goodbye": {
   "1x": "/brand/figures/zigi/origami-nebula/F019-wave-goodbye.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F019-wave-goodbye.anim.webp",
   "durationMs": 1400
  },
  "reminder": {
   "1x": "/brand/figures/zigi/origami-nebula/F020-reminder.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F020-reminder.anim.webp",
   "durationMs": 2400
  },
  "offline": {
   "1x": "/brand/figures/zigi/origami-nebula/F021-offline.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F021-offline.anim.webp",
   "durationMs": 4000
  },
  "peek": {
   "1x": "/brand/figures/zigi/origami-nebula/F022-peek.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F022-peek.anim.webp",
   "durationMs": 4000
  },
  "loading-model": {
   "1x": "/brand/figures/zigi/origami-nebula/F023-loading-model.webp",
   "animated": "/brand/figures/zigi/origami-nebula/F023-loading-model.anim.webp",
   "durationMs": 1600
  }
 },
 "extras": {
  "idleVariants": {
   "X012": "X012-idle-logo"
  },
  "celebrations": {
   "cheer": "X030-cheer"
  },
  "variants": {
   "speaking": [
    "X050-speaking-b",
    "X051-speaking-c"
   ],
   "listening": [
    "X052-listening-b"
   ],
   "thinking": [
    "X053-thinking-b"
   ],
   "celebrateSmall": "X054-celebrate-small"
  },
  "transitions": {
   "greetingInPlace": "X001-greeting-in-place",
   "chain": [
    "F004",
    "T001",
    "F005",
    "F001"
   ]
  }
 },
 "reactionTriggers": {
  "R001": "assistant_acknowledged",
  "R002": "assistant_unsure",
  "R003": "assistant_working",
  "R004": "insight_consistent",
  "R005": "checkin_low",
  "R006": "checkin_milestone",
  "R007": "action_undone",
  "R008": "wrapup_finished",
  "R009": "feedback_received",
  "R010": "journal_reflecting",
  "R011": "connection_lost",
  "R012": "connection_restored",
  "R013": "user_dismissed"
 },
 "variantSlots": {
  "X050": "V-F005-b",
  "X051": "V-F005-c",
  "X052": "V-F004-b",
  "X053": "V-T001-b",
  "X054": "V-F009-small"
 }
}
```

`reactions.json` (delivered beside the files): R001 → assistant_acknowledged (proposed), R002 → assistant_unsure (proposed), R003 → assistant_working (proposed), R004 → insight_consistent (proposed), R005 → checkin_low (proposed), R006 → checkin_milestone (proposed), R007 → action_undone (proposed), R008 → wrapup_finished (proposed), R009 → feedback_received (proposed), R010 → journal_reflecting (proposed), R011 → connection_lost, R012 → connection_restored, R013 → user_dismissed.
`connection_lost` is shared by the offline state and R011: the state wins; R011 plays when the host asks for a reaction while already offline (arbitration flagged).

## 5. Optical centre (re-measured on the new idle still)

- 1x: alpha-weighted centre at 0.478 / 0.590 of the box (x, y) -> `opticalOffset` x +0.022, y -0.090 (the spec: 0.5 minus the centre fraction; the manifest today has x +0.023, y -0.090).
- 2x: alpha-weighted centre at 0.477 / 0.590 of the box (x, y) -> `opticalOffset` x +0.022, y -0.090 (the spec: 0.5 minus the centre fraction; the manifest today has x +0.023, y -0.090).
- large: alpha-weighted centre at 0.477 / 0.590 of the box (x, y) -> `opticalOffset` x +0.022, y -0.090 (the spec: 0.5 minus the centre fraction; the manifest today has x +0.023, y -0.090).

Re-check in Chrome: open the launcher with the new idle, measure the figure's visual centre against the circle (devtools overlay), and set `opticalOffset` so the figure
reads centred (the spec's "Optical centre" section). `zigi-alive.spec` asserts the centre; update its expected value with the measured one.

## 6. Per-browser alpha rule

Animated WebP with alpha everywhere (Safari 14+ included); the APNG fallback where the one-frame WebP probe fails; VP9-alpha WebM for Chrome/Edge/Firefox video players;
HEVC-alpha MOV for Safari video (macOS script provided, not produced here). The app ships WebP + APNG; the videos are for the Lab and marketing.
VP9 alpha verified on every WebM by decoding its middle frame with libvpx (rule: mean |delta alpha| <= 1.5/255 and >= 100 distinct levels): 153 files, worst mean delta 0.50/255, fewest levels 153, all pass.


## 7. Tests to touch

- `brand-assets.test`: the `-2x` count pinned at 28 becomes 51.
- `zigi-assets.test`: the loop list (IMPORTER-PATCH.md section 2).
- `zigi-alive.spec`: the optical centre (section 5).

## 8. What needs app code (beyond the constants)

- The variant rotation (pools and the "base at least half, never the same twice" rule: `companion/rules.json` → variants; `companion/controller.mjs` has the reference implementation).
- X030 cheer on `all_habits_done` (today it maps to the celebrate state); X054 as the small celebration for ordinary validated wins.
- The ten proposed reaction events (section 4) in `semantic.ts`; R013 on `user_dismissed` as the hide animation.
- Push images need the push activation work (stills only).

## 9. Render and QA facts

`qa/size-test.txt`:

```
SIZE TEST (10 frames each of F009,F001, look v4)
size          F009        F001        mean s/f   projected for 3639 frames
960x1264      10.2        10.2        10.2       10.3 h
1440x1896     19.1        19.2        19.2       19.4 h
1920x2528     32.4        32.6        32.5       32.8 h
DECISION: app set at 1920x2528 (full-size projection 32.8 h vs the ~60 h rule; marketing stays 1920x2528)
```

Fur in motion (`qa/fur-motion/`, the internal check run before the render): start | peak | end Cycles stills of F001, F005, F007, F009, R006 and X030 show the fur following every peak; the complete F001 loop at 480x632: mean frame delta 4.88/255, seam 1.56/255 (seamless); the frames over twice the median ([23, 24, 25, 26, 27, 28, 29, 98, 99, 100, 101, 102, 103]) are the two whole-body weight shifts of the idle, confirmed on heat maps: no popping, no stretching (DECISIONS #30).

Render ledger: 91 chunks, 3557 frames, 32.0 GPU-hours, 32.4 s/frame average (`frames/render-ledger.csv`).

## 10. Known issues and "to polish later"

- R013 hide: three landing frames have a minor arm/body contact (~40 vertices, invisible at app sizes); the clip exits to screen-right only.
- R013 hide, 96x126 animated WebP: 47 frames instead of 48. After the downscale and the 16-level alpha quantization, frames 47 and 48 are both fully transparent, and libwebp merges identical consecutive frames into one (the last frame lasts 82 ms; webpinfo: 47 frames, 2000 ms, so the duration contract holds). The 192x253 WebP (48 frames) and the APNG (24 frames) are unaffected; the importer checks name, pixel size, format, loop count and bytes, not frame counts.
- 96x126 app picks at q70: X010 24-70 376 KB 28.2 dB; X011 24-70 378 KB 28.2 dB; X012 24-70 386 KB 28.3 dB; X051 24-70 364 KB 28.2 dB. The pick order keeps the frame rate ahead of the quality step (24q90 > 24q80 > 24q70 > 16q90 > 16q80 > 16q70 > 12q70); the 16 fps q90 rung sits on the quality ladder as the alternative if the app prefers detail over motion: X010 16 fps q90 394 KB 30.5 dB; X011 16 fps q90 394 KB 30.5 dB; X012 16 fps q90 402 KB 30.6 dB (over 400 KB); X051 16 fps q90 385 KB 30.6 dB.
- X020–X022 gaze: encoded as loops because today's importer lists them so; a held-gaze version needs an app change.
- The mouth region fails the v1 colour-lock line by design (the rest mouth is now open); every other region passes.
- Feet: shape unchanged (owner correction 4); only the render quality changed.
- HEVC-alpha MOV not produced (needs macOS VideoToolbox); the script is ready.
- APNG fallbacks: 41 of 51 are palette files with binary alpha (a hard outline, exactly like today's app APNGs) because their RGBA encode was over 400 KB; the 10 short clips (F004, F005, F010, F011, F015, F019, F023, R013, X050, X052) are RGBA APNGs with full alpha. The APNG only serves browsers whose animated-WebP probe fails; the WebP is the shipped format.

## 11. Where things are

`master/ZIGi-master-s4.blend` (look + actions), `master/ZIGi-actions-s4.blend`, `master/action-map.json`, `look/v4/` (LOOK v-final), `LOOK-BIBLE.md`, `frames/<CODE>/rgba/` (16-bit masters),
`encoded/` (every encode + sizes.json), `deliver/` (this delivery), `companion/`, `lab/`, `review/index.html`, `DECISIONS.md` (every decision, download, licence and revert), `STATE.md`, `checkpoints/current/`.
