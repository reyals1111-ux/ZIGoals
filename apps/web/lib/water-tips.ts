/**
 * Session AV lane 2 (health r3; LEDGER #283, Waterllama's hydration tips): one practical tip a day on the water card,
 * written for ZIGoals in this repository in English and Dutch, off unless chosen (Health → Water → "Show a water tip each
 * day"). Small habits that make a glass easier to reach for; no health claims, no amounts the body "needs".
 */
export type WaterTip = {id: string; en: string; nl: string};
export const WATER_TIPS: readonly WaterTip[] = [
  {id: 'kettle', en: 'Put a glass by the kettle. While the water boils, drink one.', nl: 'Zet een glas bij de waterkoker. Drink er een terwijl het water kookt.'},
  {id: 'bag', en: 'Keep a bottle in your bag, so water comes with you wherever you go.', nl: 'Houd een fles in je tas, zodat water overal met je meegaat.'},
  {id: 'desk', en: 'A full glass on your desk is easier to reach for than a tap down the hall.', nl: 'Een vol glas op je bureau pak je makkelijker dan een kraan verderop in de gang.'},
  {id: 'meal', en: 'Pour a glass when you sit down to eat, and put it next to your plate.', nl: 'Schenk een glas in als je gaat eten, en zet het naast je bord.'},
  {id: 'morning', en: 'Fill a glass before bed and leave it where you will see it in the morning.', nl: 'Vul voor het slapen een glas en zet het waar je het ’s ochtends ziet.'},
  {id: 'flavour', en: 'Plain water feels dull? A slice of lemon, cucumber or a few mint leaves change it.', nl: 'Vind je gewoon water saai? Een schijfje citroen, komkommer of wat muntblaadjes veranderen het.'},
  {id: 'cold', en: 'Keep a jug in the fridge. Cold water is the one many people reach for.', nl: 'Zet een kan in de koelkast. Koud water is wat veel mensen pakken.'},
  {id: 'teeth', en: 'Tie a glass to something you already do: after brushing your teeth, before the first coffee.', nl: 'Koppel een glas aan iets wat je al doet: na het tandenpoetsen, voor de eerste koffie.'},
  {id: 'meetings', en: 'Take a glass into each meeting or call. It is easy to sip while you listen.', nl: 'Neem een glas mee naar elke vergadering of elk gesprek. Tijdens het luisteren neem je makkelijk een slok.'},
  {id: 'size', en: 'A bigger glass or bottle means fewer refills. Pick one you like holding.', nl: 'Een groter glas of een grotere fles betekent minder vaak bijvullen. Kies er een die je fijn vasthoudt.'},
  {id: 'marks', en: 'A bottle with time marks on the side shows at a glance how the day is going.', nl: 'Een fles met tijdstreepjes op de zijkant laat in één blik zien hoe de dag gaat.'},
  {id: 'log-tap', en: 'Log a drink the moment you finish it: one tap now is easier than remembering tonight.', nl: 'Log een drankje zodra je het op hebt: één tik nu is makkelijker dan het je vanavond herinneren.'},
  {id: 'walk', en: 'Each time you stand up for a stretch, stop by the tap on the way back.', nl: 'Elke keer dat je opstaat om te strekken: loop op de terugweg langs de kraan.'},
  {id: 'tea', en: 'Tea, milk and other drinks count toward your water too, as you log them.', nl: 'Thee, melk en andere drankjes tellen ook mee voor je water, zoals je ze logt.'},
  {id: 'workout', en: 'Pack a bottle with your gym or sports bag, so it is there when you need it.', nl: 'Stop een fles bij je sporttas, zodat hij er is wanneer je hem nodig hebt.'},
  {id: 'car', en: 'Keep a bottle in the car or by the bike, for the trips that take longer than planned.', nl: 'Houd een fles in de auto of bij de fiets, voor de ritten die langer duren dan gepland.'},
  {id: 'restaurant', en: 'Eating out? Ask for a jug of tap water with the menu.', nl: 'Uit eten? Vraag bij de kaart om een karaf kraanwater.'},
  {id: 'straw', en: 'Some people sip more with a straw or a sports cap. Try what suits you.', nl: 'Sommige mensen drinken meer met een rietje of een sportdop. Probeer wat bij je past.'},
  {id: 'reminder', en: 'Reminders through the day can follow your pace and stay quiet when you are ahead.', nl: 'Herinneringen door de dag kunnen je tempo volgen en stil blijven als je voorloopt.'},
  {id: 'own-drink', en: 'Drink the same thing every day? Make it one of your drinks for a one-tap log.', nl: 'Drink je elke dag hetzelfde? Maak er een eigen drankje van en log het met één tik.'},
  {id: 'hot-day', en: 'On a warm day, keep a glass in view. Seeing it is often the reminder.', nl: 'Houd op een warme dag een glas in zicht. Het zien is vaak al de herinnering.'},
  {id: 'travel', en: 'Travelling? An empty bottle goes through most airport checks; fill it on the other side.', nl: 'Op reis? Een lege fles mag door de meeste controles op het vliegveld; vul hem daarna.'},
  {id: 'routine', en: 'Pick three moments for a glass: when you wake, at lunch, when you get home.', nl: 'Kies drie momenten voor een glas: als je wakker wordt, bij de lunch, als je thuiskomt.'},
  {id: 'kids', en: 'Pour a glass for yourself when you pour one for someone else.', nl: 'Schenk voor jezelf een glas in als je er een voor iemand anders inschenkt.'},
  {id: 'sparkling', en: 'Like bubbles? Sparkling water counts the same as still.', nl: 'Houd je van bubbels? Bruiswater telt net zo mee als plat water.'},
  {id: 'fruit', en: 'Frozen berries in a glass of water are a small treat, and keep it cold.', nl: 'Bevroren bessen in een glas water zijn een kleine traktatie, en houden het koud.'},
  {id: 'refill', en: 'When the bottle is empty, refill it right away, so the next sip is ready.', nl: 'Is de fles leeg? Vul hem meteen bij, dan staat de volgende slok klaar.'},
  {id: 'small-steps', en: 'A missed morning is no reason to give up the day. One glass now is a good start.', nl: 'Een gemiste ochtend is geen reden om de dag op te geven. Eén glas nu is een goed begin.'},
];
/** The tip of the day (the same all day), or the one `step` places after it. */
export function waterTipOf(today: string, step = 0): WaterTip {
  const n = Math.floor(Date.parse(`${today}T12:00:00Z`) / 86_400_000);
  return WATER_TIPS[((n + step) % WATER_TIPS.length + WATER_TIPS.length) % WATER_TIPS.length]!;
}
