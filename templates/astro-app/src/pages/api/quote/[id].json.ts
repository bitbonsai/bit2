import type { APIRoute } from 'astro';
import { getQuote } from '../../../lib/db';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const id = parseInt(params.id || '0');
    
    if (isNaN(id) || id <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid quote ID' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    const quote = await getQuote(locals.runtime, id);
    
    if (!quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
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
    return new Response(JSON.stringify({ error: 'Failed to fetch quote' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};