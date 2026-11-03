import {HERMES_DEFAULT_PORT} from './hermes-record';

/**
 * Session AK WA (owner follow-up 3 N11, message 3; WIRING_AUDIT_2 N11): the Showcase's example of a linked Hermes Agent,
 * shown on the Hermes guide while the Showcase is on (components/nova/hermes/hermes-example.tsx). Words only: it is never
 * written to `zigoals:nova-hermes:v1`, so nothing in NOVA counts it as connected, no "Ask my Hermes" appears, and no request
 * goes to any address (the Showcase has no gateway). Every line says it is an example. Fictional, no figure from records.
 */
export const HERMES_SHOWCASE_EXAMPLE = {
  label: 'Showcase example',
  honest: 'An example connection, not a real gateway. Nothing on your computer or on the internet is contacted, and nothing here is saved.',
  status: [
    {term: 'Gateway', value: `Reachable at the last check (example) · 127.0.0.1:${HERMES_DEFAULT_PORT}`},
    {term: 'Model it reported', value: 'hermes-agent (example)'},
    {term: 'Privacy', value: 'You confirmed it runs a local model, so Strict allows it (example).'},
  ],
  exchange: [
    {who: 'You', text: 'Ask my Hermes: plan tomorrow around my two meetings.'},
    {who: 'NOVA', text: 'Asked your Hermes Agent, with Today’s records. Any change comes back as a card you confirm.'},
    {who: 'Hermes · your agent', text: 'Example answer. A focus block before the first meeting, a walk after lunch, and the weekly review at five. Shall I add the focus block as a task?'},
  ],
  yours: 'With your own data (Showcase off), the planets below connect your real Hermes and each step’s check tests it on this computer.',
} as const;
/** Every visible line of the example, for the label test (each says example, or is the person's own question). */
export const hermesShowcaseLines = (): string[] => [HERMES_SHOWCASE_EXAMPLE.label, HERMES_SHOWCASE_EXAMPLE.honest, ...HERMES_SHOWCASE_EXAMPLE.status.map(s => `${s.term}: ${s.value}`), ...HERMES_SHOWCASE_EXAMPLE.exchange.map(e => `${e.who}: ${e.text}`), HERMES_SHOWCASE_EXAMPLE.yours];
