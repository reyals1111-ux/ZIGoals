import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// Every HTML route is dynamic/no-store. No R2, ISR or remote cache resources.
export default defineCloudflareConfig();
