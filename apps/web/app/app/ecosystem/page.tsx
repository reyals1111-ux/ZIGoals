import "../../../components/life-pages.css";
import { explorers, hubLinks } from "@zigoals/ecosystem-registry";
import { EcosystemDirectory } from "../../../components/ecosystem-directory";
import { idleStrategy } from "@zigoals/strategy-types";
import { StrategyTransparency } from "../../../components/strategy-transparency";

export default function EcosystemPage() {
  return (
    <div className="ecosystem-page">
      <EcosystemDirectory />
      <p className="fine">External investment and funding integrations are disabled.</p>
      <details className="ecosystem-tools"><summary>Network tools &amp; integration readiness</summary>
      <section className="panel" id="network-tools" aria-label="Onchain verification tools">
        <h2>Check the public record.</h2>
        <p>
          Use an explorer to inspect public activity. ZIGoals separately checks
          known transaction receipts.
        </p>
        <div className="actions">
          {explorers.map((p) => (
            <a
              key={p.id}
              className="secondary"
              href={p.homepage}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open {p.name} testnet ↗
            </a>
          ))}
        </div>
        <p className="fine">
          ZIGScan detail links appear on known records. Range detail routes are
          still unconfirmed; its official testnet homepage is available here.
          Neither explorer is a complete ZIGoals history service.
        </p>
      </section>
      <section
        className="panel ecosystem-hub"
        aria-label="Official ZIGChain Hub links"
      >
        <h2>Explore the official Hub.</h2>
        <p>
          Read validator, governance and network information in ZIGChain’s own
          tools.
        </p>
        <div className="hub-links">
          {hubLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
        <p className="fine">
          These links open a separate app. Check its selected network; it may
          open mainnet. ZIGoals passes no wallet or transfer instructions.
          Staking, voting and bridging are separate actions in Hub.
        </p>
      </section>
      <StrategyTransparency strategy={idleStrategy("azig")} />
      </details>
    </div>
  );
}
