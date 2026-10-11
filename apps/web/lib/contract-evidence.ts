import type { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import type { DeployedManifest } from "@zigoals/shared-types/deployment";
/** Read-only identity check shared by financial preflight and diagnostics. */
export async function verifyContractEvidence(
  client: CosmWasmClient,
  manifest: DeployedManifest,
) {
  const info = await client.getContract(manifest.contractAddress);
  if (
    String(info.codeId) !== manifest.codeId ||
    info.admin ||
    info.creator !== manifest.deployerPublicAddress
  )
    throw Error(
      "Contract deployment does not match the approved immutable code manifest.",
    );
  const code = await client.getCodeDetails(info.codeId);
  if (
    typeof code.checksum !== "string" ||
    code.checksum.toLowerCase() !== manifest.wasmSha256
  )
    throw Error(
      "Goal Manager code checksum mismatch. Financial actions are disabled.",
    );
  const [config, version] = await Promise.all([
    client.queryContractSmart(manifest.contractAddress, { config: {} }),
    client.queryContractSmart(manifest.contractAddress, {
      contract_version: {},
    }),
  ]);
  if (
    config?.native_denom !== manifest.denom ||
    config?.admin !== manifest.pauseAdmin ||
    version?.contract !== manifest.contractName ||
    version?.version !== manifest.contractVersion
  )
    throw Error(
      "Goal Manager version or denomination mismatch (including pause admin).",
    );
  return { checksum: code.checksum.toLowerCase(), codeId: String(info.codeId) };
}
