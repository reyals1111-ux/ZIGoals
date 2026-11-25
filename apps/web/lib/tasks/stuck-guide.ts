/**
 * Session AW (X2, LEDGER #448; Amazing Marvin's "help getting started on a stuck task"; owner decision 1d: written content
 * approved): a short written guide for a task that will not start. It asks why — too big, unclear, dreaded, or not the right
 * time — and gives one strategy for each answer, which leads to a tool the app already has: split it into steps and play
 * them (LEDGER #351), write the first step, a short focus block (Focus Sessions), or a better day. English and Dutch; the
 * app's screens use the English, ZIGi and NOVA answer in the person's language (lib/ai/local-answers/aw-x2-tasks.ts).
 * General guidance about getting started, not advice about health; nothing in it promises a result. Pure data.
 */
export type StuckReason = 'big' | 'unclear' | 'dread' | 'time';
export type StuckAction = 'steps' | 'first-step' | 'focus' | 'day';
type Words = {en: string; nl: string};
export type StuckAnswer = {id: StuckReason; question: Words; strategy: {en: readonly string[]; nl: readonly string[]}; action: StuckAction; actionLabel: Words};

export const STUCK_INTRO: Words = {
  en: 'Stuck on it? Most stuck tasks are stuck for one of four reasons. Pick the one that fits; each comes with one way to start.',
  nl: 'Kom je niet op gang? De meeste taken blijven om een van vier redenen liggen. Kies de reden die past; bij elke reden hoort een manier om te beginnen.',
};
export const STUCK_CLOSE: Words = {
  en: 'There is no right answer here, and any small start is a good start.',
  nl: 'Er is hier geen goed of fout antwoord, en elk klein begin is een goed begin.',
};
export const STUCK_GUIDE: readonly StuckAnswer[] = [
  {
    id: 'big', action: 'steps',
    question: {en: 'Does it feel too big?', nl: 'Voelt het te groot?'},
    strategy: {
      en: ['A big task is hard to start because there is no clear first move. Write down three to five small steps, each one something you could do in one sitting. Then look only at the first one.', '“Play the steps” shows them one at a time, with a timer for each.'],
      nl: ['Een grote taak is lastig om aan te beginnen, omdat er geen duidelijke eerste stap is. Schrijf drie tot vijf kleine stappen op, elk iets wat je in één keer kunt doen. Kijk daarna alleen naar de eerste.', 'Met “Play the steps” zie je ze één voor één, met een timer per stap.'],
    },
    actionLabel: {en: 'Split it into steps', nl: 'Splits het in stappen'},
  },
  {
    id: 'unclear', action: 'first-step',
    question: {en: 'Is it unclear what to do?', nl: 'Is het onduidelijk wat je moet doen?'},
    strategy: {
      en: ['A vague task keeps getting put aside. Ask yourself: what is the very next thing I would actually do — open a file, look up a phone number, write one sentence? Write that down as the first step.', 'If you need something from someone else first, the first step is to ask them.'],
      nl: ['Een vage taak schuif je steeds weer op. Vraag jezelf: wat is het allereerste wat ik echt zou doen — een bestand openen, een telefoonnummer opzoeken, één zin schrijven? Schrijf dat op als eerste stap.', 'Heb je eerst iets van iemand anders nodig, dan is de eerste stap het hem of haar te vragen.'],
    },
    actionLabel: {en: 'Write the first step', nl: 'Schrijf de eerste stap op'},
  },
  {
    id: 'dread', action: 'focus',
    question: {en: 'Are you dreading it?', nl: 'Zie je ertegenop?'},
    strategy: {
      en: ['Dread is often bigger before you start than while you work. Agree with yourself to work on it for just a few minutes, and allow yourself to stop after that. Starting is the whole goal.', 'A short focus block (five minutes is the shortest) gives that start a clear beginning and end.'],
      nl: ['Tegenzin is vaak groter vóór je begint dan tijdens het werk. Spreek met jezelf af dat je er maar een paar minuten aan werkt, en dat je daarna mag stoppen. Beginnen is het hele doel.', 'Een kort focusblok (vijf minuten is het kortste) geeft dat begin een duidelijk begin en einde.'],
    },
    actionLabel: {en: 'Start a short focus block', nl: 'Start een kort focusblok'},
  },
  {
    id: 'time', action: 'day',
    question: {en: 'Is it not the right time?', nl: 'Is het niet het juiste moment?'},
    strategy: {
      en: ['Some tasks need energy, a place or other people that you do not have right now. That is a real reason, not a failing. Give it a day that fits better, or let it wait without a day until one does.', 'If it keeps moving, ask whether it still needs doing at all: removing it is a choice too.'],
      nl: ['Sommige taken vragen energie, een plek of andere mensen die je nu niet hebt. Dat is een echte reden, geen falen. Geef de taak een dag die beter past, of laat hem zonder dag wachten tot er een past.', 'Schuift hij steeds op, vraag je dan af of hij nog nodig is: hem weghalen is ook een keuze.'],
    },
    actionLabel: {en: 'Give it a better day', nl: 'Geef het een betere dag'},
  },
];
export const stuckAnswer = (id: StuckReason) => STUCK_GUIDE.find(a => a.id === id)!;
/** The steps typed one per line: trimmed, blank lines dropped, at most `max`, each cut to the title's 140 characters. */
export function stepLines(text: string, max = 8): string[] {
  return text.split(/\r?\n/).map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean).slice(0, max).map(l => l.slice(0, 140));
}
