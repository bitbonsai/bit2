import chalk from 'chalk';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';

const execAsync = promisify(exec);

export async function deployCommand() {
  console.log(chalk.blue('🚀 Starting deployment setup...'));
  
  const spinner = ora('Checking prerequisites...').start();
  
  try {
    // Check prerequisites
    await checkPrerequisites();
    spinner.succeed('Prerequisites checked');
    
    // Get project name from package.json
    const fs = await import('fs-extra');
    const packageJson = await fs.readJson('./package.json');
    const projectName = packageJson.name;
    
    // Setup Turso database
    spinner.start('Setting up Turso database...');
    const dbInfo = await setupTursoDatabase(projectName);
    spinner.succeed('Turso database setup complete');
    
    // Setup GitHub repository
    spinner.start('Creating GitHub repository...');
    await setupGitHubRepository(projectName);
    spinner.succeed('GitHub repository created');
    
    // Display Cloudflare Pages setup instructions
    displayCloudflareSetup(projectName, dbInfo);
    
  } catch (error) {
    spinner.fail();
    console.error(chalk.red('❌ Deployment setup failed:'), error.message);
    process.exit(1);
  }
}

async function checkPrerequisites() {
  const commands = [
    { cmd: 'turso', args: ['--version'], name: 'Turso CLI' },
    { cmd: 'gh', args: ['--version'], name: 'GitHub CLI' }
  ];
  
  for (const command of commands) {
    try {
      await execAsync(`${command.cmd} ${command.args.join(' ')}`);
    } catch (error) {
      throw new Error(`${command.name} not found. Please install it first.`);
    }
  }
  
  // Check if user is authenticated with Turso
  try {
    await execAsync('turso auth whoami');
  } catch (error) {
    throw new Error('Not authenticated with Turso. Run: turso auth signup');
  }
  
  // Check if user is authenticated with GitHub
  try {
    await execAsync('gh auth status');
  } catch (error) {
    throw new Error('Not authenticated with GitHub. Run: gh auth login');
  }
}

async function setupTursoDatabase(projectName) {
  // Create database
  await execAsync(`turso db create ${projectName}`);
  
  // Get database URL
  const { stdout: urlOutput } = await execAsync(`turso db show --url ${projectName}`);
  const databaseUrl = urlOutput.trim();
  
  // Create auth token
  const { stdout: tokenOutput } = await execAsync(`turso db tokens create ${projectName}`);
  const authToken = tokenOutput.trim();
  
  // Run migrations
  const fs = await import('fs-extra');
  if (await fs.pathExists('./src/db/schema.sql')) {
    const schema = await fs.readFile('./src/db/schema.sql', 'utf8');
    await execAsync(`turso db shell ${projectName} "${schema}"`);
  }
  
  return { databaseUrl, authToken };
}

async function setupGitHubRepository(projectName) {
  // Initialize git if not already done
  try {
    await execAsync('git status');
  } catch (error) {
    await execAsync('git init');
    await execAsync('git add .');
    await execAsync('git commit -m "Initial commit"');
  }
  
  // Create GitHub repository
  await execAsync(`gh repo create ${projectName} --private --source=. --remote=origin --push`);
}

function displayCloudflareSetup(projectName, dbInfo) {
  console.log();
  console.log(chalk.blue('🚀 Cloudflare Pages Setup Instructions:'));
  console.log();
  console.log(chalk.cyan('1.'), 'Go to dashboard.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git');
  console.log(chalk.cyan('2.'), `Select GitHub repo: ${chalk.bold(projectName)}`);
  console.log(chalk.cyan('3.'), 'Build settings:');
  console.log(chalk.gray('   - Framework preset: Astro'));
  console.log(chalk.gray('   - Build command: bun run build'));
  console.log(chalk.gray('   - Build output directory: dist'));
  console.log(chalk.cyan('4.'), 'Environment variables:');
  console.log(chalk.gray(`   - TURSO_DATABASE_URL: ${dbInfo.databaseUrl}`));
  console.log(chalk.gray(`   - TURSO_AUTH_TOKEN: ${dbInfo.authToken}`));
  console.log(chalk.cyan('5.'), chalk.green('Save and Deploy!'));
  console.log();
  console.log(chalk.green('✅ Auto-deploys on every push to main'));
  console.log();
}