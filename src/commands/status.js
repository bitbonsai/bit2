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
    { name: 'Deployment Config', check: checkDeploymentConfig }
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
  console.log(chalk.gray('  • Local dev:'), chalk.white(`${chalk.bold('bit2 dev')} OR bun dev`));
  console.log(chalk.gray('  • Database:'), chalk.white(`${chalk.bold('bit2 db')} info|shell|token`));
  console.log(chalk.gray('  • Deployment:'), chalk.white(`${chalk.bold('bit2 deploy')} OR ${chalk.bold('bit2 open')}`));
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
    const requiredDeps = ['astro', '@libsql/client'];
    const missing = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);
    
    // Check for any Astro adapter
    const hasAdapter = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies })
      .some(dep => dep.startsWith('@astrojs/') && ['cloudflare', 'vercel', 'netlify'].some(provider => dep.includes(provider)));
    
    if (missing.length === 0) {
      const hasNodeModules = await fs.pathExists('node_modules');
      const adapterStatus = hasAdapter ? ' with deployment adapter' : '';
      
      if (hasNodeModules) {
        return { status: 'success', message: `Dependencies installed${adapterStatus}` };
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
          chalk.gray(`Use ${chalk.bold('bit2 db')} to get connection details`)
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

async function checkDeploymentConfig() {
  const fs = await import('fs-extra');
  
  try {
    // Check if deployment config exists
    if (await fs.pathExists('.env.bit2')) {
      const deploymentConfig = await readDeploymentConfig('.env.bit2');
      
      if (deploymentConfig.provider && deploymentConfig.projectName) {
        const { provider, projectName, createdAt, deploymentUrl } = deploymentConfig;
        
        // Generate dashboard URL
        const dashboardUrl = generateDashboardUrl(provider, projectName);
        
        // Get last deploy info
        const lastDeployInfo = await getLastDeployInfo(provider, projectName);
        
        const details = [
          `${chalk.cyan('Project:')} ${projectName}`,
          `${chalk.cyan('Provider:')} ${provider}`,
          `${chalk.cyan('Dashboard:')} ${dashboardUrl}`,
        ];
        
        if (createdAt) {
          const createdDate = new Date(createdAt);
          details.push(`${chalk.cyan('Created:')} ${createdDate.toLocaleDateString()}`);
        }
        
        if (lastDeployInfo) {
          details.push(`${chalk.cyan('Last Deploy:')} ${lastDeployInfo}`);
        }
        
        details.push('');
        details.push(`${chalk.gray('Commands:')} bit2 open | bit2 logs | bit2 db | bit2 deploy`);
        
        return {
          status: 'success',
          message: `Deployed on ${provider}`,
          details
        };
      }
    }
    
    return {
      status: 'warning',
      message: 'No deployment configuration',
      details: [`Run: ${chalk.bold('bit2 deploy')} to set up deployment`]
    };
  } catch (error) {
    return { status: 'error', message: 'Could not check deployment config' };
  }
}

async function readDeploymentConfig(configPath) {
  try {
    const fs = await import('fs-extra');
    const content = await fs.readFile(configPath, 'utf8');
    
    const config = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('BIT2_')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        const configKey = key.replace('BIT2_', '').toLowerCase();
        
        switch (configKey) {
          case 'project_name':
            config.projectName = value;
            break;
          case 'provider':
            config.provider = value;
            break;
          case 'deployment_url':
            config.deploymentUrl = value;
            break;
          case 'created_at':
            config.createdAt = value;
            break;
        }
      }
    }
    
    return config;
  } catch (error) {
    return {};
  }
}

function generateDashboardUrl(provider, projectName) {
  switch (provider.toLowerCase()) {
    case 'cloudflare':
      return `https://dash.cloudflare.com/pages/view/${projectName}`;
    case 'vercel':
      return `https://vercel.com/dashboard`;
    case 'netlify':
      return `https://app.netlify.com/sites/${projectName}`;
    default:
      return `https://${provider}.com/dashboard`;
  }
}


async function getLastDeployInfo(provider, projectName) {
  try {
    // Check if there are any recent commits
    const { stdout: gitLog } = await execAsync('git log --oneline -1');
    const lastCommit = gitLog.trim();
    
    if (lastCommit) {
      // Check if this commit has been pushed
      try {
        await execAsync('git log origin/main..HEAD --oneline');
        return `${lastCommit.substring(0, 50)}... (not yet pushed)`;
      } catch {
        return `${lastCommit.substring(0, 50)}... (deployed)`;
      }
    }
    
    return 'No recent commits';
  } catch {
    return 'Unable to determine';
  }
}

