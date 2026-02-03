/**
 * Authentication Middleware for Hono
 *
 * Verifies Supabase JWT tokens and extracts user information
 */

import { Context, Next } from 'hono';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string;
  email?: string;
}

// Extend Hono's context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

// ============================================================================
// Supabase Client (lazy initialization)
// ============================================================================

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }

    supabaseClient = createClient(url, anonKey);
  }
  return supabaseClient;
}

// ============================================================================
// Auth Middleware
// ============================================================================

/**
 * Middleware that requires authentication
 * Extracts user from JWT token in Authorization header
 */
export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Authorization header required' }, 401);
  }

  // Expect format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return c.json({ error: 'Invalid authorization format. Use: Bearer <token>' }, 401);
  }

  const token = parts[1];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.log('[Auth] Token verification failed:', error?.message || 'No user');
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Set user in context
    c.set('user', {
      id: data.user.id,
      email: data.user.email,
    });

    return next();
  } catch (err) {
    console.error('[Auth] Error verifying token:', err);
    return c.json({ error: 'Authentication failed' }, 500);
  }
}

/**
 * Middleware that optionally extracts user if token is present
 * Does not require authentication, but sets user if valid token exists
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.getUser(token);

        if (!error && data.user) {
          c.set('user', {
            id: data.user.id,
            email: data.user.email,
          });
        }
      } catch {
        // Ignore auth errors for optional auth
      }
    }
  }

  await next();
}

/**
 * Get the current authenticated user from context
 * Returns null if not authenticated
 */
export function getUser(c: Context): AuthUser | null {
  try {
    return c.get('user') || null;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user from context
 * Throws if not authenticated (use after requireAuth middleware)
 */
export function requireUser(c: Context): AuthUser {
  const user = getUser(c);
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}
