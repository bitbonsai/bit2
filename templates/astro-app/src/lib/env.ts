// Universal environment variable access for all deployment platforms
function getEnvValue(name: string): string | undefined {
  // Try different ways to access environment variables
  // 1. Standard Node.js process.env
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[name];
    if (value) return value;
  }
  
  // 2. Runtime context (Cloudflare Workers)
  if (typeof globalThis !== 'undefined') {
    const value = (globalThis as any)[name];
    if (value) return value;
  }
  
  // 3. Import meta env (Vite/Astro)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[name];
    if (value) return value;
  }
  
  return undefined;
}

export function requireEnv(name: string): string {
  const raw = getEnvValue(name);
  const value = (raw ?? '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it in your deployment platform settings.`);
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  const value = (getEnvValue(name) ?? '').trim();
  return value.length > 0 ? value : undefined;
}

