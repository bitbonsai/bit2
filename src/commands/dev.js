import chalk from 'chalk';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

export async function devCommand() {
  console.log(`${chalk.yellow('∴')} Starting development server...`);
  
  // Check if we're in a bit2 project
  const astroConfigPath = path.resolve(process.cwd(), 'astro.config.mjs');
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  
  if (!await fs.pathExists(astroConfigPath) || !await fs.pathExists(packageJsonPath)) {
    console.error(chalk.red('❌ Not in a bit2 project directory!'));
    console.log(chalk.yellow('Run bit2 new <project-name> first.'));
    process.exit(1);
  }
  
  try {
    // Set development environment
    process.env.NODE_ENV = 'development';
    
    console.log(chalk.cyan('📦 Installing dependencies...'));
    const installProcess = spawn('bun', ['install'], {
      stdio: 'inherit',
      shell: true
    });
    
    installProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(chalk.red('❌ Failed to install dependencies'));
        process.exit(1);
      }
      
      console.log(chalk.green('✅ Dependencies installed'));
      console.log(chalk.cyan('🔥 Starting Astro dev server...'));
      console.log(chalk.gray('Database: Using local SQLite file (./dev.db)'));
      console.log();
      
      // Start Astro dev server
      const devProcess = spawn('bun', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true
      });
      
      devProcess.on('close', (code) => {
        console.log(chalk.yellow(`Dev server exited with code ${code}`));
      });
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to start dev server:'), error.message);
    process.exit(1);
  }
}