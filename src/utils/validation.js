import chalk from 'chalk';

export function validateProjectName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Project name is required' };
  }

  if (name.length < 1 || name.length > 100) {
    return { valid: false, error: 'Project name must be between 1 and 100 characters' };
  }

  // Check for npm package name validity
  // Must be lowercase, can contain letters, digits, hyphens, underscores, and dots
  // Cannot start with dot or underscore
  const validPattern = /^[a-z0-9][a-z0-9-_.]*$/;
  
  if (!validPattern.test(name)) {
    return { 
      valid: false, 
      error: 'Project name must be lowercase and can only contain letters, numbers, hyphens, underscores, and dots' 
    };
  }

  // Cannot start or end with a dot or hyphen
  if (name.startsWith('.') || name.startsWith('-') || name.endsWith('.') || name.endsWith('-')) {
    return { 
      valid: false, 
      error: 'Project name cannot start or end with a dot or hyphen' 
    };
  }

  // Check for reserved names
  const reserved = ['node_modules', 'favicon.ico', 'test', 'tests'];
  if (reserved.includes(name.toLowerCase())) {
    return { valid: false, error: `"${name}" is a reserved name` };
  }

  return { valid: true };
}

export function formatValidationError(error) {
  console.log();
  console.log(chalk.red('❌ Invalid project name:'), error);
  console.log();
  console.log(chalk.yellow('Valid project names:'));
  console.log(chalk.gray('  • Must be lowercase'));
  console.log(chalk.gray('  • Can contain letters, numbers, hyphens, underscores, dots'));
  console.log(chalk.gray('  • Cannot start or end with dots or hyphens'));
  console.log(chalk.gray('  • Examples: my-app, cool_project, app.v2'));
  console.log();
}

export function validateGitHubRepo(url) {
  const patterns = [
    /github\.com[:/]([^/]+)\/([^.]+)(?:\.git)?$/,
    /git@github\.com:([^/]+)\/([^.]+)(?:\.git)?$/,
    /https:\/\/github\.com\/([^/]+)\/([^.]+?)(?:\.git)?$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        valid: true,
        owner: match[1],
        repo: match[2]
      };
    }
  }
  
  return { valid: false, error: 'Invalid GitHub repository URL' };
}

export function validateDatabaseUrl(url) {
  if (url.startsWith('file:')) {
    return { valid: true, type: 'local' };
  }
  
  if (url.startsWith('libsql://') || url.includes('.turso.io')) {
    return { valid: true, type: 'turso' };
  }
  
  return { valid: false, error: 'Invalid database URL format' };
}