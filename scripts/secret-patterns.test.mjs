import { test, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { findSecrets } from "./secret-patterns.mjs";
// Samples are assembled at runtime so no credential-shaped literal is ever committed.
const x = (n, c = "a") => c.repeat(n);
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (payload) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.${x(43, "s")}`;
const words = readFileSync(new URL("./bip39-english.txt", import.meta.url), "utf8").trim().split("\n");

test("each credential shape is detected by name", () => {
  const cases = [
    ["PEM private key", ["-----BEGIN ", "PRIVATE KEY-----"].join("")],
    ["PEM private key", ["-----BEGIN ENCRYPTED ", "PRIVATE KEY-----"].join("")],
    ["PEM private key", ["-----BEGIN PGP ", "PRIVATE KEY BLOCK-----"].join("")],
    ["GitHub token", "ghp" + "_" + x(36, "Z")],
    ["Supabase secret key", "sb" + "_secret_" + x(32, "k")],
    ["Supabase service_role JWT", `key = "${jwt({ iss: "supabase", role: "service_role" })}"`],
    ["Resend API key", "re" + "_" + x(9, "A") + "_" + x(24, "b")],
    ["Cloudflare API token or key", "CLOUDFLARE_API_TOKEN=" + x(40, "t")],
    ["Cloudflare API token or key", '"CF_API_KEY": "' + x(37, "f") + '"'],
    ["CoinGecko API key", "CG-" + x(24, "q")],
    ["Assigned mnemonic or private key", "mnemonic = '" + x(24, "w") + "'"],
    ["Seed-phrase-like word list", `const phrase = "${words.slice(100, 112).join(" ")}";`],
    ["Seed-phrase-like word list", words.slice(500, 524).join(" ")],
  ];
  for (const [name, sample] of cases) expect(findSecrets(sample), sample.slice(0, 24)).toContain(name);
});

test("near misses are not reported", () => {
  const samples = [
    `anon = "${jwt({ iss: "supabase", role: "anon" })}"`,
    "sb" + "_publishable_" + x(32, "p"),
    "CG-short",
    "CLOUDFLARE_API_TOKEN=${{ secrets.CLOUDFLARE_API_TOKEN }}",
    "-----BEGIN PUBLIC KEY-----",
    words.slice(0, 11).join(" "),
    words.slice(0, 13).join(" "),
    `test("${"private account route reads current request bindings and reaches named sync service without public fetch"}")`,
    "the quick brown fox jumps over the lazy dog again and again today",
  ];
  for (const sample of samples) expect(findSecrets(sample), sample.slice(0, 40)).toEqual([]);
});

test("the current repository has no findings", () => {
  expect(execFileSync("node", [new URL("./check-secrets.mjs", import.meta.url).pathname], { encoding: "utf8" })).toContain("check passed");
}, 60000);
