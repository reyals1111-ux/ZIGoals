import {
  documentedProvenance,
  type StrategyDescriptor,
} from "@zigoals/strategy-types";
/** Only product-specific documented relationships are displayed. Text is escaped by React. */
export function StrategyTransparency({
  strategy,
}: {
  strategy: StrategyDescriptor;
}) {
  const entries = documentedProvenance(strategy);
  return (
    <section className="principle" aria-label="Strategy transparency">
      <div>
        <p className="eyebrow">Powered by the ecosystem</p>
        <h2>{strategy.name}</h2>
        <dl className="metrics">
          <div>
            <dt>Goal layer</dt>
            <dd>ZIGoals</dd>
          </div>
          <div>
            <dt>Product</dt>
            <dd>{strategy.product?.name ?? strategy.protocol}</dd>
          </div>
          {strategy.network && (
            <div>
              <dt>Network</dt>
              <dd>
                {strategy.network.name} · {strategy.network.chainId}
              </dd>
            </div>
          )}
          {entries.map((entry, i) => (
            <div key={`${entry.role}-${entry.providerId}-${i}`}>
              <dt>{entry.role.toLowerCase()}</dt>
              <dd>
                {entry.name}{" "}
                <a
                  href={entry.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source ↗
                </a>
              </dd>
            </div>
          ))}
          <div>
            <dt>Audit</dt>
            <dd>
              {strategy.audit.status === "NOT_AUDITED"
                ? "Not audited"
                : "Audit documented; review its scope"}
            </dd>
          </div>
        </dl>
        <p>
          {strategy.underlyingYieldSource ??
            "Idle holds native assets without investing them. No external yield source is active."}
        </p>
        {entries.length === 0 && (
          <p className="fine">
            No external curator, originator, custodian or servicer relationship
            is configured.
          </p>
        )}
      </div>
    </section>
  );
}
