'use client';
import {Component, Suspense, lazy, type CSSProperties, type ReactNode} from 'react';
import type {PathColour} from '../../lib/path/colours';
import type {FavouriteRef} from '../../lib/checklist/store';
import {StarGlyph, starTint, starTitle} from './star-glyph';
import './star-toggle.css';

/**
 * CI14 (page weights; budgets are never raised): the Checklist star loads with its own chunk (star-toggle-button.tsx: the
 * Checklist store, the toast and the record), asked for as soon as a page that shows stars loads, not with the page.
 * Until it is there the star stands in exactly as the button first renders: outlined, disabled (its record is read only
 * after mount, so the real button is disabled on its first render too), with the same name, title and colour. The first
 * paint is the same, nothing moves when the button takes over, and the stylesheet stays here, in its place in the cascade.
 * A chunk that cannot be fetched (offline after a new version) leaves the disabled star in place; the card keeps working.
 */
const loadButton = () => import('./star-toggle-button');
if (typeof window !== 'undefined') void loadButton().catch(() => undefined);
const Button = lazy(() => loadButton().then(m => ({default: m.StarToggleButton})));
type StarProps = {item: FavouriteRef; label: string; colour?: PathColour; section?: string; defaultValue?: number; unit?: string; note?: string};
function StarStandIn({item, label, colour, note}: StarProps) {
  return <button type="button" className="star-toggle" data-dim={note ? '' : undefined} disabled aria-pressed={false} aria-label={`Star ${label} for your Checklist path`} title={starTitle(note, false)} style={{'--checklist-star': starTint(item, colour)} as CSSProperties}>
    <StarGlyph/>
  </button>;
}
class KeepStandIn extends Component<{standIn: ReactNode; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() { return this.state.failed ? this.props.standIn : this.props.children; }
}
/** The Checklist star (Session AF, L3; P7.2): see star-toggle-button.tsx. */
export function StarToggle(props: StarProps) {
  const standIn = <StarStandIn {...props}/>;
  return <KeepStandIn standIn={standIn}><Suspense fallback={standIn}><Button {...props}/></Suspense></KeepStandIn>;
}
