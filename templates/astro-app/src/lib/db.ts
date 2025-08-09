import { getDatabase } from '../db/client.js';

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  user_id: number;
  created_at: string;
}

// Simplified functions - no runtime parameters needed for Vercel
export async function getUsers(): Promise<User[]> {
  const db = getDatabase();
  const result = await db.execute('SELECT * FROM users ORDER BY created_at DESC');
  return result.rows as User[];
}

export async function getUser(id: number): Promise<User | null> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id]
  });
  return result.rows.length > 0 ? result.rows[0] as User : null;
}

export async function createUser(name: string, email: string): Promise<number> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?) RETURNING id',
    args: [name, email]
  });
  return result.lastInsertRowid as number;
}

export async function getPosts(): Promise<(Post & { user_name: string })[]> {
  const db = getDatabase();
  const result = await db.execute(`
    SELECT p.*, u.name as user_name 
    FROM posts p 
    JOIN users u ON p.user_id = u.id 
    ORDER BY p.created_at DESC
  `);
  return result.rows as (Post & { user_name: string })[];
}

export async function createPost(title: string, content: string, userId: number): Promise<number> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?) RETURNING id',
    args: [title, content, userId]
  });
  return result.lastInsertRowid as number;
}