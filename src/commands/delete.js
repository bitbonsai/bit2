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
  
  let spinner = new TimedSpinner('Gathering project information');
  
  try {
    const fs = await import('fs-extra');
    const path = await import('path');
    
    let projectPath, actualProjectName, isInsideProject = false;
    
    // Case 1: User provided project name (from parent directory)
    if (projectName) {
      projectPath = path.resolve(process.cwd(), projectName);
      actualProjectName = projectName;
      
      if (!await fs.pathExists(projectPath)) {
        spinner.fail('Project directory not found');
        console.log(chalk.red(`❌ Directory "${projectName}" not found.`));
        process.exit(1);
      }
      
      // Check if it has package.json to confirm it's a bit2 project
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        spinner.fail('Not a bit2 project');
        console.log(chalk.red(`❌ "${projectName}" doesn't appear to be a bit2 project (no package.json).`));
        process.exit(1);
      }
    } 
    // Case 2: Run from inside project directory
    else {
      if (!await fs.pathExists('./package.json')) {
        spinner.fail('No package.json found');
        console.log(chalk.red('❌ This doesn\'t appear to be a project directory.'));
        console.log(chalk.gray('Usage: bit2 delete [project-name] (from parent dir) OR bit2 delete (from inside project)'));
        process.exit(1);
      }
      
      const packageJson = await fs.readJson('./package.json');
      actualProjectName = packageJson.name;
      projectPath = process.cwd();
      isInsideProject = true;
    }
    
    spinner.succeed('Project information gathered');
    
    // Show what will be deleted
    console.log(chalk.bold.red('DANGER ZONE'));
    console.log();
    console.log(chalk.red('⚠️  This will permanently delete:'));
    
    // Check what exists and show deletion plan
    const deletionPlan = await gatherDeletionPlan(actualProjectName);
    
    if (deletionPlan.length === 0) {
      console.log(chalk.yellow('Nothing to delete - no cloud resources found.'));
      console.log(chalk.gray('Only local files would be removed.'));
    } else {
      deletionPlan.forEach(item => {
        console.log(chalk.red(`  • ${item.type}: ${chalk.white(item.name)}`));
        if (item.details) {
          item.details.forEach(detail => {
            console.log(chalk.gray(`    ${detail}`));
          });
        }
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
    for (const item of deletionPlan) {
      spinner = new TimedSpinner(`Deleting ${item.type}: ${item.name}`);
      try {
        await item.deleteAction();
        spinner.succeed(`${item.type} deleted`);
      } catch (error) {
        spinner.warn(`Failed to delete ${item.type}: ${error.message}`);
        console.log(chalk.gray(`  You may need to delete manually: ${item.manualUrl || 'N/A'}`));
      }
    }
    
    // Delete local project files
    spinner = new TimedSpinner('Removing local project files');
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
    if (spinner) {
      spinner.fail('Deletion failed');
    }
    console.error(chalk.red('❌ Deletion failed:'), error.message);
    process.exit(1);
  }
}

async function gatherDeletionPlan(projectName) {
  const plan = [];
  
  // Check Turso database
  try {
    await execAsync('turso auth whoami');
    await execAsync(`turso db show ${projectName}`);
    
    plan.push({
      type: 'Turso Database',
      name: projectName,
      details: ['All data will be permanently lost'],
      deleteAction: () => execAsync(`turso db destroy ${projectName} --yes`),
      manualUrl: 'https://app.turso.tech'
    });
  } catch (error) {
    // Database doesn't exist or not authenticated
  }
  
  // Check GitHub repository
  try {
    await execAsync('gh auth status');
    await execAsync(`gh repo view ${projectName}`);
    
    const { stdout: userOutput } = await execAsync('gh api user --jq .login');
    const githubUser = userOutput.trim();
    
    plan.push({
      type: 'GitHub Repository',
      name: `${githubUser}/${projectName}`,
      details: ['All code history will be permanently lost'],
      deleteAction: async () => {
        try {
          await execAsync(`gh repo delete ${projectName} --yes`);
        } catch (error) {
          if (error.message.includes('delete_repo') || error.message.includes('403')) {
            // Handle insufficient permissions
            const enhancedError = new Error('Insufficient GitHub permissions for repository deletion');
            enhancedError.isPermissionError = true;
            enhancedError.recoverySteps = [
              'Grant delete_repo permission: gh auth refresh -h github.com -s delete_repo',
              `Then retry deletion: gh repo delete ${projectName} --yes`,
              `Or delete manually: https://github.com/${githubUser}/${projectName}/settings`
            ];
            throw enhancedError;
          }
          throw error;
        }
      },
      manualUrl: `https://github.com/${githubUser}/${projectName}/settings`
    });
  } catch (error) {
    // Repository doesn't exist or not authenticated
  }
  
  // Check Cloudflare Pages
  try {
    await execAsync('bunx wrangler whoami');
    const { stdout } = await execAsync('bunx wrangler pages project list --json');
    const projects = JSON.parse(stdout);
    const project = projects.find(p => p.name === projectName);
    
    if (project) {
      plan.push({
        type: 'Cloudflare Pages',
        name: projectName,
        details: [`Live site: https://${projectName}.pages.dev`],
        deleteAction: () => execAsync(`bunx wrangler pages project delete ${projectName} --yes`),
        manualUrl: 'https://dash.cloudflare.com'
      });
    }
  } catch (error) {
    // Pages project doesn't exist or not authenticated
  }
  
  return plan;
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