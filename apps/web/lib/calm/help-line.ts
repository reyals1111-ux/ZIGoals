/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #416): the help lines the app already shows, for the "On a low day" page —
 * the same numbers as ZIGi's reply to distress words (lib/ai/safety-guard.ts; a unit test checks each number is there),
 * written short. Kept here so the page does not load the safety guard. Plain words; no advice.
 */
export const HELP_LINE = {
  en: 'If you might hurt yourself or you are in danger, call your local emergency number now (112 in the EU, 911 in the US). Netherlands: 113 Zelfmoordpreventie, call 113 or 0800-0113, or chat at 113.nl. Belgium: 1813. UK and Ireland: Samaritans, 116 123. US: call or text 988. Elsewhere: findahelpline.com lists free, confidential lines.',
  nl: 'Ben je in gevaar of denk je eraan jezelf iets aan te doen, bel dan nu 112. Nederland: 113 Zelfmoordpreventie, bel 113 of gratis 0800-0113, of chat via 113.nl. België: Zelfmoordlijn 1813. Elders: findahelpline.com noemt gratis, vertrouwelijke hulplijnen.',
} as const;
export const HELP_NUMBERS = {en: ['112', '911', '113', '0800-0113', '113.nl', '1813', '116 123', '988', 'findahelpline.com'], nl: ['112', '113', '0800-0113', '113.nl', '1813', 'findahelpline.com']} as const;
