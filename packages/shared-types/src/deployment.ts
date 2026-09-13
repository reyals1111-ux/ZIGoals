import { z } from "zod";
import { fromBech32 } from "@cosmjs/encoding";
const hash = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .refine((v) => !/^0+$/.test(v));
const txHash = z
  .string()
  .regex(/^[A-Fa-f0-9]{64}$/)
  .refine((v) => !/^0+$/.test(v));
function address(bytes: number) {
  return z
    .string()
    .max(90)
    .refine((value) => {
      try {
        const decoded = fromBech32(value, 90);
        return (
          value === value.toLowerCase() &&
          decoded.prefix === "zig" &&
          decoded.data.length === bytes &&
          decoded.data.some((b) => b !== 0)
        );
      } catch {
        return false;
      }
    }, "Use a valid ZIGChain public address.");
}
const timestamp = z.string().refine((value) => {
  const time = Date.parse(value);
  return (
    Number.isFinite(time) &&
    new Date(time).toISOString() === value &&
    time <= Date.now() + 300_000 &&
    time >= Date.UTC(2024, 0, 1)
  );
}, "Use an actual UTC timestamp, not a future or invalid date.");
const common = {
  schemaVersion: z.literal(2),
  environment: z.literal("testnet"),
  chainId: z.literal("zig-test-2"),
  chainVersion: z.literal("v5.0.0-patch-1"),
  denom: z.literal("azig"),
  decimals: z.literal(18),
  wasmSha256: hash,
  migrationAdmin: z.null(),
  pauseAdmin: address(20).nullable(),
  contractName: z.literal("crates.io:zigoals-goal-manager"),
  contractVersion: z.literal("0.1.0"),
  gitCommit: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .refine((v) => !/^0+$/.test(v)),
  buildEnvironment: z.strictObject({
    platform: z.enum(["darwin", "linux"]),
    arch: z.enum(["arm64", "x64"]),
    rust: z.literal("1.85.1"),
    binaryen: z.literal("123"),
    cosmwasmCheck: z.literal("2.2.2"),
    sourceDirty: z.boolean(),
  }),
  preparedAt: timestamp,
  rpcUsed: z.literal("https://testnet-rpc.zigchain.com"),
  restUsed: z.literal("https://testnet-api.zigchain.com"),
};
const prepared = z.strictObject({
  ...common,
  status: z.literal("PREPARED_NOT_DEPLOYED"),
  codeId: z.null(),
  contractAddress: z.null(),
  uploadTx: z.null(),
  instantiateTx: z.null(),
  deployerPublicAddress: z.null(),
  deploymentTimestamp: z.null(),
  explorerVerification: z.strictObject({
    status: z.literal("NOT_VERIFIED"),
    url: z.null(),
    verifiedAt: z.null(),
  }),
});
const deployed = z
  .strictObject({
    ...common,
    status: z.literal("DEPLOYED"),
    codeId: z
      .string()
      .regex(/^[1-9]\d{0,15}$/)
      .refine((v) => BigInt(v) <= BigInt(Number.MAX_SAFE_INTEGER)),
    contractAddress: address(32),
    uploadTx: txHash,
    instantiateTx: txHash,
    deployerPublicAddress: address(20),
    deploymentTimestamp: timestamp,
    explorerVerification: z.strictObject({
      status: z.literal("VERIFIED"),
      url: z.string(),
      verifiedAt: timestamp,
    }),
  })
  .superRefine((m, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (m.buildEnvironment.sourceDirty)
      fail("Deployed code must refer to a clean, reviewed build.");
    if (
      m.explorerVerification.url !==
      `https://testnet.zigscan.org/smart-contracts/contract/${m.contractAddress}`
    )
      fail("Explorer evidence must identify this exact testnet contract.");
    if (
      m.preparedAt > m.deploymentTimestamp ||
      m.explorerVerification.verifiedAt < m.deploymentTimestamp
    )
      fail("Deployment evidence timestamps are out of order.");
    if (m.uploadTx.toUpperCase() === m.instantiateTx.toUpperCase())
      fail("Record distinct upload and instantiate receipts.");
  });
export const deploymentSchema = z.discriminatedUnion("status", [
  prepared,
  deployed,
]);
export type DeploymentManifest = z.infer<typeof deploymentSchema>;
export type DeployedManifest = Extract<
  DeploymentManifest,
  { status: "DEPLOYED" }
>;
export function requireDeployedManifest(input: unknown): DeployedManifest {
  const parsed = deploymentSchema.safeParse(input);
  if (!parsed.success)
    throw Error(
      "Goal Manager deployment manifest is invalid. Financial actions are disabled.",
    );
  if (parsed.data.status !== "DEPLOYED")
    throw Error("Goal Manager is not deployed. Local demo is available.");
  return parsed.data;
}
