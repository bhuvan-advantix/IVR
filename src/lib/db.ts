import { createClient } from "@tursodatabase/serverless/compat";
import { getServerEnv } from "./env";

let client: ReturnType<typeof createClient> | null = null;

export function db() {
  if (!client) {
    const env = getServerEnv();
    client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });
  }

  return client;
}
