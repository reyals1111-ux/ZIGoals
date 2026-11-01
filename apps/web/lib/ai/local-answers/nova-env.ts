import type {ToolEnv} from '../tools/env';
import {HEALTH_CLOSED} from '../tools/format';
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
/** Why Health is not read by NOVA here, and the one place to turn it on. */
export function novaHealthClosed(info: NovaEnvInfo, lang: Lang = 'en'): string {
  if (lang === 'nl') {
    if (!info.healthScope) return `Health staat uit voor NOVA, dus er wordt niets uit Health gelezen. Zet Health aan in ${NOVA_PERMISSIONS_NL}${info.healthGate ? '' : ', met daar ook Health page data en Include Health (Include Health werkt zodra Health op je Today-pagina staat)'}.`;
    return `Health staat aan voor NOVA, maar het delen van Health staat uit op dit apparaat, dus er wordt niets uit Health gelezen. Zet in ${NOVA_PERMISSIONS_NL} Health page data en Include Health aan (Include Health werkt zodra Health op je Today-pagina staat).`;
  }
  if (!info.healthScope) return `Health is off for NOVA, so nothing from Health is read here. Turn on Health in ${NOVA_PERMISSIONS}${info.healthGate ? '' : ', with Health page data and Include Health there (Include Health works once Health is on your Today page)'}.`;
  return `Health is on for NOVA, but Health sharing is off on this device, so nothing from Health is read here. In ${NOVA_PERMISSIONS}, turn on Health page data and Include Health (Include Health works once Health is on your Today page).`;
}
const AREA_WORDS: Record<string, string> = {Today: 'Today (your agenda, tasks, focus and Checklist)', Goals: 'Goals', Habits: 'Habits', Wealth: 'Wealth'};
/** An area NOVA → Permissions keeps closed (on this device every other area is open to on-device answers). */
export const novaAreaClosed = (area: string, lang: Lang = 'en') => lang === 'nl'
  ? `${area} staat uit voor NOVA, dus dat wordt hier niet gelezen. Zet het aan in ${NOVA_PERMISSIONS_NL}.`
  : `${AREA_WORDS[area] ?? area} is off for NOVA, so it is not read here. Turn it on in ${NOVA_PERMISSIONS}.`;
const HEALTH_REFUSAL = /^Health is(?:n[’']t| not) shared with ZIGi\b/;
const AREA_REFUSAL = /^(Today|Goals|Habits|Wealth) isn[’']t shared with ZIGi here\b/;
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
  const text = reply.text.replace(/(is(?:n[’']t| not)|are not|aren[’']t) shared with ZIGi\b/g, '$1 shared with NOVA');
  return text === reply.text ? reply : {...reply, text};
}
