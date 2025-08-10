import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TimedSpinner } from '../utils/spinner.js';
import readline from 'readline';
import path from 'path';

const execAsync = promisify(exec);

export async function deployCommand(options = {}) {
  try {
    // Check if this is a subsequent deployment first
    const fs = await import('fs-extra');
    const isFirstDeploy = !await fs.pathExists('.env.bit2');
    
    if (!isFirstDeploy) {
      // This is a subsequent deployment - check git status and push
      return await handleSubsequentDeploy();
    }
    
    // First deployment - show setup messages
    console.log(`${chalk.yellow('∴')} Starting deployment setup...`);
    console.log();
    
    let spinner = new TimedSpinner('Validating project');
    
    // 1. Validate project structure
    const projectInfo = await validateProject();
    spinner.succeed('Project validation complete');
    
    // 3. Check for existing adapter (first deploy only)
    spinner = new TimedSpinner('Checking existing configuration');
    const existingAdapter = await detectExistingAdapter();
    spinner.succeed('Configuration check complete');
    
    // 3. Provider selection
    let provider;
    if (existingAdapter) {
      console.log(chalk.yellow(`ℹ Detected existing adapter: ${existingAdapter}`));
      const keepExisting = await promptKeepExisting(existingAdapter);
      provider = keepExisting ? existingAdapter : await selectProvider();
    } else {
      provider = await selectProvider();
    }
    
    // 4. Install/update adapter if needed
    if (provider !== existingAdapter) {
      spinner = new TimedSpinner(`Installing ${provider} adapter`);
      await installAdapter(provider);
      spinner.succeed(`${provider} adapter installed`);
    } else {
      console.log(chalk.green(`✓ Using existing ${provider} adapter`));
    }
    
    // 5. Setup Turso database
    spinner = new TimedSpinner('Setting up Turso database');
    const dbInfo = await setupTursoDatabase(projectInfo.name);
    spinner.succeed('Turso database setup complete');
    
    // 6. Check Git environment and offer repo creation
    const gitStatus = await checkGitEnvironment(projectInfo.name);
    
    // 7. Show deployment guide
    await showDeploymentGuide(provider, dbInfo, gitStatus);
    
    // 8. Save deployment info
    await saveDeploymentInfo(projectInfo.name, provider, dbInfo);
    
  } catch (error) {
    if (spinner) {
      spinner.fail(`Deployment setup failed: ${error.message}`);
    }
    
    console.log();
    console.log(chalk.red('❌ Deployment setup failed'));
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
  
  // Get project info
  const packageJson = await fs.readJson('./package.json');
  
  return {
    name: packageJson.name,
    version: packageJson.version
  };
}

async function detectExistingAdapter() {
  try {
    const fs = await import('fs-extra');
    const packageJson = await fs.readJson('./package.json');
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps['@astrojs/cloudflare']) return 'cloudflare';
    if (deps['@astrojs/vercel']) return 'vercel';  
    if (deps['@astrojs/netlify']) return 'netlify';
    
    return null;
  } catch {
    return null;
  }
}

