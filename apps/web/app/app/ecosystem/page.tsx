import { AppIcon } from "../../../components/app-icon";
import Link from "next/link";
import { explorers, hubLinks } from "@zigoals/ecosystem-registry";
import { ecosystemProviders } from "@zigoals/ecosystem-registry/providers";
import { idleStrategy } from "@zigoals/strategy-types";
import { StrategyTransparency } from "../../../components/strategy-transparency";

export default function EcosystemPage() {
  return (
    <div className="ecosystem-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">An open ecosystem</p>
          <h1>Built to work together.</h1>
          <p>
            Verify onchain activity and explore the people and protocols around
            ZIGChain.
          </p>
        </div>
        <Link href="/app/goals" className="text-link">
          Back to goals →
        </Link>
      </div>
      <section className="ecosystem-map" aria-label="ZIGChain integration readiness"><div className="network-emblem" aria-hidden="true"><AppIcon name="ecosystem" size={74}/></div><div><p className="eyebrow">THE GOAL LAYER FOR ZIGCHAIN</p><h2>Connected by purpose.</h2><p>One Goal Manager architecture. A growing strategy ecosystem, connected only when its interfaces are verified.</p></div><ul><li><strong>ZIGChain Testnet</strong><span>VERIFIED NETWORK · WALLET CONNECTION</span></li><li><strong>Goal Manager</strong><span>NOT DEPLOYED</span></li><li><strong>Valdora</strong><span>PENDING CANONICAL INTERFACE</span></li><li><strong>WME</strong><span>FUTURE · UNVERIFIED</span></li></ul></section>
      <section className="panel" aria-label="Onchain verification tools">
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
      <div className="page-heading">
        <div>
          <p className="eyebrow">Research, with sources</p>
          <h2>The wider ecosystem.</h2>
          <p>
            External investment and funding integrations are disabled. Provider
            research is not an audit, endorsement or eligibility approval.
          </p>
        </div>
      </div>
      <div className="ecosystem-list">
        {ecosystemProviders
          .filter((p) => p.phase !== "READ_ONLY")
          .map((p) => (
            <details className="panel provider-record" key={p.id}>
              <summary>
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.roles
                      .map((role) => role.toLowerCase().replaceAll("_", " "))
                      .join(" · ")}
                  </small>
                </span>
                <span className="badge">Research only</span>
              </summary>
              <p>{p.notes}</p>
              <dl>
                {p.networks.map((n, i) => (
                  <div key={`${n.chainId}-${i}`}>
                    <dt>
                      {n.chainId} ·{" "}
                      {n.status.toLowerCase().replaceAll("_", " ")}
                    </dt>
                    <dd>{n.note}</dd>
                  </div>
                ))}
              </dl>
              <h3>Eligibility and access</h3>
              <p>{p.eligibility.note}</p>
              <h3>Unresolved risks and gates</h3>
              <ul>
                {p.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="fine">
                Evidence reviewed {p.lastVerified}. Historical audit references
                do not establish the safety of current deployed code.
              </p>
              <div className="source-links">
                {p.sources.map((s, i) => (
                  <a
                    href={s.url}
                    key={`${s.url}-${i}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.title} ↗
                  </a>
                ))}
              </div>
            </details>
          ))}
      </div>
    </div>
  );
}
