import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE = '/api';

export function TrelloCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      // Get token from URL fragment
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get('token');
      const state = searchParams.get('state');

      if (!token) {
        setStatus('error');
        setError('No token received from Trello');
        return;
      }

      if (!state) {
        setStatus('error');
        setError('Invalid callback state');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/integrations/trello/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, state }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save Trello connection');
        }

        // Get projectId from state (we need to decode it from backend response)
        await response.json();
        setStatus('success');

        // Redirect back to project after short delay
        setTimeout(() => {
          // Navigate to projects page since we don't have projectId readily available
          navigate('/projects');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
            Trello Connection
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Connecting to Trello...'}
            {status === 'success' && 'Successfully connected!'}
            {status === 'error' && 'Connection failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <p className="text-muted-foreground">
              Saving your Trello authorization...
            </p>
          )}
          {status === 'success' && (
            <p className="text-muted-foreground">
              Redirecting to your projects...
            </p>
          )}
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-red-500">{error}</p>
              <Button onClick={() => navigate('/projects')}>
                Back to Projects
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
