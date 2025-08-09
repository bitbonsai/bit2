import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';

const execAsync = promisify(exec);

export async function migrateCommand() {
  console.log(`${chalk.yellow('∴')} Running database migrations...`);
  
  const spinner = ora('Checking for schema file...').start();
  
  try {
    // Check if schema.sql exists
    const schemaPath = './src/db/schema.sql';
    if (!await fs.pathExists(schemaPath)) {
      spinner.fail();
      console.error(chalk.red('❌ No schema.sql file found at ./src/db/schema.sql'));
      process.exit(1);
    }
    
    // Read schema file
    const schema = await fs.readFile(schemaPath, 'utf8');
    spinner.succeed('Schema file found');
    
    // Determine environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.TURSO_DATABASE_URL;
    
    if (isProduction) {
      // Production: Run against Turso database
      spinner.start('Running migrations against Turso database...');
      
      // Get project name for database
      const packageJson = await fs.readJson('./package.json');
      const projectName = packageJson.name;
      
      try {
        await execAsync(`turso db shell ${projectName} "${schema}"`);
        spinner.succeed('Migrations completed on Turso database');
      } catch (error) {
        spinner.fail();
        console.error(chalk.red('❌ Failed to run migrations on Turso:'), error.message);
        console.log(chalk.yellow('Make sure you have the Turso CLI installed and are authenticated.'));
        process.exit(1);
      }
      
    } else {
      // Development: Run against local SQLite file
      spinner.start('Running migrations against local database...');
      
      try {
        // Create a temporary script to run the migration
        const migrationScript = `
import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:./dev.db'
});

const schema = \`${schema.replace(/`/g, '\\`')}\`;
await db.execute(schema);
await db.close();
console.log('Migration completed');
`;
        
        await fs.writeFile('./temp-migration.mjs', migrationScript);
        await execAsync('bun ./temp-migration.mjs');
        await fs.remove('./temp-migration.mjs');
        
        spinner.succeed('Migrations completed on local database (dev.db)');
      } catch (error) {
        spinner.fail();
        console.error(chalk.red('❌ Failed to run migrations on local database:'), error.message);
        process.exit(1);
      }
    }
    
    // Run seed data if exists
    const seedPath = './src/db/seed.sql';
    if (await fs.pathExists(seedPath)) {
      spinner.start('Running seed data...');
      
      const seedData = await fs.readFile(seedPath, 'utf8');
      
      if (isProduction) {
        const packageJson = await fs.readJson('./package.json');
        const projectName = packageJson.name;
        await execAsync(`turso db shell ${projectName} "${seedData}"`);
      } else {
        // Create a temporary script to run the seed data
        const seedScript = `
import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:./dev.db'
});

const seedData = \`${seedData.replace(/`/g, '\\`')}\`;
await db.execute(seedData);
await db.close();
console.log('Seed data applied');
`;
        
        await fs.writeFile('./temp-seed.mjs', seedScript);
        await execAsync('bun ./temp-seed.mjs');
        await fs.remove('./temp-seed.mjs');
      }
      
      spinner.succeed('Seed data applied');
    }
    
    console.log(chalk.green('✅ Database migrations completed successfully!'));
    
  } catch (error) {
    spinner.fail();
    console.error(chalk.red('❌ Migration failed:'), error.message);
    process.exit(1);
  }
}