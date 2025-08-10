import { getDatabase } from '../db/client.js';

// Quote interface for Stoic wisdom
export interface Quote {
  id: number;
  quote: string;
  author: string;
  source?: string;
  category?: string;
  notes?: string;
  created_at: string;
}

/**
 * Get all quotes with optional category filtering
 * @param runtime - Runtime context for Cloudflare Workers
 * @param category - Optional category to filter by (mindfulness, control, change, etc.)
 * @returns Array of quotes
 */
export async function getQuotes(runtime?: any, category?: string): Promise<Quote[]> {
  const db = getDatabase(runtime);
  
  if (category) {
    const result = await db.execute({
      sql: 'SELECT * FROM quotes WHERE category = ? ORDER BY created_at DESC',
      args: [category]
    });
    return result.rows as Quote[];
  }
  
  const result = await db.execute('SELECT * FROM quotes ORDER BY created_at DESC');
  return result.rows as Quote[];
}

/**
 * Get a random quote from the database
 * Perfect for daily inspiration or featured quotes
 * @param runtime - Runtime context for Cloudflare Workers
 * @returns A single random quote or null if no quotes exist
 */
export async function getRandomQuote(runtime?: any): Promise<Quote | null> {
  const db = getDatabase(runtime);
  const result = await db.execute('SELECT * FROM quotes ORDER BY RANDOM() LIMIT 1');
  return result.rows.length > 0 ? result.rows[0] as Quote : null;
}

/**
 * Search quotes by text in quote, author, or notes
 * @param runtime - Runtime context for Cloudflare Workers
 * @param searchTerm - The term to search for
 * @returns Array of matching quotes
 */
export async function searchQuotes(runtime?: any, searchTerm: string): Promise<Quote[]> {
  const db = getDatabase(runtime);
  const result = await db.execute({
    sql: `SELECT * FROM quotes 
          WHERE quote LIKE ? OR author LIKE ? OR notes LIKE ? OR source LIKE ?
          ORDER BY created_at DESC`,
    args: [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
  });
  return result.rows as Quote[];
}

/**
 * Get a specific quote by ID
 * @param runtime - Runtime context for Cloudflare Workers
 * @param id - The quote ID
 * @returns The quote or null if not found
 */
export async function getQuote(runtime?: any, id: number): Promise<Quote | null> {
  const db = getDatabase(runtime);
  const result = await db.execute({
    sql: 'SELECT * FROM quotes WHERE id = ?',
    args: [id]
  });
  return result.rows.length > 0 ? result.rows[0] as Quote : null;
}

/**
 * Get quotes by a specific author
 * @param runtime - Runtime context for Cloudflare Workers
 * @param author - The author name
 * @returns Array of quotes by that author
 */
export async function getQuotesByAuthor(runtime?: any, author: string): Promise<Quote[]> {
  const db = getDatabase(runtime);
  const result = await db.execute({
    sql: 'SELECT * FROM quotes WHERE author = ? ORDER BY created_at DESC',
    args: [author]
  });
  return result.rows as Quote[];
}

/**
 * Get all unique categories
 * @param runtime - Runtime context for Cloudflare Workers
 * @returns Array of category names
 */
export async function getCategories(runtime?: any): Promise<string[]> {
  const db = getDatabase(runtime);
  const result = await db.execute('SELECT DISTINCT category FROM quotes WHERE category IS NOT NULL ORDER BY category');
  return result.rows.map(row => row.category as string);
}

/**
 * Get all unique authors
 * @param runtime - Runtime context for Cloudflare Workers
 * @returns Array of author names
 */
export async function getAuthors(runtime?: any): Promise<string[]> {
  const db = getDatabase(runtime);
  const result = await db.execute('SELECT DISTINCT author FROM quotes ORDER BY author');
  return result.rows.map(row => row.author as string);
}