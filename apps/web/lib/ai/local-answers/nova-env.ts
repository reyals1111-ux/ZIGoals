import type {ToolEnv} from '../tools/env';
import {HEALTH_CLOSED, HEALTH_CLOSED_NL} from '../tools/format';
import type {LocalReply} from './engine';

/**
 * Release review 2 (R2-2): NOVA's on-device answers read under NOVA's own permissions (lib/nova/local-env.ts builds the
 * environment: ZIGi's local gates narrowed by NOVA → Permissions) and say why something is not read in NOVA's words, with
 * the place to change it in NOVA ("NOVA → Permissions"), never a path through ZIGi's settings.
 *
 * An environment is NOVA's when lib/nova/local-env.ts marked it here. The mark lives beside the object (a WeakMap), so the
 * environment's shape and every ZIGi path stay exactly as they were: an unmarked environment (ZIGi's panel, the golden set,
 * the evals) is answered byte for byte as before.
 */
export type NovaEnvInfo = {
  /** NOVA → Permissions: Health is allowed for NOVA. */ healthScope: boolean;
  /** This device's three-part Health gate (Health page data, Include Health, Health on Today, the account's permission). */ healthGate: boolean;
  /** NOVA → Permissions: Today (agenda, tasks, focus, Checklist) is allowed for NOVA (absent: allowed). */ todayScope?: boolean;
};
const NOVA_ENVS = new WeakMap<object, NovaEnvInfo>();
export function markNovaEnv<T extends ToolEnv>(env: T, info: NovaEnvInfo): T { NOVA_ENVS.set(env, {...info}); return env; }
export const novaEnvInfo = (env: ToolEnv | null | undefined): NovaEnvInfo | null => env ? NOVA_ENVS.get(env) ?? null : null;

/** Where NOVA's permissions are changed (the chat offers a button to it, components/nova/chat/nova-turns.tsx). */
export const NOVA_PERMISSIONS = 'NOVA → Permissions';
/** The panel's name as the app shows it, in a Dutch sentence too (the app's labels are English). */
export const NOVA_PERMISSIONS_NL = NOVA_PERMISSIONS;
type Lang = 'en' | 'nl';
/**
 * Why Health is not read by NOVA here, and the one place to turn it on. Session AV lane 2 (fr-answers; FR-TJ-1): the one
 * switch that matters, Allow Health in NOVA → Permissions (components/nova/panels/permissions-panel.tsx: one tap opens
 * NOVA's Health scope, Health page data and Include Health together), never the three switches to find one by one.
 */
export function novaHealthClosed(info: NovaEnvInfo, lang: Lang = 'en'): string {
  if (lang === 'nl') {
    if (!info.healthScope) return `Health staat uit voor NOVA, dus er wordt niets uit Health gelezen. Tik op Allow Health in ${NOVA_PERMISSIONS_NL}: één tik opent Health (de knop staat er zodra Health op je Today-pagina staat).`;
    return `Health staat aan voor NOVA, maar het delen van Health staat uit op dit apparaat, dus er wordt niets uit Health gelezen. Tik op Allow Health in ${NOVA_PERMISSIONS_NL}: één tik opent het (de knop staat er zodra Health op je Today-pagina staat).`;
  }
  if (!info.healthScope) return `Health is off for NOVA, so nothing from Health is read here. Tap Allow Health in ${NOVA_PERMISSIONS}: one tap opens Health (the button is there once Health is on your Today page).`;
  return `Health is on for NOVA, but Health sharing is off on this device, so nothing from Health is read here. Tap Allow Health in ${NOVA_PERMISSIONS}: one tap opens it (the button is there once Health is on your Today page).`;
}
const AREA_WORDS: Record<string, string> = {Today: 'Today (your agenda, tasks, focus and Checklist)', Goals: 'Goals', Habits: 'Habits', Wealth: 'Wealth'};
/** An area NOVA → Permissions keeps closed (on this device every other area is open to on-device answers). */
export const novaAreaClosed = (area: string, lang: Lang = 'en') => lang === 'nl'
  ? `${area} staat uit voor NOVA, dus dat wordt hier niet gelezen. Zet het aan in ${NOVA_PERMISSIONS_NL}.`
  : `${AREA_WORDS[area] ?? area} is off for NOVA, so it is not read here. Turn it on in ${NOVA_PERMISSIONS}.`;
