'use client';
import './pages-settings.css';
import Link from 'next/link';
import {Fragment, Suspense, lazy, useRef, useState} from 'react';
import {usePrivateStore} from '../use-private-store';
import {useShowcase} from '../showcase-controls';
import {useLauncherRecord} from '../ai/use-launcher-record';
import {useDeviceRecord} from '../ai/use-device-record';
import {EARN_PREFS, earnPrefsOf, setEarnPref} from '../../lib/earn/records';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {NAV_ITEMS, useVisibleNav} from '../app-nav';
import {navCompact} from '../nav-extras';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings} from '../../lib/dashboard-settings';
import {settingsGroupIn} from '../../lib/vault/w-homes';
import {updateSettingsGroup} from '../../lib/w-homes-store';
import {AVAILABLE_BUTTONS, AVAILABLE_PAGES, BUTTON_LABEL, PAGE_LABEL, isShown, phoneTabs, showEverything, startPage, viewOf, visiblePages, withChoice, withStart} from '../../lib/pages/visibility';
import type {PageId, Pages, VisibilityId} from '../../lib/pages/schema';
import {plainErrorMessage} from '../../lib/plain-error';
import {useChainChoice} from '../chain/use-chain-choice';
import {CRYPTO_PAGES, chainChosenFrom} from '../../lib/chain-choice';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {checklistPrefsOf} from '../../lib/ui-prefs/schema';
import {APPS_EXTRAS, APPS_PREFS, SIDEBAR_APP_HREFS, SIDEBAR_APP_IDS, appShown, withAppShown, type SidebarAppId} from '../../lib/ui-prefs/apps';
// Session AK (BUILD list 2 #16, lane G1a): the opt-in cycle log's switch, under Health (device-only, off by default).
const CycleSwitch = lazy(() => import('../cycle/cycle-switch'));

const NOTES: Partial<Record<VisibilityId, string>> = {
  'quick-add': 'In the sidebar, the phone top bar and on Today.',
  'wealth-shortcut': 'The wallet button next to Settings in the phone top bar, while Wealth shows.',
  zigi: 'The ZIGi button on a computer, ZIGi in Apps & extras below 901 px, and ⌘K / Ctrl+K, on every device you sync.',
  music: 'A round button opposite ZIGi’s on a computer, a row in Apps & extras and the phone’s More sheet, and a Today widget.',
};
/**
 * Settings → "Your pages & buttons" (Session W Part 2, owner decision W4): a switch per page and button, the start page,
 * a preview of the sidebar and the phone tab bar, and "Show everything again". Each switch saves at once as a stamped
 * choice in settings v3 `pages` (synced with the settings, docs/product/SYNC_HOMES.md); Settings and Help have no switch.
 * Session AG Polish 3 (ADR-032 L2, L19; owner Part 8): Governance's switch sits after Chess and is kept on this device
 * (`governanceShown` in `zigoals:earn-prefs:v1`), never in the synced pages format; it is off until the person turns it on.
 */
