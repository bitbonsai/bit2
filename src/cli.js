#!/usr/bin/env bun

import { Command } from 'commander';
import chalk from 'chalk';
import { newCommand } from './commands/new.js';
import { devCommand } from './commands/dev.js';
import { deployCommand } from './commands/deploy.js';
import { migrateCommand } from './commands/migrate.js';
import { testCommand } from './commands/test.js';

const program = new Command();

program
  .name('bit2')
  .description('Simple CLI tool to scaffold Astro webapps with libSQL/Turso database integration')
  .version('1.0.0');

program
  .command('new <project-name>')
  .description('Create new Astro + libSQL project')
  .action(newCommand);

program
  .command('dev')
  .description('Start development server with Bun + local libSQL file')
  .action(devCommand);

program
  .command('deploy')
  .description('Setup GitHub repo + Turso DB + display CF setup steps')
  .action(deployCommand);

program
  .command('migrate')
  .description('Run database migrations')
  .action(migrateCommand);

program
  .command('test')
  .description('Run integration tests to verify bit2 is working correctly')
  .action(testCommand);

// Error handling
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

program.parse();