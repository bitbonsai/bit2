import { createClient } from "@libsql/client";
import { requireEnv, getOptionalEnv } from "../lib/env";

// Universal database client for all deployment platforms
// Works with Vercel, Cloudflare Pages, Netlify, and local development
export function createDbClient(runtime?: any) {
  // Local development - use SQLite file
  if (import.meta.env.DEV) {
    return createClient({
      url: "file:./dev.db"
    });
  }
  
  // Production - use environment variables from platform
  // Try runtime context first (Cloudflare), then fallback to standard env
  let dbUrl: string;
  let authToken: string | undefined;
  
  try {
    // Check runtime context for Cloudflare Workers
    if (runtime?.env) {
      dbUrl = runtime.env.TURSO_DATABASE_URL;
      authToken = runtime.env.TURSO_AUTH_TOKEN;
      
      if (!dbUrl) {
        throw new Error('TURSO_DATABASE_URL not found in runtime context');
      }
    } else {
      // Fallback to standard environment variable access
      dbUrl = requireEnv('TURSO_DATABASE_URL');
      authToken = getOptionalEnv('TURSO_AUTH_TOKEN');
    }
  } catch (error) {
    // Final fallback - try all available environment sources
    dbUrl = requireEnv('TURSO_DATABASE_URL');
    authToken = getOptionalEnv('TURSO_AUTH_TOKEN');
  }

  return createClient({
    url: dbUrl,
    authToken: authToken,
  });
}

// Helper function to get database instance
// Pass runtime context for Cloudflare Workers compatibility
export function getDatabase(runtime?: any) {
  return createDbClient(runtime);
}

// Use getDatabase(runtime) for all database access
// This ensures proper environment variable handling across all platforms