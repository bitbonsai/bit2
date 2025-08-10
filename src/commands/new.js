import chalk from 'chalk';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateProjectName, formatValidationError } from '../utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function newCommand(projectName) {
  // Validate project name
  const validation = validateProjectName(projectName);
  if (!validation.valid) {
    formatValidationError(validation.error);
    process.exit(1);
  }
  
  console.log(`${chalk.yellow('∴')} Creating new Astro + libSQL project: ${chalk.bold(projectName)}`);
  
  // Check for bun
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    await execAsync('bun --version');
  } catch (error) {
    console.log();
    console.log(chalk.red('❌ Bun is required to create and run bit2 projects'));
    console.log(chalk.yellow('Install with:'), chalk.cyan('curl -fsSL https://bun.sh/install | bash'));
    console.log();
    process.exit(1);
  }
  
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
    
    // Update README.md with project name and bit2 version
    const readmePath = path.join(projectPath, 'README.md');
    let readmeContent = await fs.readFile(readmePath, 'utf8');
    
    // Get bit2 CLI version from package.json
    const bit2PackageJsonPath = path.resolve(__dirname, '../../package.json');
    const bit2PackageJson = await fs.readJson(bit2PackageJsonPath);
    const bit2Version = bit2PackageJson.version;
    
    readmeContent = readmeContent.replace(/PROJECT_NAME/g, projectName);
    readmeContent = readmeContent.replace(/v2\.0\.0/g, `v${bit2Version}`);
    await fs.writeFile(readmePath, readmeContent);
    
    // Update version in Astro pages
    const indexPath = path.join(projectPath, 'src/pages/index.astro');
    const aboutPath = path.join(projectPath, 'src/pages/about.astro');
    
    if (await fs.pathExists(indexPath)) {
      let indexContent = await fs.readFile(indexPath, 'utf8');
      indexContent = indexContent.replace(/v2\.0\.0/g, `v${bit2Version}`);
      indexContent = indexContent.replace(/BIT2_VERSION_PLACEHOLDER/g, bit2Version);
      await fs.writeFile(indexPath, indexContent);
    }
    
    if (await fs.pathExists(aboutPath)) {
      let aboutContent = await fs.readFile(aboutPath, 'utf8');
      aboutContent = aboutContent.replace(/v2\.0\.0/g, `v${bit2Version}`);
      aboutContent = aboutContent.replace(/BIT2_VERSION_PLACEHOLDER/g, bit2Version);
      await fs.writeFile(aboutPath, aboutContent);
    }
    
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
      // This function properly handles semicolons within quoted strings
      const splitSqlStatements = (sql) => {
        const lines = sql.split('\n');
        const cleanLines = lines.filter(line => !line.trim().startsWith('--') && line.trim() !== '');
        const cleanSql = cleanLines.join('\n');
        
        const statements = [];
        let currentStatement = '';
        let inSingleQuotes = false;
        let inDoubleQuotes = false;
        let i = 0;
        
        while (i < cleanSql.length) {
          const char = cleanSql[i];
          
          if (char === "'" && !inDoubleQuotes) {
            // Check for escaped single quotes
            if (i + 1 < cleanSql.length && cleanSql[i + 1] === "'") {
              currentStatement += "''";
              i += 2;
              continue;
            }
            inSingleQuotes = !inSingleQuotes;
          } else if (char === '"' && !inSingleQuotes) {
            inDoubleQuotes = !inDoubleQuotes;
          } else if (char === ';' && !inSingleQuotes && !inDoubleQuotes) {
            // End of statement
            const stmt = currentStatement.trim();
            if (stmt.length > 0) {
              statements.push(stmt);
            }
            currentStatement = '';
            i++;
            continue;
          }
          
          currentStatement += char;
          i++;
        }
        
        // Add the last statement if there is one
        const lastStmt = currentStatement.trim();
        if (lastStmt.length > 0) {
          statements.push(lastStmt);
        }
        
        return statements;
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
    console.log(chalk.bold.green('SUCCESS'), chalk.green('Your project is ready!'));
    console.log();
    console.log(chalk.yellow('✨ MCP-enabled'), chalk.gray('for AI assistants (Cursor, Claude Desktop, Windsurf, etc.)'));
    console.log();
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.gray(`  cd ${projectName}`));
    console.log(chalk.gray('  bit2 dev'));
    console.log();
    console.log(chalk.gray('or check project status:'), chalk.white(`bit2 status`));
    console.log();
    
  } catch (error) {
    spinner.fail();
    console.error(chalk.red('❌ Failed to create project:'), error.message);
    process.exit(1);
  }
}