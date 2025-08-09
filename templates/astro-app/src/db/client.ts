import { createClient } from "@libsql/client";

function getEnvVars(runtime?: { env: any }, request?: Request): any {
  // Try multiple access patterns for environment variables
  const sources = [
    // Cloudflare Pages Functions context
    runtime?.env,
    (runtime as any)?.runtime?.env,
    (request as any)?.cf?.env,
    // Node.js process environment
    typeof process !== 'undefined' ? process.env : undefined,
    // Vite/Astro meta environment
    import.meta.env
  ];

  let workingEnv: any = {};

  // Try each source until we find the env vars
  for (const source of sources) {
    if (source?.TURSO_DATABASE_URL && source?.TURSO_AUTH_TOKEN) {
      workingEnv = source;
      break;
    }
  }

  // Fallback: merge all available env vars from all sources
  if (!workingEnv.TURSO_DATABASE_URL || !workingEnv.TURSO_AUTH_TOKEN) {
    workingEnv = {};
    for (const source of sources) {
      if (source) {
        Object.assign(workingEnv, source);
      }
    }
  }

  return workingEnv;
}

// For components and API routes that have access to runtime
export function createDbClient(runtime?: { env: any }, request?: Request) {
  if (import.meta.env.DEV) {
    // Local development - use SQLite file
    return createClient({
      url: "file:./dev.db"
    });
  }
  
  // Production - try multiple sources for environment variables
  const env = getEnvVars(runtime, request);
  const dbUrl = env.TURSO_DATABASE_URL;
  const authToken = env.TURSO_AUTH_TOKEN;
  
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