const HEALTH_REFUSAL = /^Health is(?:n[’']t| not) shared with ZIGi\b/;
const AREA_REFUSAL = /^(Today|Goals|Habits|Wealth) isn[’']t shared with (?:ZIGi|NOVA) here\b/;
/**
 * A reply on NOVA's environment in NOVA's words: a Health or area refusal names NOVA → Permissions (and carries no lookup,
 * so "Ask my AI for more" cannot send what NOVA does not read); "shared with ZIGi" in an answer's note reads "with NOVA".
 */
/** Today's own records (lane NE's narrowing keeps the Today area open for Notes and the Journal, so these are checked here). */
const TODAY_TOOLS = new Set(['agenda', 'tasks', 'focus_sessions', 'checklist_today', 'calendar_events']);
export function novaWording(reply: LocalReply, info: NovaEnvInfo, lang: Lang = 'en'): LocalReply {
  if (!('text' in reply)) return reply;
  if (info.todayScope === false && reply.calls.some(c => TODAY_TOOLS.has(c.tool))) return {kind: 'refusal', text: novaAreaClosed('Today', lang), calls: []};
  if (reply.kind === 'refusal') {
    if (reply.text === HEALTH_CLOSED || HEALTH_REFUSAL.test(reply.text)) return {...reply, text: novaHealthClosed(info, lang), calls: []};
    const area = AREA_REFUSAL.exec(reply.text);
    if (area) return {...reply, text: novaAreaClosed(area[1]!, lang), calls: []};
    if (/^Paused on this private screen: ZIGi reads nothing here\.$/.test(reply.text)) return {...reply, text: 'Paused on this private screen: NOVA reads nothing here.'};
  }
  // Session AL fourth pass (L7-4b; Berlin BN-047, AL-COPY-060): NOVA speaks as NOVA ("ZIGi checks off one item at a time",
  // "so ZIGi makes no Health card"); the places that carry ZIGi's name stay as the app names them.
  // Session AL (BN-047, the "sleep better" pointer): in NOVA, a model is connected in NOVA → Setup (Your brain), not ZIGi's
  // Settings — the pointer names NOVA's own place.
  const text = reply.text.replace(/Settings → ZIGi connects\b/g, 'NOVA → Setup (Your brain) connects').replace(/in Settings → ZIGi; it then answers/g, 'in NOVA → Setup (Your brain); it then answers')
    .replace(/(is(?:n[’']t| not)|are not|aren[’']t) shared with ZIGi\b/g, '$1 shared with NOVA')
    .replace(/(?<!Actions by |Settings → |What |what |→ )\bZIGi\b(?! knows about me| · your companion|’s (?:panel|page))/g, 'NOVA');
  return text === reply.text ? reply : {...reply, text};
}

/**
 * Session AU (D-ALLOW-HEALTH): the one button to where Health is allowed, for a reply that says Health is not shared. On
 * ZIGi's panel: the existing open-page card to Settings → ZIGi (its Privacy & data holds both switches; nothing is
 * written, the person turns them on there). On NOVA: the words name NOVA → Permissions, which holds the same switches and
 * which NOVA's chat turns into its one button (components/nova/chat/nova-turns.tsx), so no second card is added.
 */
export const ALLOW_HEALTH_CARD = `\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'open-page', page: 'settings', view: 'zigi'})}\n\`\`\``;
export function allowHealth(env: ToolEnv | null | undefined, lang: Lang = 'en'): string {
  if (!novaEnvInfo(env)) return ALLOW_HEALTH_CARD;
  return lang === 'nl' ? `\n\nHealth sta je toe in ${NOVA_PERMISSIONS_NL}.` : `\n\nHealth is allowed in ${NOVA_PERMISSIONS}.`;
}
/**
 * Session AU (D-ALLOW-HEALTH): ZIGi's own Health-closed refusal, in the question's language (a Dutch question got the
 * English line), with the one button to Settings → ZIGi. NOVA's environment is left as it is: novaWording already says
 * it in NOVA's words, in either language, naming NOVA → Permissions.
 */
export function zigiHealthClosed(reply: LocalReply, env: ToolEnv | null | undefined, lang: Lang): LocalReply {
  if (novaEnvInfo(env) || reply.kind !== 'refusal' || reply.text !== HEALTH_CLOSED) return reply;
  return {...reply, text: (lang === 'nl' ? HEALTH_CLOSED_NL : HEALTH_CLOSED) + ALLOW_HEALTH_CARD};
}
