/**
 * Session AV lane 2 (habits pillar; LEDGER #81 Calm Daily Move): a few short guided stretch sequences, written for
 * ZIGoals in English and Dutch, each a list of steps with a written cue and its seconds. The player (components/health/
 * meditation/daily-move.tsx) goes through them with a timer; the time actually moved is saved as minutes in Health's
 * activity log. Minutes only: no calorie figure is ever estimated (owner rule). Gentle movement, never into pain; not
 * medical advice. Pure.
 */
export type StretchStep = {seconds: number; en: {name: string; cue: string}; nl: {name: string; cue: string}};
export type StretchSequence = {id: string; en: string; nl: string; steps: readonly StretchStep[]};
const s = (seconds: number, en: [string, string], nl: [string, string]): StretchStep => ({seconds, en: {name: en[0], cue: en[1]}, nl: {name: nl[0], cue: nl[1]}});
export const STRETCHES: readonly StretchSequence[] = [
  {id: 'wake-up', en: 'Morning wake-up', nl: 'Wakker worden', steps: [
    s(40, ['Reach up', 'Stand tall. Breathe in and reach both arms up; breathe out and let them float down. Repeat slowly.'], ['Omhoog reiken', 'Sta rechtop. Adem in en reik met beide armen omhoog; adem uit en laat ze zakken. Herhaal rustig.']),
    s(40, ['Side bend', 'Reach your right arm over your head and lean a little to the left. Switch sides halfway.'], ['Zijwaarts buigen', 'Reik je rechterarm over je hoofd en leun een beetje naar links. Wissel halverwege van kant.']),
    s(40, ['Shoulder rolls', 'Roll your shoulders slowly backwards, then forwards. Keep the neck soft.'], ['Schouders rollen', 'Rol je schouders langzaam naar achteren, daarna naar voren. Houd je nek ontspannen.']),
    s(40, ['Forward fold', 'Bend your knees a little and fold forward from the hips. Let your head hang. Come up slowly.'], ['Voorover hangen', 'Buig je knieën een beetje en buig vanuit je heupen naar voren. Laat je hoofd hangen. Kom langzaam omhoog.']),
    s(40, ['Calf raises', 'Hold a chair if you like. Rise onto your toes, then lower your heels. Slow and steady.'], ['Op je tenen', 'Houd een stoel vast als je wilt. Kom op je tenen en zak weer terug. Rustig en gelijkmatig.']),
    s(40, ['Stand and breathe', 'Stand still, feet hip-width apart. Three slow breaths. Notice how you feel now.'], ['Staan en ademen', 'Sta stil, voeten op heupbreedte. Drie rustige ademhalingen. Merk op hoe je je nu voelt.']),
  ]},
  {id: 'desk-break', en: 'Desk break', nl: 'Pauze aan je bureau', steps: [
    s(30, ['Neck tilt', 'Sit tall. Let your right ear move toward your right shoulder; breathe. Switch sides halfway.'], ['Nek kantelen', 'Zit rechtop. Laat je rechteroor naar je rechterschouder zakken; adem. Wissel halverwege.']),
    s(30, ['Chest opener', 'Clasp your hands behind you, or hold the chair. Lift the chest gently and look ahead.'], ['Borst openen', 'Vouw je handen achter je, of houd de stoel vast. Til je borst zacht op en kijk vooruit.']),
    s(30, ['Seated twist', 'Turn your upper body to the right, a hand on the chair back. Breathe. Then the left.'], ['Draaien op je stoel', 'Draai je bovenlichaam naar rechts, een hand op de rugleuning. Adem. Dan naar links.']),
    s(30, ['Wrists and hands', 'Circle your wrists both ways. Spread your fingers wide, then make a soft fist.'], ['Polsen en handen', 'Draai je polsen beide kanten op. Spreid je vingers wijd en maak dan een zachte vuist.']),
    s(30, ['Eyes far away', 'Look at something far away, out of a window if you can. Let your eyes rest there.'], ['Ver weg kijken', 'Kijk naar iets ver weg, uit het raam als dat kan. Laat je ogen daar rusten.']),
    s(30, ['Stand up', 'Stand, reach up once, and shake out your arms and legs a little.'], ['Opstaan', 'Sta op, reik één keer omhoog en schud je armen en benen een beetje los.']),
  ]},
  {id: 'neck-shoulders', en: 'Neck and shoulders', nl: 'Nek en schouders', steps: [
    s(40, ['Slow nods', 'Nod your head slowly yes, a small movement, then a slow no.'], ['Langzaam knikken', 'Knik langzaam ja, een kleine beweging, en daarna langzaam nee.']),
    s(40, ['Ear to shoulder', 'Let one ear move toward its shoulder; the other shoulder stays low. Switch halfway.'], ['Oor naar schouder', 'Laat één oor naar die schouder zakken; de andere schouder blijft laag. Wissel halverwege.']),
    s(40, ['Shoulder shrugs', 'Lift both shoulders toward your ears as you breathe in, and let them drop as you breathe out.'], ['Schouders optrekken', 'Trek beide schouders naar je oren als je inademt en laat ze vallen als je uitademt.']),
    s(40, ['Arm across', 'Bring one arm across your chest and hold it with the other arm. Switch halfway.'], ['Arm voor je borst', 'Breng één arm voor je borst langs en houd hem vast met de andere arm. Wissel halverwege.']),
    s(40, ['Upper back', 'Reach both arms forward and round your upper back, as if hugging a big ball.'], ['Bovenrug', 'Strek beide armen naar voren en maak je bovenrug rond, alsof je een grote bal omarmt.']),
    s(40, ['Rest', 'Let your hands rest. Feel your shoulders. Breathe out slowly, twice.'], ['Rust', 'Laat je handen rusten. Voel je schouders. Adem twee keer langzaam uit.']),
  ]},
  {id: 'hips-back', en: 'Hips and lower back', nl: 'Heupen en onderrug', steps: [
    s(45, ['Knees to chest', 'Lie on your back. Hug both knees toward you and rock gently from side to side.'], ['Knieën naar je borst', 'Lig op je rug. Trek beide knieën naar je toe en wieg zacht van links naar rechts.']),
    s(45, ['Knees to one side', 'Feet on the floor, let both knees fall slowly to one side. Switch halfway.'], ['Knieën opzij', 'Voeten op de grond, laat beide knieën langzaam naar één kant zakken. Wissel halverwege.']),
    s(45, ['Figure four', 'Cross one ankle over the other knee; draw the legs toward you if that is easy. Switch halfway.'], ['Enkel op knie', 'Leg één enkel over de andere knie; trek de benen naar je toe als dat makkelijk gaat. Wissel halverwege.']),
    s(45, ['Cat and cow', 'On hands and knees, round your back as you breathe out, and let it dip as you breathe in.'], ['Bolle en holle rug', 'Op handen en knieën: maak je rug bol als je uitademt en laat hem hol worden als je inademt.']),
    s(45, ['Child’s rest', 'Sit back toward your heels, arms forward or beside you, forehead down.'], ['Kindhouding', 'Zak terug naar je hielen, armen naar voren of naast je, voorhoofd omlaag.']),
    s(45, ['Lie still', 'Lie on your back, legs long or knees bent. Let the floor hold you.'], ['Stil liggen', 'Lig op je rug, benen lang of knieën gebogen. Laat de vloer je dragen.']),
  ]},
  {id: 'evening-unwind', en: 'Evening unwind', nl: 'Avond ontspanning', steps: [
    s(60, ['Slow breaths', 'Sit or lie comfortably. Let each out-breath be a little longer than the in-breath.'], ['Rustig ademen', 'Zit of lig comfortabel. Laat elke uitademing iets langer zijn dan de inademing.']),
    s(60, ['Seated forward bend', 'Sit with legs long, knees soft. Lean forward only as far as is easy.'], ['Voorover zitten', 'Zit met lange benen, knieën zacht. Leun alleen zo ver naar voren als makkelijk gaat.']),
    s(60, ['Lying twist', 'On your back, let both knees fall to one side and look the other way. Switch halfway.'], ['Liggend draaien', 'Op je rug: laat beide knieën naar één kant zakken en kijk de andere kant op. Wissel halverwege.']),
    s(60, ['Legs up', 'Rest your legs up a wall or on a chair, or simply bend your knees. Arms wide.'], ['Benen omhoog', 'Leg je benen tegen een muur of op een stoel, of buig gewoon je knieën. Armen wijd.']),
    s(60, ['Body at rest', 'Lie still. Let your feet, legs, belly, hands and face soften one by one.'], ['Lichaam in rust', 'Lig stil. Laat je voeten, benen, buik, handen en gezicht één voor één zacht worden.']),
  ]},
];
export const stretchSeconds = (seq: StretchSequence) => seq.steps.reduce((n, x) => n + x.seconds, 0);
export const stretchMinutes = (seq: StretchSequence) => Math.round(stretchSeconds(seq) / 60);
export const stretchById = (id: string) => STRETCHES.find(q => q.id === id);
/** The activity name a finished stretch is saved under in Health, so ZIGi and NOVA can count it. */
export const STRETCH_PREFIX = 'Stretch: ';

