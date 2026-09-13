// Read-only preparation: no signer, key input, wallet, upload or broadcast API.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { TESTNET, verifyNetwork } from "../packages/chain-config/src/index.ts";
import { buildPreparedManifest } from "./lib/prepare-deployment.mjs";
import { verifyCandidateDirectory } from "./release/verify.mjs";

const defaultValidator = fileURLToPath(new URL("../.toolchain/check/bin/cosmwasm-check", import.meta.url));
export async function prepareDeployment({ expectedCommit, candidateDir, validator = defaultValidator }, fetcher = fetch) {
  // This entire local gate precedes the first request and any prepared output.
  const { manifest: candidate, wasm: bytes } = verifyCandidateDirectory({
    expectedCommit, directory: candidateDir, validator,
  });
  await verifyNetwork(TESTNET, fetcher, "v5.0.0-patch-1");
  const response = await fetcher(`${TESTNET.rpcUrl}/status`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Error("Network evidence unavailable; preparation stopped.");
  const rpc = await response.json();
  if (rpc.result?.node_info?.network !== TESTNET.chainId || rpc.result?.sync_info?.catching_up !== false)
    throw Error("Testnet RPC identity or readiness changed; review before preparing.");
  return buildPreparedManifest({ bytes, candidate, expectedCommit });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [expectedCommit, candidateDir, validator] = process.argv.slice(2);
    if (!expectedCommit || !candidateDir || process.argv.length > 5)
      throw Error("Usage: node scripts/prepare-deployment.mjs EXPECTED_FULL_COMMIT CANDIDATE_DIRECTORY [TRUSTED_VALIDATOR_PATH] (no wallet or secret arguments)");
    const manifest = await prepareDeployment({ expectedCommit, candidateDir, validator });
    console.error("Preparation only: verify trusted run and main-workflow attestation separately before owner-approved upload; no provenance or upload approval is granted here.");
    console.log(JSON.stringify(manifest, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
