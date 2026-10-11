'use client';
import {Component, useEffect, useState, type ReactNode} from 'react';

/**
 * Session X Part 14 (J249): a part of a page whose code loads on demand keeps a failed load to itself. Offline, or after
 * a new version replaced the files, that code cannot be fetched, and the whole page gave way to the error page, against
 * the offline notice ("This page keeps working and saves on this device"). The part says so in place (or, `quiet`, a
 * floating button simply stays away); the rest of the page keeps working. A failed load is remembered by the browser
 * until the page reloads, so the way back is a reload once online.
 */
export class LoadBoundary extends Component<{children: ReactNode; label?: string; title?: string; quiet?: boolean; className?: string; noteClassName?: string; rest?: string}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.quiet) return null;
    const note = <LoadFailed label={this.props.label ?? 'This part of the page'} className={this.props.className} noteClassName={this.props.noteClassName} rest={this.props.rest} />;
    return this.props.title ? <section className="panel"><h1>{this.props.title}</h1>{note}</section> : note;
  }
}

// Session X-Local Part 9 (the owner's H9 fold, ADR-017 S80): ZIGi's own parts render through this same component with their
// class names and "the rest of ZIGi"; without the extra props the markup is exactly as before.
function LoadFailed({label, className, noteClassName, rest}: {label: string; className?: string; noteClassName?: string; rest?: string}) {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <div className={className ?? 'load-boundary'} role="status">
    <p className={noteClassName}>{online ? `${label} could not be opened. Reload the page to try again.` : `${label} needs a connection to open. It opens when you’re back online; the rest of ${rest ?? 'this page'} keeps working.`}</p>
    <button type="button" className="secondary" disabled={!online} onClick={() => window.location.reload()}>Reload</button>
  </div>;
}
