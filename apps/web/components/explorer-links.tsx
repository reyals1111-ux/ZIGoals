import {
  buildExplorerUrl,
  explorers,
  type ExplorerKind,
} from "@zigoals/ecosystem-registry";
/** External navigation only. A link is never confirmation evidence. */
export function ExplorerLinks({
  chainId,
  kind,
  identifier,
}: {
  chainId: string;
  kind: ExplorerKind;
  identifier: string;
}) {
  const links = explorers.flatMap((provider) => {
    const url = buildExplorerUrl(provider.id, chainId, kind, identifier);
    return url ? [{ name: provider.name, url }] : [];
  });
  return (
    <span className="explorer-links">
      {links.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Verify with {link.name} ↗
        </a>
      ))}
      {!links.length && (
        <span className="fine">
          No verified explorer link for this network and record.
        </span>
      )}
    </span>
  );
}
