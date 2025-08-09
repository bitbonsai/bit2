import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TimedSpinner } from '../utils/spinner.js';
import readline from 'readline';

const execAsync = promisify(exec);

export async function deployCommand(options = {}) {
  const { dryRun, local } = options;
  
  // Resolve first-deploy defaults
  const fs = await import('fs-extra');
  const isFirstDeploy = !(await fs.pathExists('.env.bit2'));
  const hasVercelToken = Boolean(process.env.VERCEL_TOKEN);
  const resolvedConnectGit = options.connectGit ?? (isFirstDeploy && hasVercelToken);
  const resolvedSaveToken = options.saveToken ?? (isFirstDeploy && hasVercelToken);
  
  // Handle dry run preview
  if (dryRun) {
    return showDeploymentPreview({ connectGit: resolvedConnectGit, saveToken: resolvedSaveToken, isFirstDeploy });
  }
  
  // Default: Full automation
  return deployAutomated({ connectGit: resolvedConnectGit, saveToken: resolvedSaveToken, isFirstDeploy });
}

async function showDeploymentPreview({ connectGit, saveToken, isFirstDeploy } = {}) {
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
  console.log(chalk.gray('  ✓ Check authentication (Turso, GitHub, Vercel)'));
  if (isFirstDeploy) {
    console.log(chalk.gray(`  ✓ Create Turso database: ${chalk.yellow(projectName)}`));
    console.log(chalk.gray('  ✓ Initialize database schema and seed (production)'));
    console.log(chalk.gray(`  ✓ Create GitHub repository: ${chalk.yellow(`username/${projectName}`)}`));
    if (connectGit) {
      console.log(chalk.gray('  ✓ Connect GitHub repo to Vercel project (via API)'));
    }
    console.log(chalk.gray('  ✓ Set environment variables (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)'));
    if (saveToken) {
      console.log(chalk.gray('  ✓ Save VERCEL_TOKEN to .env.local'));
    }
    console.log(chalk.gray(`  ✓ Live URL: ${chalk.yellow(`https://${projectName}.vercel.app`)}`));
  } else {
    console.log(chalk.gray('  ✓ Check for uncommitted changes'));
    console.log(chalk.gray('  ✓ Push latest commits to GitHub (Vercel auto-deploy)'));
  }
  console.log();
  
  console.log(chalk.yellow('💡 Estimated time: 1-2 minutes'));
  console.log();
  console.log(chalk.cyan('To proceed with deployment:'));
  console.log(chalk.gray('  bit2 deploy'));
  console.log();
}

async function deployAutomated({ connectGit, saveToken, isFirstDeploy } = {}) {
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
    
    // Optionally save VERCEL_TOKEN to project .env.local (ignored by git)
    if (saveToken && process.env.VERCEL_TOKEN) {
      const fs = await import('fs-extra');
      try {
        const existing = (await fs.pathExists('.env.local')) ? await fs.readFile('.env.local', 'utf8') : '';
        const lines = existing.split('\n').filter(Boolean).filter(l => !l.startsWith('VERCEL_TOKEN='));
        lines.push(`VERCEL_TOKEN=${process.env.VERCEL_TOKEN}`);
        await fs.writeFile('.env.local', lines.join('\n') + '\n');
        console.log(chalk.gray('  → Saved VERCEL_TOKEN to .env.local'));
      } catch {
        console.log(chalk.yellow('  ⚠ Could not write .env.local to save VERCEL_TOKEN'));
      }
    }

    let dbInfo = { databaseUrl: undefined, authToken: undefined };
    let repoInfo = { githubUser: undefined, repoName: projectName };
    if (isFirstDeploy) {
      // Setup Turso database (create + init schema/seed)
      spinner = new TimedSpinner('Setting up Turso database');
      dbInfo = await setupTursoDatabase(projectName);
      spinner.succeed('Turso database setup complete');

      // Setup GitHub repository
      spinner = new TimedSpinner('Creating GitHub repository');
      repoInfo = await setupGitHubRepository(projectName);
      spinner.succeed('GitHub repository created and pushed');
    } else {
      // Fast path: ensure clean working tree, then push to trigger Vercel
      spinner = new TimedSpinner('Checking git status');
      try {
        const { stdout } = await execAsync('git status --porcelain');
        if (stdout.trim()) {
          spinner.fail('Uncommitted changes');
          const err = new Error('Uncommitted changes detected');
          err.recoverySteps = ['Run: git add .', 'Run: git commit -m "Update"', 'Re-run: bit2 deploy'];
          throw err;
        }
        spinner.succeed('Working tree clean');
      } catch (e) {
        if (!e.recoverySteps) {
          spinner.fail('Git status check failed');
        }
        throw e;
      }

      spinner = new TimedSpinner('Pushing latest commits');
      try {
        await execAsync('git push');
        spinner.succeed('Push complete - Vercel will auto-deploy');
        console.log();
        console.log(chalk.cyan('Vercel auto-deploy triggered from Git push.'));
        console.log(chalk.gray('View deployments: vercel ls'));
        console.log(chalk.gray('Dashboard: https://vercel.com/dashboard'));
        return; // End fast path
      } catch (e) {
        spinner.warn('Could not push changes; continuing with manual deploy');
      }
    }
    
    // Build project locally first
    spinner = new TimedSpinner('Building project locally');
    await buildProject();
    spinner.succeed('Local build successful');
    
    // Deploy to Vercel
    spinner = new TimedSpinner('Deploying to Vercel');
    const deployInfo = await deployToVercel(projectName, repoInfo, dbInfo, { connectGit, isFirstDeploy });
    spinner.succeed('Vercel deployment complete');
    
    // Save deployment state to .env for delete command
    spinner = new TimedSpinner('Saving deployment configuration');
    try {
      const fs = await import('fs-extra');
      const envContent = `# bit2 deployment configuration
BIT2_PROJECT_NAME=${projectName}
BIT2_TURSO_DATABASE=${projectName}
BIT2_GITHUB_REPO=${repoInfo.githubUser}/${projectName}
BIT2_VERCEL_PROJECT=${projectName}
BIT2_DEPLOYMENT_URL=${deployInfo.url}
BIT2_CREATED_AT=${new Date().toISOString()}
`;
      await fs.writeFile('.env.bit2', envContent);
      spinner.succeed('Configuration saved');
    } catch (error) {
      spinner.warn('Could not save deployment configuration');
    }
    
    // Success message
    displaySuccessMessage(projectName, deployInfo, dbInfo);
    
  } catch (error) {
    if (spinner) {
      spinner.fail(`Deployment failed: ${error.message}`);
    }
    
    console.log();
    console.log(chalk.red('❌ Automated deployment failed'));
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
    },
    {
      cmd: 'vercel',
      args: ['--version'],
      name: 'Vercel CLI',
      install: 'npm i -g vercel'
    }
  ];
  
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
    },
    {
      cmd: 'vercel whoami',
      name: 'Vercel', 
      login: 'vercel login'
    }
  ];
  
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
      .split('\\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement separately
    for (const statement of statements) {
      const cleanStatement = statement.replace(/'/g, `'"'"`);
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

async function deployToVercel(projectName, repoInfo, dbInfo, { connectGit, isFirstDeploy } = {}) {
  try {
    const { githubUser } = repoInfo;
    
    // Link project to Vercel (creates the project if it doesn't exist)
    console.log(chalk.gray('  → Linking project to Vercel...'));
    await execAsync(`vercel link --yes`);

    // Optional: Connect Git via Vercel API if requested. If token is missing, try to create one via CLI.
    if (connectGit) {
      try {
        const fs = await import('fs-extra');
        // Ensure we have a token for API calls
        if (!process.env.VERCEL_TOKEN) {
          console.log(chalk.gray('  → Creating Vercel token for API operations...'));
          try {
            const tokenName = `bit2-${projectName}-${Date.now()}`;
            const { stdout: tokenOut } = await execAsync(`vercel tokens add ${tokenName} | cat`);
            const tokenMatch = tokenOut.match(/[A-Za-z0-9._-]{24,}/);
            if (tokenMatch) {
              process.env.VERCEL_TOKEN = tokenMatch[0];
              // Persist to .env.local for future runs
              const existing = (await fs.pathExists('.env.local')) ? await fs.readFile('.env.local', 'utf8') : '';
              const lines = existing.split('\n').filter(Boolean).filter(l => !l.startsWith('VERCEL_TOKEN='));
              lines.push(`VERCEL_TOKEN=${process.env.VERCEL_TOKEN}`);
              await fs.writeFile('.env.local', lines.join('\n') + '\n');
              console.log(chalk.gray('  → Saved VERCEL_TOKEN to .env.local'));
            } else {
              throw new Error('Could not parse token from vercel output');
            }
          } catch (e) {
            console.log(chalk.yellow('  ⚠ Could not automatically create Vercel token. Connect Git in the dashboard instead.'));
          }
        }

        // Proceed only if we have a token
        if (process.env.VERCEL_TOKEN) {
          console.log(chalk.gray('  → Connecting GitHub repo to Vercel project...'));
          // Get project id from .vercel/project.json written by `vercel link`
          let projectId = null;
          try {
            const projectConfig = await fs.readJson('.vercel/project.json');
            projectId = projectConfig.projectId || projectConfig.project?.id || null;
          } catch {}
          
          if (!projectId) {
            // Fallback: try to find by name via deployments list (best-effort)
            try {
              const { stdout: projJson } = await execAsync(`vercel ls ${projectName} --json | cat`);
              const proj = JSON.parse(projJson);
              projectId = proj?.projectId || null;
            } catch {}
          }

          if (projectId) {
            const repoSlug = `${githubUser}/${projectName}`;
            const payload = JSON.stringify({ gitRepository: { type: 'github', repo: repoSlug } });
            await execAsync(`curl -sS -X PATCH \
              -H 'Authorization: Bearer ${process.env.VERCEL_TOKEN}' \
              -H 'Content-Type: application/json' \
              --data '${payload}' \
              https://api.vercel.com/v9/projects/${projectId}`);
            console.log(chalk.green('  ✓ GitHub repository connected in Vercel'));
            // Trigger a deploy via empty commit
            try {
              await execAsync(`git commit --allow-empty -m "Trigger Vercel deploy"`);
            } catch {}
            try {
              await execAsync('git push');
              console.log(chalk.gray('  → Triggered deployment via git push'));
            } catch {}
          }
        }
      } catch {
        console.log(chalk.yellow('  ⚠ Could not auto-connect Git. You can connect it in Vercel → Project Settings → Git.'));
      }
    }
    
    // Set environment variables only on first deploy; skip if they already exist
    if (isFirstDeploy && dbInfo?.databaseUrl && dbInfo?.authToken) {
      console.log(chalk.gray('  → Setting environment variables...'));
      await execAsync(`printf %s "${dbInfo.databaseUrl}" | vercel env add TURSO_DATABASE_URL production`);
      await execAsync(`printf %s "${dbInfo.authToken}" | vercel env add TURSO_AUTH_TOKEN production`);
      await execAsync(`printf %s "${dbInfo.databaseUrl}" | vercel env add TURSO_DATABASE_URL preview`);
      await execAsync(`printf %s "${dbInfo.authToken}" | vercel env add TURSO_AUTH_TOKEN preview`);
    }
    
    // Deploy to production - non-interactive
    console.log(chalk.gray('  → Deploying to production...'));
    const { stdout } = await execAsync(`vercel --prod --yes`, { timeout: 300000 }); // 5 minute timeout
    
    // Extract URL from stdout - Vercel always outputs deployment URL to stdout
    let url = stdout.trim();
    
    // Ensure it's a proper URL
    if (!url.startsWith('https://')) {
      // Fallback if parsing fails
      url = `https://${projectName}.vercel.app`;
    }
    
    return { url, output: stdout };
  } catch (error) {
    console.log(chalk.red('Vercel deployment error:'), error.message);
    if (error.stdout) {
      console.log(chalk.gray('Vercel stdout:'), error.stdout);
    }
    if (error.stderr) {
      console.log(chalk.gray('Vercel stderr:'), error.stderr);
    }
    
    const err = new Error(`Deployment to Vercel failed: ${error.message}`);
    err.recoverySteps = [
      'Check build output for errors above',
      'Verify project builds locally: bun run build',
      'Ensure you\'re logged in: vercel login',
      'Try manual deployment: vercel --prod'
    ];
    throw err;
  }
}

