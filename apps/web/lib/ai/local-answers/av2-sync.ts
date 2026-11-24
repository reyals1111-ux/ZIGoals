import type {ToolEnv} from '../tools/env';
import type {BackupReminder} from '../../backup-reminder';
import {EVERY_WORDS, nextDueOn, scheduleDue} from '../../backup-folder/schedule';
import {answer, asked, dayIn, isQuestion, list, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (sync and appearance; LEDGER #41, #134, #209, #34, N6 #191–#193): NOVA's and ZIGi's on-device answers,
 * in English and Dutch, to what lane 2's sync and appearance features hold: which of the journal, the money records and
 * the workout log this device syncs, Dark's style and the font, and the scheduled copy. Each reads the device's own
 * choice (never a record's content); the choices come in `extra` (the lead reads them where it builds the env: the
 * extras' choice `zigoals:extras-sync-choice:v1` via lib/vault/extras-sync.ts readExtrasSectionsChoice, the display
 * record via lib/ui-prefs/theme.ts readTheme and lib/ui-prefs/dark-style.ts readDarkStyle and lib/ui-prefs/look.ts
 * readLook, the reminder via lib/backup-reminder.ts). Without them the answer says where the choice lives. Called like
 * `avAnswer` in engine.ts (the lead wires it); null when the question is not one of these.
 */
export type Av2SyncExtra = {
  sections?: {journal: boolean; money: boolean; workouts: boolean} | null;
  /** "Also sync my extras" on this device (the three ride with it). */
  extrasOn?: boolean | null;
  look?: {theme: string; darkStyle: string; font: string} | null;
  backup?: BackupReminder | null;
};
type Ask = Asked & {extra: Av2SyncExtra};

export function av2SyncAnswer(question: string, env: ToolEnv, extra: Av2SyncExtra = {}): LocalReply | null {
  try {
    const a = asked(question, env);
    // Dutch yes/no questions about sync start with the verb ("wordt mijn dagboek …"), which the shared list does not name.
    if (!a || MIXED.test(a.f) || !(isQuestion(a) || /^(?:wordt|worden)\b/.test(a.f))) return null;
    const ask: Ask = {...a, extra};
    for (const one of [synced, darkStyle, font, backup]) { const r = one(ask); if (r) return r; }
    return null;
  } catch { return null; }
}

const SETTINGS_SYNC = [{tool: 'settings', args: {section: 'sync'}, label: 'Settings → Account & sync'}];
const SETTINGS_LOOK = [{tool: 'settings', args: {section: 'appearance'}, label: 'Settings → Appearance'}];
const SETTINGS_DATA = [{tool: 'settings', args: {section: 'data'}, label: 'Settings → Your data'}];

/** LEDGER #41, #134, #209: "is my journal synced", "which records sync to my other devices". */
function synced(a: Ask): LocalReply | null {
  const en = /\b(?:is|are|does|do)\b.*\b(?:journal|diary|money|spending|budgets?|bills?|workouts?|workout log)\b.*\bsync(?:ed|ing|s)?\b|\bsync(?:ed|ing|s)? (?:my|the) (?:journal|diary|money|spending|workouts?)\b|\bwhat (?:syncs|is synced|gets synced)\b|\bwhich (?:records|data|parts) (?:sync|are synced)\b/.test(a.f);
  const nl = /\b(?:dagboek|uitgaven|geld|budgetten?|rekeningen|workouts?|trainingen)\b.*\bgesynchroniseerd\b|\bgesynchroniseerd\b.*\b(?:dagboek|uitgaven|geld|workouts?|trainingen)\b|\bwat (?:wordt|word) (?:er )?gesynchroniseerd\b|\bwelke (?:gegevens|onderdelen) (?:worden )?gesynchroniseerd\b/.test(a.f);
  if (!en && !nl) return null;
  const s = a.extra.sections, lang = a.lang;
  if (!s) return answer(say(lang, 'Whether your journal, money records and workout log sync is chosen per device in Settings → Account & sync, under Also sync my extras. Each stays on this device until you tick it there.', 'Of je dagboek, geldgegevens en trainingslog meegaan kies je per apparaat in Settings → Account & sync, onder Also sync my extras. Elk blijft op dit apparaat tot je het daar aanvinkt.'), SETTINGS_SYNC);
  const names = {journal: say(lang, 'your journal', 'je dagboek'), money: say(lang, 'your money records', 'je geldgegevens'), workouts: say(lang, 'your workout log', 'je trainingslog')};
  const on = (Object.keys(names) as (keyof typeof names)[]).filter(k => s[k]), off = (Object.keys(names) as (keyof typeof names)[]).filter(k => !s[k]);
  if (a.extra.extrasOn === false) return answer(say(lang, 'Extras sync is off on this device, so your journal, money records and workout log stay here. Settings → Account & sync turns it on.', 'Extra-synchronisatie staat uit op dit apparaat, dus je dagboek, geldgegevens en trainingslog blijven hier. Zet het aan in Settings → Account & sync.'), SETTINGS_SYNC);
  if (!on.length) return answer(say(lang, 'None of them: your journal, money records and workout log stay on this device. Tick each in Settings → Account & sync to have it travel, end-to-end encrypted.', 'Geen ervan: je dagboek, geldgegevens en trainingslog blijven op dit apparaat. Vink ze aan in Settings → Account & sync om ze versleuteld mee te laten gaan.'), SETTINGS_SYNC);
  const health = s.workouts ? say(lang, ' The workout log travels only while Health sync is on.', ' De trainingslog gaat alleen mee als Health-synchronisatie aan staat.') : '';
  return answer(say(lang, `This device syncs ${list(on.map(k => names[k]), 'en')}, end-to-end encrypted${off.length ? `; ${list(off.map(k => names[k]), 'en')} ${off.length === 1 && off[0] !== 'money' ? 'stays' : 'stay'} here` : ''}. Photos and voice notes stay on the device where you added them.${health}`,
    `Dit apparaat synchroniseert ${list(on.map(k => names[k]), 'nl')}, end-to-end versleuteld${off.length ? `; ${list(off.map(k => names[k]), 'nl')} ${off.length === 1 && off[0] !== 'money' ? 'blijft' : 'blijven'} hier` : ''}. Foto's en spraakmemo's blijven op het apparaat waar je ze toevoegde.${health}`), SETTINGS_SYNC);
}

const STYLE_WORDS: Record<string, {en: string; nl: string}> = {standard: {en: 'Standard', nl: 'Standaard'}, black: {en: 'Pure black', nl: 'Puur zwart'}, contrast: {en: 'High contrast', nl: 'Hoog contrast'}};
/** LEDGER #34, N6 #191: "is high contrast on", "which theme am I using", "is pure black on". */
function darkStyle(a: Ask): LocalReply | null {
  const en = /\bhigh contrast\b|\bpure black\b|\b(?:oled|amoled)\b|\b(?:which|what) theme\b|\bdark style\b/.test(a.f);
  const nl = /\bhoog contrast\b|\bpuur zwart\b|\bwelk(?:e)? thema\b|\bdonkere stijl\b/.test(a.f);
  if (!en && !nl) return null;
  const look = a.extra.look, lang = a.lang;
  if (!look) return answer(say(lang, 'The theme is chosen in the sidebar’s theme bar or Settings → Appearance; Dark’s style (Standard, Pure black or High contrast) is in Settings → Appearance → Customize, on this device only.', 'Het thema kies je in de themabalk of in Settings → Appearance; de stijl van Dark (Standard, Pure black of High contrast) staat in Settings → Appearance → Customize, alleen op dit apparaat.'), SETTINGS_LOOK);
  const theme = look.theme === 'light' ? 'Light' : look.theme === 'dark' ? 'Dark' : 'Nebula', style = STYLE_WORDS[look.darkStyle] ?? STYLE_WORDS.standard!;
  if (look.theme !== 'dark') return answer(say(lang, `You use ${theme}. Dark’s style is ${style.en}; it shows when Dark is on. High contrast (every word at least 7:1) and Pure black are in Settings → Appearance → Customize.`, `Je gebruikt ${theme}. De stijl van Dark is ${style.nl}; die zie je als Dark aan staat. High contrast (elk woord minstens 7:1) en Pure black staan in Settings → Appearance → Customize.`), SETTINGS_LOOK);
  return answer(say(lang, `You use Dark, style ${style.en}.${look.darkStyle === 'contrast' ? ' Every word is at least 7:1 on black, with strong focus rings.' : look.darkStyle === 'black' ? ' The page is true black, for OLED screens.' : ' Pure black and High contrast are in Settings → Appearance → Customize.'}`, `Je gebruikt Dark, stijl ${style.nl}.${look.darkStyle === 'contrast' ? ' Elk woord is minstens 7:1 op zwart, met duidelijke focusranden.' : look.darkStyle === 'black' ? ' De pagina is echt zwart, voor OLED-schermen.' : ' Pure black en High contrast staan in Settings → Appearance → Customize.'}`), SETTINGS_LOOK);
}

const FONT_WORDS: Record<string, string> = {system: 'System', inter: 'Inter', serif: 'Serif', rounded: 'Rounded', mono: 'Monospace'};
/** N6 #192: "which font am I using", "can I change the font". */
function font(a: Ask): LocalReply | null {
  const en = /\b(?:which|what) font\b|\bchange the font\b|\bfonts?\b.*\b(?:using|available|choose)\b/.test(a.f), nl = /\bwelk(?:e)? (?:lettertype|font)\b|\blettertype\b.*\b(?:veranderen|kiezen|wijzigen)\b/.test(a.f);
  if (!en && !nl) return null;
  const lang = a.lang, now = a.extra.look ? FONT_WORDS[a.extra.look.font] ?? 'System' : null;
  return answer(say(lang, `${now ? `Your font is ${now}. ` : ''}Settings → Appearance → Customize offers System, Inter, Serif, Rounded and Monospace, on this device only; Serif, Rounded and Monospace use the fonts the device already has.`, `${now ? `Je lettertype is ${now}. ` : ''}Settings → Appearance → Customize biedt System, Inter, Serif, Rounded en Monospace, alleen op dit apparaat; Serif, Rounded en Monospace gebruiken de lettertypen die het apparaat al heeft.`), SETTINGS_LOOK);
}

/** N6 #193: "when is my next backup", "when was my last backup", "do I have automatic backups". */
function backup(a: Ask): LocalReply | null {
  const en = /\b(?:next|last|latest|automatic|scheduled) (?:back ?ups?|cop(?:y|ies))\b|\bback ?ups?\b.*\b(?:when|schedule|automatic|folder)\b|\bwhen\b.*\bback ?ups?\b/.test(a.f);
  const nl = /\b(?:volgende|laatste|automatische|geplande) (?:back[ -]?ups?|kopie(?:en)?)\b|\bback[ -]?ups?\b.*\b(?:wanneer|automatisch|map)\b|\bwanneer\b.*\bback[ -]?ups?\b/.test(a.f);
  if (!en && !nl) return null;
  const r = a.extra.backup, lang = a.lang;
  if (!r) return answer(say(lang, 'A copy on a schedule is set in Settings → Your data: how often, and in Chrome or Edge on a computer a folder that ZIGoals writes Export everything into by itself. Nothing leaves your device.', 'Een kopie op schema stel je in bij Settings → Your data: hoe vaak, en in Chrome of Edge op een computer een map waarin ZIGoals Export everything zelf wegschrijft. Er verlaat niets je apparaat.'), SETTINGS_DATA);
  const last = r.schedule?.lastOn ?? r.savedOn;
  const lastWords = last ? say(lang, `The last copy was ${dayIn('en', last, a.today)}.`, `De laatste kopie was ${dayIn('nl', last, a.today)}.`) : say(lang, 'No copy is marked yet.', 'Er is nog geen kopie gemarkeerd.');
  if (!r.schedule) return answer(say(lang, `${lastWords} No scheduled copy is set; Settings → Your data → A copy on a schedule sets one.`, `${lastWords} Er is geen kopie op schema; die stel je in bij Settings → Your data → A copy on a schedule.`), SETTINGS_DATA);
  const next = nextDueOn(r, a.today)!, where = r.schedule.folder ? say(lang, ` into “${r.schedule.folder}”`, ` in “${r.schedule.folder}”`) : say(lang, ' (a reminder: this browser does not write into a folder)', ' (een herinnering: deze browser schrijft niet in een map)');
  const due = scheduleDue(r, a.today);
  return answer(say(lang, `A copy ${EVERY_WORDS[r.schedule.every].en}${where}. ${lastWords} ${due ? 'One is due now; it is made when you next open ZIGoals.' : `The next one is ${dayIn('en', next, a.today)}.`}`, `Een kopie ${EVERY_WORDS[r.schedule.every].nl}${where}. ${lastWords} ${due ? 'Er is er nu een aan de beurt; die wordt gemaakt als je ZIGoals opent.' : `De volgende is ${dayIn('nl', next, a.today)}.`}`), SETTINGS_DATA);
}
