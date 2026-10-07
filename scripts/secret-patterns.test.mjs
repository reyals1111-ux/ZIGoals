import { test, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { findSecrets } from "./secret-patterns.mjs";
import { scanFiles, sha256 } from "./lib/secret-scan.mjs";
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
    // Session X Part 2: provider, payment, cloud and chat shapes (after GitHub's secret-scanning patterns).
    ["Google API key", "AI" + "za" + x(35, "G")],
    ["OpenAI API key", "sk-" + "proj-" + x(20, "o") + "T3Blbk" + "FJ" + x(20, "p")],
    ["OpenAI API key", "sk-" + "svcacct-" + x(48, "o")],
    ["Anthropic API key", "sk-" + "ant-" + "api03-" + x(93, "A")],
    ["xAI API key", "xa" + "i-" + x(80, "X")],
    ["OpenRouter API key", "sk-" + "or-v1-" + x(64, "e")],
    ["Groq API key", "gs" + "k_" + x(52, "Q")],
    ["Stripe secret key", "sk" + "_live_" + x(24, "S")],
    ["Stripe secret key", "rk" + "_test_" + x(30, "S")],
    ["Stripe secret key", "wh" + "sec_" + x(32, "W")],
    ["AWS access key id", "AK" + "IA" + x(16, "A")],
    ["Slack token", "xo" + "xb-" + x(12, "1") + "-" + x(24, "s")],
    ["Signed JWT", jwt({ sub: "fixture" })],
    ["Elliptic-curve private JWK", `{"kty":"EC","crv":"P-256","d":"${x(43, "d")}","x":"${x(43, "x")}"}`],
    ["Elliptic-curve private JWK", `{d:'${x(43, "d")}',crv:'P-256',kty:'EC'}`],
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
    // Session X Part 2 near misses: short fixture keys, publishable keys, unsigned or one-part tokens, public JWKs.
    "AI" + "zaSyFAKE" + x(14, "0"),
    "AI" + "za" + x(36, "G"),
    "sk-" + "test-FAKE-relay-key",
    "sk-" + "proj-" + x(32, "a"),
    "sk-" + "ant-FAKE-" + x(10, "k"),
    "xa" + "i-" + x(26, "a"),
    "sk-" + "or-v1-" + x(10, "a"),
    "pk" + "_live_" + x(24, "P"),
    "AK" + "IA" + x(15, "A"),
    `${b64({ alg: "none" })}.${b64({ sub: "x" })}.${x(20, "s")}`,
    "eyJjb250cmFjdCI6InppZzEifQ",
    `{"kty":"EC","crv":"P-256","x":"${x(43, "x")}","y":"${x(43, "y")}"}`,
    `{"kty":"RSA","d":"${x(43, "d")}"}`,
  ];
  for (const sample of samples) expect(findSecrets(sample), sample.slice(0, 40)).toEqual([]);
});

test("the current repository has no findings", () => {
  expect(execFileSync("node", [new URL("./check-secrets.mjs", import.meta.url).pathname], { encoding: "utf8" })).toContain("check passed");
}, 60000);

// Session X Part 2: the allowlist hides one exact value per entry; a stale entry is reported, never a failure.
test("an allowlist entry hides exactly its value; another value in the same file is still a finding", () => {
  const known = "AI" + "za" + x(35, "K"), other = "AI" + "za" + x(35, "L");
  const entry = { path: "lane/a.test.ts", check: "Google API key", sha256: sha256(known) };
  const files = { "lane/a.test.ts": `const k = '${known}';`, "lane/b.test.ts": `const k = '${known}';`, "lane/c.test.ts": `'${known}' '${other}'` };
  const read = (file) => files[file];
  expect(scanFiles(["lane/a.test.ts"], read, [entry])).toEqual({ hits: [], allowed: 1, stale: [] });
  expect(scanFiles(["lane/b.test.ts"], read, [entry]).hits).toEqual(["lane/b.test.ts (Google API key)"]);
  expect(scanFiles(["lane/c.test.ts"], read, [{ ...entry, path: "lane/c.test.ts" }]).hits).toEqual(["lane/c.test.ts (Google API key)"]);
});
test("a stale allowlist entry (the value already fixed) is reported as stale and the scan still passes", () => {
  const entry = { path: "lane/a.test.ts", check: "Google API key", sha256: sha256("AI" + "za" + x(35, "K")) };
  expect(scanFiles(["lane/a.test.ts"], () => "const k = ['AI', 'za'].join('');", [entry])).toEqual({ hits: [], allowed: 0, stale: [{ path: "lane/a.test.ts", check: "Google API key" }] });
});
test("the checked-in allowlist names only hashes, files and checks, never a value", () => {
  const list = JSON.parse(readFileSync(new URL("./secret-allowlist.json", import.meta.url), "utf8"));
  for (const entry of list.entries) {
    expect(Object.keys(entry).sort()).toEqual(["check", "path", "reason", "sha256"]);
    expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
  }
  expect(findSecrets(JSON.stringify(list))).toEqual([]);
});
