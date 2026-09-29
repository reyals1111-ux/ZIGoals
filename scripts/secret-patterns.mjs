import { readFileSync } from "node:fs";
// Credential patterns for the tracked-file scan. Names only are reported; values never are.
const jwtPayload = (token) => {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
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
  return candidates.some((c) => {
    if (!/^[a-z]+(?: [a-z]+)+$/.test(c)) return false;
    const words = c.split(" ");
    return [12, 15, 18, 21, 24].includes(words.length) && words.every((w) => bip39.has(w));
  });
};

export const secretChecks = [
  ["PEM private key", (t) => /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/.test(t)],
  ["GitHub token", (t) => /\bgh[pousr]_[A-Za-z0-9]{30,}/.test(t) || /\bgithub_pat_[A-Za-z0-9_]{40,}/.test(t)],
  ["Supabase secret key", (t) => /\bsb_secret_[A-Za-z0-9_-]{20,}/.test(t)],
  [
    "Supabase service_role JWT",
    (t) => [...t.matchAll(/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}/g)].some((m) => jwtPayload(m[0])?.role === "service_role"),
  ],
  ["Resend API key", (t) => /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/.test(t)],
  [
    "Cloudflare API token or key",
    (t) => /\b(?:CLOUDFLARE_API_(?:TOKEN|KEY)|CF_API_(?:TOKEN|KEY))\b["']?\s*[:=]\s*["']?(?:[A-Za-z0-9_-]{40}|[a-f0-9]{37})\b/i.test(t),
  ],
  ["CoinGecko API key", (t) => /\bCG-[A-Za-z0-9]{20,}\b/.test(t)],
  ["Assigned mnemonic or private key", (t) => /\b(?:mnemonic|private_key|seed_phrase)\s*[:=]\s*["'][A-Za-z0-9+/ ]{20,}["']/i.test(t)],
  ["Seed-phrase-like word list", seedLike],
];

export function findSecrets(text) {
  return secretChecks.filter(([, check]) => check(text)).map(([name]) => name);
}
