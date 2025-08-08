import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mcp from 'astro-mcp';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [mcp()],
});