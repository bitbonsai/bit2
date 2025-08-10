import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function logsCommand(options = {}) {
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
    
    console.log(chalk.cyan(`📋 Fetching ${provider} deployment logs...`));
    console.log();
    
    // Fetch logs based on provider
    switch (provider.toLowerCase()) {
      case 'cloudflare':
        await getCloudflarePageslogs(projectName);
        break;
      case 'vercel':
        await getVercelLogs(projectName);
        break;
      case 'netlify':
        await getNetlifyLogs(projectName);
        break;
      default:
        console.log(chalk.red(`❌ Logs not supported for provider: ${provider}`));
        console.log(chalk.gray('Supported providers: cloudflare, vercel, netlify'));
        process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch logs:'), error.message);
    process.exit(1);
  }
}

async function getCloudflarePageslogs(projectName) {
  try {
    // Check if wrangler is available
    await execAsync('npx wrangler --version');
    
    // Get pages deployments
    console.log(chalk.yellow('Recent deployments:'));
    const { stdout } = await execAsync(`npx wrangler pages deployment list --project-name=${projectName} --compatibility-date=2023-10-01 | head -10`);
    
    if (stdout.trim()) {
      console.log(stdout);
    } else {
      console.log(chalk.gray('No recent deployments found'));
    }
    
    console.log();
    console.log(chalk.cyan('💡 For detailed logs:'));
    console.log(chalk.gray(`• Dashboard: https://dash.cloudflare.com/pages/view/${projectName}`));
    console.log(chalk.gray(`• CLI: npx wrangler pages deployment list --project-name=${projectName}`));
    
  } catch (error) {
    console.log(chalk.yellow('⚠ Wrangler CLI not available or not authenticated'));
    console.log();
    console.log(chalk.cyan('💡 View logs at:'));
    console.log(chalk.gray(`• Dashboard: https://dash.cloudflare.com/pages/view/${projectName}`));
    console.log(chalk.gray(`• Install Wrangler: npm install -g wrangler`));
    console.log(chalk.gray(`• Login: npx wrangler login`));
  }
}

async function getVercelLogs(projectName) {
  try {
    // Check if vercel CLI is available
    await execAsync('vercel --version');
    
    // Get recent deployments
    console.log(chalk.yellow('Recent deployments:'));
    const { stdout } = await execAsync(`vercel ls ${projectName} | head -10`);
    
    if (stdout.trim()) {
      console.log(stdout);
    } else {
      console.log(chalk.gray('No recent deployments found'));
    }
    
    console.log();
    console.log(chalk.cyan('💡 For detailed logs:'));
    console.log(chalk.gray(`• CLI: vercel logs ${projectName}`));
    console.log(chalk.gray('• Dashboard: https://vercel.com/dashboard'));
    
  } catch (error) {
    console.log(chalk.yellow('⚠ Vercel CLI not available or not authenticated'));
    console.log();
    console.log(chalk.cyan('💡 View logs at:'));
    console.log(chalk.gray('• Dashboard: https://vercel.com/dashboard'));
    console.log(chalk.gray('• Install CLI: npm install -g vercel'));
    console.log(chalk.gray('• Login: vercel login'));
  }
}

async function getNetlifyLogs(projectName) {
  try {
    // Check if netlify CLI is available
    await execAsync('netlify --version');
    
    // Get site info and recent deploys
    console.log(chalk.yellow('Recent deployments:'));
    const { stdout } = await execAsync(`netlify api listSiteDeploys --data='{ "site_id": "${projectName}" }' | head -10`);
    
    if (stdout.trim()) {
      console.log(stdout);
    } else {
      console.log(chalk.gray('No recent deployments found'));
    }
    
    console.log();
    console.log(chalk.cyan('💡 For detailed logs:'));
    console.log(chalk.gray(`• CLI: netlify logs --site=${projectName}`));
    console.log(chalk.gray('• Dashboard: https://app.netlify.com/sites/' + projectName));
    
  } catch (error) {
    console.log(chalk.yellow('⚠ Netlify CLI not available or not authenticated'));
    console.log();
    console.log(chalk.cyan('💡 View logs at:'));
    console.log(chalk.gray(`• Dashboard: https://app.netlify.com/sites/${projectName}`));
    console.log(chalk.gray('• Install CLI: npm install -g netlify-cli'));
    console.log(chalk.gray('• Login: netlify login'));
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