async function promptKeepExisting(adapter) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(chalk.cyan(`Keep existing ${adapter} adapter? (Y/n): `), (answer) => {
      rl.close();
      resolve(!answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function selectProvider() {
  console.log();
  console.log(chalk.cyan('Choose your deployment provider:'));
  console.log(chalk.white('  [1] Cloudflare Pages'));
  console.log(chalk.white('  [2] Vercel'));
  console.log(chalk.white('  [3] Netlify'));
  console.log();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    const askProvider = () => {
      rl.question(chalk.cyan('Enter your choice (1-3): '), (answer) => {
        switch (answer.trim()) {
          case '1':
            rl.close();
            resolve('cloudflare');
            break;
          case '2':
            rl.close();
            resolve('vercel');
            break;
          case '3':
            rl.close();
            resolve('netlify');
            break;
          default:
            console.log(chalk.red('Please enter 1, 2, or 3'));
            askProvider();
        }
      });
    };
    askProvider();
  });
}

async function installAdapter(provider) {
  const adapters = {
    cloudflare: '@astrojs/cloudflare',
    vercel: '@astrojs/vercel/serverless',
    netlify: '@astrojs/netlify'
  };
  
  const fs = await import('fs-extra');
  
  // Install adapter package
  await execAsync(`bun add ${adapters[provider]}`);
  
  // Update astro.config.mjs
  await updateAstroConfig(provider);
}

async function updateAstroConfig(provider) {
  const fs = await import('fs-extra');
  const configPath = './astro.config.mjs';
  
  const configs = {
    cloudflare: `import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  vite: {
    resolve: {
      alias: {
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
        '@db': '/src/db',
        '@content': '/src/content'
      }
    }
  }
});`,
    vercel: `import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config  
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  vite: {
    resolve: {
      alias: {
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
        '@db': '/src/db',
        '@content': '/src/content'
      }
    }
  }
});`,
    netlify: `import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: netlify(),
  vite: {
    resolve: {
      alias: {
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
        '@db': '/src/db',
        '@content': '/src/content'
      }
    }
  }
});`
  };
  
  await fs.writeFile(configPath, configs[provider]);
}

async function setupTursoDatabase(projectName) {
  // Check if Turso CLI is available
  try {
    await execAsync('turso --version');
  } catch (error) {
    const err = new Error('Turso CLI is required for database setup');
    err.recoverySteps = [
      'Install Turso CLI: curl -sSfL https://get.tur.so/install.sh | bash',
      'Restart your terminal',
      'Run: turso auth signup',
      'Re-run: bit2 deploy'
    ];
    throw err;
  }
  
  // Check authentication
  try {
    await execAsync('turso auth whoami');
  } catch (error) {
    const err = new Error('Turso authentication required');
    err.recoverySteps = [
      'Run: turso auth signup',
      'Follow the signup process',
      'Re-run: bit2 deploy'
    ];
    throw err;
  }
  
  // Check if database already exists
  let databaseExists = false;
  try {
    await execAsync(`turso db show ${projectName}`);
    databaseExists = true;
    console.log(chalk.yellow(`  ℹ Using existing Turso database: ${projectName}`));
  } catch (error) {
    // Database doesn't exist, create it
    await execAsync(`turso db create ${projectName}`);
  }
  
  // Get database URL
  const { stdout: urlOutput } = await execAsync(`turso db show --url ${projectName}`);
  const databaseUrl = urlOutput.trim();
  
  // Create auth token
  const { stdout: tokenOutput } = await execAsync(`turso db tokens create ${projectName}`);
  const authToken = tokenOutput.trim();
  
  // Run migrations if database is new
  if (!databaseExists) {
    const fs = await import('fs-extra');
    if (await fs.pathExists('./src/db/schema.sql')) {
      const schema = await fs.readFile('./src/db/schema.sql', 'utf8');
      const seed = await fs.pathExists('./src/db/seed.sql') 
        ? await fs.readFile('./src/db/seed.sql', 'utf8') 
        : '';
      
      // Split SQL into individual statements and execute
      // This function properly handles semicolons within quoted strings
      const splitSqlStatements = (sql) => {
        const lines = sql.split('\n');
        const cleanLines = lines.filter(line => !line.trim().startsWith('--') && line.trim() !== '');
        const cleanSql = cleanLines.join('\n');
        
        const statements = [];
        let currentStatement = '';
        let inSingleQuotes = false;
        let inDoubleQuotes = false;
        let i = 0;
        
        while (i < cleanSql.length) {
          const char = cleanSql[i];
          
          if (char === "'" && !inDoubleQuotes) {
            // Check for escaped single quotes
            if (i + 1 < cleanSql.length && cleanSql[i + 1] === "'") {
              currentStatement += "''";
              i += 2;
              continue;
            }
            inSingleQuotes = !inSingleQuotes;
          } else if (char === '"' && !inSingleQuotes) {
            inDoubleQuotes = !inDoubleQuotes;
          } else if (char === ';' && !inSingleQuotes && !inDoubleQuotes) {
            // End of statement
            const stmt = currentStatement.trim();
            if (stmt.length > 0) {
              statements.push(stmt);
            }
            currentStatement = '';
            i++;
            continue;
          }
          
          currentStatement += char;
          i++;
        }
        
        // Add the last statement if there is one
        const lastStmt = currentStatement.trim();
        if (lastStmt.length > 0) {
          statements.push(lastStmt);
        }
        
        return statements;
      };
      
      const statements = splitSqlStatements([schema, seed].join('\n'));
      
      for (const statement of statements) {
        const cleanStatement = statement.replace(/'/g, `'"'"'`);
        await execAsync(`turso db shell ${projectName} '${cleanStatement};'`);
      }
    }
  }
  
  return { databaseUrl, authToken };
}

async function checkGitEnvironment(projectName) {
  const status = {
    hasRepo: false,
    hasRemote: false,
    canCreateRepo: false,
    platform: null,
    remoteUrl: null
  };
  
  // Check if git repo exists
  try {
    await execAsync('git status');
    status.hasRepo = true;
  } catch {
    // Initialize git repo
    console.log(chalk.gray('  ℹ Initializing git repository...'));
    await execAsync('git init');
    await execAsync('git add .');
    await execAsync('git commit -m "Initial commit"');
    status.hasRepo = true;
  }
  
  // Check for remote
  try {
    const { stdout } = await execAsync('git remote get-url origin');
    status.hasRemote = true;
    status.remoteUrl = stdout.trim();
  } catch {
    // No remote, check for CLI tools
    
    // Check GitHub CLI
    try {
      await execAsync('gh auth status');
      status.canCreateRepo = true;
      status.platform = 'github';
    } catch {
      // Check GitLab CLI
      try {
        await execAsync('glab auth status');
        status.canCreateRepo = true;
        status.platform = 'gitlab';
      } catch {
        // No CLI tools configured
      }
    }
  }
  
  // Offer repo creation if possible
  if (!status.hasRemote && status.canCreateRepo) {
    const creationResult = await offerGitRepoCreation(status.platform, projectName);
    status.repoCreatedAndPushed = creationResult.createdAndPushed;
    
    // Check if remote was created
    try {
      const { stdout } = await execAsync('git remote get-url origin');
      status.hasRemote = true;
      status.remoteUrl = stdout.trim();
    } catch {
      // Still no remote
    }
  }
  
  return status;
}

async function offerGitRepoCreation(platform, projectName) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    const question = platform === 'github' 
      ? `Create private GitHub repository? (Y/n): `
      : `Create private GitLab repository? (Y/n): `;
      
    rl.question(chalk.cyan(question), async (answer) => {
      rl.close();
      
      if (!answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        try {
          if (platform === 'github') {
            await execAsync(`gh repo create ${projectName} --private --source=. --remote=origin --push`);
            console.log(chalk.green('✓ GitHub repository created and pushed'));
            resolve({ createdAndPushed: true });
            return;
          } else if (platform === 'gitlab') {
            await execAsync(`glab repo create ${projectName} --private`);
            console.log(chalk.green('✓ GitLab repository created'));
            resolve({ createdAndPushed: false }); // GitLab CLI doesn't auto-push
            return;
          }
        } catch (error) {
          console.log(chalk.red(`❌ Failed to create repository: ${error.message}`));
          
          // Handle specific error cases
          if (error.message.includes('Name already exists')) {
            const err = new Error(`Repository name '${projectName}' already exists on your account`);
            err.recoverySteps = [
              `Choose a different project name`,
              `Or use existing repository manually`,
              `Run: git remote add origin <your-existing-repo-url>`,
              `Run: git push -u origin main`
            ];
            throw err;
          } else {
            const err = new Error(`Repository creation failed: ${error.message}`);
            err.recoverySteps = [
              `Create repository manually on ${platform === 'github' ? 'GitHub' : 'GitLab'}`,
              `Run: git remote add origin <your-repo-url>`,
              `Run: git push -u origin main`,
              `Re-run: bit2 deploy`
            ];
            throw err;
          }
        }
      }
      resolve({ createdAndPushed: false });
    });
  }).catch(error => {
    // Re-throw the error to stop deployment
    throw error;
  });
}

