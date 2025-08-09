import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

describe('Command Prerequisites', () => {
  it('should check for required tools', async () => {
    const checkTool = async (command, args = []) => {
      try {
        await execAsync(`${command} ${args.join(' ')}`);
        return true;
      } catch {
        return false;
      }
    };

    // These should exist in test environment
    const hasBun = await checkTool('bun', ['--version']);
    expect(hasBun).toBe(true);
    
    // Check command existence (may or may not be installed)
    const hasGit = await checkTool('git', ['--version']);
    expect(typeof hasGit).toBe('boolean');
  });
});

describe('Package.json Validation', () => {
  it('should validate required package.json fields', () => {
    const validatePackageJson = (pkg) => {
      const errors = [];
      
      if (!pkg.name) errors.push('Missing name field');
      if (!pkg.version) errors.push('Missing version field');
      if (!pkg.dependencies) errors.push('Missing dependencies');
      
      const requiredDeps = ['astro', '@astrojs/vercel', '@libsql/client'];
      if (pkg.dependencies) {
        requiredDeps.forEach(dep => {
          if (!pkg.dependencies[dep]) {
            errors.push(`Missing dependency: ${dep}`);
          }
        });
      }
      
      return errors;
    };

    const validPkg = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'astro': 'latest',
        '@astrojs/vercel': 'latest',
        '@libsql/client': 'latest'
      }
    };
    
    expect(validatePackageJson(validPkg)).toEqual([]);
    
    const invalidPkg = {
      version: '1.0.0',
      dependencies: {
        'astro': 'latest'
      }
    };
    
    const errors = validatePackageJson(invalidPkg);
    expect(errors).toContain('Missing name field');
    expect(errors).toContain('Missing dependency: @astrojs/vercel');
    expect(errors).toContain('Missing dependency: @libsql/client');
  });
});

describe('Error Handling', () => {
  it('should create errors with recovery steps', () => {
    class DeploymentError extends Error {
      constructor(message, recoverySteps = []) {
        super(message);
        this.name = 'DeploymentError';
        this.recoverySteps = recoverySteps;
      }
    }

    const error = new DeploymentError('Turso authentication failed', [
      'Run: turso auth signup',
      'Check your network connection'
    ]);

    expect(error.message).toBe('Turso authentication failed');
    expect(error.recoverySteps).toHaveLength(2);
    expect(error.recoverySteps[0]).toBe('Run: turso auth signup');
  });

  it('should handle async errors properly', async () => {
    const riskyOperation = async () => {
      throw new Error('Operation failed');
    };

    const safeOperation = async () => {
      try {
        await riskyOperation();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };

    const result = await safeOperation();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Operation failed');
  });
});

describe('Git Operations', () => {
  it('should parse GitHub URLs correctly', () => {
    const parseGitHubUrl = (url) => {
      const patterns = [
        /github\.com[:/]([^/]+)\/([^.]+)(?:\.git)?$/,
        /git@github\.com:([^/]+)\/([^.]+)(?:\.git)?$/,
        /https:\/\/github\.com\/([^/]+)\/([^.]+?)(?:\.git)?$/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return {
            owner: match[1],
            repo: match[2]
          };
        }
      }
      return null;
    };

    expect(parseGitHubUrl('git@github.com:user/repo.git')).toEqual({
      owner: 'user',
      repo: 'repo'
    });
    
    expect(parseGitHubUrl('https://github.com/user/repo.git')).toEqual({
      owner: 'user',
      repo: 'repo'
    });
    
    expect(parseGitHubUrl('https://github.com/user/repo')).toEqual({
      owner: 'user',
      repo: 'repo'
    });
    
    expect(parseGitHubUrl('invalid-url')).toBe(null);
  });
});

describe('Database URL Handling', () => {
  it('should construct database URLs correctly', () => {
    const buildDatabaseUrl = (type, params) => {
      if (type === 'local') {
        return `file:${params.path}`;
      } else if (type === 'turso') {
        return `libsql://${params.database}-${params.organization}.turso.io`;
      }
      return null;
    };

    expect(buildDatabaseUrl('local', { path: './dev.db' })).toBe('file:./dev.db');
    
    expect(buildDatabaseUrl('turso', { 
      database: 'my-db',
      organization: 'my-org'
    })).toBe('libsql://my-db-my-org.turso.io');
    
    expect(buildDatabaseUrl('unknown', {})).toBe(null);
  });
});