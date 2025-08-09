import { createClient } from "@libsql/client";

function getEnvVars(runtime?: { env: any }, request?: Request): any {
  // In Cloudflare Pages with Astro, environment variables are available via runtime.env
  // This is the standard way to access runtime environment variables in CF Pages
  if (runtime?.env) {
    return runtime.env;
  }

  // Fallback to other sources for development or other environments
  const sources = [
    // Node.js process environment (development)
    typeof process !== 'undefined' ? process.env : undefined,
    // Vite/Astro meta environment (build-time variables only)
    import.meta.env
  ];

  let workingEnv: any = {};
  for (const source of sources) {
    if (source) {
      Object.assign(workingEnv, source);
    }
  }

  return workingEnv;
}

// For components and API routes that have access to runtime
export function createDbClient(runtime?: { env?: any }, request?: Request) {
  if (import.meta.env.DEV) {
    // Local development - use SQLite file
    return createClient({
      url: "file:./dev.db"
    });
  }
  
  // Production - get environment variables from runtime
  const env = getEnvVars(runtime, request);
  const dbUrl = env.TURSO_DATABASE_URL;
  const authToken = env.TURSO_AUTH_TOKEN;
  
  if (!dbUrl) {
    console.error("Available env keys:", Object.keys(env));
    console.error("Runtime structure:", JSON.stringify(runtime, null, 2));
    throw new Error("TURSO_DATABASE_URL is required in production. Check environment variables in Cloudflare Pages dashboard.");
  }
  
  return createClient({
    url: dbUrl,
    authToken: authToken,
  });
}

// Default instance for local development
export const db = createDbClient();