/**
 * Authentication API Routes
 *
 * Endpoints for user registration, login, and session management
 * Uses Supabase Auth under the hood
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getUser } from '../middleware/auth.js';

// ============================================================================
// Supabase Client
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
// Routes
// ============================================================================

const app = new Hono();

// POST /api/auth/register - Register new user
app.post('/register', async (c) => {
  const body = await c.req.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
      },
    });

    if (error) {
      console.log('[Auth] Registration error:', error.message);
      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      return c.json({ error: 'Registration failed' }, 500);
    }

    // Check if email confirmation is required
    const needsConfirmation = !data.session;

    return c.json({
      message: needsConfirmation
        ? 'Registration successful. Please check your email to confirm your account.'
        : 'Registration successful',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at,
          }
        : null,
      needsConfirmation,
    }, 201);
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// POST /api/auth/login - Login with email/password
app.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('[Auth] Login error:', error.message);
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    if (!data.session || !data.user) {
      return c.json({ error: 'Login failed' }, 500);
    }

    return c.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// POST /api/auth/logout - Logout (invalidate session)
app.post('/logout', requireAuth, async (c) => {
  try {
    const supabase = getSupabase();

    // Get the token from the request to sign out
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];

    if (token) {
      // Sign out will invalidate the token
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('[Auth] Logout error:', error.message);
      }
    }

    return c.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

// POST /api/auth/refresh - Refresh access token
app.post('/refresh', async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body;

  if (!refreshToken) {
    return c.json({ error: 'Refresh token is required' }, 400);
  }

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      console.log('[Auth] Refresh error:', error.message);
      return c.json({ error: 'Invalid or expired refresh token' }, 401);
    }

    if (!data.session || !data.user) {
      return c.json({ error: 'Token refresh failed' }, 500);
    }

    return c.json({
      message: 'Token refreshed',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    });
  } catch (err) {
    console.error('[Auth] Refresh error:', err);
    return c.json({ error: 'Token refresh failed' }, 500);
  }
});

// POST /api/auth/forgot-password - Request password reset
app.post('/forgot-password', async (c) => {
  const body = await c.req.json();
  const { email } = body;

  if (!email) {
    return c.json({ error: 'Email is required' }, 400);
  }

  try {
    const supabase = getSupabase();

    // Get the redirect URL from the request or use default
    const redirectTo = process.env.PASSWORD_RESET_REDIRECT_URL
      || `${c.req.header('Origin') || 'http://localhost:5173'}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.log('[Auth] Password reset error:', error.message);
      // Don't reveal if email exists
    }

    // Always return success to prevent email enumeration
    return c.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('[Auth] Password reset error:', err);
    return c.json({ error: 'Password reset failed' }, 500);
  }
});

// POST /api/auth/reset-password - Reset password with token
app.post('/reset-password', async (c) => {
  const body = await c.req.json();
  const { accessToken, newPassword } = body;

  if (!accessToken || !newPassword) {
    return c.json({ error: 'Access token and new password are required' }, 400);
  }

  if (newPassword.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  try {
    const supabase = getSupabase();

    // Set the session with the recovery token
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '', // Not needed for password reset
    });

    if (sessionError) {
      console.log('[Auth] Set session error:', sessionError.message);
      return c.json({ error: 'Invalid or expired reset token' }, 401);
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.log('[Auth] Password update error:', updateError.message);
      return c.json({ error: updateError.message }, 400);
    }

    return c.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('[Auth] Password reset error:', err);
    return c.json({ error: 'Password reset failed' }, 500);
  }
});

// GET /api/auth/me - Get current user
app.get('/me', requireAuth, async (c) => {
  const user = getUser(c);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  try {
    const supabase = getSupabase();
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];

    if (token) {
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data.user) {
        return c.json({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name,
          createdAt: data.user.created_at,
          emailConfirmedAt: data.user.email_confirmed_at,
        });
      }
    }

    return c.json({
      id: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error('[Auth] Get user error:', err);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

// POST /api/auth/update-password - Update password (authenticated)
app.post('/update-password', requireAuth, async (c) => {
  const body = await c.req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current password and new password are required' }, 400);
  }

  if (newPassword.length < 8) {
    return c.json({ error: 'New password must be at least 8 characters' }, 400);
  }

  try {
    const supabase = getSupabase();
    const user = getUser(c);

    if (!user?.email) {
      return c.json({ error: 'User email not available' }, 400);
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return c.json({ error: updateError.message }, 400);
    }

    return c.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[Auth] Update password error:', err);
    return c.json({ error: 'Failed to update password' }, 500);
  }
});

export default app;
