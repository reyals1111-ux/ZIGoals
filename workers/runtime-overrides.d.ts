// Corrections to the generated workers/worker-runtime.d.ts (workerd 1.20260911.1,
// compatibility date 2026-09-13). Each was checked against that workerd through
// Miniflare: fetch() accepts `credentials` and `referrerPolicy`, and `typeof window`
// is "undefined" (shared app modules test for it before use).

// Merging requires the original's type parameter, even though these fields do not use it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RequestInit<Cf = CfProperties> {
  credentials?: "omit" | "same-origin" | "include";
  referrerPolicy?: "" | "no-referrer" | "no-referrer-when-downgrade" | "origin" | "origin-when-cross-origin" | "same-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url";
}

declare const window: undefined;
