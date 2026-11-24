/**
 * Session AV lane 2 (bodymind-r2; LEDGER #231, Reflectly's space to vent): "Write it out", a page that is never saved. Its
 * words live only in the page's memory; "Let it go" clears them on purpose with one calm closing line (written here in
 * English and Dutch); "Keep as an entry" makes an ordinary journal entry marked with this template id. Pure.
 */
export const WRITE_IT_OUT_ID = 'write-it-out';
export const LET_GO_LINES = {
  en: ['It is out of your head now. Nothing was kept.', 'Let go. The page is empty again, and nothing was saved.', 'That was yours to say, and it is gone now. Nothing was kept.', 'Written and released. Take a slow breath; nothing was saved.', 'The words are gone. You can start fresh whenever you like.'],
  nl: ['Het is nu uit je hoofd. Er is niets bewaard.', 'Losgelaten. De pagina is weer leeg en er is niets opgeslagen.', 'Dat mocht je zeggen, en nu is het weg. Er is niets bewaard.', 'Opgeschreven en losgelaten. Haal rustig adem; er is niets opgeslagen.', 'De woorden zijn weg. Je kunt opnieuw beginnen wanneer je wilt.'],
} as const;
/** The closing line for a moment (a different one through the day), in English or Dutch. */
export function letGoLine(now: number, lang: 'en' | 'nl'): string {
  const list = LET_GO_LINES[lang], i = Math.floor(now / 60_000) % list.length;
  return list[(i + list.length) % list.length]!;
}
