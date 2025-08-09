export function requireEnv(name: string): string {
  const raw = process.env[name];
  const value = (raw ?? '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it in your Vercel project settings.`);
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  const value = (process.env[name] ?? '').trim();
  return value.length > 0 ? value : undefined;
}

