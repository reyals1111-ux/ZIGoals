/**
 * Session AV lane 2, round 4 (health; LEDGER #334, Pillow's sleep tips): one practical tip a day on Health's Sleep card,
 * written for ZIGoals in this repository in English and Dutch, off unless chosen ("Show a sleep tip each day", one device
 * preference in zigoals:health-extras:v1 `sleepTips`). Small habits around the evening and the morning, the way round 3's
 * water tips are (lib/water-tips.ts); no health claims, no amounts the body "needs", nothing about pills or treatment.
 */
export type SleepTip = {id: string; en: string; nl: string};
export const SLEEP_TIPS: readonly SleepTip[] = [
  {id: 'charger', en: 'Charge your phone outside the bedroom tonight, and use a simple alarm clock instead.', nl: 'Laad je telefoon vannacht buiten de slaapkamer op, en gebruik een gewone wekker.'},
  {id: 'saturday', en: 'Try the same wake time on Saturday as on a weekday, and see how Monday feels.', nl: 'Probeer zaterdag op dezelfde tijd op te staan als door de week, en kijk hoe maandag voelt.'},
  {id: 'curtains', en: 'Check the bedroom by night: a gap in the curtains or a standby light is easy to fix.', nl: 'Kijk ’s avonds eens rond in de slaapkamer: een kier in het gordijn of een standbylampje is makkelijk te verhelpen.'},
  {id: 'last-coffee', en: 'Pick a time for your last coffee of the day, and write it on the coffee jar.', nl: 'Kies een tijd voor je laatste koffie van de dag, en schrijf hem op de koffiepot.'},
  {id: 'wind-down', en: 'Set an alarm for an hour before bed: that is when the screens go off.', nl: 'Zet een wekker een uur voor bedtijd: dan gaan de schermen uit.'},
  {id: 'notepad', en: 'Keep a notepad by the bed. A thought written down can wait until morning.', nl: 'Leg een notitieblok naast je bed. Een opgeschreven gedachte kan wachten tot de ochtend.'},
  {id: 'cool-room', en: 'Open a window for ten minutes before bed, so the room is fresh when you get in.', nl: 'Zet tien minuten voor het slapen een raam open, dan is de kamer fris als je erin stapt.'},
  {id: 'morning-light', en: 'Step outside for a few minutes after you wake: a walk to the corner is enough.', nl: 'Ga na het opstaan een paar minuten naar buiten: een rondje om het blok is genoeg.'},
  {id: 'same-order', en: 'Do your evening steps in the same order each night: teeth, lights, book.', nl: 'Doe je avondstappen elke avond in dezelfde volgorde: tanden, lichten, boek.'},
  {id: 'book', en: 'Keep a paper book on the nightstand for the last half hour of the day.', nl: 'Leg een papieren boek op het nachtkastje voor het laatste halfuur van de dag.'},
  {id: 'dim', en: 'Turn the big light off after dinner and use a lamp instead.', nl: 'Doe na het eten de grote lamp uit en gebruik een schemerlamp.'},
  {id: 'clock-face', en: 'Turn the clock away from the bed, so you do not count the minutes.', nl: 'Draai de klok van het bed af, zodat je de minuten niet telt.'},
  {id: 'clothes', en: 'Lay out tomorrow’s clothes tonight: one less thing to think about in bed.', nl: 'Leg vanavond je kleren voor morgen klaar: één ding minder om in bed aan te denken.'},
  {id: 'bed-for-sleep', en: 'Keep work and email out of bed. The sofa or the desk is for those.', nl: 'Houd werk en mail buiten bed. Daar zijn de bank en het bureau voor.'},
  {id: 'alarm-across', en: 'Put the alarm across the room, so getting up is the first step.', nl: 'Zet de wekker aan de andere kant van de kamer, dan is opstaan de eerste stap.'},
  {id: 'log-morning', en: 'Log last night when you make your morning drink: it takes one tap while it is fresh.', nl: 'Log de afgelopen nacht als je je ochtenddrankje maakt: één tik, nu je het nog weet.'},
  {id: 'nap-short', en: 'Want a nap? Set a timer before you lie down, so a short rest stays short.', nl: 'Zin in een dutje? Zet een timer voor je gaat liggen, dan blijft een korte rust kort.'},
  {id: 'late-meal', en: 'Plan dinner a little earlier on the nights you want an early bedtime.', nl: 'Plan het avondeten iets eerder op de avonden dat je vroeg naar bed wilt.'},
  {id: 'tags', en: 'Tag a night “screens” or “late meal” when it fits. Patterns show up in your own log.', nl: 'Geef een nacht het label “screens” of “late meal” als het past. Patronen verschijnen in je eigen log.'},
  {id: 'bedding', en: 'Air the duvet by the open window in the morning.', nl: 'Lucht ’s ochtends je dekbed bij het open raam.'},
  {id: 'quiet-mode', en: 'Set your phone’s quiet hours to start at bedtime, every day.', nl: 'Laat de stille modus van je telefoon elke dag op bedtijd beginnen.'},
  {id: 'earplugs', en: 'Noisy street or a snoring partner? Keep earplugs in the nightstand drawer.', nl: 'Drukke straat of een snurkende partner? Bewaar oordopjes in de la van het nachtkastje.'},
  {id: 'sunday', en: 'Sunday evening: go to bed at your weekday time, so the week starts at its usual pace.', nl: 'Zondagavond: ga op je doordeweekse tijd naar bed, dan begint de week in het gewone tempo.'},
  {id: 'walk-evening', en: 'A short walk after dinner is a calm way to close the day.', nl: 'Een korte wandeling na het eten is een rustige manier om de dag af te sluiten.'},
  {id: 'drink-water', en: 'Put your glass of water by the bed early, so you do not get up for it later.', nl: 'Zet je glas water op tijd naast je bed, dan hoef je er later niet voor op te staan.'},
  {id: 'tomorrow-list', en: 'Write tomorrow’s three tasks down before the evening starts.', nl: 'Schrijf de drie taken voor morgen op voordat de avond begint.'},
  {id: 'pets', en: 'If a pet wakes you, give it its own spot outside the bedroom for a week, and see.', nl: 'Maakt een huisdier je wakker? Geef het een week een eigen plek buiten de slaapkamer, en kijk.'},
  {id: 'kind', en: 'A short night happens. Tonight is a fresh start; no need to make up for it at once.', nl: 'Een korte nacht gebeurt. Vannacht is een nieuw begin; je hoeft het niet meteen in te halen.'},
];
/** The tip of the day (the same all day), or the one `step` places after it. */
export function sleepTipOf(today: string, step = 0): SleepTip {
  const n = Math.floor(Date.parse(`${today}T12:00:00Z`) / 86_400_000) + 11; // a different place in the list than the water tips
  return SLEEP_TIPS[((n + step) % SLEEP_TIPS.length + SLEEP_TIPS.length) % SLEEP_TIPS.length]!;
}
