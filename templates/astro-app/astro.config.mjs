import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import mcp from 'astro-mcp';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [mcp()],
});