import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function openCommand(options = {}) {
  try {
    const fs = await import('fs-extra');
    
    // Check if deployment config exists
    if (!await fs.pathExists('.env.bit2')) {
      console.log(chalk.red('❌ No deployment found'));
      console.log(chalk.gray('Run: bit2 deploy'));
      process.exit(1);
    }
    
    // Read deployment config
    const deploymentConfig = await readDeploymentConfig('.env.bit2');
    
    if (!deploymentConfig) {
      console.log(chalk.red('❌ Could not read deployment configuration'));
      process.exit(1);
    }
    
    const { provider, projectName } = deploymentConfig;
    
    if (!provider || !projectName) {
      console.log(chalk.red('❌ Incomplete deployment configuration'));
      console.log(chalk.gray('Try running: bit2 deploy'));
      process.exit(1);
    }
    
    // Generate dashboard URL based on provider
    let dashboardUrl;
    switch (provider.toLowerCase()) {
      case 'cloudflare':
        dashboardUrl = `https://dash.cloudflare.com/pages/view/${projectName}`;
        break;
      case 'vercel':
        dashboardUrl = `https://vercel.com/dashboard`;
        break;
      case 'netlify':
        dashboardUrl = `https://app.netlify.com/sites/${projectName}`;
        break;
      default:
        console.log(chalk.red(`❌ Unsupported provider: ${provider}`));
        process.exit(1);
    }
    
    console.log(chalk.cyan(`Opening ${provider} dashboard...`));
    
    // Open URL in default browser
    const openCommand = process.platform === 'darwin' ? 'open' : 
                       process.platform === 'win32' ? 'start' : 'xdg-open';
    
    try {
      await execAsync(`${openCommand} "${dashboardUrl}"`);
      console.log(chalk.green(`✅ Opened: ${dashboardUrl}`));
    } catch (error) {
      console.log(chalk.yellow(`⚠ Could not open browser automatically`));
      console.log(chalk.cyan(`Dashboard: ${dashboardUrl}`));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to open dashboard:'), error.message);
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
    return null;
  }
}