import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('File Operations', () => {
  const testDir = path.join(__dirname, 'test-temp');
  
  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });
  
  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should copy template files correctly', async () => {
    const srcFile = path.join(testDir, 'source.txt');
    const destFile = path.join(testDir, 'dest.txt');
    
    await fs.writeFile(srcFile, 'test content');
    await fs.copy(srcFile, destFile);
    
    const content = await fs.readFile(destFile, 'utf8');
    expect(content).toBe('test content');
  });

  it('should update JSON files correctly', async () => {
    const jsonFile = path.join(testDir, 'test.json');
    const data = { name: 'original', version: '1.0.0' };
    
    await fs.writeJson(jsonFile, data, { spaces: 2 });
    
    const readData = await fs.readJson(jsonFile);
    readData.name = 'updated';
    await fs.writeJson(jsonFile, readData, { spaces: 2 });
    
    const finalData = await fs.readJson(jsonFile);
    expect(finalData.name).toBe('updated');
    expect(finalData.version).toBe('1.0.0');
  });

  it('should check file existence correctly', async () => {
    const filePath = path.join(testDir, 'exists.txt');
    
    expect(await fs.pathExists(filePath)).toBe(false);
    
    await fs.writeFile(filePath, 'content');
    expect(await fs.pathExists(filePath)).toBe(true);
  });
});

describe('Environment Detection', () => {
  it('should detect production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    
    process.env.NODE_ENV = 'production';
    const isProduction = process.env.NODE_ENV === 'production';
    expect(isProduction).toBe(true);
    
    process.env.NODE_ENV = 'development';
    const isDevelopment = process.env.NODE_ENV === 'production';
    expect(isDevelopment).toBe(false);
    
    process.env.NODE_ENV = originalEnv;
  });
});

describe('Command Utilities', () => {
  it('should format error messages with recovery steps', () => {
    const formatError = (message, recoverySteps = []) => {
      let output = `Error: ${message}`;
      if (recoverySteps.length > 0) {
        output += '\nRecovery steps:';
        recoverySteps.forEach(step => {
          output += `\n  • ${step}`;
        });
      }
      return output;
    };

    const error1 = formatError('Database connection failed');
    expect(error1).toBe('Error: Database connection failed');

    const error2 = formatError('Authentication required', [
      'Run: turso auth login',
      'Check your credentials'
    ]);
    expect(error2).toContain('Recovery steps:');
    expect(error2).toContain('Run: turso auth login');
    expect(error2).toContain('Check your credentials');
  });

  it('should parse version strings correctly', () => {
    const parseVersion = (versionString) => {
      const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);
      if (!match) return null;
      return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3])
      };
    };

    expect(parseVersion('0.9.0')).toEqual({ major: 0, minor: 9, patch: 0 });
    expect(parseVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion('invalid')).toBe(null);
  });
});