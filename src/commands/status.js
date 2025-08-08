import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';

const execAsync = promisify(exec);

export async function statusCommand() {
  console.log(chalk.blue('📊 bit2 Project Status'));
  console.log();
  
  const checks = [
    { name: 'Project Structure', check: checkProjectStructure },
    { name: 'Dependencies', check: checkDependencies },
    { name: 'Database', check: checkDatabase },
    { name: 'Git Repository', check: checkGitRepo },
    { name: 'Turso Database', check: checkTursoDatabase },
    { name: 'Deployment', check: checkDeployment }
  ];
  
  for (const { name, check } of checks) {
    const spinner = ora(`Checking ${name}...`).start();
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
        details: ['Run: bit2 migrate']
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
        details: ['Run: bit2 deploy to create GitHub repo']
      };
    }
  } catch (error) {
    return { 
      status: 'warning', 
      message: 'Not a git repository',
      details: ['Run: git init']
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
    
    // Check if Turso database exists
    try {
      const { stdout: dbUrl } = await execAsync(`turso db show --url ${projectName}`);
      const { stdout: authToken } = await execAsync(`turso db tokens create ${projectName}`);
      
      return { 
        status: 'success', 
        message: 'Turso database configured',
        details: [
          chalk.yellow('TURSO_DATABASE_URL') + '=' + chalk.cyan(dbUrl.trim()),
          chalk.yellow('TURSO_AUTH_TOKEN') + '=' + chalk.cyan(authToken.trim()),
          '',
          chalk.gray('Copy these to your Cloudflare Pages environment variables')
        ]
      };
    } catch (dbError) {
      return { 
        status: 'warning', 
        message: 'Turso database not found',
        details: [`Run: turso db create ${projectName}`]
      };
    }
  } catch (error) {
    return { status: 'error', message: 'Could not check Turso status' };
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
      const details = [
        `GitHub repo: ${repoName}`,
        'Connect at: https://dash.cloudflare.com'
      ];
      
      // Try to detect if it's already deployed to Cloudflare Pages
      const fs = await import('fs-extra');
      const packageJson = await fs.readJson('package.json');
      const projectName = packageJson.name;
      
      // Common Cloudflare Pages URL patterns
      const repoNameOnly = repoName.split('/')[1];
      const possibleUrls = new Set([
        `https://${projectName}.pages.dev`,
        `https://${repoNameOnly}.pages.dev`
      ]);
      
      details.push('Possible CF Pages URLs:');
      possibleUrls.forEach(url => {
        details.push(`  ${url}`);
      });
      
      return { 
        status: 'success', 
        message: 'Ready for Cloudflare Pages',
        details
      };
    } else {
      return { status: 'warning', message: 'Non-GitHub remote detected' };
    }
  } catch (error) {
    return { 
      status: 'warning', 
      message: 'Not ready for deployment',
      details: ['Run: bit2 deploy to set up deployment']
    };
  }
}