'use client';
import {Component, type ReactNode} from 'react';

/**
 * Session AF (L1): one Earn section that fails to draw (an answer of a shape this build did not expect) says so in its
 * own place and leaves the rest of the page, its explanations and its safety notes, standing. Nothing is guessed.
 */
export class SectionBoundary extends Component<{id: string; title: string; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section id={this.props.id} className="panel earn-option" aria-labelledby={`${this.props.id}-title`}>
      <h2 id={`${this.props.id}-title`}>{this.props.title}</h2>
      <p className="earn-figure" data-live-figure={this.props.id} data-state="unavailable" data-reason="MALFORMED">This section could not be drawn just now: its live answer was not in the shape ZIGoals checks for. The other sections are unaffected.</p>
    </section>;
  }
}
