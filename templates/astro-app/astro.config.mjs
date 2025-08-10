import { defineConfig } from 'astro/config';

// Adapter will be added when you run 'bit2 deploy'
// This keeps the template provider-agnostic

// https://astro.build/config
export default defineConfig({
  output: 'server', // SSR enabled by default
  vite: {
    resolve: {
      alias: {
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
        '@db': '/src/db',
        '@content': '/src/content'
      }
    }
  }
});