import type {OnDeviceAvailability} from './on-device';

/**
 * "Which setup fits me?" (Session V Part 15): three or four taps to a recommendation with honest pros and cons and the
 * exact next steps. Computed on this device from the answers and what this browser can do; nothing is sent. The
 * hosted route is offered only when this build and the person's account have it.
 */
export type Have = 'subscription' | 'api' | 'nothing';
export type Where = 'computer' | 'phone';
export type Matters = 'privacy' | 'quality' | 'free';
export type Memory = 'plenty' | 'little' | 'unknown';
export type Answers = {have: Have; where: Where; matters: Matters; memory?: Memory};
export type Route = 'local' | 'on-device' | 'api' | 'subscription' | 'hosted';
export type Recommendation = {route: Route; title: string; why: string; pros: string[]; cons: string[]; steps: string[]; also?: Route};
export const QUESTIONS = {
  have: {label: 'What do you have today?', options: {subscription: 'A ChatGPT, Claude, Gemini or Grok subscription', api: 'An API account with an AI provider', nothing: 'Nothing yet'}},
  where: {label: 'Where do you use ZIGoals most?', options: {computer: 'On a computer', phone: 'On a phone'}},
  matters: {label: 'What matters most to you?', options: {privacy: 'Nothing leaves my computer', quality: 'The best answers', free: 'No extra cost'}},
  memory: {label: 'How much memory does your computer have?', options: {plenty: '16 GB or more', little: 'Less than 16 GB', unknown: 'I don’t know'}},
} as const;
/** Each route's name, for "Also a good fit". */
export const ROUTE_TITLES: Record<Route, string> = {local: 'a local model on this computer (Ollama or LM Studio)', 'on-device': 'Chrome’s on-device model', api: 'an API key from a provider', subscription: 'the subscription bridge', hosted: 'ZIGoals hosted'};
/** Whether the memory question applies (only a computer can run a model). */
export const asksMemory = (answers: Partial<Answers>) => answers.where === 'computer' && (answers.matters === 'privacy' || answers.matters === 'free');
const LOCAL: Omit<Recommendation, 'why'> = {route: 'local', title: 'A local model on this computer (Ollama or LM Studio)',
  pros: ['Free to run', 'Nothing leaves your computer', 'Works without the internet once set up'],
  cons: ['Needs a capable computer (16 GB of memory or more)', 'Smaller models answer less well than the best cloud ones', 'A one-time setup of a few minutes'],
  steps: ['Install Ollama (ollama.com) or LM Studio (lmstudio.ai) on this computer.', 'Download a model there (a small chat model to start).', 'Settings → ZIGi · your AI → "I run a model on this computer", then pick the model. The setup says exactly what to allow for this site.']};
const ON_DEVICE: Omit<Recommendation, 'why'> = {route: 'on-device', title: 'Chrome’s on-device model',
  pros: ['Free', 'Nothing leaves your computer', 'No account and no key'],
  cons: ['Chrome on a computer only', 'A large one-time download (about 22 GB of free space)', 'A small model: short answers and rewording, not long plans'],
  steps: ['Settings → ZIGi · your AI → "Chrome’s on-device model" → Download.', 'Keep this tab open while Chrome downloads it; it says when it is ready.']};
const API: Omit<Recommendation, 'why'> = {route: 'api', title: 'An API key from a provider',
  pros: ['The best answers, with tools and proposal cards', 'Works on phones and computers', 'You pay only for what you use'],
  cons: ['Costs money per message, at your provider\u2019s own prices', 'The key stays on this device; you add it on each device you use'],
  steps: ['Create a key at your provider (OpenAI, Anthropic, Google, xAI or OpenRouter).', 'Set a monthly spending limit in that provider’s billing settings first.', 'Settings → ZIGi · your AI → "I have an API key", paste it. ZIGi’s own soft cap is under Usage.']};
const BRIDGE: Omit<Recommendation, 'why'> = {route: 'subscription', title: 'The subscription bridge',
  pros: ['Uses the subscription you already pay for', 'No key, no extra cost'],
  cons: ['Copy and paste: ZIGi writes the prompt, you paste it into the app', 'Answers cannot become cards here'],
  steps: ['Settings → ZIGi · your AI → "I only have a subscription", pick your app.', 'Ask in ZIGi, copy the prompt, paste it into the app.']};
/** The recommendation for these answers, given what Chrome says about its own model here and whether hosted is offered. */
export function recommend(answers: Answers, {onDevice, hosted = false}: {onDevice: OnDeviceAvailability; hosted?: boolean}): Recommendation {
  const chromeModel = onDevice === 'available' || onDevice === 'downloadable' || onDevice === 'downloading';
  if (answers.where === 'computer' && answers.matters === 'privacy') {
    if (answers.memory === 'plenty') return {...LOCAL, why: 'You want nothing to leave your computer, and it has the memory a local model needs.', ...(chromeModel ? {also: 'on-device' as const} : {})};
    if (chromeModel) return {...ON_DEVICE, why: 'You want nothing to leave your computer; Chrome’s own model runs on it without a big local setup.', also: 'local'};
    return {...LOCAL, why: 'You want nothing to leave your computer. A local model does that; check that it has 16 GB of memory or more first.'};
  }
  if (answers.where === 'phone' && answers.matters === 'privacy') {
    // A phone runs no model, so an AI always means sending something; the bridge sends only what the person copies.
    return {...BRIDGE, why: 'A phone cannot run a model, so any AI means sending something. With the bridge you see and copy exactly what goes, and ZIGi’s own answers about your records never leave the phone.', ...(answers.have === 'api' ? {also: 'api' as const} : {})};
  }
  if (answers.matters === 'free') {
    if (answers.where === 'computer' && chromeModel) return {...ON_DEVICE, why: 'No extra cost and nothing to set up beyond one download in Chrome.', ...(answers.memory === 'plenty' ? {also: 'local' as const} : {})};
    if (answers.have === 'subscription') return {...BRIDGE, why: 'No extra cost: your subscription does the answering.'};
    if (answers.where === 'computer' && answers.memory === 'plenty') return {...LOCAL, why: 'No extra cost: a model on your own computer.'};
    return {...BRIDGE, why: 'Without a subscription or a capable computer, ZIGi still answers questions about your records on this device; the bridge works once you have any chat app.', also: 'api'};
  }
  if (hosted) return {route: 'hosted', title: 'ZIGoals hosted', why: 'The best answers without a key of your own, within your plan’s limits.', pros: ['No key to manage', 'Works on phones and computers'], cons: ['Your messages pass through ZIGoals to its provider (nothing is stored)', 'Daily limits apply'], steps: ['Settings → ZIGi · your AI → "ZIGoals hosted", read what passes through, then turn it on.'], also: 'api'};
  if (answers.have === 'subscription') return {...API, why: 'For the best answers inside ZIGoals (tools and cards) a key is needed; your subscription stays useful through the bridge.', also: 'subscription'};
  return {...API, why: answers.have === 'api' ? 'You already have an API account: it gives the best answers here.' : 'The best answers here, with tools and cards; you pay your provider for what you use.'};
}
