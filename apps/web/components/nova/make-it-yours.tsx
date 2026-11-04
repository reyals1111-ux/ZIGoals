'use client';
import {useId, useState, type ChangeEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showUndo} from '../ui/undo-toast';
import {ACCENT_LABEL, MAX_INSTRUCTIONS, MAX_PERSONA_NAME, MAX_YOUR_NAME, NOVA_ACCENTS, NOVA_LAYOUTS, PERSONA_AVATARS, accentOf, instructionsOf, setStartOnNova, startsOnNova, layoutOf, personaOf, setAccent, setInstructions, setLayout, setPersona, setShortcuts, setYourName, shortcutsOn, yourNameOf, type NovaRecord} from '../../lib/nova/store';
import {keyLabel, moveDock, resetDock, setDockHidden, type DockEntry} from '../../lib/nova/dock';
import {ACCENT_STOPS, LAYOUT_LABEL, SETUP_FILE_NAME, applySetupShare, buildSetupShare, parseSetupShare, setupFileText, setupSummary, type SetupShare} from '../../lib/nova/share-setup';
import {NOVA_WORKFLOWS, importSetupWorkflows, workflowsForSetupShare} from '../../lib/nova/workflows';
import {plainErrorMessage} from '../../lib/plain-error';
import {NovaIcon} from './icons';
import {PersonaMark} from './persona-mark';
import {LookPicker, PresetPicker} from './holo/presets';
import type {HudLook, HudPreset} from '../../lib/nova/layout';

/**
 * Session AK (owner follow-up 2 N2 "Make it yours"; lane NA): the person's NOVA. Persona (NOVA's name and avatar: the orb
 * or ZIGi as they dressed it), what NOVA calls them, the accent, the layout, custom instructions (they go to the person's
 * own model with the chat, through NB's chat), the dock (order, hide and show), single-key shortcuts on or off, a replay
 * of the opening, and "Share my NOVA setup" / "Import a setup" (lib/nova/share-setup.ts: no personal data travels; an
 * import is previewed first and can be undone).
 */
