'use client';
import {useSyncExternalStore} from 'react';
import {AREA_LABELS} from '../../../lib/ai/context/pages';
import {DUO_IDLE, duoState, subscribeDuo, type DuoState, type DuoStep} from '../../../lib/nova/bridge';
import {ZigiAvatar} from '../../zigi/zigi-avatar';
import {AgentGlyph, PersonaFigure, type NovaPersona} from './nova-figure';
import './nova-chat.css';

/**
 * The Duo (Session AK, owner follow-up 2 N1): while ZIGi works on a page task NOVA handed over, NOVA's figure and ZIGi's
 * (its own look, unchanged) stand side by side on NOVA's dashboard, each with the step it is on. It shows only while a task
 * uses both (and its result for a moment after); otherwise it renders nothing. NOVA's dashboard mounts it (lazily, once
 * the state is active) above the conversation on a computer and at the top of the phone's chat sheet. The chat itself
 * announces the hand-over and the report (its own live line), so this view is not a second live region; the step it is on
 * is marked with aria-current. Nothing moves under reduced motion or Motion Off.
 */
const STEPS: readonly DuoStep[] = ['handed', 'reading', 'answering', 'reported'];
export function duoLines(state: DuoState, persona: string): {nova: string; zigi: string} {
  const page = state.area ? AREA_LABELS[state.area] : 'the page';
  if (state.agent === 'hermes') switch (state.step) {
    case 'handed': return {nova: 'Asked your Hermes Agent', zigi: `Taking the task, with ${page}’s records`};
    case 'reading': case 'answering': return {nova: 'Waiting for Hermes', zigi: 'Answering on your computer'};
    case 'reported': return {nova: `${persona} has Hermes’s answer`, zigi: 'Reported back: changes come as cards'};
    case 'stopped': return {nova: 'The task stopped', zigi: 'Stopped'};
    default: return {nova: persona, zigi: 'Hermes'};
  }
  switch (state.step) {
    case 'handed': return {nova: `Handed to ZIGi: ${page}`, zigi: `Taking the task on ${page}`};
    case 'reading': return {nova: 'Waiting for ZIGi', zigi: state.looked.length ? `Read ${state.looked.slice(0, 3).join(', ')}` : `Reading ${page}’s records`};
    case 'answering': return {nova: 'Waiting for ZIGi', zigi: 'Answering'};
    case 'reported': return {nova: `${persona} has ZIGi’s answer`, zigi: 'Reported back'};
    case 'stopped': return {nova: 'The task stopped', zigi: 'Stopped'};
    default: return {nova: persona, zigi: 'ZIGi'};
  }
}
export function NovaDuo({persona = {name: 'NOVA', avatar: 'orb'}}: {persona?: NovaPersona}) {
  const state = useSyncExternalStore(subscribeDuo, duoState, () => DUO_IDLE);
  if (!state.active) return null;
  const lines = duoLines(state, persona.name), at = state.step ? STEPS.indexOf(state.step) : -1;
  const working = state.step === 'reading' || state.step === 'answering', hermes = state.agent === 'hermes', other = hermes ? 'Hermes' : 'ZIGi';
  return <section className="nova-duo" aria-label={`${persona.name} and ${hermes ? 'your Hermes Agent' : 'ZIGi'}`}>
    <div className="nova-duo-side"><PersonaFigure persona={persona} size={44} state={working ? 'thinking' : 'idle'}/><p><strong>{persona.name}</strong><span>{lines.nova}</span></p></div>
    <ol className="nova-duo-steps" aria-label="Steps">{STEPS.map((step, i) => <li key={step} data-done={at >= i ? '' : undefined} aria-current={at === i ? 'step' : undefined}>{['Handed over', 'Reading', 'Answering', 'Reported back'][i]}</li>)}</ol>
    <div className="nova-duo-side">{hermes ? <AgentGlyph size={44}/> : <ZigiAvatar state={state.step === 'reading' ? 'reading-your-data' : state.step === 'answering' ? 'speaking' : state.step === 'reported' ? 'success' : 'idle'} size={44} decorative/>}<p><strong>{other}</strong><span>{lines.zigi}</span></p></div>
  </section>;
}
export default NovaDuo;
