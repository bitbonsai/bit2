import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.NODE_ENV === "development" 
    ? "file:./dev.db" 
    : process.env.TURSO_DATABASE_URL!,
  authToken: process.env.NODE_ENV === "development" 
    ? undefined 
    : process.env.TURSO_AUTH_TOKEN!,
});

export default db;