/**
 * Database Connection - PostgreSQL with Drizzle ORM (Supabase)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// ============================================================================
// Environment Variables
// ============================================================================

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return url;
}

// ============================================================================
// Database Instance
// ============================================================================

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!dbInstance) {
    const databaseUrl = getDatabaseUrl();

    // Create postgres.js client with connection pooling
    sqlClient = postgres(databaseUrl, {
      max: 10, // Maximum connections in pool
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // Timeout for establishing connection
    });

    dbInstance = drizzle(sqlClient, { schema });
  }

  return dbInstance;
}

// ============================================================================
// Initialization
// ============================================================================

export async function initializeDb(): Promise<void> {
  // Initialize connection
  getDb();

  try {
    // Simple query to test connection
    await sqlClient!`SELECT 1`;
    console.log('[DB] PostgreSQL connection established');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to connect to database: ${message}`);
  }
}

// ============================================================================
// Cleanup
// ============================================================================

export async function closeDb(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = null;
    dbInstance = null;
    console.log('[DB] PostgreSQL connection closed');
  }
}

// ============================================================================
// Supabase Client (for auth operations)
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Get Supabase client for public operations (uses anon key)
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }

    supabaseInstance = createClient(url, anonKey);
  }

  return supabaseInstance;
}

/**
 * Get Supabase admin client (uses service role key - bypasses RLS)
 * Use only for server-side operations that need to bypass row-level security
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    supabaseAdminInstance = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminInstance;
}

/**
 * Verify a JWT token from Supabase Auth
 * Returns the user if valid, null if invalid
 */
export async function verifyToken(token: string): Promise<{ id: string; email?: string } | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}
