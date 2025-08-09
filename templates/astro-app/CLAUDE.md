# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this Astro + libSQL/Turso application.

## Project Overview

This is a modern web application built with the bit2 stack:
- **Framework**: Astro 5.x with SSR capabilities
- **Database**: libSQL (SQLite-compatible) with Turso cloud integration  
- **Deployment**: Cloudflare Pages with automated CI/CD
- **Runtime**: Bun for package management and development
- **Styling**: Native CSS with component-scoped styles

## Architecture & Key Files

### Core Application Structure
- **Entry Point**: `src/pages/index.astro` - Main landing page with database queries
- **Layout**: `src/components/Layout.astro` - Shared layout component with dark theme
- **Database Client**: `src/db/client.ts` - Automatically switches between local SQLite and Turso cloud
- **Database Functions**: `src/lib/db.ts` - Query functions for posts and users
- **API Routes**: `src/pages/api/` - JSON endpoints for data access

### Database Configuration
- **Local Development**: Uses `./dev.db` SQLite file (created automatically)
- **Production**: Switches to Turso cloud database via environment variables
- **Schema**: Defined in `src/db/schema.sql` with users and posts tables
- **Seeds**: Sample data in `src/db/seed.sql` for development

### Deployment & Infrastructure
- **Local Dev**: `bun run dev` starts Astro dev server with SQLite
- **Build**: `bun run build` creates static assets in `dist/`
- **Deploy**: `bit2 deploy` handles full deployment pipeline
- **Status**: `bit2 status` shows deployment and infrastructure status

## Development Workflow

### Database Operations
- **Add/modify tables**: Edit `src/db/schema.sql` and run database migration
- **Update seed data**: Modify `src/db/seed.sql`
- **Query data**: Use functions from `src/lib/db.ts` or create new ones
- **Local reset**: Delete `dev.db` and restart dev server to recreate from schema

### Adding New Features
1. **Database changes**: Update schema.sql first if needed
2. **Backend logic**: Add query functions to `src/lib/db.ts`
3. **API endpoints**: Create new files in `src/pages/api/` for JSON responses
4. **Frontend**: Create components/pages in `src/` using Astro component syntax
5. **Styling**: Use component-scoped `<style>` blocks or global CSS

### Deployment Pipeline
- **Automatic**: Push to main branch triggers auto-deployment
- **Manual**: Run `bit2 deploy` for full automated deployment
- **Environment**: Production uses Turso database via environment variables
- **Monitoring**: Check deployment status with `bit2 status`

## Important Implementation Details

### Database Client Pattern
The database client in `src/db/client.ts` automatically detects the environment:
```typescript
const db = createClient({
  url: import.meta.env.TURSO_DATABASE_URL || 'file:./dev.db',
  authToken: import.meta.env.TURSO_AUTH_TOKEN
});
```

### SSR Configuration
- Astro is configured for SSR with Cloudflare adapter
- Pages can access runtime context via `Astro.locals.runtime`
- Database queries work in both dev and production environments

### MCP Integration
- This project includes `astro-mcp` for AI assistant integration
- Supports Cursor, Claude Desktop, Windsurf, and other MCP-enabled tools
- Configuration in `astro.config.mjs`

## Common Tasks & Patterns

### Adding a New Database Table
1. Add CREATE TABLE statement to `src/db/schema.sql`
2. Add sample data to `src/db/seed.sql`
3. Create query functions in `src/lib/db.ts`
4. Delete local `dev.db` to recreate with new schema

### Creating API Endpoints
```typescript
// src/pages/api/example.json.ts
import type { APIRoute } from 'astro';
import { getExample } from '../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  const data = await getExample(locals.runtime);
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' }
  });
};
```

### Database Query Functions
```typescript
// src/lib/db.ts
export async function getExample(runtime: any) {
  const db = getDatabase(runtime);
  const result = await db.execute('SELECT * FROM example_table');
  return result.rows;
}
```

### Astro Component with Database
```astro
---
// src/pages/example.astro
import Layout from '../components/Layout.astro';
import { getExample } from '../lib/db';

const { runtime } = Astro.locals;
const data = await getExample(runtime);
---

<Layout title="Example">
  <main>
    {data.map(item => (
      <div>{item.name}</div>
    ))}
  </main>
</Layout>
```

## Deployment Commands

- `bit2 dev` - Start development server
- `bit2 deploy` - Full automated deployment (creates DB, GitHub repo, Cloudflare Pages)
- `bit2 deploy --dry-run` - Preview deployment plan without executing
- `bit2 deploy --local` - Manual deployment with dashboard setup instructions
- `bit2 status` - Check deployment and infrastructure status
- `bit2 delete` - Complete project and infrastructure removal

## Environment Variables (Production)

Set in Cloudflare Pages dashboard or via `bit2 deploy`:
- `TURSO_DATABASE_URL` - Turso database connection URL
- `TURSO_AUTH_TOKEN` - Turso database authentication token
- `NODE_ENV` - Set to 'production' for Cloudflare Pages

## File Structure Reference

```
├── astro.config.mjs          # Astro configuration with Cloudflare adapter
├── package.json              # Dependencies and scripts
├── src/
│   ├── components/
│   │   └── Layout.astro      # Shared layout component
│   ├── db/
│   │   ├── client.ts         # Database client configuration
│   │   ├── schema.sql        # Database table definitions
│   │   └── seed.sql          # Sample data for development
│   ├── lib/
│   │   └── db.ts             # Database query functions
│   ├── pages/
│   │   ├── api/              # JSON API endpoints
│   │   ├── index.astro       # Main landing page
│   │   └── about.astro       # About page
│   └── env.d.ts              # TypeScript environment definitions
└── public/                   # Static assets
```

## Troubleshooting

- **Database not found**: Delete `dev.db` and restart dev server
- **Build fails**: Check for TypeScript errors and database queries
- **Deployment issues**: Run `bit2 status` to check infrastructure
- **Environment variables**: Verify Turso credentials in Cloudflare dashboard

## Best Practices

- Use TypeScript for better development experience
- Keep database queries in `src/lib/db.ts` for reusability
- Test API endpoints locally before deployment
- Use component-scoped styles in Astro components
- Follow Astro's islands architecture for interactive components