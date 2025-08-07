# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

bit2 is a CLI tool for scaffolding modern web applications with Astro 5.x, libSQL/Turso database, and Cloudflare Pages deployment. It uses Bun as the primary runtime and package manager.

## Architecture

### CLI Tool Structure
- **Entry Point**: `src/cli.js` - Commander.js-based CLI with 4 main commands
- **Commands**: Each command in `src/commands/` is a standalone module that exports an async function
- **Templates**: `templates/astro-app/` contains the complete Astro project template that gets copied when creating new projects
- **Auto-setup**: The `new` command automatically installs dependencies and initializes the database

### Database Strategy
- **Local Development**: Uses libSQL with `file:./dev.db` connection (SQLite file)
- **Production**: Switches to Turso cloud database using environment variables
- **Migration System**: The `migrate` command creates temporary `.mjs` scripts that import from the project's `node_modules` to avoid import resolution issues

### Deployment Flow
1. `bit2 deploy` creates Turso database and GitHub repository
2. User manually configures Cloudflare Pages through dashboard (no wrangler.toml needed)
3. Environment variables (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN) are set in CF dashboard
4. Auto-deploys on git push to main branch

## Development Commands

```bash
# Install CLI dependencies
bun install

# Test CLI commands
./src/cli.js --help
./src/cli.js new test-project
./src/cli.js dev
./src/cli.js migrate
./src/cli.js deploy

# Install globally for testing
bun link
bit2 --help
```

## Template Updates

When updating the Astro template:
- Use `"latest"` for all dependencies in `templates/astro-app/package.json` to ensure new projects get current versions
- The template uses Astro 5.x with @astrojs/cloudflare adapter for SSR
- Database client configuration in `src/db/client.ts` automatically switches between local and production based on NODE_ENV

## Important Implementation Details

### Auto-initialization in new.js
The `new` command performs full project setup:
1. Copies template files and updates package.json with project name
2. Auto-runs `bun install` in the new project directory
3. Parses SQL files (schema.sql and seed.sql) to split multi-statement SQL into individual statements
4. Creates and executes a temporary script to initialize the database with schema and seed data
5. Cleans up temporary files
6. Falls back to manual instructions if auto-setup fails

**Key Implementation Detail**: The database initialization properly handles multi-statement SQL files by:
- Removing comment lines and empty lines from SQL files
- Splitting SQL content by semicolons to get individual statements
- Executing each statement separately to avoid libSQL multi-statement execution issues

### Import Resolution Pattern (migrate.js and new.js)
Both migrate and new commands use a workaround for importing @libsql/client by creating temporary scripts:
```javascript
// new.js - Enhanced SQL parsing and execution
const splitSqlStatements = (sql) => {
  const lines = sql.split('\n');
  const cleanLines = lines.filter(line => !line.trim().startsWith('--') && line.trim() !== '');
  const cleanSql = cleanLines.join('\n');
  return cleanSql.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);
};

const schemaStatements = splitSqlStatements(schemaContent);
const migrationScript = `
import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:./dev.db' });
const schemaStatements = ${JSON.stringify(schemaStatements)};
for (const statement of schemaStatements) {
  await db.execute(statement);
}
await db.close();`;
```

**Note**: The migrate command still uses the older single-statement approach and may need similar updates for consistency.

### Prerequisites Validation
The deploy command checks for:
- Turso CLI installation and authentication (`turso auth whoami`)
- GitHub CLI installation and authentication (`gh auth status`)
- Project must have a package.json with a name field

### Cloudflare Pages Configuration
- No wrangler.toml is used - configuration is done through CF dashboard
- Build command: `bun run build`
- Output directory: `dist`
- Framework preset: Astro

## Testing New Features

Simplified workflow since auto-setup was implemented:

1. Create a test project (auto-installs deps and sets up DB): `./src/cli.js new test-feature`
2. Test development: `cd test-feature && bun run dev` or `../src/cli.js dev`
3. Test build: `bun run build`
4. Clean up: `cd .. && rm -rf test-feature`

The `new` command now handles dependency installation and database initialization automatically.

## Common Issues and Solutions

- **Auto-setup fails during project creation**: Falls back to manual setup instructions (bun install + bit2 migrate)
- **Import errors in migrate command**: Both migrate and new commands create temporary scripts to run in the project context
- **Turso authentication**: User must run `turso auth signup` before using deploy command  
- **GitHub authentication**: User must run `gh auth login` before using deploy command
- **Database file location**: Always `./dev.db` in project root for local development
- **"no such table" error**: Fixed as of latest version - auto-setup now properly parses and executes multi-statement SQL files
- **Database initialization issues**: The new command now correctly handles SQL files with comments and multiple statements