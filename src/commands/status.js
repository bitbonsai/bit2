import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TimedSpinner } from '../utils/spinner.js';

const execAsync = promisify(exec);

export async function statusCommand() {
  console.log(`${chalk.yellow('∴')} bit2 Project Status`);
  console.log();
  
  const checks = [
    { name: 'Project Structure', check: checkProjectStructure },
    { name: 'Dependencies', check: checkDependencies },
    { name: 'Database', check: checkDatabase },
    { name: 'Git Repository', check: checkGitRepo },
    { name: 'Turso Database', check: checkTursoDatabase },
    { name: 'Cloudflare Pages', check: checkCloudflarePages },
    { name: 'Deployment Status', check: checkDeployment }
  ];
  
  for (const { name, check } of checks) {
    const spinner = new TimedSpinner(`Checking ${name}`);
    try {
      const result = await check();
      if (result.status === 'success') {
        spinner.succeed(`${name}: ${chalk.green(result.message)}`);
      } else if (result.status === 'warning') {
        spinner.warn(`${name}: ${chalk.yellow(result.message)}`);
      } else {
        spinner.fail(`${name}: ${chalk.red(result.message)}`);
      }
      
      if (result.details) {
        result.details.forEach(detail => {
          console.log(chalk.gray(`  ${detail}`));
        });
      }
    } catch (error) {
      spinner.fail(`${name}: ${chalk.red('Check failed')}`);
    }
    console.log();
  }
  
  // Show final recommendations
  console.log(chalk.bold.blue('NEXT STEPS'));
  console.log();
  console.log(chalk.cyan('🚀 Quick commands:'));
  console.log(chalk.gray('  • Local dev:'), chalk.white(`${chalk.bold('bit2 dev')} OR bun run dev`));
  console.log(chalk.gray('  • Full deployment:'), chalk.white(chalk.bold('bit2 deploy')));
  console.log(chalk.gray('  • Preview deployment:'), chalk.white(chalk.bold('bit2 deploy --dry-run')));
  console.log(chalk.gray('  • Manual deployment:'), chalk.white(chalk.bold('bit2 deploy --local')));
  console.log();
}

async function checkProjectStructure() {
  const fs = await import('fs-extra');
  const requiredFiles = [
    'package.json',
    'astro.config.mjs',
    'src/pages/index.astro',
    'src/db/client.ts',
    'src/db/schema.sql'
  ];
  
  const missing = [];
  for (const file of requiredFiles) {
    if (!await fs.pathExists(file)) {
      missing.push(file);
    }
  }
  
  if (missing.length === 0) {
    return { status: 'success', message: 'All required files present' };
  } else {
    return { 
      status: 'error', 
      message: `Missing ${missing.length} file(s)`,
      details: missing.map(f => `Missing: ${f}`)
    };
  }
}

async function checkDependencies() {
  const fs = await import('fs-extra');
  
  try {
    const packageJson = await fs.readJson('package.json');
    const requiredDeps = ['astro', '@astrojs/cloudflare', '@libsql/client'];
    const missing = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);
    
    if (missing.length === 0) {
      // Check if node_modules exists
      const hasNodeModules = await fs.pathExists('node_modules');
      if (hasNodeModules) {
        return { status: 'success', message: 'Dependencies installed' };
      } else {
        return { status: 'warning', message: 'Dependencies need installation', details: ['Run: bun install'] };
      }
    } else {
      return { 
        status: 'error', 
        message: `Missing dependencies: ${missing.join(', ')}` 
      };
    }
  } catch (error) {
    return { status: 'error', message: 'Could not read package.json' };
  }
}

async function checkDatabase() {
  const fs = await import('fs-extra');
  
  try {
    const hasDevDb = await fs.pathExists('dev.db');
    const hasSchema = await fs.pathExists('src/db/schema.sql');
    
    if (!hasSchema) {
      return { status: 'error', message: 'Schema file missing' };
    }
    
    if (hasDevDb) {
      return { status: 'success', message: 'Local database ready' };
    } else {
      return { 
        status: 'warning', 
        message: 'Database not initialized',
        details: [`Run: ${chalk.bold('bit2 migrate')}`]
      };
    }
  } catch (error) {
    return { status: 'error', message: 'Database check failed' };
  }
}

