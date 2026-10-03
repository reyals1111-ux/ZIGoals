import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { normalize, resolve } from "node:path";

/** The landing's deployable directory, from apps/web (where Playwright runs). */
export const landingRoot = resolve(process.cwd(), "../../landing");

// The same content types as tests/landing.spec.ts, which mirror Cloudflare's asset server (`.mjs` included).
const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

/** The response headers landing/_headers sets for every path (its single `/*` rule), parsed verbatim. */
export function landingHeaders(): Record<string, string> {
  const lines = readFileSync(resolve(landingRoot, "_headers"), "utf8").split("\n");
  if (lines[0]?.trim() !== "/*") throw new Error("landing/_headers no longer starts with its single /* rule");
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const match = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(line);
    if (!match) throw new Error(`Unexpected _headers line: ${line}`);
    headers[match[1]!.toLowerCase()] = match[2]!.trim();
  }
  return headers;
}

export type LandingServer = { url: string; close: () => Promise<void>; files: Set<string> };

/**
 * Serves the real landing/ directory on 127.0.0.1 with Cloudflare's content types. With `headers: true` every
 * response also carries landing/_headers, so the page runs under its real Content-Security-Policy. `files` collects
 * every path served, for weight and allowlist checks.
 */
export async function startLandingServer(options: { headers?: boolean } = {}): Promise<LandingServer> {
  const extra = options.headers ? landingHeaders() : {};
  const files = new Set<string>();
  const server: Server = createServer((request, response) => {
    const path = (request.url ?? "/").split("?")[0]!.split("#")[0]!;
    const relative = normalize(path === "/" ? "/index.html" : decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, "");
    const file = resolve(landingRoot, `.${relative}`);
    if (!file.startsWith(landingRoot) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, extra).end();
      return;
    }
    files.add(file.slice(landingRoot.length + 1));
    const extension = file.slice(file.lastIndexOf("."));
    response.writeHead(200, {
      ...extra,
      "content-type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      "content-length": statSync(file).size,
    });
    createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Landing test server has no TCP address");
  return {
    url: `http://127.0.0.1:${address.port}`,
    files,
    close: () => new Promise<void>((resolveClose, reject) => server.close(error => (error ? reject(error) : resolveClose()))),
  };
}

/** The on-disk size of a served landing path, in bytes. */
export function landingFileSize(relative: string): number {
  return statSync(resolve(landingRoot, relative)).size;
}
