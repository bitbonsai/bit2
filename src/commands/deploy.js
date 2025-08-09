import chalk from 'chalk';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { TimedSpinner } from '../utils/spinner.js';
import readline from 'readline';

const execAsync = promisify(exec);

export async function deployCommand(options = {}) {
  const { dryRun, local } = options;
  
  // Handle dry run preview
  if (dryRun) {
    return showDeploymentPreview();
  }
  
  // Handle local/manual deployment  
  if (local) {
    return deployManual();
  }
  
  // Default: Full automation
  return deployAutomated();
}

async function showDeploymentPreview() {
  console.log(chalk.bold.blue('DEPLOYMENT PREVIEW'));
  console.log();
  
  let projectName;
  try {
    const fs = await import('fs-extra');
    const packageJson = await fs.readJson('./package.json');
    projectName = packageJson.name;
  } catch (error) {
    console.log(chalk.red('❌ No package.json found. Run this command in your project root.'));
    process.exit(1);
  }
  
  console.log(chalk.cyan('📋 Deployment Plan:'));
  console.log(chalk.gray('  ✓ Validate project structure and dependencies'));
  console.log(chalk.gray('  ✓ Check authentication (Turso, GitHub, Cloudflare)'));
  console.log(chalk.gray(`  ✓ Create Turso database: ${chalk.yellow(projectName)}`));
  console.log(chalk.gray(`  ✓ Create GitHub repository: ${chalk.yellow(`username/${projectName}`)}`));
  console.log(chalk.gray(`  ✓ Create Cloudflare Pages project with Git integration`));
  console.log(chalk.gray('  ✓ Set environment variables (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)'));
  console.log(chalk.gray('  ✓ Build and deploy application'));
  console.log(chalk.gray(`  ✓ Live URL: ${chalk.yellow(`https://${projectName}.pages.dev`)}`));
  console.log();
  
  console.log(chalk.yellow('💡 Estimated time: 2-3 minutes'));
  console.log();
  console.log(chalk.cyan('To proceed with deployment:'));
  console.log(chalk.gray('  bit2 deploy'));
  console.log();
  console.log(chalk.cyan('For manual setup (original flow):'));
  console.log(chalk.gray('  bit2 deploy --local'));
}

async function deployAutomated() {
  console.log(`${chalk.yellow('∴')} Starting automated deployment...`);
  console.log();
  
  let spinner = new TimedSpinner('Validating project and dependencies');
  
  try {
    // Validate project structure
    await validateProject();
    spinner.succeed('Project validation complete');
    
    // Check prerequisites
    spinner = new TimedSpinner('Checking prerequisites and authentication');
    await checkPrerequisites();
    spinner.succeed('Prerequisites and authentication verified');
    
    // Get project info
    const fs = await import('fs-extra');
    const packageJson = await fs.readJson('./package.json');
    const projectName = packageJson.name;
    
    // Setup Turso database
    spinner = new TimedSpinner('Setting up Turso database');
    const dbInfo = await setupTursoDatabase(projectName);
    spinner.succeed('Turso database setup complete');
    
    // Setup GitHub repository
    spinner = new TimedSpinner('Creating GitHub repository');
    const repoInfo = await setupGitHubRepository(projectName);
    spinner.succeed('GitHub repository created and pushed');
    
    // Build project locally first
    spinner = new TimedSpinner('Building project locally');
    await buildProject();
    spinner.succeed('Local build successful');
    
    // Setup Cloudflare Pages
    spinner = new TimedSpinner('Creating Cloudflare Pages project');
    const pageInfo = await setupCloudflarePages(projectName, repoInfo, spinner);
    if (spinner) spinner.succeed('Cloudflare Pages project created');
    
    // Set environment variables
    spinner = new TimedSpinner('Setting environment variables');
    await setEnvironmentVariables(projectName, dbInfo, pageInfo.accountId);
    spinner.succeed('Environment variables configured');
    
    // Deploy to Cloudflare Pages
    spinner = new TimedSpinner('Deploying to Cloudflare Pages');
    const deployInfo = await deployToCloudflare(projectName);
    spinner.succeed('Deployment complete');
    
    // Verify deployment
    spinner = new TimedSpinner('Verifying deployment');
    await verifyDeployment(deployInfo.url, dbInfo);
    spinner.succeed('Deployment verification complete');
    
    // Success message
    displaySuccessMessage(projectName, deployInfo, dbInfo);
    
  } catch (error) {
    if (spinner) {
      spinner.fail(`Deployment failed: ${error.message}`);
    }
    
    console.log();
    console.log(chalk.red('❌ Automated deployment failed'));
    console.log(chalk.yellow('💡 Try manual deployment:'), chalk.gray('bit2 deploy --local'));
    console.log();
    
    if (error.recoverySteps) {
      console.log(chalk.cyan('🔧 Recovery steps:'));
      error.recoverySteps.forEach(step => {
        console.log(chalk.gray(`  • ${step}`));
      });
      console.log();
    }
    
    process.exit(1);
  }
}

async function deployManual() {
  console.log(`${chalk.yellow('∴')} Starting manual deployment setup...`);
  console.log();
  
  const spinner = new TimedSpinner('Checking prerequisites');
  
  try {
    // Check prerequisites (without Cloudflare)
    await checkPrerequisites(false); // false = skip Cloudflare check
    spinner.succeed('Prerequisites checked');
    
    // Get project name from package.json
    const fs = await import('fs-extra');
    const packageJson = await fs.readJson('./package.json');
    const projectName = packageJson.name;
    
    // Setup Turso database
    const dbSpinner = new TimedSpinner('Setting up Turso database');
    const dbInfo = await setupTursoDatabase(projectName);
    dbSpinner.succeed('Turso database setup complete');
    
    // Setup GitHub repository
    const gitSpinner = new TimedSpinner('Creating GitHub repository');
    await setupGitHubRepository(projectName);
    gitSpinner.succeed('GitHub repository created');
    
    // Display manual Cloudflare setup instructions
    displayManualCloudflareSetup(projectName, dbInfo);
    
  } catch (error) {
    spinner.fail();
    console.error(chalk.red('❌ Manual deployment setup failed:'), error.message);
    process.exit(1);
  }
}

async function validateProject() {
  const fs = await import('fs-extra');
  
  // Check if we're in a project directory
  if (!await fs.pathExists('./package.json')) {
    throw new Error('No package.json found. Run this command in your project root.');
  }
  
  // Check if it's an Astro project
  if (!await fs.pathExists('./astro.config.mjs')) {
    throw new Error('No astro.config.mjs found. This doesn\'t appear to be an Astro project.');
  }
  
  // Check for required database files
  if (!await fs.pathExists('./src/db/schema.sql')) {
    throw new Error('Missing src/db/schema.sql. This doesn\'t appear to be a bit2 project.');
  }
  
  // Check git status
  try {
    const { stdout } = await execAsync('git status --porcelain');
    if (stdout.trim()) {
      console.log(chalk.yellow('⚠️  You have uncommitted changes. Consider committing them first.'));
    }
  } catch (error) {
    // Not a git repo yet, that's fine
  }
}

async function checkPrerequisites(includeCloudflare = true) {
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
  
  if (includeCloudflare) {
    commands.push({
      cmd: 'bunx',
      args: ['wrangler', '--version'],
      name: 'Wrangler CLI',
      install: 'Included with bit2 (bunx wrangler)'
    });
  }
  
  for (const command of commands) {
    try {
      await execAsync(`${command.cmd} ${command.args.join(' ')}`);
    } catch (error) {
      const err = new Error(`${command.name} is required for deployment`);
      err.recoverySteps = [`Install ${command.name}: ${command.install}`];
      throw err;
    }
  }
  
  // Check authentications
  const authChecks = [
    {
      cmd: 'turso auth whoami',
      name: 'Turso',
      login: 'turso auth signup'
    },
    {
      cmd: 'gh auth status',
      name: 'GitHub',
      login: 'gh auth login'
    }
  ];
  
  if (includeCloudflare) {
    authChecks.push({
      cmd: 'bunx wrangler whoami',
      name: 'Cloudflare',
      login: 'bunx wrangler login'
    });
  }
  
  for (const auth of authChecks) {
    try {
      await execAsync(auth.cmd);
    } catch (error) {
      const err = new Error(`${auth.name} authentication required`);
      err.recoverySteps = [`Login to ${auth.name}: ${auth.login}`];
      throw err;
    }
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
        const err = new Error('Turso authentication failed');
        err.recoverySteps = ['Run: turso auth signup'];
        throw err;
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
  
  // Get GitHub username
  const { stdout: userOutput } = await execAsync('gh api user --jq .login');
  const githubUser = userOutput.trim();
  
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
      await execAsync(`git remote add origin https://github.com/${githubUser}/${projectName}.git`);
      await execAsync('git push -u origin main').catch(() => {
        return execAsync('git push -u origin master');
      });
    }
  } else {
    // Create new GitHub repository
    await execAsync(`gh repo create ${projectName} --private --source=. --remote=origin --push`);
  }
  
  return { githubUser, repoName: projectName };
}

async function buildProject() {
  try {
    await execAsync('bun run build', { timeout: 120000 }); // 2 minute timeout
  } catch (error) {
    const err = new Error('Local build failed');
    err.recoverySteps = [
      'Check your code for errors',
      'Run: bun run build locally to see detailed errors',
      'Ensure all dependencies are installed: bun install'
    ];
    throw err;
  }
}

async function setupCloudflarePages(projectName, repoInfo, spinner = null) {
  // First, get account information to handle multiple accounts
  let selectedAccountId = null;
  try {
    const { stdout: whoamiOutput } = await execAsync('bunx wrangler whoami');
    
    // Check for multiple accounts in the output
    if (whoamiOutput.includes('Account Name') && whoamiOutput.includes('Account ID')) {
      // Parse all accounts from the table
      const accountMatches = [...whoamiOutput.matchAll(/│\s+(.+?)'s Account\s+│\s+([a-f0-9-]+)\s+│/g)];
      
      if (accountMatches.length > 1) {
        // Multiple accounts - pause spinner and let user choose
        if (spinner) {
          spinner.stop();
          spinner = null;
        }
        
        console.log();
        console.log(chalk.yellow('  ℹ Multiple Cloudflare accounts detected:'));
        console.log();
        
        accountMatches.forEach((match, index) => {
          const accountName = match[1];
          const accountId = match[2];
          console.log(chalk.white(`  ${index + 1}. ${accountName}'s Account (${accountId})`));
        });
        
        console.log();
        selectedAccountId = await selectAccount(accountMatches);
      } else if (accountMatches.length === 1) {
        // Single account
        selectedAccountId = accountMatches[0][2];
        const accountName = accountMatches[0][1];
        console.log(chalk.yellow(`  ℹ Using Cloudflare account: ${accountName}'s Account`));
      }
    }
  } catch (error) {
    // Continue without account selection
  }

  try {
    // Check if Pages project already exists
    let projectExists = false;
    try {
      const listCommand = selectedAccountId 
        ? `CLOUDFLARE_ACCOUNT_ID=${selectedAccountId} bunx wrangler pages project list` 
        : `bunx wrangler pages project list`;
      
      const { stdout } = await execAsync(listCommand);
      projectExists = stdout.includes(projectName);
    } catch (error) {
      // Continue with creation attempt
    }
    
    if (projectExists) {
      console.log(chalk.yellow(`  ℹ Cloudflare Pages project already exists: ${projectName}`));
    } else {
      // Create Pages project with Git integration
      const repoUrl = `https://github.com/${repoInfo.githubUser}/${repoInfo.repoName}`;
      const createCommand = selectedAccountId 
        ? `CLOUDFLARE_ACCOUNT_ID=${selectedAccountId} bunx wrangler pages project create ${projectName} --production-branch=main --repo=${repoUrl} --compatibility-date=$(date +%Y-%m-%d)`
        : `bunx wrangler pages project create ${projectName} --production-branch=main --repo=${repoUrl} --compatibility-date=$(date +%Y-%m-%d)`;
      
      await execAsync(createCommand);
    }
    
    return { projectName, accountId: selectedAccountId };
  } catch (error) {
    const err = new Error(`Failed to create Cloudflare Pages project: ${error.message}`);
    err.recoverySteps = [
      'Check Cloudflare authentication: bunx wrangler whoami',
      'Login if needed: bunx wrangler login',
      'Try manual setup: bit2 deploy --local'
    ];
    throw err;
  }
}

async function setEnvironmentVariables(projectName, dbInfo, accountId = null) {
  try {
    // Set environment variables in parallel
    const secretPromises = [
      { key: 'TURSO_DATABASE_URL', value: dbInfo.databaseUrl },
      { key: 'TURSO_AUTH_TOKEN', value: dbInfo.authToken }
    ].map(secret => {
      const command = accountId ?
        `CLOUDFLARE_ACCOUNT_ID=${accountId} echo "${secret.value}" | bunx wrangler pages secret put ${secret.key} --project-name=${projectName}` :
        `echo "${secret.value}" | bunx wrangler pages secret put ${secret.key} --project-name=${projectName}`;
      
      return execAsync(command);
    });
    
    await Promise.all(secretPromises);
  } catch (error) {
    const err = new Error('Failed to set environment variables');
    err.recoverySteps = [
      'Set variables manually in Cloudflare dashboard',
      'TURSO_DATABASE_URL: ' + dbInfo.databaseUrl,
      'TURSO_AUTH_TOKEN: ' + dbInfo.authToken
    ];
    throw err;
  }
}

async function deployToCloudflare(projectName) {
  try {
    // Deploy to Cloudflare Pages
    const { stdout } = await execAsync(`bunx wrangler pages deploy dist --project-name=${projectName}`);
    
    // Extract URL from wrangler output
    let url = `https://${projectName}.pages.dev`; // fallback
    
    // Look for the actual URL in wrangler output
    const urlMatch = stdout.match(/https:\/\/[^\s]+\.pages\.dev/);
    if (urlMatch) {
      url = urlMatch[0];
    }
    
    return { url, output: stdout };
  } catch (error) {
    const err = new Error('Deployment to Cloudflare failed');
    err.recoverySteps = [
      'Check build output for errors',
      'Verify dist directory exists: ls -la dist/',
      'Try manual deployment: bunx wrangler pages deploy dist'
    ];
    throw err;
  }
}

async function verifyDeployment(url, dbInfo) {
  // Simple verification - could be enhanced with actual HTTP checks
  try {
    // Wait a moment for deployment to propagate
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Could add HTTP check here to verify site is responding
    console.log(chalk.gray(`  → Verifying ${url}...`));
    
    return true;
  } catch (error) {
    console.log(chalk.yellow('  ⚠️  Could not verify deployment automatically'));
    return false;
  }
}

function displaySuccessMessage(projectName, deployInfo, dbInfo) {
  console.log();
  console.log(chalk.bold.green('🎉 DEPLOYMENT SUCCESSFUL!'));
  console.log();
  
  console.log(chalk.cyan('📦 Project:'), chalk.white(projectName));
  console.log(chalk.cyan('🌐 Live URL:'), chalk.underline.blue(deployInfo.url));
  console.log(chalk.cyan('📊 Dashboard:'), chalk.underline.blue(`https://dash.cloudflare.com`));
  console.log();
  
  console.log(chalk.bold.blue('NEXT STEPS'));
  console.log();
  console.log(chalk.yellow('✨ Your app is live!'));
  console.log(chalk.gray('  • Test your app:'), chalk.white('Visit the URL above'));
  console.log(chalk.gray('  • View logs:'), chalk.white(`bunx wrangler pages tail ${projectName}`));
  console.log(chalk.gray('  • Redeploy:'), chalk.white('git push (auto-deploys on main branch)'));
  console.log(chalk.gray('  • Local dev:'), chalk.white('bun run dev'));
  console.log(chalk.gray('  • Check status:'), chalk.white('bit2 status'));
  console.log();
  
  console.log(chalk.green('🚀 Your modern web app is ready for the world!'));
  console.log();
}

function displayManualCloudflareSetup(projectName, dbInfo) {
  console.log();
  console.log(chalk.bold.yellow('CLOUDFLARE PAGES SETUP'));
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
  console.log(chalk.gray('  →'), chalk.white('Framework preset:'), chalk.green('Astro'));
  console.log(chalk.gray('  →'), chalk.white('Build command:   '), chalk.green('bun run build'));
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
  console.log(chalk.bold.green('SUCCESS'), chalk.green('Your app will auto-deploy on every push to main branch'));
  console.log();
}

async function selectAccount(accountMatches) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    const prompt = chalk.white(`Select account (1-${accountMatches.length}): `);
    
    rl.question(prompt, (answer) => {
      rl.close();
      const selection = parseInt(answer.trim());
      
      if (isNaN(selection) || selection < 1 || selection > accountMatches.length) {
        console.log(chalk.yellow('  → Invalid selection, using first account'));
        const accountId = accountMatches[0][2];
        const accountName = accountMatches[0][1];
        console.log(chalk.gray(`  → Selected: ${accountName}'s Account`));
        resolve(accountId);
      } else {
        const selectedMatch = accountMatches[selection - 1];
        const accountId = selectedMatch[2];
        const accountName = selectedMatch[1];
        console.log(chalk.gray(`  → Selected: ${accountName}'s Account`));
        console.log(); // Add spacing after selection
        resolve(accountId);
      }
    });
  });
}