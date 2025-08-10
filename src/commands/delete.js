import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TimedSpinner } from '../utils/spinner.js';
import readline from 'readline';

const execAsync = promisify(exec);

export async function deleteCommand(projectName, options = {}) {
  const { force } = options;
  
  console.log(`${chalk.yellow('∴')} Delete bit2 project and infrastructure`);
  console.log();
  
  try {
    const fs = await import('fs-extra');
    const path = await import('path');
    
    let projectPath, actualProjectName, isInsideProject = false;
    let deploymentConfig = null;
    
    // Case 1: User provided project name (from parent directory)
    if (projectName) {
      projectPath = path.resolve(process.cwd(), projectName);
      actualProjectName = projectName;
      
      if (!await fs.pathExists(projectPath)) {
        console.log(chalk.red(`❌ Directory "${projectName}" not found.`));
        process.exit(1);
      }
      
      // Check if it has package.json to confirm it's a bit2 project
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        console.log(chalk.red(`❌ "${projectName}" doesn't appear to be a bit2 project (no package.json).`));
        process.exit(1);
      }
      
      // Check for deployment config
      const configPath = path.join(projectPath, '.env.bit2');
      if (await fs.pathExists(configPath)) {
        deploymentConfig = await readDeploymentConfig(configPath);
      }
    } 
    // Case 2: Run from inside project directory
    else {
      if (!await fs.pathExists('./package.json')) {
        console.log(chalk.red('❌ This doesn\'t appear to be a project directory.'));
        console.log(chalk.gray('Usage: bit2 delete [project-name] (from parent dir) OR bit2 delete (from inside project)'));
        process.exit(1);
      }
      
      const packageJson = await fs.readJson('./package.json');
      actualProjectName = packageJson.name;
      projectPath = process.cwd();
      isInsideProject = true;
      
      // Check for deployment config
      if (await fs.pathExists('.env.bit2')) {
        deploymentConfig = await readDeploymentConfig('.env.bit2');
      }
    }
    
    // Show what will be deleted (skip resources that don't exist / aren't configured)
    console.log(chalk.bold.red('DANGER ZONE'));
    console.log();
    console.log(chalk.red('⚠️  This will permanently delete:'));
    
    const deletionItems = [];

    // Turso: only include if it actually exists
    try {
      await execAsync(`turso db show ${actualProjectName}`);
      console.log(chalk.red(`  • Turso Database: ${chalk.white(actualProjectName)}`));
      deletionItems.push({
        type: 'Turso Database',
        name: actualProjectName,
        deleteAction: () => execAsync(`turso db destroy ${actualProjectName} --yes`)
      });
    } catch {
      // skip printing Turso if it doesn't exist or not authenticated
    }

    // Check for GitHub repository (from config or git remote)
    let githubRepoInfo = null;
    
    if (deploymentConfig?.githubRepo) {
      githubRepoInfo = {
        name: deploymentConfig.githubRepo,
        settingsUrl: `https://github.com/${deploymentConfig.githubRepo}/settings`
      };
    } else {
      // Check git remote for GitHub repo
      try {
        const { stdout: remoteUrl } = await execAsync('git remote get-url origin');
        const match = remoteUrl.trim().match(/github\.com[/:]([^\s]+?)(?:\.git)?$/);
        if (match) {
          githubRepoInfo = {
            name: match[1],
            settingsUrl: `https://github.com/${match[1]}/settings`
          };
        }
      } catch {}
    }
    
    if (githubRepoInfo) {
      console.log(chalk.red(`  • GitHub Repository: ${chalk.white(githubRepoInfo.name)}`));
      deletionItems.push({
        type: 'GitHub Repository', 
        name: githubRepoInfo.name,
        settingsUrl: githubRepoInfo.settingsUrl,
        deleteAction: () => execAsync(`gh repo delete ${githubRepoInfo.name.split('/')[1]} --yes`)
      });
    }
    
    // Check for deployment platform projects
    if (deploymentConfig?.provider) {
      const provider = deploymentConfig.provider.toLowerCase();
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      
      console.log(chalk.red(`  • ${providerName} Project: ${chalk.white(actualProjectName)}`));
      
      // All deployment providers require manual deletion
      const dashboardUrls = {
        cloudflare: 'https://dash.cloudflare.com/',
        vercel: 'https://vercel.com/dashboard',
        netlify: 'https://app.netlify.com'
      };
      const dashboardUrl = dashboardUrls[provider] || `https://dashboard.${provider}.com`;
      console.log(chalk.gray(`    Manual deletion: ${dashboardUrl}`));
      deletionItems.push({
        type: `${providerName} Project`,
        name: actualProjectName,
        provider: provider,
        dashboardUrl: dashboardUrl,
        requiresManualDeletion: true,
        deleteAction: () => Promise.resolve()
      });
    } else if (deploymentConfig?.vercelProject) {
      // Fallback for older configs without provider field
      console.log(chalk.red(`  • Vercel Project: ${chalk.white(deploymentConfig.vercelProject)}`));
      console.log(chalk.gray(`    Manual deletion: https://vercel.com/dashboard`));
      
      deletionItems.push({
        type: 'Vercel Project',
        name: deploymentConfig.vercelProject,
        provider: 'vercel',
        requiresManualDeletion: true,
        deleteAction: () => Promise.resolve()
      });
    }
    
    console.log(chalk.red(`  • Local project files: ${chalk.white(projectPath)}`));
    console.log();
    
    // Confirmation (skip if --force)
    if (!force) {
      const confirmed = await confirmDeletion(actualProjectName);
      if (!confirmed) {
        console.log(chalk.yellow('Deletion cancelled.'));
        process.exit(0);
      }
    }
    
    console.log();
    console.log(chalk.red('🗑️  Starting deletion process...'));
    console.log();
    
    // Delete cloud resources
    const manualDeletionInstructions = [];
    
    for (const item of deletionItems) {
      if (item.requiresManualDeletion) {
        // Handle items that require manual deletion
        const spinner = new TimedSpinner(`${item.type} requires manual deletion`);
        spinner.warn(`Manual deletion required`);
        
        manualDeletionInstructions.push({
          title: item.type,
          projectName: item.name,
          dashboardUrl: item.dashboardUrl
        });
      } else {
        // Handle automatic deletion
        const spinner = new TimedSpinner(`Deleting ${item.type}: ${item.name}`);
        try {
          await item.deleteAction();
          spinner.succeed(`${item.type} deleted`);
        } catch (error) {
          // Special handling for GitHub repository deletion
          if (item.type === 'GitHub Repository') {
            spinner.warn(`${item.type} deletion requires manual action`);
            
            try {
              // Remove local remote to avoid stale origin
              try {
                await execAsync('git remote remove origin');
                console.log(chalk.gray('  → Removed local git remote "origin"'));
              } catch {}
              
              // Add to manual instructions
              manualDeletionInstructions.push({
                title: 'GitHub Repository',
                projectName: item.name,
                dashboardUrl: item.settingsUrl
              });
            } catch {}
          } else {
            spinner.warn(`${item.type} not found or already deleted`);
          }
        }
      }
    }
    
    // Delete local project files
    const spinner = new TimedSpinner('Removing local project files');
    try {
      if (isInsideProject) {
        // Move to parent directory, then delete project folder using project name
        const parentDir = path.dirname(projectPath);
        process.chdir(parentDir);
        // Use project name since we're now in the parent directory
        await execAsync(`rm -rf "${actualProjectName}"`);
      } else {
        // Already in parent directory, delete using absolute path
        await execAsync(`rm -rf "${projectPath}"`);
      }
      
      spinner.succeed('Local project files removed');
    } catch (error) {
      spinner.warn('Failed to remove local files');
      console.log(chalk.yellow(`Please manually delete: ${projectPath}`));
    }
    
    // Show manual deletion instructions if needed
    if (manualDeletionInstructions.length > 0) {
      console.log();
      console.log(chalk.yellow('⚠️  Manual deletion required:'));
      
      manualDeletionInstructions.forEach((instruction) => {
        if (instruction.title === 'GitHub Repository') {
          console.log(chalk.cyan(`GitHub Repository: ${instruction.projectName} (${instruction.dashboardUrl})`));
        } else if (instruction.title.includes('Project')) {
          // For Cloudflare, Vercel, Netlify projects
          console.log(chalk.cyan(`${instruction.title}: ${instruction.projectName} (${instruction.dashboardUrl})`));
        } else {
          console.log(chalk.cyan(`${instruction.title}: ${instruction.projectName}`));
          console.log(chalk.gray(`${instruction.dashboardUrl}`));
        }
      });
    }

    console.log();
    console.log(chalk.green(`✅ Project "${actualProjectName}" deleted`));
    
    if (isInsideProject) {
      console.log(chalk.gray('Run: cd ..'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Deletion failed:'), error.message);
    process.exit(1);
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
        const value = valueParts.join('='); // Handle values with = in them
        const configKey = key.replace('BIT2_', '').toLowerCase();
        
        switch (configKey) {
          case 'project_name':
            config.projectName = value;
            break;
          case 'provider':
            config.provider = value;
            break;
          case 'turso_database':
            config.tursoDatabase = value;
            break;
          case 'github_repo':
            config.githubRepo = value;
            break;
          case 'vercel_project':
            config.vercelProject = value;
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
    return null;
  }
}

async function confirmDeletion(projectName) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log(chalk.yellow('⚠️  This action cannot be undone!'));
    console.log();
    rl.question(
      chalk.white(`Type "${chalk.bold(projectName)}" to confirm deletion: `),
      (answer) => {
        rl.close();
        resolve(answer.trim() === projectName);
      }
    );
  });
}
