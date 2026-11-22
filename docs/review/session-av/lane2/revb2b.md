# Lane 2 batch 2: fresh-review B fixes (slug `revb2b`, branch `lane2/revb2b`)

The findings: fresh review B of lane2/batch2 @ 23eaf493, numbered as there. B2B-1 and B2B-2 are the lead's (fixed
there). One commit per finding. No stored format changes in any of them; no new key; nothing new on Today.

## B2B-3 Major: the BMI answer gave the BMI and height while "Hide calories and weight" was on

- Verdict: fixed.
- Fix: `bmiAnswer` (lib/ai/local-answers/av2-body.ts) reads the device switch (`bodyFiguresHidden()`, the same read
  engine.ts uses for `withHiddenFigures`) and, with it on, says neither the BMI, the height nor the reading's day: "Your
  BMI is hidden with your weight figures on this device; Health → “Show calories and weight” brings it back." / "Je BMI
  is verborgen, samen met je gewichtscijfers op dit apparaat; Health → “Show calories and weight” zet hem terug." A
  missing height or weight still says what is missing (no figure in those lines). As a safety net for any other answer,
  `hideBodyFigures` (av2-hide-figures.ts) now also hides a number right after "BMI" ("BMI 24.3", "BMI is 24,3", "BMI:
  22.1"), as the page hides the same figure (`data-body-figure`).
- Tests: `lib/ai/local-answers/av2-body.test.ts` → "BMI under hidden figures (review b2b #3)": EN and NL with the switch
  on (no digit at all in the reply), off (the number as before), the missing-height line, and the generic BMI hiding in
  EN, NL and on a lifting line. av2-hide-figures and revb1-hide-figures tests still pass unchanged.
- Spec: none (a chat answer only; the page's own BMI is already hidden by `data-body-figure`, av2-bmi-milestones.spec).
- Help (EN), one sentence for the hide-figures answer (av-hide-figures): "With them hidden, NOVA and ZIGi do not say
  your BMI either."
- What's new: none needed (a fix).