export function PagesSettings() {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const showcase = useShowcase(), launcher = useLauncherRecord(), prefs = useDeviceRecord(EARN_PREFS);
  const governance = earnPrefsOf(prefs.data).governanceShown, prefsUsable = prefs.loaded && !prefs.unreadable, chain = useChainChoice();
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null), [confirming, setConfirming] = useState(false);
  const resetButton = useRef<HTMLButtonElement>(null);
  // Session AL (owner decisions O3, O4): the app pages' switches and the Checklist button, on this device.
  const apps = useDeviceRecord(APPS_PREFS), ui = useUiPrefs(), appsUsable = apps.loaded && !apps.unreadable, uiUsable = ui.loaded && !ui.unreadable;
  const showApp = (id: SidebarAppId, on: boolean) => {
    setMessage(null);
    try { apps.update(p => withAppShown(p, id, on)); setMessage({text: on ? `${APPS_EXTRAS[id].label} shows on this device.` : `${APPS_EXTRAS[id].label} is hidden on this device. The page still opens from a link or search.`}); }
    catch (cause) { setMessage({text: deviceSettingFailureMessage(cause), failed: true}); }
  };
  const showChecklistButton = (on: boolean) => {
    setMessage(null);
    try { ui.update(p => ({...p, checklist: {...(p.checklist ?? {}), launcher: on}})); setMessage({text: on ? 'The Checklist button shows on this device.' : 'The Checklist button is hidden on this device. The Checklist still opens from Today and the navigation.'}); }
    catch (cause) { setMessage({text: deviceSettingFailureMessage(cause), failed: true}); }
  };
  const ready = settings.loaded && !settings.error;
  // Session AK X1 (RELEASE_REVIEW R3): the crypto pages start off until the chain is chosen (lib/chain-choice.ts).
  const pagesChoice = ready ? settingsGroupIn(settings.data, 'pages') : undefined;
  const view = viewOf(pagesChoice, showcase, chainChosenFrom({linked: chain.linked, pages: pagesChoice, earn: chain.earn}));
  const save = (change: (pages: Pages) => Pages, done: string) => {
    setMessage(null);
    return updateSettingsGroup('pages', change).then(() => { setMessage({text: done}); return true; }, (error: unknown) => { setMessage({text: plainErrorMessage(error, 'Could not save.'), failed: true}); return false; });
  };
  // Session AL (P-BN-34; BN-016, BN-186, T-132): a switch that changes more than itself says so, next to the switches.
  const sideEffect = (id: VisibilityId | 'governance' | 'earn', on: boolean): string => {
    if (on && !chain.chosen && (CRYPTO_PAGES as readonly string[]).concat('governance', 'earn').includes(id)) return ' The money pages that start off (Earn, Markets, Staking, Portfolio and Ecosystem) show now too; each keeps its own switch here.';
    if (!on && id === 'staking' && governance) return ' Governance hides with it, since it shows only while Staking shows.';
    if (!on && id === 'wealth') return ' Earn hides with it, since it sits in the Wealth group.';
    if (!on && id === 'today') { const next = startPage({...view, hidden: [...view.hidden, 'today']}); return next ? ` ZIGoals now opens on ${PAGE_LABEL[next]}; choose another start page below.` : ''; }
    if (on && id === 'governance' && !isShown(view, 'staking')) return ' It shows once Staking shows too.';
    return '';
  };
  // The synced choice is saved asynchronously and the settings are read back after that, so a switch held its old state for
  // a moment (a click "did not change" it; o3-apps-extras at 500 px). It shows the choice at once, until the settings are
  // read again (whatever they then say wins) or the save fails.
  const [pending, setPending] = useState<Partial<Record<VisibilityId, {on: boolean; base: unknown}>>>({});
  const shown = (id: VisibilityId) => { const choice = pending[id]; return choice && choice.base === settings.data ? choice.on : isShown(view, id); };
  const toggle = (id: VisibilityId, label: string, on: boolean) => {
    setPending(current => ({...current, [id]: {on, base: settings.data}}));
    void save(pages => withChoice(pages, id, on, new Date().toISOString()), (on ? `${label} shows again.` : `${label} is hidden. You can show it again here at any time.`) + sideEffect(id, on))
      .then(saved => { if (!saved) setPending(current => { const next = {...current}; delete next[id]; return next; }); });
  };
  const showGovernance = (on: boolean) => {
    setMessage(null);
    try { prefs.update(r => setEarnPref(r, {governanceShown: on})); setMessage({text: (on ? 'Governance shows on this device.' : 'Governance is hidden. You can show it again here at any time.') + sideEffect('governance', on)}); }
    catch (cause) { setMessage({text: deviceSettingFailureMessage(cause), failed: true}); }
  };
  // Session AK X1: Earn's own switch on this device (`pageShown` in `zigoals:earn-prefs:v1`; absent follows the chain choice).
  const showEarn = (on: boolean) => {
    setMessage(null);
    try { prefs.update(r => setEarnPref(r, {pageShown: on})); setMessage({text: (on ? 'Earn shows on this device.' : 'Earn is hidden. You can show it again here at any time.') + sideEffect('earn', on)}); }
    catch (cause) { setMessage({text: deviceSettingFailureMessage(cause), failed: true}); }
  };
  const visible = visiblePages(view), start = startPage(view);
  // Session AL (AL-NAV-010; DV-045c, D-249, D-217): the preview is the navigation as it really is (the same model the
  // sidebar, the rail and More use: NOVA, the Checklist, the Journey and the Apps group included), not the fixed pages only.
  const items = useVisibleNav().items, isPage = (href: string) => NAV_ITEMS.some(([h]) => h === href), {tabs, more} = phoneTabs(items, isPage);
  const chosenStart = view.start && visible.includes(view.start) ? view.start : '';
  // Session AB-Design (owner request 10, D2): five tabs; More is the top bar's button, not a tab.
  // Session AH (ST9, B-174, D-217): the sidebar as it really is, with the pages other parts add (the Checklist, Journey).
  // Session AK G2 (RELEASE_REVIEW_2 R2-10): the 'compact' entries (Tasks, Notes, the Journal) join the desktop sidebar only in a
  // tall window (Session AK P2, ADR-036 Q31; components/navigation.css), so the summary names them as such.
  // Session AL (O4): the sidebar's main list, then its Apps group (NOVA, Tasks, Notes, the Journal, the Agenda; those shown).
  const sidebar = items.filter(item => !navCompact(item) && !SIDEBAR_APP_HREFS.includes(item[0])), appsGroup = SIDEBAR_APP_IDS.filter(id => appShown(apps.data, id)).map(id => APPS_EXTRAS[id].label);
  const summary = `Sidebar: ${sidebar.map(([, label]) => label).join(', ')}${appsGroup.length ? `; its Apps group: ${appsGroup.join(', ')}` : ''}. Phone tab bar: ${tabs.map(([, label]) => label).join(', ')}; More (in the top bar) holds ${more.map(([, label]) => label).join(', ')}.`;
  return <section className="panel pages-settings" id="your-pages" aria-labelledby="your-pages-title">
    <p className="eyebrow">YOUR APP</p><h2 id="your-pages-title">Your pages & buttons</h2>
    <p>Hide what you don&rsquo;t use; your records stay as they are. Settings and Help always show. A hidden page still opens from a link, with a way to show it again.</p>
    {!settings.loaded ? <p className="fine">Your choices appear once your settings open.</p> : settings.error ? <p role="alert">Your settings could not be read, so every page shows. Nothing was changed.</p> : <>
      <div className="pages-settings-grid">
        <fieldset className="pages-switches">
          <legend>Pages</legend>
          {AVAILABLE_PAGES.map(id => <Fragment key={id}>
            <label className="pages-switch">
              <input type="checkbox" role="switch" checked={shown(id)} onChange={e => toggle(id, PAGE_LABEL[id], e.currentTarget.checked)}/>
              <span>{PAGE_LABEL[id]}</span>
            </label>
            {id === 'health' && <Suspense fallback={null}><CycleSwitch healthShown={isShown(view, 'health')}/></Suspense>}
            {id === 'wealth' && <div className="pages-switch-row">
              <label className="pages-switch">
                <input type="checkbox" role="switch" checked={prefsUsable && chain.earnShown} disabled={!prefsUsable || !isShown(view, 'wealth')} aria-describedby="pages-note-earn" onChange={e => showEarn(e.currentTarget.checked)}/>
                <span>Earn</span>
              </label>
              <small className="pages-switch-note" id="pages-note-earn">On this device. Earn sits in the Wealth group: it shows only while Wealth shows.</small>
            </div>}
            {id === 'chess' && <div className="pages-switch-row">
              <label className="pages-switch">
                <input type="checkbox" role="switch" checked={prefsUsable && governance} disabled={!prefsUsable} aria-describedby="pages-note-governance" onChange={e => showGovernance(e.currentTarget.checked)}/>
                <span>Governance</span>
              </label>
              <small className="pages-switch-note" id="pages-note-governance">On this device. It shows while Staking shows; Earn links to it either way.</small>
            </div>}
          </Fragment>)}
        </fieldset>
        <fieldset className="pages-switches">
          <legend>Buttons</legend>
          {AVAILABLE_BUTTONS.map(id => <div key={id} className="pages-switch-row">
            <label className="pages-switch">
              <input type="checkbox" role="switch" checked={shown(id)} aria-describedby={NOTES[id] ? `pages-note-${id}` : undefined} onChange={e => toggle(id, BUTTON_LABEL[id], e.currentTarget.checked)}/>
              <span>{BUTTON_LABEL[id]}</span>
            </label>
            {NOTES[id] && <small className="pages-switch-note" id={`pages-note-${id}`}>{NOTES[id]}</small>}
          </div>)}
          <div className="pages-switch-row">
            <label className="pages-switch">
              <input type="checkbox" role="switch" checked={uiUsable && checklistPrefsOf(ui.data).launcher} disabled={!uiUsable} aria-describedby="pages-note-checklist" onChange={e => showChecklistButton(e.currentTarget.checked)}/>
              <span>Checklist button</span>
            </label>
            <small className="pages-switch-note" id="pages-note-checklist">On this device. The round button on a computer and the Checklist in Apps & extras; the phone’s top-bar pill follows it too.</small>
          </div>
          {isShown(view, 'zigi') && launcher.loaded && launcher.record.launcherHidden && <p className="fine pages-device-note">ZIGi is hidden on this device with its chevron. <button type="button" className="text-link" onClick={() => launcher.setLauncherHidden(false)}>Show ZIGi on this device</button></p>}
        </fieldset>
        <fieldset className="pages-switches" aria-describedby="pages-note-apps">
          <legend>Apps</legend>
          <small className="pages-switch-note" id="pages-note-apps">On this device. On a computer they form the sidebar’s Apps group; below 901 px they are in Apps &amp; extras (with ZIGi, Earn and Music).</small>
          {SIDEBAR_APP_IDS.map(id => <label key={id} className="pages-switch">
            <input type="checkbox" role="switch" checked={appsUsable && appShown(apps.data, id)} disabled={!appsUsable} onChange={e => showApp(id, e.currentTarget.checked)}/>
            <span>{APPS_EXTRAS[id].label}</span>
          </label>)}
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
          <div className="pages-preview-sidebar"><span className="pages-preview-title">Sidebar</span><ol>{sidebar.map(([href, label]) => <li key={href}>{label}</li>)}</ol>{appsGroup.length > 0 && <><span className="pages-preview-title pages-preview-apps">Apps</span><ol>{appsGroup.map(label => <li key={label}>{label}</li>)}</ol></>}</div>
          <div className="pages-preview-phone"><span className="pages-preview-title">Phone tab bar</span><ol className="pages-preview-tabs">{tabs.map(([href, label]) => <li key={href}>{label}</li>)}</ol><span className="pages-preview-more">In More: {more.map(([, label]) => label).join(' · ')}</span></div>
        </div>
      </figure>
      {confirming ? <div className="pages-reset-confirm" role="group" aria-labelledby="pages-reset-question">
        <p id="pages-reset-question">Show every page and button again? Your start page stays as it is.</p>
        <div className="actions">
          <button type="button" className="primary" autoFocus onClick={() => { setConfirming(false); try { prefs.update(r => setEarnPref(r, {governanceShown: true, pageShown: true})); } catch { /* this device refused: Governance stays as it was */ } try { apps.update(p => SIDEBAR_APP_IDS.reduce((r, id) => withAppShown(r, id, true), p)); } catch { /* this device refused: the apps stay as they were */ } void save(pages => showEverything(pages, new Date().toISOString()), 'Every page and button shows again.').then(() => resetButton.current?.focus()); }}>Show everything</button>
          <button type="button" className="quiet" onClick={() => { setConfirming(false); requestAnimationFrame(() => resetButton.current?.focus()); }}>Cancel</button>
        </div>
      </div> : <button ref={resetButton} type="button" className="secondary" onClick={() => setConfirming(true)}>Show everything again</button>}
      {showcase ? <p className="fine">In Showcase these choices last for this tab only.</p> : <p className="fine"><Link className="text-link" href="/app/welcome">Run the welcome again</Link> to pick what you want to improve and a few starters; nothing you have is added twice.</p>}
    </>}
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </section>;
}
