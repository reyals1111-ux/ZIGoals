import {MAILTO_MAX, type Handoff, type HandoffKind, type HandoffLang} from './handoff';

/**
 * Session AM-2 (owner's step 4b): the words of a hand-off card, in English and Dutch. A card says what it is, exactly what
 * will leave and to where, what its button does, and that nothing has happened yet. NOVA never says something was sent:
 * the person sends, saves, shares, opens or copies.
 */
type Words = Readonly<Record<HandoffLang, string>>;
export const CARD_TITLE: Readonly<Record<HandoffKind, Words>> = {
  email: {en: 'Email draft', nl: 'E-mailconcept'},
  calendar: {en: 'Add to your calendar', nl: 'In je agenda zetten'},
  share: {en: 'Share', nl: 'Delen'},
  link: {en: 'Open a link', nl: 'Een link openen'},
  copy: {en: 'Copy', nl: 'Kopiëren'},
};
/** The button that hands over. */
export const CARD_ACTION: Readonly<Record<HandoffKind, Words>> = {
  email: {en: 'Open in your mail app', nl: 'Openen in je mailapp'},
  calendar: {en: 'Save the calendar file', nl: 'Agendabestand opslaan'},
  share: {en: 'Share…', nl: 'Delen…'},
  link: {en: 'Open in a new tab', nl: 'Openen in een nieuw tabblad'},
  copy: {en: 'Copy', nl: 'Kopiëren'},
};
/** Under the title: what the button does, and who does the sending. */
export const CARD_PROMISE: Readonly<Record<HandoffKind, Words>> = {
  email: {en: 'Nothing is sent. The button opens this draft in your own mail app; you send it there.', nl: 'Er wordt niets verstuurd. De knop opent dit concept in je eigen mailapp; daar verstuur jij het.'},
  calendar: {en: 'Nothing is added yet. The button saves a small .ics file on this device; open it with your calendar app to add the event.', nl: 'Er wordt nog niets toegevoegd. De knop slaat een klein .ics-bestand op dit apparaat op; open het met je agenda-app om de afspraak toe te voegen.'},
  share: {en: 'Nothing is shared yet. The button opens your device’s own share sheet; you choose the app and send it there.', nl: 'Er wordt nog niets gedeeld. De knop opent het deelmenu van je apparaat; jij kiest de app en verstuurt het daar.'},
  link: {en: 'Nothing is opened yet. The button opens this address in a new tab; that site then sees your visit, not ZIGoals.', nl: 'Er wordt nog niets geopend. De knop opent dit adres in een nieuw tabblad; die site ziet dan je bezoek, niet ZIGoals.'},
  copy: {en: 'Nothing is copied yet. The button puts exactly this text on your clipboard.', nl: 'Er wordt nog niets gekopieerd. De knop zet precies deze tekst op je klembord.'},
};
export const SHARE_FALLBACK: Words = {en: 'This browser has no share sheet, so the button copies the text instead.', nl: 'Deze browser heeft geen deelmenu, dus kopieert de knop de tekst.'};
export const COPY_TEXT_ACTION: Words = {en: 'Copy the text', nl: 'Tekst kopiëren'};
export const COPY_INSTEAD_ACTION: Words = {en: 'Copy instead', nl: 'In plaats daarvan kopiëren'};
export const NOT_NOW: Words = {en: 'Not now', nl: 'Niet nu'};
export const OPEN_WITHOUT_TEXT: Words = {en: 'Open in your mail app (address and subject only)', nl: 'Openen in je mailapp (alleen adres en onderwerp)'};
/** What NOVA says in the conversation when a card is ready (the card itself shows the content). */
export const READY_WORDS: Readonly<Record<HandoffKind, Words>> = {
  email: {en: 'A draft is ready on the card below. Nothing is sent: check it, open it in your own mail app, and send it there.', nl: 'Er staat een concept klaar op de kaart hieronder. Er wordt niets verstuurd: controleer het, open het in je eigen mailapp en verstuur het daar.'},
  calendar: {en: 'A calendar file is ready on the card below. Check the day and time, then save it and open it with your calendar app.', nl: 'Er staat een agendabestand klaar op de kaart hieronder. Controleer de dag en de tijd, sla het dan op en open het met je agenda-app.'},
  share: {en: 'Ready to share, on the card below. Nothing leaves until you press Share and choose where it goes.', nl: 'Klaar om te delen, op de kaart hieronder. Er gaat niets weg tot je op Delen drukt en kiest waar het heen gaat.'},
  link: {en: 'The link is on the card below with its real address. It opens only when you press the button.', nl: 'De link staat op de kaart hieronder met zijn echte adres. Hij opent pas als jij op de knop drukt.'},
  copy: {en: 'Ready to copy, on the card below.', nl: 'Klaar om te kopiëren, op de kaart hieronder.'},
};
/** What the card says after its button was pressed (never "sent"). */
export const DONE_WORDS: Readonly<Record<HandoffKind, Words>> = {
  email: {en: 'Opened in your mail app. Send it there when it reads right.', nl: 'Geopend in je mailapp. Verstuur het daar als het goed staat.'},
  calendar: {en: 'Saved. Open the file with your calendar app to add the event.', nl: 'Opgeslagen. Open het bestand met je agenda-app om de afspraak toe te voegen.'},
  share: {en: 'Handed to your share sheet.', nl: 'Doorgegeven aan je deelmenu.'},
  link: {en: 'Opened in a new tab.', nl: 'Geopend in een nieuw tabblad.'},
  copy: {en: 'Copied.', nl: 'Gekopieerd.'},
};
export const FAILED_WORDS: Readonly<Record<HandoffKind, Words>> = {
  email: {en: 'Your mail app did not open. Copy the text and write the email there yourself.', nl: 'Je mailapp ging niet open. Kopieer de tekst en schrijf de e-mail daar zelf.'},
  calendar: {en: 'The file could not be saved on this device.', nl: 'Het bestand kon niet op dit apparaat worden opgeslagen.'},
  share: {en: 'Nothing was shared.', nl: 'Er is niets gedeeld.'},
  link: {en: 'The link did not open.', nl: 'De link ging niet open.'},
  copy: {en: 'This browser did not allow copying. Select the text and copy it yourself.', nl: 'Deze browser liet kopiëren niet toe. Selecteer de tekst en kopieer hem zelf.'},
};
export const HEALTH_CLOSED_WORDS: Words = {
  en: 'Not made: this would carry Health details, and Health is not shared with NOVA right now. Turn on Health in NOVA → Permissions and the Health switch in Settings first, or ask without the Health part.',
  nl: 'Niet gemaakt: hier zouden Health-gegevens in staan, en Health wordt nu niet met NOVA gedeeld. Zet eerst Health aan in NOVA → Permissions en de Health-schakelaar in Settings, of vraag het zonder het Health-deel.',
};
export const PRIVATE_SCREEN_WORDS: Words = {
  en: 'Paused on this private screen: I read nothing here, so I cannot take that from the conversation. Say the words themselves, for example “draft an email to name@example.com about dinner”.',
  nl: 'Gepauzeerd op dit privéscherm: ik lees hier niets, dus ik kan dat niet uit het gesprek halen. Zeg de woorden zelf, bijvoorbeeld “mail naam@voorbeeld.nl over het etentje”.',
};
/** The honest notes a card carries about its own content. */
export function cardNotes(h: Handoff, lang: HandoffLang): string[] {
  const nl = lang === 'nl', notes: string[] = [];
  if (h.kind === 'email') {
    if (!h.to.length) notes.push(h.named
      ? (nl ? `Geen adres in je woorden: vul het adres van ${h.named} in je mailapp in.` : `No address in your words: fill in ${h.named}’s address in your mail app.`)
      : (nl ? 'Nog geen adres: vul het in je mailapp in.' : 'No address yet: fill it in in your mail app.'));
    if (!h.bodyInLink) notes.push(nl
      ? `De tekst is te lang voor een maillink (een link draagt ongeveer ${MAILTO_MAX.toLocaleString('nl-NL')} tekens). Kopieer de tekst, open je mailapp met adres en onderwerp, en plak hem daar.`
      : `The text is too long for a mail link (a link carries about ${MAILTO_MAX.toLocaleString('en-US')} characters). Copy the text, open your mail app with the address and subject, and paste it there.`);
  }
  if (h.kind === 'link') {
    if (h.untrusted) notes.push(nl ? 'Deze link komt niet uit je eigen woorden (maar uit het antwoord van een model, een opzoeking of geplakte tekst). Controleer het adres voor je hem opent.' : 'This link did not come from your own words (it came from a model’s reply, a lookup or pasted text). Check the address before you open it.');
    if (h.written) notes.push(nl ? `Geschreven als “${h.written}”; de echte site is ${h.host}.` : `Written as “${h.written}”; the real site is ${h.host}.`);
    if (h.idn) notes.push(nl ? `Dit adres gebruikt een internationale naam. Hierboven staat de echte naam, zoals je browser hem opvraagt (${h.host}); zo’n naam kan op een andere lijken.` : `This address uses an internationalised name. Shown is its real name, as your browser asks for it (${h.host}); such a name can look like another one.`);
    if (!h.secure) notes.push(nl ? 'Niet versleuteld (http): anderen op het netwerk kunnen meelezen.' : 'Not encrypted (http): others on the network can read along.');
  }
  if (h.kind === 'calendar') notes.push(h.time
    ? (nl ? 'De tijd is die van je eigen klok: de afspraak staat op dit uur, waar je ook bent.' : 'The time is your own clock’s: the event shows at this hour wherever you are.')
    : (nl ? 'Een afspraak voor de hele dag.' : 'An all-day event.'));
  return notes;
}
