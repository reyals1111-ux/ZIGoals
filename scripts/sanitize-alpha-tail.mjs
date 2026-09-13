import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const numeric = value => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const outcomes = new Set(["ok","exception","exceededCpu","exceededMemory","canceled","unknown"]);
export function sanitizeEvent(input, version) {
  if (typeof version !== "string" || !uuid.test(version)) throw Error("Expected an exact Worker version UUID.");
  if (input?.scriptName !== "zigoals-alpha" || input?.scriptVersion?.id !== version || input?.event?.request?.method !== "GET") return null;
  let url;
  try { url = new URL(input.event.request.url); } catch { return null; }
  if (url.origin !== "https://alpha.zigoals.app" || url.username || url.password ||
      !["/app","/app/settings","/icon.svg"].includes(url.pathname)) return null;
  const timestamp = numeric(input.eventTimestamp);
  const hour = timestamp === null ? NaN : Math.floor(timestamp/3600000)*3600000;
  const date = new Date(hour);
  const status = input.event?.response?.status;
  // Construct a new object; no spreading or recursive copying of trace fields.
  return {route:url.pathname,cpuMs:numeric(input.cpuTime),wallMs:numeric(input.wallTime),
    status:Number.isInteger(status) && status>=100 && status<=599 ? status : null,
    outcome:outcomes.has(input.outcome) ? input.outcome : "unknown",workerVersion:version,
    hourUtc:Number.isNaN(date.getTime()) ? null : date.toISOString()};
}

// Wrangler emits consecutive pretty-printed JSON objects. Parse that stream
// without saving raw bytes, and reject banners/truncated/oversized input.
export async function* parseEvents(chunks) {
  let buffer="", depth=0, quoted=false, escaped=false, total=0;
  const invalid = () => Error("Trace input invalid or too large; no raw content was saved.");
  for await (const chunk of chunks) {
    const text = String(chunk);
    total += Buffer.byteLength(text);
    if (total > 10*1024*1024) throw invalid();
    for (const char of text) {
      if (!buffer) {
        if (/\s/.test(char)) continue;
        if (char !== "{") throw invalid();
      }
      buffer += char;
      if (buffer.length > 1024*1024) throw invalid();
      if (quoted) {
        if (escaped) escaped=false;
        else if (char === "\\") escaped=true;
        else if (char === '"') quoted=false;
      } else if (char === '"') quoted=true;
      else if (char === "{" || char === "[") depth++;
      else if (char === "}" || char === "]") depth--;
      if (depth === 0) {
        let event;
        try { event=JSON.parse(buffer); } catch { throw invalid(); }
        buffer="";
        yield event;
      }
    }
  }
  if (buffer) throw invalid();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let count=0;
  // Only this process is timed out; the owner stops the separate tail after the batch.
  const timer=setTimeout(()=>{
    console.error("Sanitized capture reached 90 seconds; stop the tail and verify sample counts.");
    process.exit(count ? 0 : 1);
  },90000);
  try {
    const version=process.argv[2];
    if (process.argv.length !== 3 || !uuid.test(version ?? "")) throw Error();
    process.stdin.setEncoding("utf8");
    for await (const event of parseEvents(process.stdin)) {
      const safe=sanitizeEvent(event,version);
      if (safe) {console.log(JSON.stringify(safe));count++;}
      if (count >= 60) break;
    }
    if (!count) {console.error("No matching sanitized samples. This is not a zero-CPU result.");process.exitCode=1;}
  } catch {
    console.error("Trace capture refused or malformed. No raw content was saved; verify version and JSON-only input.");
    process.exitCode=1;
  } finally {clearTimeout(timer);}
}
