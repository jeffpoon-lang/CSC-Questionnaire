import "server-only";
import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Always the async form: works in every server context (RSC, route
 * handlers, server actions) and under `next dev` via initOpenNextCloudflareForDev.
 */
export async function getDb(): Promise<Db> {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export async function getExecutionContext(): Promise<ExecutionContext> {
  const { ctx } = await getCloudflareContext({ async: true });
  return ctx;
}

export { schema };
