import { describe, it, expect } from 'bun:test';

describe('Project Name Validation', () => {
  const validateProjectName = (name) => {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 1 || name.length > 100) return false;
    
    // Allow only lowercase letters, numbers, and hyphens
    // Must start with a letter, cannot end with hyphen
    const validPattern = /^[a-z][a-z0-9-]*[a-z0-9]$/;
    if (name.length === 1) return /^[a-z]$/.test(name);
    return validPattern.test(name);
  };

  it('should accept valid project names', () => {
    expect(validateProjectName('my-project')).toBe(true);
    expect(validateProjectName('test123')).toBe(true);
    expect(validateProjectName('a')).toBe(true);
    expect(validateProjectName('my-awesome-app')).toBe(true);
    expect(validateProjectName('app2024')).toBe(true);
  });

  it('should reject invalid project names', () => {
    expect(validateProjectName('')).toBe(false);
    expect(validateProjectName(null)).toBe(false);
    expect(validateProjectName(undefined)).toBe(false);
    expect(validateProjectName('My Project')).toBe(false); // spaces
    expect(validateProjectName('my_project')).toBe(false); // underscore
    expect(validateProjectName('123project')).toBe(false); // starts with number
    expect(validateProjectName('my-project-')).toBe(false); // ends with hyphen
    expect(validateProjectName('-myproject')).toBe(false); // starts with hyphen
    expect(validateProjectName('my.project')).toBe(false); // contains dot
    expect(validateProjectName('MY-PROJECT')).toBe(false); // uppercase
  });

  it('should enforce length limits', () => {
    const longName = 'a'.repeat(101);
    expect(validateProjectName(longName)).toBe(false);
    
    const maxLengthName = 'a'.repeat(100);
    expect(validateProjectName(maxLengthName)).toBe(true);
  });
});

describe('SQL Statement Splitting', () => {
  const splitSqlStatements = (sql) => {
    const lines = sql.split('\n');
    const cleanLines = lines.filter(line => !line.trim().startsWith('--') && line.trim() !== '');
    const cleanSql = cleanLines.join('\n');
    return cleanSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
  };

  it('should split multiple SQL statements', () => {
    const sql = `
      CREATE TABLE users (id INTEGER);
      CREATE TABLE posts (id INTEGER);
      INSERT INTO users VALUES (1);
    `;
    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(3);
    expect(statements[0]).toBe('CREATE TABLE users (id INTEGER)');
    expect(statements[1]).toBe('CREATE TABLE posts (id INTEGER)');
    expect(statements[2]).toBe('INSERT INTO users VALUES (1)');
  });

  it('should ignore comments', () => {
    const sql = `
      -- This is a comment
      CREATE TABLE users (id INTEGER);
      -- Another comment
      INSERT INTO users VALUES (1);
    `;
    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toBe('CREATE TABLE users (id INTEGER)');
    expect(statements[1]).toBe('INSERT INTO users VALUES (1)');
  });

  it('should handle empty lines', () => {
    const sql = `
      CREATE TABLE users (id INTEGER);
      
      
      INSERT INTO users VALUES (1);
    `;
    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(2);
  });

  it('should handle statements without trailing semicolons', () => {
    const sql = 'CREATE TABLE users (id INTEGER)';
    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(1);
    expect(statements[0]).toBe('CREATE TABLE users (id INTEGER)');
  });
});