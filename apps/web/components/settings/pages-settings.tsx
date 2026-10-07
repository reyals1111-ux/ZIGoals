'use client';
import './pages-settings.css';
import Link from 'next/link';
import {useRef, useState} from 'react';
import {usePrivateStore} from '../use-private-store';
import {useShowcase} from '../showcase-controls';
import {useLauncherRecord} from '../ai/use-launcher-record';
import {NAV_ITEMS} from '../app-nav';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings} from '../../lib/dashboard-settings';
import {settingsGroupIn} from '../../lib/vault/w-homes';
import {updateSettingsGroup} from '../../lib/w-homes-store';
import {AVAILABLE_BUTTONS, AVAILABLE_PAGES, BUTTON_LABEL, PAGE_LABEL, hrefShown, isShown, phoneTabs, showEverything, startPage, viewOf, visiblePages, withChoice, withStart} from '../../lib/pages/visibility';
import type {PageId, Pages, VisibilityId} from '../../lib/pages/schema';

const NOTES: Partial<Record<VisibilityId, string>> = {
  'quick-add': 'In the sidebar, the phone top bar and on Today.',
  zigi: 'The ZIGi button and ⌘K / Ctrl+K, on every device you sync.',
  'wealth-shortcut': 'The wallet button next to Settings in the phone top bar, while Wealth shows.',
};
/**
 * Settings → "Your pages & buttons" (Session W Part 2, owner decision W4): a switch per page and button, the start page,
 * a preview of the sidebar and the phone tab bar, and "Show everything again". Each switch saves at once as a stamped
 * choice in settings v3 `pages` (synced with the settings, docs/product/SYNC_HOMES.md); Settings and Help have no switch.
 */