async function checkGitRepo() {
  try {
    await execAsync('git status');
    
    // Check for uncommitted changes
    const { stdout } = await execAsync('git status --porcelain');
    if (stdout.trim()) {
      return { 
        status: 'warning', 
        message: 'Uncommitted changes',
        details: ['Run: git add . && git commit -m "Update"']
      };
    }
    
    // Check for remote
    try {
      await execAsync('git remote get-url origin');
      return { status: 'success', message: 'Git repository with remote' };
    } catch {
      return { 
        status: 'warning', 
        message: 'No remote repository',
        details: [`Run: ${chalk.bold('bit2 deploy')} to create GitHub repo`]
      };
    }
  } catch (error) {
    return { 
      status: 'warning', 
      message: 'Not a git repository',
      details: [`Run: ${chalk.bold('bit2 deploy')} OR git init`]
    };
  }
}

async function checkTursoDatabase() {
  const fs = await import('fs-extra');
  
  try {
    // Get project name from package.json
    const packageJson = await fs.readJson('package.json');
    const projectName = packageJson.name;
    
    // Check if authenticated with Turso
    try {
      await execAsync('turso auth whoami');
    } catch (authError) {
      return { 
        status: 'warning', 
        message: 'Not authenticated with Turso',
        details: ['Run: turso auth signup']
      };
    }
    
    // Check if Turso database exists (READ-ONLY check)
    try {
      await execAsync(`turso db show ${projectName}`);
      const { stdout: dbUrl } = await execAsync(`turso db show --url ${projectName}`);
      
      return { 
        status: 'success', 
        message: 'Turso database exists',
        details: [
          chalk.yellow('Database URL: ') + chalk.cyan(dbUrl.trim()),
          chalk.gray(`Use ${chalk.bold('`bit2 deploy`')} to get auth token for production`)
        ]
      };
    } catch (dbError) {
      return { 
        status: 'warning', 
        message: 'Turso database not found',
        details: [`Run: ${chalk.bold('bit2 deploy')} OR turso db create ${projectName}`]
      };
    }
  } catch (error) {
    return { status: 'error', message: 'Could not check Turso status' };
  }
}