async function showDeploymentGuide(provider, dbInfo, gitStatus) {
  console.log();
  console.log(chalk.bold.green('🎉 DEPLOYMENT SETUP COMPLETE!'));
  console.log();
  
  console.log(chalk.cyan('📋 Deployment Configuration:'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(chalk.white(`Database: ${dbInfo.databaseUrl.split('//')[1].split('.')[0]}`));
  console.log(chalk.gray(`TURSO_DATABASE_URL=${dbInfo.databaseUrl}`));
  console.log(chalk.gray(`TURSO_AUTH_TOKEN=${dbInfo.authToken}`));
  console.log();
  
  // Create .env file for easy copying
  try {
    const fs = await import('fs-extra');
    const envContent = `# Environment variables for production deployment\nTURSO_DATABASE_URL=${dbInfo.databaseUrl}\nTURSO_AUTH_TOKEN=${dbInfo.authToken}\n`;
    await fs.writeFile('.env', envContent);
    console.log(chalk.green('✓ Environment variables saved to .env file'));
    console.log();
  } catch (error) {
    console.log(chalk.yellow('⚠ Could not create .env file - copy the values above manually'));
    console.log();
  }
  
  console.log(chalk.cyan('💡 Next Steps:'));
  
  if (!gitStatus.hasRemote) {
    console.log(chalk.yellow('1. Push your code to a Git repository'));
    console.log(chalk.gray('   • Create repo on GitHub, GitLab, or Bitbucket'));
    console.log(chalk.gray('   • Add as remote: git remote add origin <your-repo-url>'));
    console.log(chalk.gray('   • Push: git push -u origin main'));
    console.log();
  } else if (gitStatus.repoCreatedAndPushed) {
    console.log(chalk.green('✓ Git repository created and code pushed'));
  } else {
    console.log(chalk.green('✓ Git repository configured'));
  }
  
  console.log(chalk.yellow(`2. Deploy to ${provider.charAt(0).toUpperCase() + provider.slice(1)}`));
  
  // Read deployment steps from markdown file
  try {
    const fs = await import('fs-extra');
    const deploymentGuideMap = {
      cloudflare: 'cloudflare-pages.md',
      vercel: 'vercel.md', 
      netlify: 'netlify.md'
    };
    
    const guidePath = `./src/content/deployment/${deploymentGuideMap[provider]}`;
    if (await fs.pathExists(guidePath)) {
      const guideContent = await fs.readFile(guidePath, 'utf8');
      const quickSteps = extractQuickSteps(guideContent);
      if (quickSteps.length > 0) {
        quickSteps.forEach(step => {
          console.log(chalk.gray(`   • ${step}`));
        });
      } else {
        // Fallback to simple instructions
        console.log(chalk.gray('   • Connect your Git repository'));
        console.log(chalk.gray('   • Add environment variables (from .env file or shown above)'));
        console.log(chalk.gray('   • Deploy!'));
      }
    }
  } catch (error) {
    // Fallback to simple instructions
    console.log(chalk.gray('   • Connect your Git repository'));
    console.log(chalk.gray('   • Add environment variables (from .env file or shown above)'));
    console.log(chalk.gray('   • Deploy!'));
  }
  console.log();
  
  console.log(chalk.cyan('📖 Detailed deployment guide:'));
  console.log(chalk.gray('   • Run: bit2 dev'));
  console.log(chalk.gray('   • Open your browser: http://localhost:4321'));
  console.log(chalk.gray(`   • View ${provider} deployment instructions`));
  console.log();
  
  console.log(chalk.green('✨ Your project is ready!'));
  console.log();
}

// Extract essential deployment steps from markdown
function extractQuickSteps(markdownContent) {
  const steps = [];
  const lines = markdownContent.split('\n');
  
  // Extract steps from Step 2, 3, 4, and 5 sections
  let currentStep = null;
  let stepCounter = 0;
  
  for (const line of lines) {
    // Detect step sections
    if (line.match(/^## Step [2-5]:/)) {
      currentStep = line.replace(/^## /, '').replace(/Step \d+: /, '');
      stepCounter = 0;
      continue;
    }
    
    // Stop at Step 6 or later sections
    if (line.startsWith('## Step ') && line.match(/Step [6-9]:/)) {
      break;
    }
    
    // Stop at non-step sections after we've started collecting
    if (currentStep && line.startsWith('## ') && !line.match(/^## Step [2-5]:/)) {
      break;
    }
    
    // Extract numbered items from current step (limit to 6 total quick steps)
    if (currentStep && /^\d+\. /.test(line.trim()) && steps.length < 6) {
      stepCounter++;
      // Only take first 2 items from each step section to keep it concise
      if (stepCounter <= 2) {
        let step = line.trim()
          .replace(/^\d+\. /, '')
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
          .replace(/`([^`]+)`/g, '$1'); // Remove code formatting
        
        // Extract and preserve links - convert [text](url) to text (url)
        step = step.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
        
        // Just use the step text without redundant prefixes
        steps.push(step);
      }
    }
  }
  
  return steps;
}

async function saveDeploymentInfo(projectName, provider, dbInfo) {
  try {
    const fs = await import('fs-extra');
    const envContent = `# bit2 deployment configuration\nBIT2_PROJECT_NAME=${projectName}\nBIT2_PROVIDER=${provider}\nBIT2_TURSO_DATABASE=${projectName}\nBIT2_TURSO_DATABASE_URL=${dbInfo.databaseUrl}\nBIT2_TURSO_AUTH_TOKEN=${dbInfo.authToken}\nBIT2_CREATED_AT=${new Date().toISOString()}\n`;
    await fs.writeFile('.env.bit2', envContent);
  } catch (error) {
    console.log(chalk.yellow('⚠ Could not save deployment configuration'));
  }
}

async function handleSubsequentDeploy() {
  // Check git status
  try {
    const { stdout } = await execAsync('git status --porcelain');
    if (stdout.trim()) {
      console.log(chalk.red('❌ You have uncommitted changes'));
      console.log();
      console.log(chalk.yellow('Please commit your changes first:'));
      console.log(chalk.gray('  git add .'));
      console.log(chalk.gray('  git commit -m "Your commit message"'));
      console.log(chalk.gray('  bit2 deploy OR git push (will be deployed automatically)'));
      console.log();
      process.exit(1);
    }
  } catch (error) {
    console.log(chalk.red('❌ Error checking git status'));
    console.log(chalk.gray('Make sure you\'re in a git repository'));
    process.exit(1);
  }
  
  // Push changes
  let spinner = new TimedSpinner('Pushing changes');
  try {
    await execAsync('git push');
    spinner.succeed('Changes pushed - deployment triggered automatically');
    console.log();
  } catch (error) {
    spinner.fail('Failed to push changes');
    console.log();
    console.log(chalk.red('❌ Git push failed'));
    console.log(chalk.yellow('Please check your git configuration and try again'));
    process.exit(1);
  }
}