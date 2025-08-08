import type { APIRoute } from 'astro';
import { getUsers, createUser } from '../../lib/db';

export const GET: APIRoute = async (context) => {
  try {
    const { runtime } = context.locals;
    const users = await getUsers(runtime);
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const { runtime } = context.locals;
    const data = await context.request.json();
    const { name, email } = data;
    
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    const userId = await createUser(name, email, runtime);
    
    return new Response(JSON.stringify({ id: userId, name, email }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create user' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};