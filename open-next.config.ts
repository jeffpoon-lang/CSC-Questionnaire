import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No ISR / "use cache" is used in this app, so the default (in-memory dummy)
// incremental cache is sufficient. Do not add KV/R2 cache bindings.
export default defineCloudflareConfig();
