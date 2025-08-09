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

    // GitHub and Vercel: only include if we have explicit config values
    if (deploymentConfig) {
      if (deploymentConfig.githubRepo) {
        console.log(chalk.red(`  • GitHub Repository: ${chalk.white(deploymentConfig.githubRepo)}`));
        deletionItems.push({
          type: 'GitHub Repository', 
          name: deploymentConfig.githubRepo,
          deleteAction: () => execAsync(`gh repo delete ${deploymentConfig.githubRepo.split('/')[1]} --yes`)
        });
      }

      if (deploymentConfig.vercelProject) {
        console.log(chalk.red(`  • Vercel Project: ${chalk.white(deploymentConfig.vercelProject)}`));
        if (deploymentConfig.deploymentUrl) {
          console.log(chalk.gray(`    Live site: ${deploymentConfig.deploymentUrl}`));
        }
        deletionItems.push({
          type: 'Vercel Project',
          name: deploymentConfig.vercelProject,
          deleteAction: () => execAsync(`vercel remove ${deploymentConfig.vercelProject} --yes`)
        });
      }
    }
    
    console.log(chalk.red(`  • Local project files: ${chalk.white(projectPath)}`));
    console.log();
    
    console.log(chalk.yellow('⚠️  Resources that don\'t exist will be silently skipped.'));
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
    for (const item of deletionItems) {
      const spinner = new TimedSpinner(`Deleting ${item.type}: ${item.name}`);
      try {
        await item.deleteAction();
        spinner.succeed(`${item.type} deleted`);
      } catch (error) {
        spinner.warn(`${item.type} not found or already deleted`);
        // Extra cleanup/help for GitHub
        if (item.type === 'GitHub Repository') {
          try {
            // Try to capture remote URL before removal
            let repoUrl = '';
            try {
              const { stdout: remoteUrl } = await execAsync('git remote get-url origin');
              repoUrl = remoteUrl.trim();
            } catch {}

            // Remove local remote to avoid stale origin
            try {
              await execAsync('git remote remove origin');
              console.log(chalk.gray('  → Removed local git remote "origin"'));
            } catch {}

            // Print GitHub settings URL if determinable
            let settingsUrl = '';
            if (deploymentConfig?.githubRepo) {
              settingsUrl = `https://github.com/${deploymentConfig.githubRepo}/settings`;
            } else if (repoUrl) {
              const match = repoUrl.match(/github\.com[/:]([^\s]+?)(?:\.git)?$/);
              if (match) settingsUrl = `https://github.com/${match[1]}/settings`;
            }
            if (settingsUrl) {
              console.log(chalk.gray('  → Repo settings:'), chalk.underline.blue(settingsUrl));
            }
          } catch {}
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
    
    // Success message
    console.log();
    console.log(chalk.bold.green('DELETION COMPLETE'));
    console.log();
    console.log(chalk.green(`✅ Project "${actualProjectName}" has been completely removed.`));
    console.log(chalk.gray('All cloud resources and local files have been deleted.'));
    
    if (isInsideProject) {
      console.log();
      console.log(chalk.yellow('📁 Your shell is still in the deleted directory.'));
      console.log(chalk.gray('Run this command to go to parent directory:'));
      console.log();
      console.log(chalk.cyan('cd ..'));
    }
    
    console.log();
    
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