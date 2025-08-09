import { createClient } from "@libsql/client";
import { requireEnv, getOptionalEnv } from "../lib/env";

// Simplified database client for Vercel deployment
// Environment variables are directly available via process.env in serverless functions
export function createDbClient() {
  // Local development - use SQLite file
  if (import.meta.env.DEV) {
    return createClient({
      url: "file:./dev.db"
    });
  }
  
  // Production (Vercel) - use environment variables
  const dbUrl = requireEnv('TURSO_DATABASE_URL');
  const authToken = getOptionalEnv('TURSO_AUTH_TOKEN');

  return createClient({
    url: dbUrl,
    authToken: authToken,
  });
}

// Helper function to get database instance
export function getDatabase() {
  return createDbClient();
}

// Default instance 
export const db = createDbClient();