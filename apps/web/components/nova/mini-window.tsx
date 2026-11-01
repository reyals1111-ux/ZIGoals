'use client';
import {createPortal} from 'react-dom';
import type {NovaOrbState} from '../../lib/nova/orb';
import {ORB_STATE_LABEL} from '../../lib/nova/orb';
import {NovaOrb} from './orb';
import {NovaClock} from './nova-stage';
import {useClock} from './use-nova';
import {useOrbitDay} from './widgets/use-orbit-day';

/**
 * Session AK (owner follow-up 2 N8; lane NA): NOVA's mini window, Document Picture-in-Picture through ZIGi's own helper
 * (lib/ai/pip.ts: the window opens only from the person's click, carries this page's styles and motion marks, and exists
 * only where the browser offers it). It keeps the essentials on top of other apps: the orb and its state, the time, how
 * much of today's orbit is lit and what is next. Reads only; a tap on "Back to NOVA" brings this tab forward.
 */
export default function NovaMiniWindow({win, persona, orb, accent}: {win: Window; persona: string; orb: NovaOrbState; accent: string}) {
  const now = useClock(), {summary} = useOrbitDay();
  return createPortal(<div className="nova-root nova-mini" style={{position: 'fixed'}}><div className="nova-frame nova-mini-frame" data-accent={accent}>
    <div className="nova-mini-head"><NovaOrb state={orb} size={72}/><div><p className="nova-name">{persona}</p><p className="nova-fine">{ORB_STATE_LABEL[orb]}</p></div></div>
    <NovaClock now={now} compact/>
    <section className="nova-mini-day" aria-label="Today">
      {!summary ? <p className="nova-reading" role="status">Reading your day…</p> : <>
        <p className="nova-line">{summary.line}</p>
        {summary.next.length > 0 && <ol className="nova-glance">{summary.next.map(item => <li key={item.key}>{item.label}{item.time ? ` · ${item.time}` : ''}</li>)}</ol>}
      </>}
    </section>
    <button type="button" className="nova-btn nova-btn-primary" onClick={() => window.focus()}>Back to {persona}</button>
  </div></div>, win.document.body);
}
