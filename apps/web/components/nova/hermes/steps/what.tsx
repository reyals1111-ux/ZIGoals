'use client';
import {useState, useSyncExternalStore} from 'react';
import {HERMES_LINKS, HERMES_POWER, HERMES_STORES} from '../../../../lib/nova/hermes-guide';
import {browserKind, loopbackNote} from '../../../../lib/nova/local-servers';
import {HermesCheck} from '../hermes-check';
import type {HermesState} from '../use-hermes';

const subscribeNothing = () => () => undefined;
const PHONE = '(max-width: 640px), (pointer: coarse) and (hover: none)';
/** Planet 1: what Hermes Agent is, what it can do with NOVA, and the privacy picture; the browser's own limits said up front. */
export default function WhatStep({hermes}: {hermes: HermesState}) {
  const ua = useSyncExternalStore(subscribeNothing, () => navigator.userAgent, () => ''), phone = useSyncExternalStore(subscribeNothing, () => !!window.matchMedia?.(PHONE).matches, () => false);
  const [understood, setUnderstood] = useState(false), kind = browserKind(ua);
  return <>
    <p><b>Hermes Agent</b> is Nous Research’s open-source personal agent (MIT licence): it runs on your computer with its own tools, skills, memory and choice of model. <a className="text-link" href={HERMES_LINKS.docs} target="_blank" rel="noopener noreferrer">Its documentation</a> · <a className="text-link" href={HERMES_LINKS.github} target="_blank" rel="noopener noreferrer">GitHub</a>. ZIGoals has no partnership with it.</p>
    <p>With NOVA it can be the brain the whole chat runs on, or a second agent NOVA asks for help (“Ask my Hermes”).</p>
    <p className="nova-note" role="note">{HERMES_POWER}</p>
    <p className="nova-note" role="note">{HERMES_STORES}</p>
    <p className="nova-honest" role="note">{loopbackNote(kind, phone)}</p>
    <label className="ai-check"><input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)}/> I understand Hermes can run commands on my computer and keeps its own history.</label>
    <HermesCheck id="what" hermes={hermes} disabled={!understood} label="Check this browser can take part"
      run={() => phone ? {ok: false, note: 'A phone cannot reach a computer’s Hermes. Open ZIGoals on the computer that runs Hermes.'} : kind === 'safari' ? {ok: false, note: 'Safari cannot reach apps on this computer from this site. Use Chrome, Edge or Firefox here.'} : {ok: true, note: 'Understood, and this browser can reach apps on this computer once you allow it.'}}/>
  </>;
}
