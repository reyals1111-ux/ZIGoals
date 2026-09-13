import { createHash } from "node:crypto";
export const LOCAL_REFERENCE_SHA256 = "090b19225a93fc191810426973001ab400452799d1925aadddadef1fc0cc6e25";
export function describeWasm(bytes, environment) {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { bytes: bytes.length, sha256, environment, referenceSha256: LOCAL_REFERENCE_SHA256, referenceMatch: sha256 === LOCAL_REFERENCE_SHA256 };
}
