import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sessionsApi, eventsApi, type SessionEvent, type Finding } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import {
  ArrowLeft,
  Play,
  XCircle,
  ExternalLink,
  MousePointer,
  Type,
  ScrollText,
  Clock,
  Navigation,
  ArrowLeftCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Eye,
  Brain,
  ImageIcon,
  X,
} from 'lucide-react';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionsApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.state.status;
      return status === 'running' ? 2000 : false;
    },
  });

  const isRunning = session?.state.status === 'running';

  const { data: events = [] } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.list(id!),
    enabled: !!id,
    // Refetch events periodically when session is running
    refetchInterval: isRunning ? 3000 : false,
  });

  const { data: findings = [] } = useQuery({
    queryKey: ['findings', id],
    queryFn: () => eventsApi.findings(id!),
    enabled: !!id,
    // Refetch findings periodically when session is running
    refetchInterval: isRunning ? 3000 : false,
  });

  const startMutation = useMutation({
    mutationFn: sessionsApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: sessionsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
  });

  // SSE for real-time updates - just invalidate queries to trigger refetch
  useEffect(() => {
    if (!id || session?.state.status !== 'running') return;

    const eventSource = eventsApi.stream(id);

    eventSource.addEventListener('update', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'action' || data.type === 'finding') {
          // Invalidate queries to refetch fresh data from DB
          queryClient.invalidateQueries({ queryKey: ['events', id] });
          queryClient.invalidateQueries({ queryKey: ['findings', id] });
          queryClient.invalidateQueries({ queryKey: ['session', id] });
        } else if (data.type === 'complete') {
          // Session completed - refetch all data
          queryClient.invalidateQueries({ queryKey: ['session', id] });
          queryClient.invalidateQueries({ queryKey: ['events', id] });
          queryClient.invalidateQueries({ queryKey: ['findings', id] });
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id, session?.state.status, queryClient]);

  // Use events directly from DB (no more liveEvents mixing)
  const allEvents = events;

  if (sessionLoading || !session) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/sessions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {session.targetUrl}
              <a
                href={session.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </h1>
            <p className="text-muted-foreground">
              Created {formatDate(session.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={session.state.status} />
          {session.state.status === 'pending' && (
            <Button onClick={() => startMutation.mutate(session.id)} disabled={startMutation.isPending}>
              <Play className="mr-1 h-4 w-4" />
              Start Session
            </Button>
          )}
          {session.state.status === 'running' && (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate(session.id)}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Progress Card (when running) */}
      {session.state.status === 'running' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Session in Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {session.state.actionCount} actions • {Math.round((session.state.progress || 0) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(session.state.progress || 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.state.actionCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Findings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((session.state.progress || 0) * 100)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusBadge status={session.state.status} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Action Timeline</CardTitle>
              <CardDescription>AI agent decisions and actions</CardDescription>
            </CardHeader>
            <CardContent>
              {allEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No actions yet</p>
                  <p className="text-sm">Actions will appear here when the session starts</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onScreenshotClick={setSelectedScreenshot}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Findings Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Findings</CardTitle>
              <CardDescription>Issues discovered by the AI agent</CardDescription>
            </CardHeader>
            <CardContent>
              {findings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No findings yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {findings.map((finding) => (
                    <FindingCard key={finding.id} finding={finding} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setSelectedScreenshot(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={selectedScreenshot}
              alt="Screenshot full view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onScreenshotClick }: { event: SessionEvent; onScreenshotClick?: (url: string) => void }) {
  const decision = event.decision as {
    action?: { type: string; target?: { description: string }; value?: string; duration?: number };
    reasoning?: { observation: string; thought: string; confidence: number };
    progress?: { objectiveStatus: string; completionEstimate: number };
  };
  const outcome = event.outcome as { success: boolean; error?: string; duration?: number };

  const actionIcons: Record<string, typeof MousePointer> = {
    click: MousePointer,
    type: Type,
    scroll: ScrollText,
    wait: Clock,
    navigate: Navigation,
    back: ArrowLeftCircle,
  };

  const ActionIcon = actionIcons[decision.action?.type || ''] || MousePointer;

  // Extract screenshot URL from path
  const getScreenshotUrl = (path?: string) => {
    if (!path) return null;
    // Path format: data/screenshots/{sessionId}/action-XXX.jpg
    const parts = path.split('/');
    if (parts.length >= 3) {
      const sessionId = parts[parts.length - 2];
      const filename = parts[parts.length - 1];
      return `/api/screenshots/${sessionId}/${filename}`;
    }
    return null;
  };

  const screenshotUrl = getScreenshotUrl(event.screenshot);

  return (
    <div className="flex gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
      <div className="flex flex-col items-center">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center ${
            outcome.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}
        >
          <ActionIcon className="h-5 w-5" />
        </div>
        <div className="text-xs text-muted-foreground mt-1">#{event.sequence}</div>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium capitalize flex items-center gap-2">
            {decision.action?.type}
            {decision.action?.target && (
              <span className="text-sm text-muted-foreground font-normal">
                on "{decision.action.target.description}"
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {outcome.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            {outcome.duration && (
              <span className="text-xs text-muted-foreground">{formatDuration(outcome.duration)}</span>
            )}
          </div>
        </div>

        {/* Screenshot Thumbnail */}
        {screenshotUrl && (
          <div
            className="relative w-full max-w-md cursor-pointer group"
            onClick={() => onScreenshotClick?.(screenshotUrl)}
          >
            <img
              src={screenshotUrl}
              alt={`Screenshot for action ${event.sequence}`}
              className="w-full h-auto rounded-md border shadow-sm group-hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-md">
              <ImageIcon className="h-8 w-8 text-white" />
            </div>
          </div>
        )}

        {/* Reasoning */}
        {decision.reasoning && (
          <div className="text-sm space-y-1 p-3 bg-muted/50 rounded-md">
            <div className="flex items-start gap-2">
              <Eye className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{decision.reasoning.observation}</span>
            </div>
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{decision.reasoning.thought}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                Confidence: {Math.round(decision.reasoning.confidence * 100)}%
              </span>
              {decision.progress && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    Progress: {Math.round(decision.progress.completionEstimate * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {!outcome.success && outcome.error && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md">{outcome.error}</div>
        )}
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const severityColors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
    info: 'bg-gray-500',
  };

  return (
    <div className="p-3 rounded-lg border space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {finding.type}
        </Badge>
        <div className={`h-2 w-2 rounded-full ${severityColors[finding.severity] || 'bg-gray-500'}`} />
      </div>
      <p className="text-sm font-medium">{finding.description}</p>
      {finding.personaPerspective && (
        <p className="text-xs text-muted-foreground italic">"{finding.personaPerspective}"</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
    pending: 'secondary',
    running: 'default',
    completed: 'success',
    failed: 'destructive',
    cancelled: 'warning',
  };

  return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
}
