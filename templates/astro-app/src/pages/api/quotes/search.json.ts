import type { APIRoute } from 'astro';
import { searchQuotes } from '../../../lib/db';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const searchTerm = url.searchParams.get('q');
    
    if (!searchTerm) {
      return new Response(JSON.stringify({ error: 'Search term is required. Use ?q=your-search' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    const quotes = await searchQuotes(locals.runtime, searchTerm);
    
    return new Response(JSON.stringify({
      query: searchTerm,
      count: quotes.length,
      results: quotes
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to search quotes' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};