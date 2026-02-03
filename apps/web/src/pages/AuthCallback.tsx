/**
 * Auth Callback Page
 *
 * Handles OAuth redirects from providers like Google and GitHub
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase handles the OAuth callback automatically via the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session) {
          // Successfully authenticated, redirect to home
          navigate('/', { replace: true });
        } else {
          // No session, something went wrong
          setError('Authentication failed. Please try again.');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-destructive flex items-center justify-center">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Authentication Failed</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="text-primary hover:underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