export function PagesSettings() {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const showcase = useShowcase(), launcher = useLauncherRecord();
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null), [confirming, setConfirming] = useState(false);
  const resetButton = useRef<HTMLButtonElement>(null);
  const ready = settings.loaded && !settings.error;
  const view = viewOf(ready ? settingsGroupIn(settings.data, 'pages') : undefined, showcase);
  const save = (change: (pages: Pages) => Pages, done: string) => {
    setMessage(null);
    return updateSettingsGroup('pages', change).then(() => setMessage({text: done}), (error: unknown) => setMessage({text: error instanceof Error ? error.message : 'Could not save.', failed: true}));
  };
  const toggle = (id: VisibilityId, label: string, on: boolean) => void save(pages => withChoice(pages, id, on, new Date().toISOString()), on ? `${label} shows again.` : `${label} is hidden. You can show it again here at any time.`);
  const visible = visiblePages(view), start = startPage(view);
  const nav = NAV_ITEMS.filter(([href]) => hrefShown(view, href)), {tabs, more} = phoneTabs(nav);
  const chosenStart = view.start && visible.includes(view.start) ? view.start : '';
  const summary = `Sidebar: ${nav.map(([, label]) => label).join(', ')}. Phone tab bar: ${[...tabs.map(([, label]) => label), 'More'].join(', ')}; More holds ${more.map(([, label]) => label).join(', ')}.`;
  return <section className="panel pages-settings" id="your-pages" aria-labelledby="your-pages-title">
    <p className="eyebrow">YOUR APP</p><h2 id="your-pages-title">Your pages & buttons</h2>
    <p>Hide what you don&rsquo;t use; your records stay as they are. Settings and Help always show. A hidden page still opens from a link, with a way to show it again.</p>
    {!settings.loaded ? <p className="fine">Your choices appear once your settings open.</p> : settings.error ? <p role="alert">Your settings could not be read, so every page shows. Nothing was changed.</p> : <>
      <div className="pages-settings-grid">
        <fieldset className="pages-switches">
          <legend>Pages</legend>
          {AVAILABLE_PAGES.map(id => <label key={id} className="pages-switch">
            <input type="checkbox" role="switch" checked={isShown(view, id)} onChange={e => toggle(id, PAGE_LABEL[id], e.currentTarget.checked)}/>
            <span>{PAGE_LABEL[id]}</span>
          </label>)}
        </fieldset>
        <fieldset className="pages-switches">
          <legend>Buttons</legend>
          {AVAILABLE_BUTTONS.map(id => <div key={id} className="pages-switch-row">
            <label className="pages-switch">
              <input type="checkbox" role="switch" checked={isShown(view, id)} aria-describedby={NOTES[id] ? `pages-note-${id}` : undefined} onChange={e => toggle(id, BUTTON_LABEL[id], e.currentTarget.checked)}/>
              <span>{BUTTON_LABEL[id]}</span>
            </label>
            {NOTES[id] && <small className="pages-switch-note" id={`pages-note-${id}`}>{NOTES[id]}</small>}
          </div>)}
          {isShown(view, 'zigi') && launcher.loaded && launcher.record.launcherHidden && <p className="fine pages-device-note">ZIGi is hidden on this device with its chevron. <button type="button" className="text-link" onClick={() => launcher.setLauncherHidden(false)}>Show ZIGi on this device</button></p>}
        </fieldset>
      </div>
      <div className="pages-start">
        <label htmlFor="pages-start-page">Start page</label>
        <select id="pages-start-page" value={chosenStart} onChange={e => { const id = (e.currentTarget.value || null) as PageId | null; void save(pages => withStart(pages, id, new Date().toISOString()), id ? `ZIGoals now opens on ${PAGE_LABEL[id]}.` : 'ZIGoals now opens on your first visible page.'); }}>
          <option value="">First visible page{visible[0] ? ` (${PAGE_LABEL[visible[0]]})` : ''}</option>
          {visible.map(id => <option key={id} value={id}>{PAGE_LABEL[id]}</option>)}
        </select>
      </div>
      <p className="fine">ZIGoals opens here from your Home Screen or a new tab; a link to another page still opens that page.{view.start && !visible.includes(view.start) && start ? ` Your start page is hidden, so ZIGoals opens on ${PAGE_LABEL[start]} until it shows again.` : ''}{!start ? ' With every page hidden, ZIGoals opens on Settings.' : ''}</p>
      <figure className="pages-preview">
        <figcaption>Preview</figcaption>
        <p className="sr-only">{summary}</p>
        <div className="pages-preview-row" aria-hidden="true">
          <div className="pages-preview-sidebar"><span className="pages-preview-title">Sidebar</span><ol>{nav.map(([href, label]) => <li key={href}>{label}</li>)}</ol></div>
          <div className="pages-preview-phone"><span className="pages-preview-title">Phone tab bar</span><ol className="pages-preview-tabs">{tabs.map(([href, label]) => <li key={href}>{label}</li>)}<li>More</li></ol><span className="pages-preview-more">In More: {more.map(([, label]) => label).join(' · ')}</span></div>
        </div>
      </figure>
      {confirming ? <div className="pages-reset-confirm" role="group" aria-labelledby="pages-reset-question">
        <p id="pages-reset-question">Show every page and button again? Your start page stays as it is.</p>
        <div className="actions">
          <button type="button" className="primary" autoFocus onClick={() => { setConfirming(false); void save(pages => showEverything(pages, new Date().toISOString()), 'Every page and button shows again.').then(() => resetButton.current?.focus()); }}>Show everything</button>
          <button type="button" className="quiet" onClick={() => { setConfirming(false); requestAnimationFrame(() => resetButton.current?.focus()); }}>Cancel</button>
        </div>
      </div> : <button ref={resetButton} type="button" className="secondary" onClick={() => setConfirming(true)}>Show everything again</button>}
      {showcase ? <p className="fine">In Showcase these choices last for this tab only.</p> : <p className="fine"><Link className="text-link" href="/app/welcome">Run the welcome again</Link> to pick what you want to improve and a few starters; nothing you have is added twice.</p>}
    </>}
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </section>;
}
