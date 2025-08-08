import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';

const execAsync = promisify(exec);

export async function buildCommand() {
  const spinner = ora('Building Astro application...').start();
  
  try {
    // Check if we're in a bit2 project
    const fs = await import('fs-extra');
    if (!await fs.pathExists('./package.json')) {
      throw new Error('No package.json found. Are you in a bit2 project?');
    }
    
    // Run the build command
    const { stdout, stderr } = await execAsync('bun run build');
    
    spinner.succeed('Build completed successfully!');
    
    // Output build details
    console.log(chalk.gray(stdout));
    
    if (stderr) {
      console.log(chalk.yellow('Build warnings:'));
      console.log(chalk.gray(stderr));
    }
    
    // Show build output location
    console.log();
    console.log(chalk.green('✓'), chalk.white('Build output:'), chalk.cyan('/dist'));
    console.log(chalk.green('✓'), chalk.white('Ready for deployment to Cloudflare Pages'));
    
  } catch (error) {
    spinner.fail('Build failed');
    console.error(chalk.red('Error:'), error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(chalk.red(error.stderr));
    process.exit(1);
  }
}