import type { APIRoute } from 'astro';
import { getPosts, createPost } from '../../lib/db';

export const GET: APIRoute = async (context) => {
  try {
    const { runtime } = context.locals;
    const posts = await getPosts(runtime);
    return new Response(JSON.stringify(posts), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
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
    const { title, content, user_id } = data;
    
    if (!title || !content || !user_id) {
      return new Response(JSON.stringify({ error: 'Title, content, and user_id are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    const postId = await createPost(title, content, user_id, runtime);
    
    return new Response(JSON.stringify({ id: postId, title, content, user_id }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create post' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};