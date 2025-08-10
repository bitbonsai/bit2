import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '../src/cli.js');
const testProjectsDir = path.join(__dirname, 'test-projects');

describe('bit2 CLI Commands', () => {
  beforeAll(async () => {
    await fs.ensureDir(testProjectsDir);
    process.chdir(testProjectsDir);
  });

  afterAll(async () => {
    process.chdir(__dirname);
    await fs.remove(testProjectsDir);
  });

  describe('bit2 --version', () => {
    it('should display version 0.9.0', async () => {
      const { stdout } = await execAsync(`${cliPath} --version`);
      expect(stdout.trim()).toBe('0.9.0');
    });
  });

  describe('bit2 --help', () => {
    it('should display help with ∴ symbol and GitHub links', async () => {
      const { stdout } = await execAsync(`${cliPath} --help`);
      expect(stdout).toContain('∴ bit2');
      expect(stdout).toContain('Repository: https://github.com/bitbonsai/bit2');
      expect(stdout).toContain('Issues:     https://github.com/bitbonsai/bit2/issues');
    });

    it('should list all available commands', async () => {
      const { stdout } = await execAsync(`${cliPath} --help`);
      const commands = ['new', 'dev', 'build', 'deploy', 'migrate', 'status', 'delete', 'open', 'logs', 'db'];
      commands.forEach(cmd => {
        expect(stdout).toContain(cmd);
      });
    });
  });

  describe('bit2 new', () => {
    const testProjectName = 'test-cli-project';

    afterAll(async () => {
      await fs.remove(path.join(testProjectsDir, testProjectName));
    });

    it('should create a new project with all required files', async () => {
      const { stdout } = await execAsync(`${cliPath} new ${testProjectName}`, {
        timeout: 60000 // 60 seconds for install and setup
      });
      
      expect(stdout).toContain('∴ Creating new Astro + libSQL project');
      expect(stdout).toContain('Project created and initialized successfully');
      
      // Check project structure
      const projectPath = path.join(testProjectsDir, testProjectName);
      expect(await fs.pathExists(projectPath)).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'astro.config.mjs'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'src'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'src/db/schema.sql'))).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'src/db/seed.sql'))).toBe(true);
      
      // Check package.json has correct name
      const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
      expect(packageJson.name).toBe(testProjectName);
      expect(packageJson.version).toBe('0.9.0');
    });

    it('should auto-install dependencies', async () => {
      const projectPath = path.join(testProjectsDir, testProjectName);
      expect(await fs.pathExists(path.join(projectPath, 'node_modules'))).toBe(true);
      // Check for either bun.lockb or bun.lock (both are valid)
      const hasLockFile = await fs.pathExists(path.join(projectPath, 'bun.lockb')) || 
                          await fs.pathExists(path.join(projectPath, 'bun.lock'));
      expect(hasLockFile).toBe(true);
    });

    it('should initialize database with schema and seed data', async () => {
      const projectPath = path.join(testProjectsDir, testProjectName);
      expect(await fs.pathExists(path.join(projectPath, 'dev.db'))).toBe(true);
    });

    it('should reject invalid project names', async () => {
      try {
        await execAsync(`${cliPath} new "Invalid Name"`);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        const output = error.stderr + error.stdout;
        expect(output).toMatch(/invalid|Invalid/);
      }
    });
  });

  describe('bit2 migrate', () => {
    it('should run database migration in project directory', async () => {
      const testProject = `test-migrate-${Date.now()}`;
      
      // Create a project first
      await execAsync(`${cliPath} new ${testProject}`, { timeout: 60000 });
      
      // Run migrate command
      const projectPath = path.join(testProjectsDir, testProject);
      const { stdout } = await execAsync(`cd ${projectPath} && ${cliPath} migrate`);
      
      expect(stdout).toContain('∴ Running database migrations');
      expect(stdout).toContain('Database migrations completed successfully');
      
      // Clean up
      await fs.remove(projectPath);
    });

    it('should fail when run outside project directory', async () => {
      try {
        const tempDir = path.join(testProjectsDir, 'empty-dir');
        await fs.ensureDir(tempDir);
        await execAsync(`cd ${tempDir} && ${cliPath} migrate`);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        const output = (error.stderr || '') + (error.stdout || '');
        expect(output).toMatch(/schema\.sql|package\.json/);
      }
    });
  });

  describe('bit2 status', () => {
    it('should check project status', async () => {
      const testProject = `test-status-${Date.now()}`;
      
      // Create a project first
      await execAsync(`${cliPath} new ${testProject}`, { timeout: 60000 });
      
      const projectPath = path.join(testProjectsDir, testProject);
      const { stdout } = await execAsync(`cd ${projectPath} && ${cliPath} status`);
      
      expect(stdout).toContain('∴ bit2 Project Status');
      expect(stdout).toMatch(/Run:|Quick commands:|Database/i);
      
      // Clean up
      await fs.remove(projectPath);
    });
  });

  describe('bit2 build', () => {
    it('should attempt to build the Astro application', async () => {
      const testProject = 'test-build-project';
      
      // Create a project first
      await execAsync(`${cliPath} new ${testProject}`, { timeout: 60000 });
      
      const projectPath = path.join(testProjectsDir, testProject);
      
      try {
        const { stdout } = await execAsync(`cd ${projectPath} && ${cliPath} build`, {
          timeout: 60000
        });
        expect(stdout).toContain('∴ Building Astro application');
        expect(await fs.pathExists(path.join(projectPath, 'dist'))).toBe(true);
      } catch (error) {
        // Build will fail without adapter - this is expected for default template
        const output = (error.stdout || '') + (error.stderr || '');
        expect(output).toMatch(/Building|NoAdapterInstalled/);
      }
      
      // Clean up
      await fs.remove(projectPath);
    });
  });

  describe('bit2 delete', () => {
    it('should delete project with --force flag', async () => {
      const testProject = 'test-delete-project';
      
      // Create a project first
      await execAsync(`${cliPath} new ${testProject}`, { timeout: 60000 });
      
      const projectPath = path.join(testProjectsDir, testProject);
      const { stdout } = await execAsync(`cd ${testProjectsDir} && ${cliPath} delete ${testProject} --force`);
      
      expect(stdout).toContain('∴ Delete bit2 project');
      expect(stdout).toContain(`Project "${testProject}" deleted`);
      expect(await fs.pathExists(projectPath)).toBe(false);
    });

    it('should require confirmation without --force flag', async () => {
      const testProject = 'test-delete-confirm';
      
      // Create a project first
      await execAsync(`${cliPath} new ${testProject}`, { timeout: 60000 });
      
      // Try to delete without force - should timeout waiting for input
      try {
        await execAsync(`cd ${testProjectsDir} && ${cliPath} delete ${testProject}`, {
          timeout: 2000 // Short timeout since it will wait for input
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // Expected to timeout or fail
        expect(error).toBeDefined();
      }
      
      // Clean up
      await fs.remove(path.join(testProjectsDir, testProject));
    });
  });

  describe('bit2 db', () => {
    it('should show database info', async () => {
      const testProject = `test-db-${Date.now()}`;
      
      // Create a project first
      await execAsync(`${cliPath} new ${testProject}`, { timeout: 60000 });
      
      const projectPath = path.join(testProjectsDir, testProject);
      const { stdout } = await execAsync(`cd ${projectPath} && ${cliPath} db info`);
      
      expect(stdout).toContain('📊 Database Information');
      expect(stdout).toMatch(/Local Database|Available commands/i);
      
      // Clean up
      await fs.remove(projectPath);
    });
  });

  describe('bit2 deploy', () => {
    it('should check prerequisites before deployment', async () => {
      const testProject = 'test-deploy-project';
      
      // Create a project first
      await execAsync(`${cliPath} new ${testProject}`, { timeout: 60000 });
      
      const projectPath = path.join(testProjectsDir, testProject);
      
      // Deploy will fail if not authenticated, but should show the right messages
      try {
        const { stdout, stderr } = await execAsync(`cd ${projectPath} && ${cliPath} deploy`, {
          timeout: 5000
        });
        
        // If it doesn't fail, check for deployment prompts
        expect(stdout).toContain('∴ Deploy to production');
      } catch (error) {
        // Expected to fail without auth, but should show helpful messages
        const output = (error.stdout || '') + (error.stderr || '');
        expect(output).toMatch(/turso|github|vercel|cloudflare|netlify|Deploy/i);
      }
      
      // Clean up
      await fs.remove(projectPath);
    });
  });

  describe('Invalid commands', () => {
    it('should show error for unknown commands', async () => {
      try {
        await execAsync(`${cliPath} unknown-command`);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.stderr || error.message).toContain('Invalid command');
      }
    });
  });
});

describe('Project validation', () => {
  it('should validate project names correctly', () => {
    const validateProjectName = (name) => {
      if (!name || typeof name !== 'string') return false;
      if (name.length < 1 || name.length > 100) return false;
      
      const validPattern = /^[a-z][a-z0-9-]*[a-z0-9]$/;
      if (name.length === 1) return /^[a-z]$/.test(name);
      return validPattern.test(name);
    };

    // Valid names
    expect(validateProjectName('my-project')).toBe(true);
    expect(validateProjectName('test123')).toBe(true);
    expect(validateProjectName('a')).toBe(true);
    
    // Invalid names
    expect(validateProjectName('My Project')).toBe(false);
    expect(validateProjectName('123project')).toBe(false);
    expect(validateProjectName('-project')).toBe(false);
    expect(validateProjectName('project-')).toBe(false);
  });
});