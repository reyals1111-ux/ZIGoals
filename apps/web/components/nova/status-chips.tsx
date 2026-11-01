'use client';
import Link from 'next/link';
import {useAiSettings} from '../ai/use-ai-settings';
import {useDeviceRecord} from '../ai/use-device-record';
import {AI_MEMORY, AI_OPTIONS} from '../../lib/ai/store/records';
import {usingNotes} from '../../lib/ai/memory';
import {PROVIDERS} from '../../lib/ai/providers';
import {NOVA_SETUP} from '../../lib/nova/setup';
import {scopesOf} from '../../lib/nova/scopes';
import {PRIVACY_WORDS} from '../../lib/nova/privacy-mode';
import {NOVA_HERMES, isHermesBase} from '../../lib/nova/hermes-record';
import {useOnline} from './use-nova';

/**
 * Session AK (owner follow-up 2, N2; lane NA): NOVA's status chips, read from ZIGi's own engine settings (one engine, Q28):
 * the brain (on-device answers, a model on this computer, the person's own cloud key, Chrome's on-device model), the privacy
 * mode (NC's lib/nova/privacy-mode.ts), memory on or off, the pillars NOVA may read, and offline. Each chip opens the step
 * of the setup guide where it changes. "Test my setup" opens the guide's checks.
 */
export type Brain = {kind: 'none' | 'local' | 'cloud' | 'device' | 'app' | 'hosted' | 'hermes'; words: string};
const short = (model: string | null) => !model ? '' : model.length > 26 ? `${model.slice(0, 25)}…` : model;
export function useBrain(): {brain: Brain; loaded: boolean} {
  const settings = useAiSettings(), options = useDeviceRecord(AI_OPTIONS), hermes = useDeviceRecord(NOVA_HERMES);
  const s = settings.data, route = options.data.route;
  let brain: Brain = {kind: 'none', words: 'On-device answers'};
  if (route === 'on-device') brain = {kind: 'device', words: 'Chrome’s on-device model'};
  else if (route === 'hosted') brain = {kind: 'hosted', words: 'ZIGoals hosted'};
  else if (s.enabled && s.mode === 'local' && hermes.loaded && !hermes.unreadable && isHermesBase(s.baseUrl, hermes.data)) brain = {kind: 'hermes', words: `Hermes Agent${s.model ? ` · ${short(s.model)}` : ''}`};
  else if (s.enabled && s.mode === 'local') brain = {kind: 'local', words: `Local · ${short(s.model) || 'your model'}`};
  else if (s.enabled && s.mode === 'api' && s.provider) brain = {kind: 'cloud', words: `Cloud · ${PROVIDERS[s.provider].name}${s.model ? ` · ${short(s.model)}` : ''}`};
  else if (s.enabled && s.mode === 'subscription') brain = {kind: 'app', words: 'Your AI app'};
  return {brain, loaded: settings.loaded && options.loaded && hermes.loaded};
}
export const SETUP_HREF = '/app/nova/setup';
export function StatusChips({brain}: {brain: Brain}) {
  const settings = useAiSettings(), options = useDeviceRecord(AI_OPTIONS), memory = useDeviceRecord(AI_MEMORY), setup = useDeviceRecord(NOVA_SETUP), online = useOnline();
  // Release review 2 (R2-2/R2-4): what NOVA sees is NOVA → Permissions (Health also needs this device's Health switches).
  const share = settings.data.pageShare, scopes = scopesOf(setup.loaded && !setup.unreadable ? setup.data : {version: 1}), healthSeen = scopes.health && share.health && settings.data.includeHealth;
  const pillars = [scopes.today, scopes.goals, scopes.habits, scopes.wealth, healthSeen];
  const granted = pillars.filter(Boolean).length, mode = setup.loaded && !setup.unreadable ? setup.data.privacyMode ?? null : null;
  const setupChips = brain.kind !== 'none';
  const notes = memory.data.notes?.length ?? 0, remembering = options.loaded && memory.loaded && !memory.unreadable && usingNotes(options.data, memory.data);
  // Session AK P3 (ND-4, ND-12): the key and its value read apart ("Brain · On-device answers"), each dot takes its chip's
  // colour, at most three chips stand in the row (Privacy and Memory fold into one when the centre is narrow), and "Test
  // my setup" is the Brain chip's own link once a brain is connected.
  const chip = (key: string, value: string) => <span><span className="nova-chip-key">{key}</span><span className="nova-chip-sep" aria-hidden="true"> · </span><span className="nova-chip-value">{value}</span></span>;
  const privacy = mode ? PRIVACY_WORDS[mode].label : 'not chosen yet', remember = remembering ? `on · ${notes} ${notes === 1 ? 'note' : 'notes'}` : 'off';
  return <ul className="nova-chips" aria-label="NOVA’s status">
    <li><Link className="nova-chip" data-kind={brain.kind} href={setupChips ? `${SETUP_HREF}?test=1` : SETUP_HREF} prefetch={false} title={setupChips ? 'Test my setup' : 'Build the brain'}><span className="nova-chip-dot" aria-hidden="true"/>{chip('Brain', brain.words)}{setupChips && <span className="sr-only">, test my setup</span>}</Link></li>
    {/* Release review 2 (R2-3): before a brain is connected nothing leaves the device, so the privacy mode, memory and the
        setup test wait until one is (the guide keeps them); the brain and what NOVA sees stay. */}
    {setup.loaded && setupChips && <li className="nova-chip-wide"><Link className="nova-chip" data-kind={mode ?? 'unset'} href={`${SETUP_HREF}#privacy`} prefetch={false}><span className="nova-chip-dot" aria-hidden="true"/>{chip('Privacy', privacy)}</Link></li>}
    {memory.loaded && setupChips && <li className="nova-chip-wide"><Link className="nova-chip" data-kind={remembering ? 'on' : 'off'} href={`${SETUP_HREF}#memory`} prefetch={false}><span className="nova-chip-dot" aria-hidden="true"/>{chip('Memory', remember)}</Link></li>}
    {setup.loaded && memory.loaded && setupChips && <li className="nova-chip-narrow"><Link className="nova-chip" data-kind={mode ?? 'unset'} href={`${SETUP_HREF}#privacy`} prefetch={false}><span className="nova-chip-dot" aria-hidden="true"/><span><span className="nova-chip-key">Privacy</span><span className="nova-chip-sep" aria-hidden="true"> · </span><span className="nova-chip-value">{privacy}</span><span className="nova-chip-sep" aria-hidden="true"> · </span><span className="nova-chip-key">Memory</span><span className="nova-chip-sep" aria-hidden="true"> · </span><span className="nova-chip-value">{remember}</span></span></Link></li>}
    {settings.loaded && <li><a className="nova-chip" data-kind="scopes" title="What NOVA can see: Permissions" href="#nova-permissions"><span className="nova-chip-dot" aria-hidden="true"/>{chip('Sees', `${granted} of 5 pillars${healthSeen ? '' : ' · Health off'}`)}</a></li>}
    {!online && <li><span className="nova-chip" data-kind="offline" role="status"><span className="nova-chip-dot" aria-hidden="true"/>{chip('Offline', 'on-device answers still work')}</span></li>}
  </ul>;
}
