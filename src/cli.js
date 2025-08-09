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

const program = new Command();

program
  .name('bit2')
  .description('Simple CLI tool to scaffold Astro webapps with libSQL/Turso database integration')
  .version('2.0.0');

program
  .command('new <project-name>')
  .description('Create new Astro + libSQL project')
  .action(newCommand);

program
  .command('dev')
  .description('Start development server with Bun + local libSQL file')
  .action(devCommand);

program
  .command('build')
  .description('Build the Astro application for production')
  .action(buildCommand);

program
  .command('deploy')
  .description('Automated deployment to Cloudflare Pages with Turso database')
  .option('--dry-run', 'Preview deployment without executing')
  .option('--local', 'Use manual setup flow (original behavior)')
  .action((options) => deployCommand(options));

program
  .command('migrate')
  .description('Run database migrations')
  .action(migrateCommand);

program
  .command('status')
  .description('Check project health and deployment status')
  .action(statusCommand);

program
  .command('test')
  .description('Run integration tests to verify bit2 is working correctly')
  .action(testCommand);

program
  .command('delete [project-name]')
  .description('Delete project and all associated cloud resources')
  .option('--force', 'Skip confirmation prompt')
  .action((projectName, options) => deleteCommand(projectName, options));

// Error handling
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

program.parse();