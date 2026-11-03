'use client';
import Link from 'next/link';
import {useState} from 'react';
import {composeBrief, novaBriefLines, type BriefKind} from '../../../../lib/nova/briefs';
import {checkBrief} from '../../../../lib/nova/setup-checks';
import {useNovaSources} from '../../workflows/use-nova-sources';
import {CheckRow} from '../check-row';
import type {SetupState} from '../use-setup';

/**
 * Planet 8: the morning brief and the evening recap, composed on this device from the person's own records within their
 * areas (lane ND's `composeBrief`); a cloud model may only reword it in Guarded or Relaxed; a notification only if
 * notifications are already on. The check composes one now and shows it.
 */
export default function BriefsStep({setup}: {setup: SetupState}) {
  const sources = useNovaSources(), [kind, setKind] = useState<BriefKind>('morning'), [lines, setLines] = useState<string[] | null | undefined>(undefined);
  const run = () => {
    const env = sources.local?.env;
    if (!env) return {ok: false, note: 'Your records are still loading. Try again in a moment.'};
    const brief = composeBrief(kind, env.habitDay, env, {scopes: sources.scopes});
    const out = brief ? novaBriefLines(brief) : null; setLines(out);
    return checkBrief(out);
  };
  return <>
    <p>Each morning NOVA can greet you with a short brief, and each evening a recap: made on this device from your records, with no model needed. With a model, NOVA may reword it in your privacy mode (never in Strict to a cloud). It shows on NOVA; as a notification only if you already turned notifications on.</p>
    <div className="ai-card-actions" role="group" aria-label="Which brief"><button type="button" className={kind === 'morning' ? 'primary' : 'secondary'} aria-pressed={kind === 'morning'} onClick={() => setKind('morning')}>Morning brief</button><button type="button" className={kind === 'evening' ? 'primary' : 'secondary'} aria-pressed={kind === 'evening'} onClick={() => setKind('evening')}>Evening recap</button></div>
    {lines && lines.length > 0 && <ul className="nova-brief" aria-label="Your brief, made on this device">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
    {lines === null && <p className="ai-note">Nothing to say yet. Add a habit or a goal, and NOVA has something for you tomorrow.</p>}
    <p className="fine">Your briefs live on <Link className="text-link" href="/app/nova">NOVA</Link>.</p>
    <CheckRow id="briefs" setup={setup} run={run} disabled={!sources.ready} label="Make a brief now"/>
  </>;
}
