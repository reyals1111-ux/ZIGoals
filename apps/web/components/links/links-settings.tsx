'use client';
import {useId, useState, type FormEvent} from 'react';
import {usePrivateStore} from '../use-private-store';
import {LinkGlyph, ICON_NAME} from './link-glyph';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, type DashboardSettings} from '../../lib/dashboard-settings';
import {LINK_ICONS, MAX_LINKS, type LinkIcon, type PersonalLink} from '../../lib/links/schema';
import {addLink, editLink, linkHost, linkInputIssue, linksOf, moveLink, removeLink, sortedLinks, suggestedIcon, type LinkInput} from '../../lib/links/engine';
import './links.css';

/**
 * Settings → My links (Session W Part 19): the person's own socials, apps and sites (settings v3 `links`, synced with
 * Today's settings), shown as buttons on Today. Add, edit, move and remove; https only; nothing is added to an address
 * and nothing is fetched from it.
 */
export function LinksSettings() {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const [adding, setAdding] = useState(false), [editing, setEditing] = useState<string | null>(null), [removing, setRemoving] = useState<string | null>(null), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const ready = settings.loaded && !settings.error, links = ready ? sortedLinks(linksOf(settings.data)) : [];
  async function change(fn: (current: DashboardSettings) => DashboardSettings, done: string) {
    try { await settings.update(fn); setMessage({text: done}); return true; } catch (error) { setMessage({text: error instanceof Error && error.message ? error.message : 'Not saved.', failed: true}); return false; }
  }
  return <section className="panel links-settings" id="links" aria-label="My links">
    <p className="eyebrow">MY LINKS</p><h2>Your links</h2>
    <p>Your socials, apps and sites, as buttons on Today. Each opens in a new tab; ZIGoals adds nothing to the address and never loads anything from it. Up to {MAX_LINKS}.</p>
    {settings.error && <p role="alert">{settings.error}</p>}
    {links.length > 0 && <ol className="links-list" aria-label="Your links">{links.map((link, index) => <li key={link.id}>
      <div className="links-row">
        <span className="links-item"><LinkGlyph icon={link.icon} label={link.label} /><span><strong>{link.label}</strong><small>{linkHost(link.url)}</small></span></span>
        <span className="links-actions">
          <button type="button" className="quiet" aria-label={`Move ${link.label} up`} disabled={index === 0} onClick={() => void change(s => moveLink(s, link.id, -1, new Date().toISOString()), `${link.label} moved up.`)}>↑</button>
          <button type="button" className="quiet" aria-label={`Move ${link.label} down`} disabled={index === links.length - 1} onClick={() => void change(s => moveLink(s, link.id, 1, new Date().toISOString()), `${link.label} moved down.`)}>↓</button>
          <button type="button" className="quiet" aria-expanded={editing === link.id} onClick={() => { setEditing(editing === link.id ? null : link.id); setRemoving(null); }}>Edit<span className="sr-only"> {link.label}</span></button>
          <button type="button" className="quiet" onClick={() => { setRemoving(link.id); setEditing(null); }}>Remove<span className="sr-only"> {link.label}</span></button>
        </span>
      </div>
      {editing === link.id && <LinkForm initial={link} onCancel={() => setEditing(null)} onSave={input => change(s => editLink(s, link.id, input, new Date().toISOString()), 'Link saved.').then(ok => { if (ok) setEditing(null); return ok; })} />}
      {removing === link.id && <div className="notice links-confirm" role="alertdialog" aria-label={`Remove ${link.label}`}><p>Remove &ldquo;{link.label}&rdquo; from your links?</p><div className="actions"><button type="button" className="secondary" onClick={() => void change(s => removeLink(s, link.id), `${link.label} removed.`).then(ok => { if (ok) setRemoving(null); })}>Remove link</button><button type="button" className="quiet" onClick={() => setRemoving(null)}>Keep it</button></div></div>}
    </li>)}</ol>}
    {adding ? <LinkForm onCancel={() => setAdding(false)} onSave={input => change(s => addLink(s, input, crypto.randomUUID(), new Date().toISOString()), `${input.label.trim()} added.`).then(ok => { if (ok) setAdding(false); return ok; })} />
      : <button type="button" className="secondary" disabled={!ready || links.length >= MAX_LINKS} onClick={() => { setAdding(true); setMessage(null); }}>Add a link</button>}
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
    <p className="fine">Show or hide them on Today under Your pages &amp; buttons (My links). The icons are ZIGoals&rsquo; own simple pictures, never a site&rsquo;s logo.</p>
  </section>;
}

function LinkForm({initial, onSave, onCancel}: {initial?: PersonalLink; onSave: (input: LinkInput) => Promise<boolean>; onCancel: () => void}) {
  const iconId = useId(), [label, setLabel] = useState(initial?.label ?? ''), [url, setUrl] = useState(initial?.url ?? 'https://'), [icon, setIcon] = useState<LinkIcon>(initial?.icon ?? 'monogram'), [chosen, setChosen] = useState(!!initial), [problem, setProblem] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    const input = {label, url, icon}, issue = linkInputIssue(input);
    if (issue) { setProblem(issue); return; }
    setProblem(''); void onSave(input);
  }
  return <form className="links-form" aria-label={initial ? `Edit ${initial.label}` : 'Add a link'} onSubmit={submit}>
    <label className="field"><span>Name</span><input value={label} maxLength={40} autoComplete="off" onChange={event => setLabel(event.target.value)} /></label>
    {/* The address suggests a picture until the person picks one; nothing is fetched to decide. */}
    <label className="field"><span>Address (https://)</span><input type="url" inputMode="url" value={url} autoComplete="off" autoCapitalize="none" spellCheck={false} onChange={event => { setUrl(event.target.value); if (!chosen) setIcon(suggestedIcon(event.target.value)); }} /></label>
    {/* Its own label (not wrapped around the list), so the icon list is named "Icon" only, not by every choice in it. */}
    <div className="links-icon-field"><label className="field" htmlFor={iconId}><span>Icon</span></label><span className="links-icon-choice"><LinkGlyph icon={icon} label={label || '?'} /><select id={iconId} value={icon} onChange={event => { setIcon(event.target.value as LinkIcon); setChosen(true); }}>{LINK_ICONS.map(value => <option key={value} value={value}>{ICON_NAME[value]}</option>)}</select></span></div>
    {problem && <p role="alert">{problem}</p>}
    <div className="actions"><button className="primary" type="submit">{initial ? 'Save link' : 'Add link'}</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></div>
  </form>;
}
