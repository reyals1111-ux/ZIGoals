import {healthBlockOf, type ToolEnv} from '../tools/env';
import {HEALTH_CLOSED_BY} from '../tools/format';
import type {LocalReply} from './engine';
import {allowHealth, novaEnvInfo, novaHealthClosed} from './nova-env';

type Lang = 'en' | 'nl';
const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;
const OPEN_ZIGI_SETTINGS = `\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'open-page', page: 'settings', view: 'zigi'})}\n\`\`\``;
const norm = (raw: string) => raw.trim().replace(/[’`]/g, '\'').replace(/\s+/g, ' ');
/**
 * "Can you see my health?", "is my health shared", "kun je mijn gezondheid zien?": whether Health is shared with the answer
 * on this device. Shared: yes, and the switch that turns it off (Settings → ZIGi). Not shared: NOVA's words on NOVA; on
 * ZIGi's panel the one button, or (Session AW fr-answers review) the reason where Allow Health cannot open it.
 */
export function healthSharedText(env: ToolEnv | null, lang: Lang): string {
  if (env?.health) return say(lang, 'Yes: Health is shared with me on this device right now, so I can read your diary, water, sleep and the rest when you ask. Settings → ZIGi → Include Health turns it off.', 'Ja: Health is nu op dit apparaat met mij gedeeld, dus ik kan je dagboek, water, slaap en de rest lezen als je het vraagt. Settings → ZIGi → Include Health zet het uit.') + OPEN_ZIGI_SETTINGS;
  if (env && novaEnvInfo(env)) return novaHealthClosed(novaEnvInfo(env)!, lang);
  const block = healthBlockOf(env);
  if (block) return say(lang, 'No: ', 'Nee: ') + HEALTH_CLOSED_BY[block][lang];
  return say(lang, 'No: Health is not shared with me now, so I don’t read your diary, water, sleep or weight. To share it, tap Allow Health in NOVA → Permissions: one tap opens it.', 'Nee: Health is nu niet met mij gedeeld, dus ik lees je dagboek, water, slaap of gewicht niet. Tik op Allow Health in NOVA → Permissions om het te delen: één tik opent het.') /* Session AW (p5-answers, FR-S-16; fr-answers, FR-AW-9: no bracket) */ + allowHealth(env, lang);
}
/**
 * Session AW (fr-answers review; the integrator's finding): "is my health shared" got Health's summary (the exact layer
 * read "health" as the part of life), and "kun je mijn gezondheid zien?" / "is mijn health gedeeld" opened Health with
 * "Opening Health." (the navigation reading of "zien"): only "can you see my health?" reached the answer above, late in
 * the no-model path. The whole question, and nothing more, is read here before any other layer (engine.ts deviceAnswer,
 * after the guard), in the language its pattern is in; any longer question ("can you see my health score") keeps its own.
 */
const HEALTH_WORD = String.raw`(?:my |mijn |m'n )?(?:health|gezondheid)(?:sgegevens|[ -]?(?:data|records|info|information|gegevens))?`;
const SHARED_EN = new RegExp(String.raw`^(?:(?:hey |hi |so |and |ok |okay )?(?:zigi|nova)?,? ?)?(?:(?:can|do|could) you (?:see|read|access|use)(?: all)? ${HEALTH_WORD}|do you have (?:access to )?${HEALTH_WORD}|(?:is|are) ${HEALTH_WORD} (?:shared|visible|open)(?: with you)?|are you (?:reading|allowed to read) ${HEALTH_WORD})(?: (?:now|right now|here|on this device))?\s*[?.!]*$`, 'i');
const SHARED_NL = new RegExp(String.raw`^(?:(?:hoi |hey |en |dus )?(?:zigi|nova)?,? ?)?(?:(?:kun|kan|mag) (?:je|jij|u) ${HEALTH_WORD} (?:zien|lezen|inzien|gebruiken)|zie je ${HEALTH_WORD}|lees je ${HEALTH_WORD}|heb je toegang tot ${HEALTH_WORD}|(?:is|zijn) ${HEALTH_WORD} (?:gedeeld|zichtbaar|open)(?: met (?:jou|je))?|deel ik ${HEALTH_WORD}(?: met (?:jou|je))?)(?: (?:nu|hier|op dit apparaat))?\s*[?.!]*$`, 'i');
export function healthSharedAnswer(question: string, env: ToolEnv | null): LocalReply | null {
  const q = norm(question);
  if (!q || q.length > 120) return null;
  const lang: Lang | null = SHARED_NL.test(q) ? 'nl' : SHARED_EN.test(q) ? 'en' : null;
  return lang ? {kind: 'answer', text: healthSharedText(env, lang), calls: []} : null;
}
