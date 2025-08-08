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
    
    // Get Astro and Cloudflare adapter versions
    let astroVersion = 'latest';
    let cfAdapterVersion = 'latest';
    try {
      const { stdout: versionOutput } = await execAsync('bun pm ls');
      const astroMatch = versionOutput.match(/astro@(\d+\.\d+\.\d+)/);
      const cfMatch = versionOutput.match(/@astrojs\/cloudflare@(\d+\.\d+\.\d+)/);
      if (astroMatch) astroVersion = astroMatch[1];
      if (cfMatch) cfAdapterVersion = cfMatch[1];
    } catch (error) {
      // Fall back to 'latest' if we can't get versions
    }
    
    // Setup Turso database
    spinner.start('Setting up Turso database...');
    const dbInfo = await setupTursoDatabase(projectName);
    spinner.succeed('Turso database setup complete');
    
    // Setup GitHub repository
    spinner.start('Creating GitHub repository...');
    await setupGitHubRepository(projectName);
    spinner.succeed('GitHub repository created');
    
    // Display Cloudflare Pages setup instructions
    displayCloudflareSetup(projectName, dbInfo, astroVersion, cfAdapterVersion);
    
  } catch (error) {
    spinner.fail();
    console.error(chalk.red('❌ Deployment setup failed:'), error.message);
    process.exit(1);
  }
}

async function checkPrerequisites() {
  const commands = [
    { 
      cmd: 'bun', 
      args: ['--version'], 
      name: 'Bun',
      install: 'curl -fsSL https://bun.sh/install | bash'
    },
    { 
      cmd: 'turso', 
      args: ['--version'], 
      name: 'Turso CLI',
      install: 'curl -sSfL https://get.tur.so/install.sh | bash'
    },
    { 
      cmd: 'gh', 
      args: ['--version'], 
      name: 'GitHub CLI',
      install: 'https://cli.github.com/manual/installation'
    }
  ];
  
  for (const command of commands) {
    try {
      await execAsync(`${command.cmd} ${command.args.join(' ')}`);
    } catch (error) {
      console.log();
      console.log(chalk.red(`❌ ${command.name} not found`));
      console.log(chalk.yellow('Install with:'), chalk.cyan(command.install));
      console.log();
      throw new Error(`${command.name} is required for deployment`);
    }
  }
  
  // Check if user is authenticated with Turso
  try {
    await execAsync('turso auth whoami');
  } catch (error) {
    console.log();
    console.log(chalk.yellow('⚠️  Not authenticated with Turso'));
    console.log(chalk.cyan('Run:'), chalk.white('turso auth signup'));
    console.log();
    throw new Error('Turso authentication required');
  }
  
  // Check if user is authenticated with GitHub
  try {
    await execAsync('gh auth status');
  } catch (error) {
    console.log();
    console.log(chalk.yellow('⚠️  Not authenticated with GitHub'));
    console.log(chalk.cyan('Run:'), chalk.white('gh auth login'));
    console.log();
    throw new Error('GitHub authentication required');
  }
}

async function setupTursoDatabase(projectName) {
  // Check if database already exists
  let databaseExists = false;
  try {
    await execAsync(`turso db show ${projectName}`);
    databaseExists = true;
    console.log(chalk.yellow(`  ℹ Using existing Turso database: ${projectName}`));
  } catch (error) {
    try {
      // Database doesn't exist, create it
      await execAsync(`turso db create ${projectName}`);
    } catch (createError) {
      if (createError.message.includes('not logged in') || createError.message.includes('authentication')) {
        throw new Error('Turso authentication failed. Database was not created. Run: turso auth signup');
      }
      throw createError;
    }
  }
  
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
    
    // Split SQL into individual statements and clean them
    const statements = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement separately
    for (const statement of statements) {
      const cleanStatement = statement.replace(/'/g, "'\"'\"'");
      await execAsync(`turso db shell ${projectName} '${cleanStatement};'`);
    }
  }
  
  return { databaseUrl, authToken };
}

