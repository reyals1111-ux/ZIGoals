'use client';
import {HERMES_SHOWCASE_EXAMPLE as X} from '../../../lib/nova/hermes-showcase';
import './hermes-example.css';

/**
 * Session AK WA (N11): the Showcase's labelled example of a linked Hermes Agent, on the Hermes guide. Static words: no
 * record, no request, no "connected" state anywhere else in NOVA (lib/nova/hermes-showcase.ts).
 */
export default function HermesShowcaseExample() {
  return <section className="nova-guide-card nova-hermes-example" aria-labelledby="nova-hermes-example-title">
    <p className="eyebrow">{X.label}</p>
    <h3 id="nova-hermes-example-title">What a linked Hermes Agent looks like</h3>
    <p className="fine">{X.honest}</p>
    <dl className="nova-hermes-example-status">{X.status.map(s => <div key={s.term}><dt>{s.term}</dt><dd>{s.value}</dd></div>)}</dl>
    <ol className="nova-hermes-example-talk" aria-label="An example exchange">{X.exchange.map(e => <li key={e.who}><strong>{e.who}</strong> <span>{e.text}</span></li>)}</ol>
    <p className="fine">{X.yours}</p>
  </section>;
}
