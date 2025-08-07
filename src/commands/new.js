import chalk from 'chalk';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function newCommand(projectName) {
  console.log(chalk.blue(`🚀 Creating new Astro + libSQL project: ${chalk.bold(projectName)}`));
  
  const spinner = ora('Setting up project...').start();
  
  try {
    const projectPath = path.resolve(process.cwd(), projectName);
    
    // Check if directory already exists
    if (await fs.pathExists(projectPath)) {
      spinner.fail();
      console.error(chalk.red(`❌ Directory ${projectName} already exists!`));
      process.exit(1);
    }
    
    // Create project directory
    await fs.ensureDir(projectPath);
    
    // Copy template files
    const templatePath = path.resolve(__dirname, '../../templates/astro-app');
    await fs.copy(templatePath, projectPath);
    
    // Update package.json with project name
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.name = projectName;
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    
    spinner.succeed();
    
    // Auto-run bun install
    spinner.start('Installing dependencies...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync('bun install', { cwd: projectPath });
      spinner.succeed('Dependencies installed');
      
      // Auto-run migrations to create database
      spinner.start('Setting up database...');
      
      // Read and parse SQL files
      const schemaContent = await fs.readFile(path.join(projectPath, 'src/db/schema.sql'), 'utf8');
      const seedContent = await fs.readFile(path.join(projectPath, 'src/db/seed.sql'), 'utf8');
      
      // Helper function to split SQL statements
      const splitSqlStatements = (sql) => {
        // Remove comment lines and empty lines first
        const lines = sql.split('\n');
        const cleanLines = lines.filter(line => !line.trim().startsWith('--') && line.trim() !== '');
        const cleanSql = cleanLines.join('\n');
        
        return cleanSql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
      };
      
      // Parse SQL statements
      const schemaStatements = splitSqlStatements(schemaContent);
      const seedStatements = splitSqlStatements(seedContent);
      
      // Create the migration script
      const migrationScript = `import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:./dev.db'
});

// Schema statements
const schemaStatements = ${JSON.stringify(schemaStatements)};
for (const statement of schemaStatements) {
  await db.execute(statement);
}

// Seed statements  
const seedStatements = ${JSON.stringify(seedStatements)};
for (const statement of seedStatements) {
  await db.execute(statement);
}

await db.close();
console.log('Database initialized');
`;
      
      await fs.writeFile(path.join(projectPath, 'temp-init.mjs'), migrationScript);
      await execAsync('bun ./temp-init.mjs', { cwd: projectPath });
      await fs.remove(path.join(projectPath, 'temp-init.mjs'));
      spinner.succeed('Database initialized with tables and seed data');
      
    } catch (error) {
      spinner.warn('Could not auto-install dependencies or initialize database');
      console.log(chalk.yellow('Please run these commands manually:'));
      console.log(chalk.gray(`  cd ${projectName}`));
      console.log(chalk.gray('  bun install'));
      console.log(chalk.gray('  bit2 migrate'));
      console.log();
      return;
    }
    
    console.log(chalk.green('✅ Project created and initialized successfully!'));
    console.log();
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.gray(`  cd ${projectName}`));
    console.log(chalk.gray('  bit2 dev'));
    console.log();
    
  } catch (error) {
    spinner.fail();
    console.error(chalk.red('❌ Failed to create project:'), error.message);
    process.exit(1);
  }
}