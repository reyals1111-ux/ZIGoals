/**
 * Session AV lane 2 (body; LEDGER #208, Nike Run Club's training tips): short running tips written for ZIGoals in this
 * repository, in English and Dutch — easy pace, rest, building up, shoes, the warm-up, the long run, the mind. Plain
 * habits of runners, not medical advice. One a day on the Workouts page; "Another tip" shows the next.
 */
export type RunTip = {id: string; en: string; nl: string};
export const RUN_TIPS: readonly RunTip[] = [
  {id: 'easy-pace', en: 'Most runs can be easy: a pace where you could still talk in short sentences. Easy days make the hard ones possible.', nl: 'De meeste lopen mogen rustig: een tempo waarin je nog korte zinnen kunt praten. Rustige dagen maken de zware mogelijk.'},
  {id: 'rest-day', en: 'A rest day is part of training. Your legs get stronger while they recover, not while you run.', nl: 'Een rustdag hoort bij trainen. Je benen worden sterker terwijl ze herstellen, niet terwijl je loopt.'},
  {id: 'build-slowly', en: 'Build up slowly: add a little distance from one week to the next, and keep an easier week now and then.', nl: 'Bouw rustig op: doe er van week tot week een beetje afstand bij, en neem af en toe een lichtere week.'},
  {id: 'warm-up', en: 'Start the first minutes slower than you want to. A gentle start warms you up better than stretching while you are cold.', nl: 'Begin de eerste minuten langzamer dan je wilt. Een rustige start warmt je beter op dan rekken terwijl je nog koud bent.'},
  {id: 'short-steps', en: 'Short, quick steps land softer than long ones. Let your feet land under you, not far in front.', nl: 'Korte, snelle passen landen zachter dan lange. Laat je voeten onder je landen, niet ver voor je uit.'},
  {id: 'new-shoes', en: 'New shoes? Wear them on a few short runs first, and keep your old pair for the long ones until they feel right.', nl: 'Nieuwe schoenen? Draag ze eerst een paar korte lopen, en houd je oude paar voor de lange tot ze goed aanvoelen.'},
  {id: 'retire-shoes', en: 'Shoes lose their spring slowly, so you rarely notice. Many runners swap a pair somewhere between 500 and 800 km.', nl: 'Schoenen verliezen langzaam hun vering, dus je merkt het zelden. Veel lopers vervangen een paar ergens tussen 500 en 800 km.'},
  {id: 'long-run', en: 'Your long run is about time on your feet, not speed. Slower than usual is exactly right.', nl: 'Bij je duurloop gaat het om tijd op je benen, niet om snelheid. Langzamer dan normaal is precies goed.'},
  {id: 'walk-breaks', en: 'Walking breaks are not cheating. Run a few minutes, walk one, repeat: many people finish longer runs this way.', nl: 'Wandelpauzes zijn geen valsspelen. Een paar minuten lopen, één wandelen, herhalen: zo lopen veel mensen langere afstanden.'},
  {id: 'same-time', en: 'Runs that happen at a set time happen more often. Put them in your week like an appointment.', nl: 'Lopen op een vaste tijd gebeuren vaker. Zet ze in je week als een afspraak.'},
  {id: 'drink', en: 'Drink a glass of water in the hour before a run, and after it. On a hot day, take some with you.', nl: 'Drink een glas water in het uur voor een loop, en erna. Neem op een warme dag iets mee.'},
  {id: 'cool-down', en: 'Finish with a few minutes of walking. It lets your breathing settle before you stop.', nl: 'Sluit af met een paar minuten wandelen. Zo komt je ademhaling tot rust voordat je stopt.'},
  {id: 'strength', en: 'Lunges, calf raises and a plank once or twice a week help your legs and core carry the run.', nl: 'Uitvalspassen, kuitheffen en een plank een of twee keer per week helpen je benen en romp de loop te dragen.'},
  {id: 'listen', en: 'Tired legs are normal; sharp or growing pain is a reason to stop and rest. If it stays, a doctor or physio can help.', nl: 'Vermoeide benen zijn normaal; scherpe of toenemende pijn is een reden om te stoppen en te rusten. Blijft het, dan kan een arts of fysiotherapeut helpen.'},
  {id: 'one-thing', en: 'On a hard day, aim only to get out the door. Ten easy minutes still count.', nl: 'Op een zware dag: richt je alleen op de deur uit gaan. Tien rustige minuten tellen ook.'},
  {id: 'breathing', en: 'Breathe through your mouth and nose, whichever feels easy. Out of breath means slow down a little.', nl: 'Adem door je mond en neus, wat makkelijk voelt. Buiten adem betekent: iets langzamer.'},
  {id: 'pace-feel', en: 'Run by feel, not only by the watch. Hills, wind and heat change the pace; the effort is what matters.', nl: 'Loop op gevoel, niet alleen op je horloge. Heuvels, wind en warmte veranderen het tempo; de inspanning telt.'},
  {id: 'sleep', en: 'A good night is a training session too. Easy runs feel easier after one.', nl: 'Een goede nacht is ook een training. Rustige lopen voelen daarna lichter.'},
  {id: 'variety', en: 'Once easy runs feel easy, one run a week with a few faster minutes adds variety. Keep the rest easy.', nl: 'Voelen rustige lopen rustig, dan geeft één loop per week met een paar snellere minuten afwisseling. Houd de rest rustig.'},
  {id: 'enjoy', en: 'Pick a route you like now and then. A run you look forward to is a run you go out for.', nl: 'Kies af en toe een route die je mooi vindt. Een loop waar je zin in hebt, is een loop waarvoor je de deur uit gaat.'},
];
/** The tip of the day (the same all day), or the one `step` places after it. */
export function tipOf(today: string, step = 0): RunTip {
  const n = Math.floor(Date.parse(`${today}T12:00:00Z`) / 86_400_000);
  return RUN_TIPS[((n + step) % RUN_TIPS.length + RUN_TIPS.length) % RUN_TIPS.length]!;
}