async function checkCloudflarePages() {
  try {
    const fs = await import('fs-extra');
    const packageJson = await fs.readJson('package.json');
    const projectName = packageJson.name;
    
    // Check if wrangler is available and authenticated
    try {
      await execAsync('bunx wrangler --version');
      await execAsync('bunx wrangler whoami');
    } catch (error) {
      return { 
        status: 'warning', 
        message: 'Cloudflare not configured',
        details: ['Run: bunx wrangler login']
      };
    }
    
    // Check if Pages project exists
    try {
      // Try to detect account ID from multiple sources
      let accountId = null;
      
      // First, try to get account ID from local config or environment
      try {
        const fs = await import('fs-extra');
        
        // Check for local .bit2 config file
        if (await fs.pathExists('.bit2')) {
          const config = await fs.readJson('.bit2');
          if (config.cloudflareAccountId) {
            accountId = config.cloudflareAccountId;
          }
        }
      } catch (error) {
        // Continue without local config
      }
      
      // If no account ID found, try to detect from whoami
      if (!accountId) {
        try {
          const { stdout: whoamiOutput } = await execAsync('bunx wrangler whoami');
          
          // Look for account IDs in whoami output
          const accountMatches = [...whoamiOutput.matchAll(/│\s+(.+?)'s Account\s+│\s+([a-f0-9-]+)\s+│/g)];
          if (accountMatches.length === 1) {
            // Single account - use it
            accountId = accountMatches[0][2];
          } else if (accountMatches.length > 1) {
            // Multiple accounts - show warning and continue without account ID
            console.log(chalk.yellow('  ⚠️  Multiple Cloudflare accounts detected'));
            console.log(chalk.gray('  → Run `bit2 deploy` to configure which account to use'));
          }
        } catch (error) {
          // Continue without account ID
        }
      }
      
      const listCommand = accountId 
        ? `CLOUDFLARE_ACCOUNT_ID=${accountId} bunx wrangler pages project list`
        : `bunx wrangler pages project list`;
      
      const { stdout } = await execAsync(listCommand);
      
      // Parse the table output to find our project
      const projectExists = stdout.includes(projectName);
      
      if (projectExists) {
        // Get deployment info
        try {
          const deploymentCommand = accountId 
            ? `CLOUDFLARE_ACCOUNT_ID=${accountId} bunx wrangler pages deployment list --project-name=${projectName}`
            : `bunx wrangler pages deployment list --project-name=${projectName}`;
          
          const { stdout: deploymentData } = await execAsync(deploymentCommand);
          
          // Parse deployment table to get status
          const lines = deploymentData.split('\n');
          const deploymentLine = lines.find(line => line.includes('Production') || line.includes('├─'));
          
          let deploymentStatus = 'unknown';
          let deploymentUrl = `https://${projectName}.pages.dev`;
          
          if (deploymentLine) {
            // Extract URL from deployment line
            const urlMatch = deploymentLine.match(/https:\/\/[^\s]+/);
            if (urlMatch) {
              deploymentUrl = urlMatch[0];
            }
            
            // Determine status based on table content
            if (deploymentLine.includes('success') || deploymentLine.includes('✅')) {
              deploymentStatus = 'success';
            } else if (deploymentLine.includes('failed') || deploymentLine.includes('❌')) {
              deploymentStatus = 'failed';
            } else {
              deploymentStatus = 'deployed';
            }
          }
          
          return {
            status: deploymentStatus === 'success' || deploymentStatus === 'deployed' ? 'success' : 'warning',
            message: `Deployed (${deploymentStatus})`,
            details: [
              `Live URL: ${chalk.underline.blue(deploymentUrl)}`,
              `View logs: bunx wrangler pages tail ${projectName}`,
              `Dashboard: https://dash.cloudflare.com`
            ]
          };
        } catch (error) {
          return {
            status: 'success',
            message: 'Pages project exists',
            details: [
              `Live URL: https://${projectName}.pages.dev`,
              `Dashboard: https://dash.cloudflare.com`
            ]
          };
        }
      } else {
        return {
          status: 'warning',
          message: 'No Pages project found',
          details: [`Run: ${chalk.bold('bit2 deploy')} to create Pages project`]
        };
      }
    } catch (error) {
      return {
        status: 'warning',
        message: 'Could not check Pages status',
        details: [`Run: ${chalk.bold('bit2 deploy')} OR setup manually at https://dash.cloudflare.com`]
      };
    }
  } catch (error) {
    return { status: 'error', message: 'Could not read project info' };
  }
}

async function checkDeployment() {
  try {
    // Check if we have a GitHub repo
    await execAsync('git remote get-url origin');
    
    // Try to get the repo name
    const { stdout: remoteUrl } = await execAsync('git remote get-url origin');
    const repoMatch = remoteUrl.match(/github\.com[/:](.*?)\.git/);
    
    if (repoMatch) {
      const repoName = repoMatch[1];
      
      // Check git status for uncommitted changes
      try {
        const { stdout: gitStatus } = await execAsync('git status --porcelain');
        if (gitStatus.trim()) {
          return {
            status: 'warning',
            message: 'Uncommitted changes detected',
            details: [
              `GitHub repo: ${repoName}`,
              'Commit changes before deployment',
              'Run: git add . && git commit -m "Update"'
            ]
          };
        }
      } catch (error) {
        // Git status failed, continue anyway
      }
      
      return { 
        status: 'success', 
        message: 'Ready for deployment',
        details: [
          `GitHub repo: ${repoName}`,
          `Run: ${chalk.bold('bit2 deploy')} for automated deployment`,
          `Or: ${chalk.bold('bit2 deploy --dry-run')} to preview`
        ]
      };
    } else {
      return { status: 'warning', message: 'Non-GitHub remote detected' };
    }
  } catch (error) {
    return { 
      status: 'warning', 
      message: 'Not ready for deployment',
      details: [`Run: ${chalk.bold('bit2 deploy')} to set up deployment`]
    };
  }
}

