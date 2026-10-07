'use client';
import {AppIcon} from '../app-icon';
import {useLauncherRecord} from './use-launcher-record';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';

/**
 * The More sheet's row for ZIGi (ADR-012): only "Show ZIGi again", and only while the launcher is hidden. The sheet's
 * links stay exactly the navigation (the specs pin that list); a button is not a link, and the ZIGi settings are one
 * tap away through Settings → ZIGi · your AI.
 */
export function AiMoreRow({onNavigate}: {onNavigate: () => void}) {
  const launcher = useLauncherRecord(), switchedOn = isShown(usePagesView(), 'zigi');
  // Only this device's hide (the chevron): the synced switch in Settings → Your pages & buttons is changed there.
  if (!launcher.loaded || !launcher.record.launcherHidden || !switchedOn) return null;
  return <li data-group-start="ai"><button type="button" className="phone-more-row" onClick={() => { launcher.setLauncherHidden(false); onNavigate(); }}>
    <span className="icon-medallion"><AppIcon name="star" size={22} luminous/></span>
    <span className="phone-more-copy" data-note="The ZIGi button comes back above the tabs"><strong>Show ZIGi again</strong></span>
  </button></li>;
}
