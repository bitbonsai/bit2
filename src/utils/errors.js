import chalk from 'chalk';

export class Bit2Error extends Error {
  constructor(message, code = 1, recoverySteps = []) {
    super(message);
    this.name = 'Bit2Error';
    this.code = code;
    this.recoverySteps = recoverySteps;
  }
}

export const ErrorCodes = {
  // General errors (1-10)
  UNKNOWN: 1,
  INVALID_INPUT: 2,
  
  // File system errors (11-20)
  FILE_NOT_FOUND: 11,
  DIRECTORY_EXISTS: 12,
  PERMISSION_DENIED: 13,
  
  // Dependencies errors (21-30)
  MISSING_DEPENDENCY: 21,
  DEPENDENCY_INSTALL_FAILED: 22,
  
  // Database errors (31-40)
  DATABASE_CONNECTION_FAILED: 31,
  DATABASE_MIGRATION_FAILED: 32,
  DATABASE_ALREADY_EXISTS: 33,
  
  // Git errors (41-50)
  GIT_NOT_INITIALIZED: 41,
  GIT_UNCOMMITTED_CHANGES: 42,
  GIT_PUSH_FAILED: 43,
  
  // Authentication errors (51-60)
  AUTH_REQUIRED: 51,
  AUTH_FAILED: 52,
  
  // Deployment errors (61-70)
  DEPLOYMENT_FAILED: 61,
  BUILD_FAILED: 62,
  
  // Network errors (71-80)
  NETWORK_ERROR: 71,
  API_ERROR: 72,
};

export function handleError(error) {
  console.log();
  
  if (error instanceof Bit2Error) {
    console.error(chalk.red(`❌ ${error.message}`));
    
    if (error.recoverySteps && error.recoverySteps.length > 0) {
      console.log();
      console.log(chalk.cyan('🔧 Recovery steps:'));
      error.recoverySteps.forEach(step => {
        console.log(chalk.gray(`  • ${step}`));
      });
    }
    
    console.log();
    process.exit(error.code);
  } else {
    // Generic error
    console.error(chalk.red(`❌ ${error.message || 'An unexpected error occurred'}`));
    
    if (process.env.DEBUG) {
      console.log();
      console.log(chalk.gray('Stack trace:'));
      console.log(chalk.gray(error.stack));
    } else {
      console.log(chalk.gray('Run with DEBUG=1 for more details'));
    }
    
    console.log();
    process.exit(ErrorCodes.UNKNOWN);
  }
}

export function createError(message, code = ErrorCodes.UNKNOWN, recoverySteps = []) {
  return new Bit2Error(message, code, recoverySteps);
}