type Save = (change: (r: NovaRecord) => NovaRecord, done?: string) => boolean;
/** Session AL Part 11 (lane L8): the HUD's look (Holo or Classic) and its presets. */
type HudChoices = {look: HudLook; onLook: (l: HudLook) => void; preset: HudPreset | null; onPreset: (p: HudPreset) => void};
export default function MakeItYours({record, save, entries, onReplay, status, hud}: {record: NovaRecord; save: Save; entries: DockEntry[]; onReplay: () => void; status: string; hud?: HudChoices}) {
  const id = useId(), persona = personaOf(record), workflows = useDeviceRecord(NOVA_WORKFLOWS);
  const [name, setName] = useState(persona.name === 'NOVA' ? '' : persona.name), [you, setYou] = useState(yourNameOf(record)), [text, setText] = useState(instructionsOf(record));
  const [incoming, setIncoming] = useState<{share: SetupShare; leftOut: number} | null>(null), [problem, setProblem] = useState(''), [shareNote, setShareNote] = useState('');
  const visible = entries.map(e => e.id);
  const share = () => buildSetupShare(record, workflows.loaded && !workflows.unreadable ? workflowsForSetupShare(workflows.data) : []);
  const download = () => {
    const blob = new Blob([setupFileText(share())], {type: 'application/json'}), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = SETUP_FILE_NAME; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    setShareNote('Saved the setup file. It holds your arrangement only, no personal data.');
  };
  const card = async () => {
    try {
      const {drawShareCard, shareOrSave} = await import('../../lib/share-image'), s = share(), summary = setupSummary(s);
      const done = await shareOrSave(await drawShareCard({eyebrow: 'My NOVA setup', title: summary.title, lines: summary.lines, footer: 'ZIGoals · NOVA · made on my device', accent: ACCENT_STOPS[s.accent]}), 'my-nova-setup.png', 'My NOVA setup');
      setShareNote(done === 'shared' ? 'Handed to your share sheet.' : 'Saved the setup card image.');
    } catch (e) { setShareNote(plainErrorMessage(e, 'The card could not be made in this browser.')); }
  };
  const read = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''; setProblem(''); setIncoming(null);
    if (!file) return;
    if (file.size > 16 * 1024) { setProblem('This file is larger than a NOVA setup can be (16 KB). Nothing was changed.'); return; }
    const r = parseSetupShare(await file.text());
    if (r.ok) setIncoming({share: r.share, leftOut: r.leftOut}); else setProblem(r.error);
  };
  const apply = () => {
    if (!incoming) return;
    const before = record, beforeWorkflows = workflows.data;
    let added = 0;
    if (!save(r => applySetupShare(r, incoming.share))) return;
    if (incoming.share.workflows.length && workflows.loaded && !workflows.unreadable) try { const out = importSetupWorkflows(workflows.data, incoming.share.workflows, new Date()); workflows.update(() => out.record); added = out.added; } catch { added = 0; }
    setIncoming(null);
    showUndo({message: `Setup applied${added ? `, with ${added} ${added === 1 ? 'workflow' : 'workflows'}` : ''}.`, undone: 'Your previous setup is back.', restore: () => { if (!save(() => before)) throw Error('Your previous setup could not be put back on this device.'); if (added) try { workflows.update(() => beforeWorkflows); } catch { /* the workflows stay */ } }});
  };
  return <div className="nova-yours">
    {status && <p className="nova-status-line" role="status">{status}</p>}
    <section className="nova-yours-part" aria-labelledby={`${id}-p`}>
      <h3 id={`${id}-p`}>Persona</h3>
      <form className="nova-inline-form" onSubmit={e => { e.preventDefault(); save(r => setPersona(r, {name}), name.trim() ? `Your assistant is called ${name.trim()} now.` : 'Your assistant is called NOVA again.'); }}>
        <label className="nova-field"><span>Your assistant’s name</span><input value={name} maxLength={MAX_PERSONA_NAME} onChange={e => setName(e.target.value)} placeholder="NOVA" autoComplete="off"/></label>
        <button type="submit" className="nova-btn">Save name</button>
      </form>
      <fieldset className="nova-fieldset"><legend>Avatar</legend><div className="nova-avatar-choices">
        {PERSONA_AVATARS.map(a => <label key={a} className="nova-avatar-choice"><input type="radio" name={`${id}-avatar`} checked={persona.avatar === a} onChange={() => save(r => setPersona(r, {avatar: a}), a === 'zigi' ? 'ZIGi is the face of your assistant now.' : 'The NOVA orb is the face of your assistant now.')}/>
          <PersonaMark avatar={a} size={56}/><span>{a === 'zigi' ? 'ZIGi, as you dressed ZIGi' : 'The NOVA orb'}</span></label>)}
      </div></fieldset>
      <form className="nova-inline-form" onSubmit={e => { e.preventDefault(); save(r => setYourName(r, you), you.trim() ? `${persona.name} calls you ${you.trim()}.` : `${persona.name} asks without a name.`); }}>
        <label className="nova-field"><span>What {persona.name} calls you <small>(on this device only, never shared)</small></span><input value={you} maxLength={MAX_YOUR_NAME} onChange={e => setYou(e.target.value)} autoComplete="given-name"/></label>
        <button type="submit" className="nova-btn">Save</button>
      </form>
    </section>
    <section className="nova-yours-part" aria-labelledby={`${id}-l`}>
      <h3 id={`${id}-l`}>Look</h3>
      {hud && <LookPicker look={hud.look} onLook={hud.onLook}/>}
      {hud && <PresetPicker shown={hud.preset} onApply={hud.onPreset}/>}
      <fieldset className="nova-fieldset"><legend>Layout</legend><div className="nova-segment">{NOVA_LAYOUTS.map(l => <label key={l} className="nova-seg"><input type="radio" name={`${id}-layout`} checked={layoutOf(record) === l} onChange={() => save(r => setLayout(r, l), `${LAYOUT_LABEL[l]} layout.`)}/><span>{LAYOUT_LABEL[l]}</span></label>)}</div></fieldset>
      <fieldset className="nova-fieldset"><legend>Accent</legend><div className="nova-accents">{NOVA_ACCENTS.map(a => <label key={a} className="nova-accent"><input type="radio" name={`${id}-accent`} checked={accentOf(record) === a} onChange={() => save(r => setAccent(r, a), `${ACCENT_LABEL[a]}.`)}/><span className="nova-swatch" data-accent={a} aria-hidden="true"/><span>{ACCENT_LABEL[a]}</span></label>)}</div></fieldset>
      <button type="button" className="nova-btn" onClick={onReplay}><NovaIcon name="star" size={18}/>Replay the opening</button>
    </section>
    <section className="nova-yours-part" aria-labelledby={`${id}-i`}>
      <h3 id={`${id}-i`}>Custom instructions</h3>
      <form onSubmit={e => { e.preventDefault(); save(r => setInstructions(r, text), text.trim() ? 'Instructions saved on this device.' : 'Instructions removed.'); }}>
        <label className="nova-field"><span>How {persona.name} should answer you <small>(sent with your messages to your own model; never in a shared setup)</small></span>
          <textarea value={text} maxLength={MAX_INSTRUCTIONS} rows={4} onChange={e => setText(e.target.value)} placeholder="Short answers. Call out what matters today first."/></label>
        <p className="nova-fine" aria-live="polite">{text.length} of 2,000 characters</p>
        <button type="submit" className="nova-btn">Save instructions</button>
      </form>
    </section>
    <section className="nova-yours-part" aria-labelledby={`${id}-d`}>
      <h3 id={`${id}-d`}>Quick access</h3>
      <ol className="nova-dock-list">{entries.map((e, i) => <li key={e.id} data-hidden={e.hidden || undefined}>
        <NovaIcon name={e.id} size={18}/><span className="nova-dock-name">{e.label}{shortcutsOn(record) && <kbd className="nova-kbd">{keyLabel(e.key)}</kbd>}</span>
        <button type="button" className="nova-mini-btn" disabled={i === 0} onClick={() => save(r => moveDock(r, e.id, -1, visible), `${e.label} moved up.`)} aria-label={`Move ${e.label} up`}><NovaIcon name="up" size={18}/></button>
        <button type="button" className="nova-mini-btn" disabled={i === entries.length - 1} onClick={() => save(r => moveDock(r, e.id, 1, visible), `${e.label} moved down.`)} aria-label={`Move ${e.label} down`}><NovaIcon name="down" size={18}/></button>
        <button type="button" className="nova-btn nova-btn-small" aria-pressed={!e.hidden} onClick={() => save(r => setDockHidden(r, e.id, !e.hidden), `${e.label} ${e.hidden ? 'shown' : 'hidden'}.`)}>{e.hidden ? 'Show' : 'Shown'}{/* Session AK lane EXF (EX-10): which entry, after the visible word */}<span className="sr-only"> in quick access: {e.label}</span></button>
      </li>)}</ol>
      <div className="nova-row-actions">
        <button type="button" className="nova-btn" onClick={() => save(resetDock, 'Quick access is back to its first order.')}>Reset the order</button>
        <div className="nova-switch-row"><span id={`${id}-keys`}>Single-key shortcuts</span><button type="button" role="switch" aria-checked={shortcutsOn(record)} aria-labelledby={`${id}-keys`} className="nova-switch" onClick={() => save(r => setShortcuts(r, !shortcutsOn(r)), shortcutsOn(record) ? 'Single-key shortcuts are off.' : 'Single-key shortcuts are on.')}><span aria-hidden="true"/></button></div>
      </div>
      <div className="nova-switch-row"><span id={`${id}-start`}>Open ZIGoals on {persona.name} (Today stays one tap away)</span><button type="button" role="switch" aria-checked={startsOnNova(record)} aria-labelledby={`${id}-start`} className="nova-switch" onClick={() => save(r => setStartOnNova(r, !startsOnNova(r)), startsOnNova(record) ? 'ZIGoals opens on Today again.' : `ZIGoals now opens on ${persona.name}.`)}><span aria-hidden="true"/></button></div>
      <p className="nova-fine">Shortcuts work while {persona.name} is open and you are not typing: a letter opens its entry, [ and ] fold the side panels, ⌘/Ctrl + K goes to the command field, Esc leaves fullscreen, then {persona.name}.</p>
    </section>
    <section className="nova-yours-part" aria-labelledby={`${id}-s`}>
      <h3 id={`${id}-s`}>Share my NOVA setup</h3>
      <p className="nova-fine">The layout, accent, widgets, quick access, persona and your saved workflows’ names and steps. Never your records, your name, your instructions, your chats or your memory.</p>
      <ul className="nova-glance">{setupSummary(share()).lines.map(l => <li key={l}>{l}</li>)}</ul>
      <div className="nova-row-actions"><button type="button" className="nova-btn nova-btn-primary" onClick={download}>Save the setup file</button><button type="button" className="nova-btn" onClick={() => void card()}>Make a setup card</button></div>
      {shareNote && <p className="nova-fine" role="status">{shareNote}</p>}
    </section>
    <section className="nova-yours-part" aria-labelledby={`${id}-m`}>
      <h3 id={`${id}-m`}>Import a setup</h3>
      <label className="nova-field"><span>A NOVA setup file (.json, at most 16 KB)</span><input type="file" accept="application/json,.json" onChange={e => void read(e)}/></label>
      {problem && <p className="nova-fine" role="alert">{problem}</p>}
      {incoming && <div className="nova-preview" role="region" aria-label="Setup preview">
        <p><strong>{setupSummary(incoming.share).title}</strong></p>
        <ul className="nova-glance">{setupSummary(incoming.share).lines.map(l => <li key={l}>{l}</li>)}</ul>
        {incoming.leftOut > 0 && <p className="nova-fine">{incoming.leftOut} {incoming.leftOut === 1 ? 'item' : 'items'} this version does not have will be left out.</p>}
        <p className="nova-fine">Your instructions, your name and your records stay as they are. You can undo this.</p>
        <div className="nova-row-actions"><button type="button" className="nova-btn nova-btn-primary" onClick={apply}>Apply this setup</button><button type="button" className="nova-btn" onClick={() => setIncoming(null)}>Cancel</button></div>
      </div>}
    </section>
  </div>;
}
