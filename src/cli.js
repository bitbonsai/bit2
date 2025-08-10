#!/usr/bin/env bun

import { Command } from 'commander';
import chalk from 'chalk';
import { newCommand } from './commands/new.js';
import { devCommand } from './commands/dev.js';
import { buildCommand } from './commands/build.js';
import { deployCommand } from './commands/deploy.js';
import { migrateCommand } from './commands/migrate.js';
import { statusCommand } from './commands/status.js';
import { testCommand } from './commands/test.js';
import { deleteCommand } from './commands/delete.js';
import { openCommand } from './commands/open.js';
import { logsCommand } from './commands/logs.js';
import { dbCommand } from './commands/db.js';

const program = new Command();

program
  .name('bit2')
  .description('∴ bit2 - Modern CLI tool for scaffolding Astro applications with libSQL/Turso and flexible deployment')
  .version('3.0.0')
  .addHelpText('after', '\n' +
    'Repository: https://github.com/bitbonsai/bit2\n' +
    'Issues:     https://github.com/bitbonsai/bit2/issues');

program
  .command('new <project-name>')
  .description('Create new Astro + libSQL project (auto-installs deps & migrates DB)')
  .action(newCommand);

program
  .command('dev')
  .description('Start development server (port 4321, uses local dev.db)')
  .action(devCommand);

program
  .command('build')
  .description('Build the Astro application for production')
  .action(buildCommand);

program
  .command('deploy')
  .description('Deploy to production (first time: full setup, after: git push)')
  .action(() => deployCommand());

program
  .command('migrate')
  .description('Reset local database (useful after schema changes or to restore seed data)')
  .action(migrateCommand);

program
  .command('status')
  .description('Check project health, database, and deployment status')
  .action(statusCommand);

program
  .command('test')
  .description('Run integration tests to verify bit2 is working correctly')
  .action(testCommand);

program
  .command('delete [project-name]')
  .description('Delete project and all cloud resources (DB, repo, deployment)')
  .option('--force', 'Skip confirmation prompt')
  .action((projectName, options) => deleteCommand(projectName, options));

program
  .command('open')
  .description('Open deployment dashboard in browser (Cloudflare/Vercel/Netlify)')
  .action(openCommand);

program
  .command('logs')
  .description('Show recent deployment logs (provider-specific)')
  .action(logsCommand);

program
  .command('db [action]')
  .description('Database management: info (default), shell, token, create')
  .action(dbCommand);

// Error handling
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

program.parse();