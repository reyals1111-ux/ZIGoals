import {CARD_WARNING, CARD_WARNING_NL} from './propose';

/**
 * Session AM-2 (step 4c): the confirm card's own words in English and Dutch (the two languages NOVA's on-device engine
 * and the safety guard answer in: lib/ai/safety-guard.ts `guardLanguage`). A card a model proposed is worded in the
 * language of the person's request; everything else on the panel is English first. Pure.
 */
export type CardLang = 'en' | 'nl';
export type CardWords = {
  fromModel: string; byHand: string; title: (tool: string) => string; server: string; at: string; tool: string; described: string; sent: string; noArgs: string; empty: string;
  showJson: string; hideJson: string; jsonLabel: string; warning: string; run: string; running: string; notNow: string; close: string; handBack: string;
  asking: string; notDone: string; listedFailed: string; answered: string; problem: string; listed: string; notListed: string; fromTool: string; cut: string; asItIs: string;
};
export const CARD_WORDS: Readonly<Record<CardLang, CardWords>> = {
  en: {
    fromModel: 'Your model proposes a tool', byHand: 'Run a tool by hand', title: tool => `Use “${tool}” once?`, server: 'Server:', at: 'On this computer at', tool: 'Tool:',
    described: 'Described by the server · untrusted', sent: 'Exactly what would be sent', noArgs: 'No arguments: the tool is asked with nothing.', empty: '(empty)',
    showJson: 'Show the raw JSON', hideJson: 'Hide the raw JSON', jsonLabel: 'The arguments as JSON', warning: CARD_WARNING,
    run: 'Run this tool once', running: 'Asking…', notNow: 'Not now', close: 'Close', handBack: 'Give this answer to my model',
    asking: 'Asking the tool… this page must stay in front of you.', notDone: 'Not done.', listedFailed: ' It is listed under “Sent out from this device” as failed.',
    answered: 'The tool answered.', problem: 'The tool reported a problem.', listed: 'This call is listed under “Sent out from this device”: when, which server and which tool — never its arguments or its answer.',
    notListed: 'This call is not listed in the history (this conversation is not kept, or the history could not be written).',
    fromTool: 'From the tool · untrusted', cut: ' · cut to fit', asItIs: 'This is the tool’s own text, shown as it is: NOVA does not follow it, links in it cannot be pressed, and it cannot start another tool or change a setting.',
  },
  nl: {
    fromModel: 'Je model stelt een tool voor', byHand: 'Een tool met de hand uitvoeren', title: tool => `“${tool}” één keer gebruiken?`, server: 'Server:', at: 'Op deze computer op', tool: 'Tool:',
    described: 'Beschreven door de server · niet vertrouwd', sent: 'Precies wat er verstuurd zou worden', noArgs: 'Geen argumenten: de tool wordt zonder iets gevraagd.', empty: '(leeg)',
    showJson: 'Toon de ruwe JSON', hideJson: 'Verberg de ruwe JSON', jsonLabel: 'De argumenten als JSON', warning: CARD_WARNING_NL,
    run: 'Voer deze tool één keer uit', running: 'Bezig…', notNow: 'Niet nu', close: 'Sluiten', handBack: 'Geef dit antwoord aan mijn model',
    asking: 'De tool wordt gevraagd… deze pagina moet voor je open blijven.', notDone: 'Niet gedaan.', listedFailed: ' Het staat onder “Sent out from this device” als mislukt.',
    answered: 'De tool heeft geantwoord.', problem: 'De tool meldde een probleem.', listed: 'Deze aanroep staat onder “Sent out from this device”: wanneer, welke server en welke tool — nooit de argumenten of het antwoord.',
    notListed: 'Deze aanroep staat niet in de geschiedenis (dit gesprek wordt niet bewaard, of de geschiedenis kon niet worden geschreven).',
    fromTool: 'Van de tool · niet vertrouwd', cut: ' · ingekort', asItIs: 'Dit is de eigen tekst van de tool, getoond zoals hij is: NOVA volgt hem niet, links erin kun je niet aanklikken, en hij kan geen andere tool starten of een instelling wijzigen.',
  },
};
