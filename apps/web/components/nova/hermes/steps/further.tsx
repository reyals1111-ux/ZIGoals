'use client';
import {useMemo, useState} from 'react';
import {noteTexts} from '../../../../lib/ai/privacy-mode';
import {buildContextPack} from '../../../../lib/ai/context-pack/build';
import {hermesSummary} from '../../../../lib/nova/hermes';
import {HERMES_LINKS, SKILL_TIP, skillFile, skillFolder} from '../../../../lib/nova/hermes-guide';
import {localModelStillConfirmed, NOVA_HERMES} from '../../../../lib/nova/hermes-record';
import {PRIVACY_WORDS} from '../../../../lib/nova/privacy-mode';
import {knownNamesFrom, redactionSummary} from '../../../../lib/nova/redact';
import {NOVA_SETUP} from '../../../../lib/nova/setup';
import {localDate} from '../../../../lib/local-date';
import {exportFileName} from '../../../../lib/showcase-detect';
import {isShowcase} from '../../../../lib/showcase-storage';
import {useAiContext} from '../../../ai/use-ai-context';
import {useAiSettings} from '../../../ai/use-ai-settings';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {HermesCheck} from '../hermes-check';
import {OsChoice, useOs} from '../os-choice';
import type {HermesState} from '../use-hermes';

const AREAS = [['goals', 'Goals'], ['habits', 'Habits'], ['wealth', 'Wealth'], ['health', 'Health']] as const;
type Areas = Record<(typeof AREAS)[number][0], boolean>;
/**
 * Planet 10: go further. "Give Hermes my ZIGoals summary": the areas the person picks, made on this device into a Hermes
 * skill file (SKILL.md), redacted per the privacy mode, shown first, then copied or saved; the person places it in
 * Hermes's skills folder themselves. Nothing is sent: ZIGoals runs no server Hermes could call. Then skills from NOVA's
 * workflows, and the official docs.
 */
export default function FurtherStep({hermes}: {hermes: HermesState}) {
  const settings = useAiSettings(), context = useAiContext(settings.data, 'your AI', false), setup = useDeviceRecord(NOVA_SETUP), record = useDeviceRecord(NOVA_HERMES);
  const [os, setOs] = useOs(), [areas, setAreas] = useState<Areas>({goals: true, habits: true, wealth: false, health: false}), [given, setGiven] = useState(''), [listed, setListed] = useState(false);
  const mode = setup.unreadable ? 'strict' : setup.data.privacyMode ?? null, healthOpen = context.gates.localHealth;
  const sources = useMemo(() => context.toolSources(), [context]);
  const summary = useMemo(() => {
    if (!sources) return null;
    const pack = buildContextPack({sources, gates: context.gates, scope: {...areas, health: areas.health && healthOpen, notes: false, days: 30}});
    const made = hermesSummary({packMarkdown: pack.markdown, mode, confirmedLocal: localModelStillConfirmed(record.data), knownNames: knownNamesFrom(noteTexts())});
    return {...made, file: skillFile(localDate(), mode ? PRIVACY_WORDS[mode].label : 'not chosen', made.markdown), included: pack.included};
  }, [sources, context.gates, areas, healthOpen, mode, record.data]); // Z1A-I5: the whole record (address, version, confirmation)
  const copy = () => { if (summary) navigator.clipboard?.writeText(summary.file).then(() => setGiven('copied'), () => setGiven('')); };
  const save = () => {
    if (!summary) return;
    const url = URL.createObjectURL(new Blob([summary.file], {type: 'text/markdown;charset=utf-8'})), a = document.createElement('a');
    a.href = url; a.download = exportFileName('SKILL.md', isShowcase()); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setGiven('saved');
  };
  return <>
    <h3>Give Hermes my ZIGoals summary</h3>
    <p>Pick the areas; ZIGoals makes a Hermes skill from them on this device{summary?.redacted ? `, redacted (${redactionSummary(summary.found)})` : ''}. Read it, then copy it or save it, and put it in Hermes’s skills folder yourself. Nothing is sent.</p>
    <fieldset className="nova-scopes"><legend>Areas in the summary</legend>
      {AREAS.map(([k, label]) => <label key={k} className="ai-check"><input type="checkbox" checked={areas[k]} disabled={k === 'health' && !healthOpen} onChange={e => setAreas(a => ({...a, [k]: e.target.checked}))}/> {label}{k === 'health' && !healthOpen && <small> Needs Health shared first (Build your own NOVA, planet 5).</small>}</label>)}
    </fieldset>
    {summary ? <details className="ai-context-preview" open><summary>The file, exactly ({summary.file.length.toLocaleString('en-US')} characters)</summary><pre tabIndex={0}>{summary.file.slice(0, 20_000)}</pre></details> : <p className="ai-note" role="status">Reading your records…</p>}
    <div className="ai-card-actions"><button type="button" className="secondary" onClick={copy} disabled={!summary}>Copy</button><button type="button" className="secondary" onClick={save} disabled={!summary}>Save as SKILL.md</button></div>
    {given && <p className="ai-note" role="status">{given === 'copied' ? 'Copied.' : 'Saved.'} Put it in this folder as SKILL.md:</p>}
    <OsChoice os={os} onChange={setOs}/>
    <p><code className="nova-path">{skillFolder(os)}SKILL.md</code></p>
    <p className="fine">{SKILL_TIP}</p>
    <label className="ai-check"><input type="checkbox" checked={listed} onChange={e => setListed(e.target.checked)}/> My Hermes listed “zigoals-summary” among its skills</label>
    <h3>More with Hermes</h3>
    <p>NOVA’s workflows can become Hermes skills the same way: the same SKILL.md shape, a short “When to Use” and the steps. Hermes’s <a className="text-link" href={HERMES_LINKS.docs} target="_blank" rel="noopener noreferrer">documentation</a>, <a className="text-link" href={HERMES_LINKS.github} target="_blank" rel="noopener noreferrer">GitHub</a> and <a className="text-link" href={HERMES_LINKS.discord} target="_blank" rel="noopener noreferrer">community</a> go further.</p>
    <HermesCheck id="further" hermes={hermes} disabled={!given || !listed} run={() => ({ok: true, note: `Your summary (${summary?.included.join(', ') || 'no areas'}) is a skill in your Hermes. Nothing was sent by ZIGoals.`})}/>
  </>;
}
