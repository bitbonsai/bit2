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
    
    // Determine environment strictly by NODE_ENV
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Split SQL into individual statements and clean them
    const splitSqlStatements = (sql) => {
      const lines = sql.split('\n');
      const cleanLines = lines.filter(line => !line.trim().startsWith('--') && line.trim() !== '');
      const cleanSql = cleanLines.join('\n');
      return cleanSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
    };

    if (isProduction) {
      // Production: Run against Turso database using a temp SQL file to avoid shell quoting issues
      spinner.start('Running migrations against Turso database...');
      const packageJson = await fs.readJson('./package.json');
      const projectName = packageJson.name;
      try {
        const statements = splitSqlStatements(schema);
        const sqlBatch = statements.map(s => (s.endsWith(';') ? s : `${s};`)).join('\n');
        await fs.writeFile('./temp-migration.sql', sqlBatch + '\n');
        await execAsync(`turso db shell ${projectName} < ./temp-migration.sql`);
        await fs.remove('./temp-migration.sql');
        spinner.succeed('Migrations completed on Turso database');
      } catch (error) {
        spinner.fail();
        console.error(chalk.red('❌ Failed to run migrations on Turso:'), error.message);
        console.log(chalk.yellow('Make sure you have the Turso CLI installed and are authenticated.'));
        process.exit(1);
      }
    } else {
      // Development: Run against local SQLite file, one statement at a time
      spinner.start('Running migrations against local database...');
      try {
        const statements = splitSqlStatements(schema);
        const migrationScript = `import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:./dev.db' });
const statements = ${JSON.stringify(statements)};

for (const statement of statements) {
  await db.execute(statement);
}

await db.close();
console.log('Migrations completed');
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
      const seedStatements = splitSqlStatements(seedData);
      if (isProduction) {
        const packageJson = await fs.readJson('./package.json');
        const projectName = packageJson.name;
        const sqlBatch = seedStatements.map(s => (s.endsWith(';') ? s : `${s};`)).join('\n');
        await fs.writeFile('./temp-seed.sql', sqlBatch + '\n');
        await execAsync(`turso db shell ${projectName} < ./temp-seed.sql`);
        await fs.remove('./temp-seed.sql');
      } else {
        const seedScript = `import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:./dev.db' });
const statements = ${JSON.stringify(seedStatements)};
for (const s of statements) { await db.execute(s); }
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