import type { APIRoute } from 'astro';
import { getRandomQuote } from '../../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const quote = await getRandomQuote(locals.runtime);
    
    if (!quote) {
      return new Response(JSON.stringify({ error: 'No quotes found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify(quote), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch random quote' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};