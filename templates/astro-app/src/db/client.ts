import { createClient } from "@libsql/client";

// For components and API routes that have access to runtime
export function createDbClient(runtime?: { env: any }) {
  if (import.meta.env.DEV) {
    // Local development - use SQLite file
    return createClient({
      url: "file:./dev.db"
    });
  }
  
  // Production - access from Cloudflare runtime
  if (!runtime?.env) {
    throw new Error("Runtime environment not available. Pass Astro.locals.runtime to createDbClient()");
  }
  
  const dbUrl = runtime.env.TURSO_DATABASE_URL;
  const authToken = runtime.env.TURSO_AUTH_TOKEN;
  
  if (!dbUrl) {
    throw new Error("TURSO_DATABASE_URL is required in production");
  }
  
  return createClient({
    url: dbUrl,
    authToken: authToken,
  });
}

// Default instance for local development
export const db = createDbClient();