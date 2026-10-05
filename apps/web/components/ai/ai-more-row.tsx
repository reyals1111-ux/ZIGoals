'use client';
import {AppIcon} from '../app-icon';
import {useAiSettings} from './use-ai-settings';

/**
 * The More sheet's row for ZIGi (ADR-012): only "Show ZIGi again", and only while the launcher is hidden. The sheet's
 * links stay exactly the navigation (the specs pin that list); a button is not a link, and the ZIGi settings are one
 * tap away through Settings → ZIGi · your AI.
 */
export function AiMoreRow({onNavigate}: {onNavigate: () => void}) {
  const settings = useAiSettings();
  if (!settings.loaded || !settings.data.launcherHidden) return null;
  return <li data-group-start="ai"><button type="button" className="phone-more-row" onClick={() => { settings.update(s => ({...s, launcherHidden: false})); onNavigate(); }}>
    <span className="icon-medallion"><AppIcon name="star" size={22} luminous/></span>
    <span className="phone-more-copy" data-note="The ZIGi button comes back above the tabs"><strong>Show ZIGi again</strong></span>
  </button></li>;
}
