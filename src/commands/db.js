import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TimedSpinner } from '../utils/spinner.js';

const execAsync = promisify(exec);

export async function dbCommand(action, options = {}) {
  try {
    const fs = await import('fs-extra');
    
    // Get project name
    let projectName;
    if (await fs.pathExists('package.json')) {
      const packageJson = await fs.readJson('package.json');
      projectName = packageJson.name;
    } else {
      console.log(chalk.red('❌ Not in a project directory'));
      console.log(chalk.gray('Run this command from your project root'));
      process.exit(1);
    }
    
    // Check Turso authentication
    let isAuthenticated = false;
    try {
      await execAsync('turso auth whoami');
      isAuthenticated = true;
    } catch {
      console.log(chalk.red('❌ Not authenticated with Turso'));
      console.log(chalk.gray('Run: turso auth signup'));
      process.exit(1);
    }
    
    if (!action || action === 'info') {
      await showDatabaseInfo(projectName);
    } else if (action === 'shell') {
      await openDatabaseShell(projectName);
    } else if (action === 'create') {
      await createDatabase(projectName);
    } else if (action === 'token') {
      await generateAuthToken(projectName);
    } else {
      console.log(chalk.red('❌ Unknown action'));
      console.log();
      showUsage();
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Database command failed:'), error.message);
    process.exit(1);
  }
}

async function showDatabaseInfo(projectName) {
  console.log(`${chalk.cyan('📊 Database Information')}`);
  console.log();
  
  const fs = await import('fs-extra');
  
  // Local database info
  const hasLocalDb = await fs.pathExists('dev.db');
  console.log(chalk.yellow('Local Database:'));
  if (hasLocalDb) {
    try {
      const stats = await fs.stat('dev.db');
      console.log(chalk.gray(`  File: ./dev.db (${(stats.size / 1024).toFixed(1)} KB)`));
      console.log(chalk.gray(`  Modified: ${stats.mtime.toLocaleDateString()}`));
    } catch {
      console.log(chalk.gray('  File: ./dev.db'));
    }
  } else {
    console.log(chalk.gray('  No local database (run: bit2 migrate)'));
  }
  console.log();
  
  // Turso database info
  console.log(chalk.yellow('Turso Database:'));
  const spinner = new TimedSpinner('Checking Turso database');
  
  try {
    // Check if database exists
    await execAsync(`turso db show ${projectName}`);
    
    // Get database URL
    const { stdout: dbUrl } = await execAsync(`turso db show --url ${projectName}`);
    
    // Get database info
    const { stdout: dbInfo } = await execAsync(`turso db show ${projectName}`);
    
    spinner.succeed('Connected to Turso');
    
    console.log(chalk.gray(`  Name: ${projectName}`));
    console.log(chalk.gray(`  URL: ${dbUrl.trim()}`));
    
    // Parse additional info from dbInfo if available
    const locationMatch = dbInfo.match(/Location: (.+)/);
    if (locationMatch) {
      console.log(chalk.gray(`  Location: ${locationMatch[1]}`));
    }
    
    console.log();
    console.log(chalk.cyan('🔑 Database Credentials:'));
    console.log(chalk.gray('  Database URL: ') + chalk.white(`${dbUrl.trim()}`));
    console.log(chalk.gray('  Auth Token: ') + chalk.yellow('Use "bit2 db token" to generate'));
    
  } catch (error) {
    spinner.stop();
    console.log(chalk.gray(`  Database "${projectName}" not found`));
    console.log(chalk.gray('  Run: bit2 db create'));
  }
  
  console.log();
  console.log(chalk.cyan('💡 Available commands:'));
  console.log(chalk.gray('  bit2 db info    - Show this information'));
  console.log(chalk.gray('  bit2 db shell   - Open database shell'));
  console.log(chalk.gray('  bit2 db token   - Generate auth token'));
  console.log(chalk.gray('  bit2 db create  - Create Turso database'));
  console.log();
}

async function openDatabaseShell(projectName) {
  console.log(chalk.cyan(`🗄️  Opening database shell for ${projectName}`));
  console.log(chalk.gray('Type .exit to close the shell'));
  console.log();
  
  try {
    // Use spawn to allow interactive shell
    const { spawn } = await import('child_process');
    const shell = spawn('turso', ['db', 'shell', projectName], {
      stdio: 'inherit',
      shell: true
    });
    
    shell.on('error', (error) => {
      console.error(chalk.red('❌ Failed to open database shell:'), error.message);
      process.exit(1);
    });
    
    shell.on('close', (code) => {
      console.log();
      console.log(chalk.green('✅ Database shell closed'));
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to open database shell:'), error.message);
    process.exit(1);
  }
}

async function createDatabase(projectName) {
  console.log(chalk.cyan(`🗄️  Creating Turso database: ${projectName}`));
  console.log();
  
  const spinner = new TimedSpinner('Creating database');
  
  try {
    // Check if database already exists
    try {
      await execAsync(`turso db show ${projectName}`);
      spinner.warn('Database already exists');
      console.log(chalk.yellow(`Database "${projectName}" already exists`));
      return;
    } catch {
      // Database doesn't exist, proceed with creation
    }
    
    // Create database
    await execAsync(`turso db create ${projectName}`);
    spinner.succeed('Database created');
    
    console.log();
    console.log(chalk.green(`✅ Database "${projectName}" created successfully`));
    console.log();
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.gray('  • Run: bit2 db info (to see connection details)'));
    console.log(chalk.gray('  • Run: bit2 db shell (to open SQL shell)'));
    console.log(chalk.gray('  • Run: bit2 deploy (to set up production deployment)'));
    console.log();
    
  } catch (error) {
    spinner.fail('Database creation failed');
    console.error(chalk.red('❌ Failed to create database:'), error.message);
    process.exit(1);
  }
}

async function generateAuthToken(projectName) {
  console.log(chalk.cyan(`🔑 Generating auth token for ${projectName}`));
  console.log();
  
  const spinner = new TimedSpinner('Generating token');
  
  try {
    // Check if database exists
    await execAsync(`turso db show ${projectName}`);
    
    // Generate token
    const { stdout: token } = await execAsync(`turso db tokens create ${projectName}`);
    
    spinner.succeed('Token generated');
    
    console.log();
    console.log(chalk.yellow('🔑 Database Credentials:'));
    console.log();
    
    // Get database URL
    const { stdout: dbUrl } = await execAsync(`turso db show --url ${projectName}`);
    
    console.log(chalk.gray('Database URL:'));
    console.log(chalk.white(`${dbUrl.trim()}`));
    console.log();
    
    console.log(chalk.gray('Auth Token:'));
    console.log(chalk.white(`${token.trim()}`));
    console.log();
    
    console.log(chalk.cyan('💡 Environment Variables:'));
    console.log(chalk.gray('Add these to your deployment platform:'));
    console.log();
    console.log(chalk.yellow('TURSO_DATABASE_URL=') + chalk.white(`${dbUrl.trim()}`));
    console.log(chalk.yellow('TURSO_AUTH_TOKEN=') + chalk.white(`${token.trim()}`));
    console.log();
    
    // Check if .env.bit2 exists and show where to find these values
    const fs = await import('fs-extra');
    if (await fs.pathExists('.env.bit2')) {
      console.log(chalk.gray('💡 These values are also saved in your .env.bit2 file'));
      console.log();
    }
    
  } catch (error) {
    spinner.fail('Token generation failed');
    if (error.message.includes('not found')) {
      console.log(chalk.red(`❌ Database "${projectName}" not found`));
      console.log(chalk.gray('Run: bit2 db create'));
    } else {
      console.error(chalk.red('❌ Failed to generate token:'), error.message);
    }
    process.exit(1);
  }
}

function showUsage() {
  console.log(chalk.cyan('Usage: bit2 db [action]'));
  console.log();
  console.log(chalk.yellow('Actions:'));
  console.log(chalk.gray('  info    - Show database information (default)'));
  console.log(chalk.gray('  shell   - Open interactive database shell'));
  console.log(chalk.gray('  token   - Generate auth token for production'));
  console.log(chalk.gray('  create  - Create new Turso database'));
  console.log();
}