/**
 * The running sequence, in plain values (component state; a reload ends it, nothing half-saved). Time is the distance
 * between instants: `doneMs` is the time spent on steps already left, `stepStartedAt` when this step began (or resumed).
 */
export type MoveRun = {seq: string; step: number; stepStartedAt: number; stepUsedMs: number; pausedAt?: number; doneMs: number; finished: boolean};
export const startMove = (seq: string, now: number): MoveRun => ({seq, step: 0, stepStartedAt: now, stepUsedMs: 0, doneMs: 0, finished: false});
const inStep = (r: MoveRun, now: number) => r.stepUsedMs + (r.pausedAt !== undefined ? r.pausedAt - r.stepStartedAt : Math.max(0, now - r.stepStartedAt));
/** Seconds left of this step. */
export function stepLeft(r: MoveRun, now: number): number {
  const q = stretchById(r.seq), st = q?.steps[r.step];
  return st ? Math.max(0, Math.ceil(st.seconds - inStep(r, now) / 1000)) : 0;
}
/** To the step after this one (or back), keeping the time spent on this step. The last step's end finishes the run. */
export function moveStep(r: MoveRun, now: number, by: 1 | -1): MoveRun {
  const q = stretchById(r.seq);
  if (!q || r.finished) return r;
  const spent = inStep(r, now), next = r.step + by, at = r.pausedAt ?? now;
  if (next < 0) return {...r, stepStartedAt: at, stepUsedMs: 0, doneMs: r.doneMs + spent};
  if (next >= q.steps.length) return {...r, doneMs: r.doneMs + spent, stepUsedMs: 0, stepStartedAt: at, finished: true, pausedAt: undefined};
  return {...r, step: next, stepStartedAt: at, stepUsedMs: 0, doneMs: r.doneMs + spent};
}
/** Moves on by itself when a step's time is up (more than one step after a long background stretch). */
export function tickMove(r: MoveRun, now: number): MoveRun {
  const q = stretchById(r.seq);
  let run = r;
  while (q && !run.finished && run.pausedAt === undefined) {
    const st = q.steps[run.step]!, end = run.stepStartedAt + st.seconds * 1000 - run.stepUsedMs;
    if (now < end) break;
    run = moveStep(run, end, 1);
  }
  return run;
}
export const pauseMove = (r: MoveRun, now: number): MoveRun => r.pausedAt !== undefined || r.finished ? r : {...r, pausedAt: now};
export function resumeMove(r: MoveRun, now: number): MoveRun {
  if (r.pausedAt === undefined) return r;
  const {pausedAt, ...rest} = r;
  return {...rest, stepUsedMs: r.stepUsedMs + (pausedAt - r.stepStartedAt), stepStartedAt: now};
}
/** Whole minutes actually moved (a part minute of 30 s or more counts as one). */
export const minutesMoved = (r: MoveRun, now: number) => Math.round((r.doneMs + (r.finished ? 0 : inStep(r, now))) / 60_000);