async function setupGitHubRepository(projectName) {
  // Initialize git if not already done
  let isGitRepo = false;
  try {
    await execAsync('git status');
    isGitRepo = true;
  } catch (error) {
    await execAsync('git init');
    await execAsync('git add .');
    await execAsync('git commit -m "Initial commit"');
  }
  
  // Check if GitHub repo already exists
  let repoExists = false;
  try {
    await execAsync(`gh repo view ${projectName}`);
    repoExists = true;
  } catch (error) {
    // Repo doesn't exist, we'll create it
  }
  
  if (repoExists) {
    console.log(chalk.yellow(`  ℹ GitHub repository already exists: ${projectName}`));
    
    // Check if remote is set
    try {
      await execAsync('git remote get-url origin');
      // Remote exists, just push
      console.log(chalk.gray('  → Pushing latest changes...'));
      await execAsync('git push -u origin main').catch(() => {
        // Try master if main doesn't work
        return execAsync('git push -u origin master');
      });
    } catch (error) {
      // Set remote and push
      console.log(chalk.gray('  → Setting remote and pushing...'));
      await execAsync(`git remote add origin https://github.com/$(gh api user --jq .login)/${projectName}.git`);
      await execAsync('git push -u origin main').catch(() => {
        return execAsync('git push -u origin master');
      });
    }
  } else {
    // Create new GitHub repository
    await execAsync(`gh repo create ${projectName} --private --source=. --remote=origin --push`);
  }
}

function displayCloudflareSetup(projectName, dbInfo, astroVersion, cfAdapterVersion) {
  console.log();
  console.log(chalk.bgYellow.black(' CLOUDFLARE PAGES DEPLOYMENT '));
  console.log();
  
  // Step 1: Dashboard URL
  console.log(chalk.cyan('Step 1:'), chalk.white('Open Cloudflare Dashboard'));
  console.log(chalk.gray('  →'), chalk.underline.blue('https://dash.cloudflare.com'));
  console.log(chalk.gray('  → Navigate to: Developer Platform → Create Application → Pages → Import an existing Git repository'));
  console.log();
  
  // Step 2: Repository
  console.log(chalk.cyan('Step 2:'), chalk.white('Select GitHub Repository'));
  console.log(chalk.gray('  →'), chalk.yellow.bold(projectName));
  console.log();
  
  // Step 3: Build Configuration
  console.log(chalk.cyan('Step 3:'), chalk.white('Configure Build Settings'));
  console.log(chalk.gray('  →'), chalk.white('Framework preset:'), chalk.green(`Astro v${astroVersion}`));
  console.log(chalk.gray('  →'), chalk.white('CF Adapter:      '), chalk.green(`v${cfAdapterVersion}`));
  console.log(chalk.gray('  →'), chalk.white('Build command:   '), chalk.green('bit2 build'), chalk.gray('(or bun run build)'));
  console.log(chalk.gray('  →'), chalk.white('Output directory:'), chalk.green('/dist'));
  console.log();
  
  // Step 4: Environment Variables
  console.log(chalk.cyan('Step 4:'), chalk.white('Add Environment Variables'));
  console.log(chalk.gray('  →'), chalk.yellow('TURSO_DATABASE_URL:'), chalk.gray(dbInfo.databaseUrl));
  console.log(chalk.gray('  →'), chalk.yellow('TURSO_AUTH_TOKEN:'), chalk.gray(dbInfo.authToken));
  console.log();
  
  // Step 5: Deploy
  console.log(chalk.cyan('Step 5:'), chalk.green.bold('Save and Deploy! 🚀'));
  console.log();
  
  // Success message
  console.log(chalk.bgGreen.black(' SUCCESS '), chalk.green('Your app will auto-deploy on every push to main branch'));
  console.log();
}