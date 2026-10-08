import { readFileSync } from "node:fs";
// Credential patterns for the tracked-file scan. Names only are reported; values never are.
const jwtPart = (token, index) => {
  try {
    return JSON.parse(Buffer.from(token.split(".")[index], "base64url").toString("utf8"));
  } catch {
    return null;
  }
};
// A seed phrase: exactly 12/15/18/21/24 words, every one from the BIP39 English list, filling a
// whole quoted string or a whole line. `bip39-english.txt` is the standard list (2048 words).
const bip39 = new Set(readFileSync(new URL("./bip39-english.txt", import.meta.url), "utf8").trim().split("\n"));
const seedLike = (text) => {
  const candidates = [
    ...[...text.matchAll(/(["'`])([a-z ]{30,220})\1/g)].map((m) => m[2]),
    ...text.split(/\r?\n/).map((line) => line.trim()),
  ];
  return candidates.filter((c) => {
    if (!/^[a-z]+(?: [a-z]+)+$/.test(c)) return false;
    const words = c.split(" ");
    return [12, 15, 18, 21, 24].includes(words.length) && words.every((w) => bip39.has(w));
  });
};
const all = (pattern) => (text) => [...text.matchAll(pattern)].map((m) => m[0]);
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}/g;

// Each check returns the exact text it matched (used only to compare with the allowlist's hashes, never printed).
// Session X Part 2 added the AI-provider, payment, cloud and chat shapes after GitHub's secret-scanning patterns, plus
// any signed JWT and an elliptic-curve private JWK.
export const secretChecks = [
  ["PEM private key", all(/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/g)],
  ["GitHub token", (t) => [...all(/\bgh[pousr]_[A-Za-z0-9]{30,}/g)(t), ...all(/\bgithub_pat_[A-Za-z0-9_]{40,}/g)(t)]],
  ["Supabase secret key", all(/\bsb_secret_[A-Za-z0-9_-]{20,}/g)],
  ["Supabase personal access token", all(/\bsbp_[a-f0-9]{40}\b/g)],
  ["npm token", all(/\bnpm_[A-Za-z0-9]{36}\b/g)],
  ["Supabase service_role JWT", (t) => all(JWT)(t).filter((m) => jwtPart(m, 1)?.role === "service_role")],
  ["Resend API key", all(/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/g)],
  [
    "Cloudflare API token or key",
    all(/\b(?:CLOUDFLARE_API_(?:TOKEN|KEY)|CF_API_(?:TOKEN|KEY))\b["']?\s*[:=]\s*["']?(?:[A-Za-z0-9_-]{40}|[a-f0-9]{37})\b/gi),
  ],
  ["CoinGecko API key", all(/\bCG-[A-Za-z0-9]{20,}\b/g)],
  ["Assigned mnemonic or private key", all(/\b(?:mnemonic|private_key|seed_phrase)\s*[:=]\s*["'][A-Za-z0-9+/ ]{20,}["']/gi)],
  ["Seed-phrase-like word list", seedLike],
  ["Google API key", all(/\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/g)],
  [
    "OpenAI API key",
    (t) => [...all(/\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{8,}T3BlbkFJ[A-Za-z0-9_-]{8,}/g)(t), ...all(/\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{40,}/g)(t)],
  ],
  // Session X P2.7 (security review): any Anthropic key or token family (api03, admin01, the OAuth oat01 and ort01).
  ["Anthropic API key", all(/\bsk-ant-[a-z]+\d{2}-[A-Za-z0-9_-]{40,}/g)],
  ["xAI API key", all(/\bxai-[A-Za-z0-9]{70,}/g)],
  ["OpenRouter API key", all(/\bsk-or-v1-[a-f0-9]{64}\b/g)],
  ["Groq API key", all(/\bgsk_[A-Za-z0-9]{48,}\b/g)],
  ["Stripe secret key", all(/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}\b|\bwhsec_[A-Za-z0-9+/]{32,}/g)],
  ["AWS access key id", all(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g)],
  ["Slack token", all(/\bxox[abposr]-[A-Za-z0-9-]{10,}|\bxapp-\d-[A-Za-z0-9-]{10,}/g)],
  // Session X P2.7: this project's own secrets by the names its docs give `wrangler secret put`, with a value of 20 or more
  // characters; a value that says it is a fixture or a placeholder is not a secret (the near-miss test keeps them out).
  [
    "Named project secret",
    (t) =>
      [...t.matchAll(/\b(?:AUTH_ADMIN_KEY|AUTH_ADMISSION_KEY|VAPID_PRIVATE_KEY|ZIGI_UPSTREAM_KEY|[A-Z]+_CLIENT_SECRET)\b["']?\s*[:=]\s*["']?([A-Za-z0-9_+/=-]{20,})/g)]
        .filter((m) => !/^(?:fake|fixture|test|example|dummy|placeholder|sample|replace|changeme|your)/i.test(m[1]) && !/^(.)\1+$/.test(m[1]))
        .map((m) => m[0]),
  ],
  // Any signed token except Supabase's legacy anon key, which is publishable by design (the near-miss test keeps it out).
  [
    "Signed JWT",
    (t) => all(JWT)(t).filter((m) => typeof jwtPart(m, 0)?.alg === "string" && jwtPart(m, 0).alg !== "none" && jwtPart(m, 1)?.role !== "anon"),
  ],
  [
    "Elliptic-curve private JWK",
    (t) => [...all(/\{[^{}]*["']?kty["']?\s*:\s*["']EC["'][^{}]*["']?\bd["']?\s*:\s*["'][A-Za-z0-9_-]{40,}["'][^{}]*\}/g)(t), ...all(/\{[^{}]*["']?\bd["']?\s*:\s*["'][A-Za-z0-9_-]{40,}["'][^{}]*["']?kty["']?\s*:\s*["']EC["'][^{}]*\}/g)(t)],
  ],
];

/** Each finding as its check's name and the exact matched text (for allowlist hashing only). */
export function findSecretMatches(text) {
  return secretChecks.flatMap(([name, find]) => [...new Set(find(text))].map((match) => ({ name, match })));
}
export function findSecrets(text) {
  return [...new Set(findSecretMatches(text).map(({ name }) => name))];
}
