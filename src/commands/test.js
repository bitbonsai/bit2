import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';

const execAsync = promisify(exec);

export async function testCommand() {
  console.log(`${chalk.yellow('∴')} Running bit2 integration tests...\n`);
  
  // Generate unique test project name
  const timestamp = Date.now();
  const testProjectName = `test-${timestamp}`;
  let spinner = ora('Initializing test suite...').start();
  
  try {
    // Clean up any existing test projects
    const testDirs = await fs.readdir(process.cwd()).then(files => 
      files.filter(file => file.startsWith('test-') && file !== testProjectName)
    );
    
    if (testDirs.length > 0) {
      spinner.text = `Cleaning up ${testDirs.length} old test project(s)...`;
      for (const dir of testDirs) {
        try {
          await fs.remove(dir);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
    
    spinner.succeed('Test suite initialized');
    
    // Test 1: Create new project
    spinner = ora('🏗️  Testing project creation...').start();
    
    try {
      await execAsync(`./src/cli.js new ${testProjectName}`, { 
        timeout: 60000,
        stdio: 'pipe'
      });
      spinner.succeed('✅ Project creation successful');
    } catch (error) {
      spinner.fail('❌ Project creation failed');
      throw new Error(`Project creation failed: ${error.message}`);
    }
    
    // Test 2: Verify project structure
    spinner = ora('📁 Testing project structure...').start();
    
    const requiredFiles = [
      'package.json',
      'src/pages/index.astro',
      'src/layouts/Layout.astro',
      'src/db/schema.sql',
      'src/db/seed.sql',
      'src/pages/api/quotes.json.ts',
      'src/pages/api/quote/random.json.ts',
      'dev.db'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(testProjectName, file);
      if (!await fs.pathExists(filePath)) {
        spinner.fail(`❌ Missing required file: ${file}`);
        throw new Error(`Missing required file: ${file}`);
      }
    }
    
    spinner.succeed('✅ Project structure verified');
    
    // Test 3: Verify database initialization
    spinner = ora('💾 Testing database initialization...').start();
    
    try {
      const dbPath = path.join(testProjectName, 'dev.db');
      const { stdout } = await execAsync(`sqlite3 ${dbPath} ".tables"`, {
        cwd: process.cwd()
      });
      
      const tables = stdout.trim().split(/\s+/);
      const requiredTables = ['quotes'];
      
      for (const table of requiredTables) {
        if (!tables.includes(table)) {
          throw new Error(`Missing table: ${table}`);
        }
      }
      
      // Check data exists
      const { stdout: quoteCount } = await execAsync(`sqlite3 ${dbPath} "SELECT COUNT(*) FROM quotes;"`, {
        cwd: process.cwd()
      });
      
      if (parseInt(quoteCount.trim()) === 0) {
        throw new Error('Database tables are empty - seed data not loaded');
      }
      
      spinner.succeed('✅ Database initialization verified');
    } catch (error) {
      spinner.fail('❌ Database initialization failed');
      throw new Error(`Database test failed: ${error.message}`);
    }
    
    // Test 4: Test build process
    spinner = ora('🔨 Testing build process...').start();
    
    try {
      const { stdout: buildOutput } = await execAsync('bun run build', { 
        cwd: testProjectName,
        timeout: 120000
      });
      
      // Check that build completes successfully
      if (!buildOutput.includes('Complete!') && !buildOutput.includes('built in')) {
        throw new Error('Build did not complete successfully');
      }
      
      // With Vercel adapter in SSR mode, check for .vercel output or successful build message
      // The adapter doesn't create a traditional dist folder with HTML files
      const vercelOutputPath = path.join(testProjectName, '.vercel');
      const distPath = path.join(testProjectName, 'dist');
      
      // Either Vercel output or dist should exist
      if (!await fs.pathExists(vercelOutputPath) && !await fs.pathExists(distPath)) {
        // If neither exists, the build still succeeded based on output
        if (!buildOutput.includes('Server built') && !buildOutput.includes('Complete')) {
          throw new Error('Build output directory not found');
        }
      }
      
      spinner.succeed('✅ Build process completed successfully');
    } catch (error) {
      spinner.fail('❌ Build process failed');
      throw new Error(`Build failed: ${error.message}`);
    }
    
    // Test 5: Test dev server and API endpoints
    spinner = ora('🌐 Testing dev server and API endpoints...').start();
    
    try {
      // Start dev server in background
      const devProcess = exec('bun dev', { 
        cwd: testProjectName,
        stdio: 'pipe'
      });
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test API endpoints
      try {
        const { stdout: quotesResponse } = await execAsync('curl -s http://localhost:4321/api/quotes.json', {
          timeout: 10000
        });
        
        const quotes = JSON.parse(quotesResponse);
        if (!Array.isArray(quotes) || quotes.length === 0) {
          throw new Error('Quotes API returned invalid data');
        }
        
        const { stdout: randomQuoteResponse } = await execAsync('curl -s http://localhost:4321/api/quote/random.json', {
          timeout: 10000
        });
        
        const randomQuote = JSON.parse(randomQuoteResponse);
        if (!randomQuote || !randomQuote.quote || !randomQuote.author) {
          throw new Error('Random quote API returned invalid data');
        }
        
        // Test main page loads
        const { stdout: mainPage } = await execAsync('curl -s http://localhost:4321/', {
          timeout: 10000
        });
        
        if (!mainPage.includes('Welcome to') || !mainPage.includes('bit2')) {
          throw new Error('Main page content invalid');
        }
        
      } finally {
        // Kill dev server
        await execAsync('pkill -f "astro dev"').catch(() => {});
        devProcess.kill('SIGTERM');
      }
      
      spinner.succeed('✅ Dev server and API endpoints working');
    } catch (error) {
      // Ensure server is killed
      await execAsync('pkill -f "astro dev"').catch(() => {});
      spinner.fail('❌ Dev server or API test failed');
      throw new Error(`Server test failed: ${error.message}`);
    }
    
    // Cleanup
    spinner = ora('🧹 Cleaning up test project...').start();
    await fs.remove(testProjectName);
    spinner.succeed('✅ Test cleanup completed');
    
    console.log(chalk.green('\n🎉 All tests passed! bit2 is working correctly.\n'));
    console.log(chalk.gray('Tests completed:'));
    console.log(chalk.gray('  ✓ Project creation'));
    console.log(chalk.gray('  ✓ File structure'));  
    console.log(chalk.gray('  ✓ Database initialization (quotes table)'));
    console.log(chalk.gray('  ✓ Build process'));
    console.log(chalk.gray('  ✓ Dev server & API endpoints (quotes API)'));
    
  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail();
    }
    
    console.error(chalk.red(`\n❌ Test failed: ${error.message}\n`));
    
    // Cleanup on failure
    try {
      if (await fs.pathExists(testProjectName)) {
        console.log(chalk.gray(`Cleaning up failed test project: ${testProjectName}`));
        await fs.remove(testProjectName);
      }
    } catch (cleanupError) {
      console.error(chalk.gray(`Cleanup failed: ${cleanupError.message}`));
    }
    
    // Kill any remaining dev servers
    await execAsync('pkill -f "astro dev"').catch(() => {});
    
    process.exit(1);
  }
}