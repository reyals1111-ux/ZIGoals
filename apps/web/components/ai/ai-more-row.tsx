'use client';
import Link from 'next/link';
import {AppIcon} from '../app-icon';
import {ZigiAvatar} from '../zigi/zigi-avatar';
import {useAiSettings} from './use-ai-settings';

/** The More sheet's row for ZIGi (ADR-012): the settings section, and "Show ZIGi again" when the launcher is hidden. */
export function AiMoreRow({onNavigate}: {onNavigate: () => void}) {
  const settings = useAiSettings();
  if (!settings.loaded) return null;
  return <>
    <li data-group-start="ai"><Link href="/app/settings#your-ai" className="phone-more-row" aria-label="ZIGi · your AI" onClick={onNavigate}>
      <span className="icon-medallion"><ZigiAvatar size={22} decorative/></span>
      <span className="phone-more-copy" data-note={settings.data.enabled ? 'Your own AI, page by page' : 'Connect your own AI · Premium, free during Alpha'}><strong>ZIGi · your AI</strong></span>
      <span className="phone-more-chevron" aria-hidden="true"><AppIcon name="back" size={18}/></span>
    </Link></li>
    {settings.data.launcherHidden && <li><button type="button" className="phone-more-row" onClick={() => { settings.update(s => ({...s, launcherHidden: false})); onNavigate(); }}>
      <span className="icon-medallion"><AppIcon name="star" size={22} luminous/></span>
      <span className="phone-more-copy" data-note="The ZIGi button comes back above the tabs"><strong>Show ZIGi again</strong></span>
    </button></li>}
  </>;
}
