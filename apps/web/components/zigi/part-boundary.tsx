'use client';
import {Component, useEffect, useState, type ReactNode} from 'react';

/**
 * Session X-Local Phase 2 (P2.8, X-Cloud's H9): a part of ZIGi whose code loads on demand keeps a failed load to itself.
 * Offline, or after a new version replaced the files, the chunk cannot be fetched; without this the chat, a Settings
 * panel or the knock's check-in took the whole launcher or section down. The part says which connection it needs, in
 * place (or, `quiet`, a floating part simply stays away); the rest of ZIGi keeps working. The browser remembers a failed
 * load until the page reloads, so the way back is a reload once online. The wording follows X-Cloud's `LoadBoundary`,
 * which wraps the places where its files mount ZIGi's parts; this one wraps the parts inside ZIGi's own components.
 */
export class ZigiPartBoundary extends Component<{children: ReactNode; label?: string; quiet?: boolean; className?: string}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.quiet) return null;
    return <PartFailed label={this.props.label ?? 'This part of ZIGi'} className={this.props.className}/>;
  }
}

function PartFailed({label, className}: {label: string; className?: string}) {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <div className={className ?? 'zigi-part-failed'} role="status">
    <p className="ai-note">{online ? `${label} could not be opened. Reload the page to try again.` : `${label} needs a connection to open. It opens when you’re back online; the rest of ZIGi keeps working.`}</p>
    <button type="button" className="secondary" disabled={!online} onClick={() => window.location.reload()}>Reload</button>
  </div>;
}