function displaySuccessMessage(projectName, deployInfo, dbInfo) {
  console.log();
  console.log(chalk.bold.green('🎉 DEPLOYMENT SUCCESSFUL!'));
  console.log();
  
  console.log(chalk.cyan('📦 Project:'), chalk.white(projectName));
  console.log(chalk.cyan('🌐 Live URL:'), chalk.underline.blue(deployInfo.url));
  console.log(chalk.cyan('📊 Dashboard:'), chalk.underline.blue(`https://vercel.com/dashboard`));
  console.log();
  
    console.log(chalk.bold.green('✅ VERCEL DEPLOYMENT CONFIGURED'));
  console.log();
  console.log(chalk.yellow('🚀 Auto-deployment is now active!'));
    console.log(chalk.gray('  • Connect Git in Vercel to auto-deploy on push'));
  console.log(chalk.gray('  • Pull requests get preview deployments'));
  console.log(chalk.gray('  • Build logs are available in Vercel dashboard'));
  console.log();
  
  console.log(chalk.bold.blue('NEXT STEPS'));
  console.log();
  console.log(chalk.yellow('✨ Your app is live and ready for development!'));
  console.log(chalk.gray('  • Test your app:'), chalk.white('Visit the URL above'));
  console.log(chalk.gray('  • Auto-deploy:'), chalk.white('git push origin main'));
  console.log(chalk.gray('  • View deployments:'), chalk.white('vercel ls'));
  console.log(chalk.gray('  • View logs:'), chalk.white('vercel logs'));
  console.log(chalk.gray('  • Local dev:'), chalk.white('bun dev'));
  console.log(chalk.gray('  • Check status:'), chalk.white('bit2 status'));
  console.log();
  
  console.log(chalk.green('🚀 Your modern web app is ready for the world!'));
  console.log();
}