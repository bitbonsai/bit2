import type { APIRoute } from 'astro';
import { getQuotes } from '../../lib/db';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Get category from query params if provided
    const category = url.searchParams.get('category');
    const quotes = await getQuotes(locals.runtime, category || undefined);
    
    return new Response(JSON.stringify(quotes), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch quotes' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};