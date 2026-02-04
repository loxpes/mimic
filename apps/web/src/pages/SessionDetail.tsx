import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sessionsApi, eventsApi, trelloApi, type SessionEvent, type Finding } from '@/lib/api';
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
  Code2,
  Copy,
  Check,
  RotateCcw,
  Star,
  ThumbsUp,
  ThumbsDown,
  Send,
  ListOrdered,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DOMElement {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  source: string;
  selector?: string;
  disabled?: boolean;
  role?: string;
}

interface PersonalAssessment {
  overallScore: number;
  difficulty: string;
  wouldRecommend: boolean;
  positives: string[];
  negatives: string[];
  summary: string;
}

interface UserInputRequest {
  type: string;
  prompt: string;
  fieldId?: string;
}

export function SessionDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedElements, setSelectedElements] = useState<DOMElement[] | null>(null);
  const [userInputRequest, setUserInputRequest] = useState<UserInputRequest | null>(null);
  const [userInputValue, setUserInputValue] = useState('');
  const [isSubmittingInput, setIsSubmittingInput] = useState(false);

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

  // Get projectId from session (if available)
  const projectId = (session as { projectId?: string } | undefined)?.projectId;

  // Check Trello integration status
  const { data: trelloStatus } = useQuery({
    queryKey: ['trello-status', projectId],
    queryFn: () => trelloApi.getStatus(projectId!),
    enabled: !!projectId,
  });

  const trelloConnected = trelloStatus?.connected && trelloStatus?.integration?.config?.boardId;

  const startMutation = useMutation({
    mutationFn: sessionsApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      window.alert(error.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: sessionsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: sessionsApi.retry,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      // Navigate to the new session
      navigate(`/sessions/${data.newSession.id}`);
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
          // Clear any pending user input request
          setUserInputRequest(null);
        } else if (data.type === 'user-input-required') {
          // Agent needs user input (2FA, CAPTCHA, etc.)
          setUserInputRequest(data.data as UserInputRequest);
          setUserInputValue('');
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

  // Handle user input submission for 2FA
  const handleSubmitUserInput = async () => {
    if (!id || !userInputValue.trim()) return;

    setIsSubmittingInput(true);
    try {
      await sessionsApi.provideInput(id, userInputValue.trim());
      setUserInputRequest(null);
      setUserInputValue('');
    } catch (error) {
      console.error('Failed to submit user input:', error);
    } finally {
      setIsSubmittingInput(false);
    }
  };

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
              {t('sessionDetail.created')} {formatDate(session.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={session.state.status} />
          {session.state.status === 'pending' && (
            <Button onClick={() => startMutation.mutate(session.id)} disabled={startMutation.isPending}>
              <Play className="mr-1 h-4 w-4" />
              {t('sessionDetail.startSession')}
            </Button>
          )}
          {session.state.status === 'running' && (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate(session.id)}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="mr-1 h-4 w-4" />
              {t('common.cancel')}
            </Button>
          )}
          {['completed', 'failed', 'cancelled'].includes(session.state.status) && (
            <Button
              variant="outline"
              onClick={() => retryMutation.mutate(session.id)}
              disabled={retryMutation.isPending}
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              {retryMutation.isPending ? t('sessionDetail.cloning') : t('common.retry')}
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
                  <span className="font-medium">{t('sessionDetail.sessionInProgress')}</span>
                  <span className="text-sm text-muted-foreground">
                    {session.state.actionCount} {t('common.actions').toLowerCase()} • {Math.round((session.state.progress || 0) * 100)}%
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
            <CardDescription>{t('sessionDetail.totalActions')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.state.actionCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('sessionDetail.findings')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('sessionDetail.progress')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((session.state.progress || 0) * 100)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('common.status')}</CardDescription>
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
              <CardTitle>{t('sessionDetail.actionTimeline')}</CardTitle>
              <CardDescription>{t('sessionDetail.aiDecisions')}</CardDescription>
            </CardHeader>
            <CardContent>
              {allEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('sessionDetail.noActionsYet')}</p>
                  <p className="text-sm">{t('sessionDetail.actionsWillAppear')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onScreenshotClick={setSelectedScreenshot}
                      onElementsClick={setSelectedElements}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Personal Assessment */}
          {(session?.results as { personalAssessment?: PersonalAssessment } | null)?.personalAssessment && (
            <PersonalAssessmentCard
              assessment={(session?.results as { personalAssessment: PersonalAssessment }).personalAssessment}
            />
          )}

          {/* Findings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('sessionDetail.findings')}</CardTitle>
              <CardDescription>{t('sessionDetail.issuesDiscovered')}</CardDescription>
            </CardHeader>
            <CardContent>
              {findings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('sessionDetail.noFindings')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {findings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      projectId={projectId}
                      trelloConnected={!!trelloConnected}
                    />
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

      {/* DOM Elements Modal */}
      {selectedElements && (
        <DOMElementsModal
          elements={selectedElements}
          onClose={() => setSelectedElements(null)}
        />
      )}

      {/* 2FA User Input Modal */}
      {userInputRequest && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => {}} // Don't close on backdrop click
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Verification Required
              </CardTitle>
              <CardDescription>
                {userInputRequest.prompt}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {userInputRequest.type}
                </Badge>
                {userInputRequest.fieldId && (
                  <span className="text-xs text-muted-foreground">
                    Field: {userInputRequest.fieldId}
                  </span>
                )}
              </div>
              <Input
                type="text"
                placeholder="Enter verification code..."
                value={userInputValue}
                onChange={(e) => setUserInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSubmittingInput) {
                    handleSubmitUserInput();
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUserInputRequest(null);
                    setUserInputValue('');
                    // Cancel by providing empty input
                    if (id) {
                      sessionsApi.provideInput(id, '').catch(console.error);
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitUserInput}
                  disabled={isSubmittingInput || !userInputValue.trim()}
                >
                  {isSubmittingInput ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  onScreenshotClick,
  onElementsClick,
}: {
  event: SessionEvent;
  onScreenshotClick?: (url: string) => void;
  onElementsClick?: (elements: DOMElement[]) => void;
}) {
  const decision = event.decision as {
    action?: {
      type: string;
      target?: {
        description: string;
        elementId?: string;
        coordinates?: { x: number; y: number };
      };
      value?: string;
      duration?: number;
    };
    reasoning?: { state: string; action_reason: string; confidence: 'high' | 'medium' | 'low' };
    progress?: { objectiveStatus: string; completionEstimate: number };
  };
  const outcome = event.outcome as { success: boolean; error?: string; duration?: number };
  const context = event.context as { url: string; elementCount: number; elements?: DOMElement[] };

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
              <>
                <span className="text-sm text-muted-foreground font-normal">
                  on "{decision.action.target.description}"
                </span>
                {decision.action.target.elementId && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {decision.action.target.elementId}
                  </Badge>
                )}
                {decision.action.target.coordinates && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    ({decision.action.target.coordinates.x}, {decision.action.target.coordinates.y})
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Ver DOM button */}
            {context.elements && context.elements.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onElementsClick?.(context.elements!)}
              >
                <Code2 className="h-3 w-3 mr-1" />
                Ver DOM ({context.elements.length})
              </Button>
            )}
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
              <span className="text-muted-foreground">{decision.reasoning.state}</span>
            </div>
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{decision.reasoning.action_reason}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded ${
                decision.reasoning.confidence === 'high' ? 'bg-green-500/20 text-green-500' :
                decision.reasoning.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                'bg-red-500/20 text-red-500'
              }`}>
                {decision.reasoning.confidence}
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

function FindingCard({
  finding,
  projectId,
  trelloConnected,
}: {
  finding: Finding;
  projectId?: string;
  trelloConnected: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [trelloSending, setTrelloSending] = useState(false);
  const [trelloSent, setTrelloSent] = useState(false);
  const [trelloCardUrl, setTrelloCardUrl] = useState<string | null>(null);

  const sendToTrello = async () => {
    if (!projectId) return;
    setTrelloSending(true);
    try {
      const card = await trelloApi.createCard(projectId, {
        id: finding.id,
        type: finding.type,
        severity: finding.severity,
        description: finding.description,
        personaPerspective: finding.personaPerspective,
        url: (finding as { url?: string }).url || '',
        evidence: finding.evidence,
      });
      setTrelloCardUrl(card.shortUrl || card.url);
      setTrelloSent(true);
    } catch (error) {
      console.error('Failed to send to Trello:', error);
    } finally {
      setTrelloSending(false);
    }
  };

  const severityColors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
    info: 'bg-gray-500',
  };

  const logLevelColors: Record<string, string> = {
    error: 'text-red-500',
    warn: 'text-yellow-500',
    warning: 'text-yellow-500',
    log: 'text-muted-foreground',
    info: 'text-blue-500',
    debug: 'text-gray-400',
  };

  const evidence = (finding as { evidence?: {
    screenshotPath?: string;
    consoleLogs?: Array<{ level: string; message: string; timestamp: number }>;
    actionContext?: {
      actionNumber: number;
      previousActions?: Array<{ type: string; target?: string; success: boolean }>;
    };
    stepsToReproduce?: string[];
  } }).evidence;

  const expectedBehavior = (finding as { expectedBehavior?: string }).expectedBehavior;

  const hasEvidence = evidence && (
    evidence.screenshotPath ||
    (evidence.consoleLogs && evidence.consoleLogs.length > 0) ||
    evidence.actionContext ||
    (evidence.stepsToReproduce && evidence.stepsToReproduce.length > 0)
  ) || expectedBehavior;

  return (
    <div className="p-3 rounded-lg border space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {finding.type}
        </Badge>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${severityColors[finding.severity] || 'bg-gray-500'}`} />
          {hasEvidence && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide' : 'Evidence'}
            </Button>
          )}
          {trelloConnected && (
            trelloSent ? (
              <a
                href={trelloCardUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:underline flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                In Trello
              </a>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={sendToTrello}
                disabled={trelloSending}
              >
                {trelloSending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1" />
                    Trello
                  </>
                )}
              </Button>
            )
          )}
        </div>
      </div>
      <p className="text-sm font-medium">{finding.description}</p>
      {finding.personaPerspective && (
        <p className="text-xs text-muted-foreground italic">"{finding.personaPerspective}"</p>
      )}

      {/* Evidence Section */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          {/* Expected Behavior */}
          {expectedBehavior && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Expected Behavior
              </div>
              <p className="text-xs bg-muted/50 rounded p-2 italic">
                {expectedBehavior}
              </p>
            </div>
          )}

          {/* Steps to Reproduce */}
          {evidence?.stepsToReproduce && evidence.stepsToReproduce.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <ListOrdered className="h-3 w-3" />
                Steps to Reproduce ({evidence.stepsToReproduce.length})
              </div>
              <ol className="text-xs space-y-1 list-decimal list-inside bg-muted/30 rounded p-2">
                {evidence.stepsToReproduce.map((step, i) => (
                  <li key={i} className="text-muted-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Screenshot */}
          {evidence?.screenshotPath && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Screenshot
              </div>
              <div
                className="relative cursor-pointer"
                onClick={() => setShowScreenshot(true)}
              >
                <img
                  src={`/screenshots/${evidence.screenshotPath.split('/').slice(-2).join('/')}`}
                  alt="Finding screenshot"
                  className="w-full h-32 object-cover rounded border hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors rounded">
                  <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100" />
                </div>
              </div>
            </div>
          )}

          {/* Console Logs */}
          {evidence?.consoleLogs && evidence.consoleLogs.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Code2 className="h-3 w-3" />
                Console Logs ({evidence.consoleLogs.length})
              </div>
              <div className="bg-gray-900 rounded p-2 text-xs font-mono max-h-32 overflow-y-auto">
                {evidence.consoleLogs.map((log, i) => (
                  <div key={i} className={`${logLevelColors[log.level] || 'text-gray-300'}`}>
                    [{log.level}] {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Context */}
          {evidence?.actionContext && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Action #{evidence.actionContext.actionNumber}
              </div>
              {evidence.actionContext.previousActions && evidence.actionContext.previousActions.length > 0 && (
                <div className="text-xs space-y-1">
                  {evidence.actionContext.previousActions.map((action, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={action.success ? 'text-green-500' : 'text-red-500'}>
                        {action.success ? '✓' : '✗'}
                      </span>
                      <span className="text-muted-foreground">
                        {action.type}: {action.target || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshot && evidence?.screenshotPath && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowScreenshot(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-10 right-0 text-white hover:bg-white/20"
              onClick={() => setShowScreenshot(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={`/screenshots/${evidence.screenshotPath.split('/').slice(-2).join('/')}`}
              alt="Finding screenshot full"
              className="max-w-full max-h-[90vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'success' | 'warning'> = {
    pending: 'secondary',
    running: 'default',
    completed: 'success',
    failed: 'destructive',
    cancelled: 'warning',
  };

  return <Badge variant={variants[status] || 'secondary'}>{t(`status.${status}`)}</Badge>;
}

function DOMElementsModal({
  elements,
  onClose,
}: {
  elements: DOMElement[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredElements = elements.filter((el) => {
    const matchesText =
      filter === '' ||
      el.name.toLowerCase().includes(filter.toLowerCase()) ||
      el.id.toLowerCase().includes(filter.toLowerCase()) ||
      el.selector?.toLowerCase().includes(filter.toLowerCase());

    const matchesType = typeFilter === 'all' || el.type === typeFilter;

    return matchesText && matchesType;
  });

  const copyToClipboard = () => {
    const text = JSON.stringify(elements, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uniqueTypes = [...new Set(elements.map((el) => el.type))];

  const sourceIcon = (source: string) => {
    if (source === 'both') return '🔀';
    if (source === 'dom') return '📄';
    if (source === 'vision') return '👁️';
    return '❓';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">DOM Elements ({elements.length})</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar JSON
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b flex gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre, ID o selector..."
            className="flex-1 px-3 py-2 border rounded-md text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select
            className="px-3 py-2 border rounded-md text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Todos los tipos</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Element List */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {filteredElements.map((el) => (
              <div
                key={el.id}
                className={`p-3 rounded-lg border text-sm ${
                  el.disabled ? 'opacity-50 bg-muted' : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                        {el.id}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {el.type}
                      </Badge>
                      {el.role && el.role !== el.type && (
                        <Badge variant="secondary" className="text-xs">
                          {el.role}
                        </Badge>
                      )}
                      <span title={`Source: ${el.source}`}>{sourceIcon(el.source)}</span>
                      {el.disabled && (
                        <Badge variant="destructive" className="text-xs">
                          disabled
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium mt-1 truncate" title={el.name}>
                      {el.name || <span className="text-muted-foreground italic">(sin nombre)</span>}
                    </p>
                    {el.selector && (
                      <p
                        className="text-xs text-muted-foreground font-mono truncate mt-1"
                        title={el.selector}
                      >
                        {el.selector}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    <div>({el.x}, {el.y})</div>
                    <div>{el.width}x{el.height}</div>
                  </div>
                </div>
              </div>
            ))}
            {filteredElements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron elementos
              </div>
            )}
          </div>
        </div>

        {/* Footer stats */}
        <div className="p-3 border-t text-xs text-muted-foreground flex justify-between">
          <span>
            Mostrando {filteredElements.length} de {elements.length} elementos
          </span>
          <span>
            DOM: {elements.filter((e) => e.source === 'dom').length} |
            Vision: {elements.filter((e) => e.source === 'vision').length} |
            Both: {elements.filter((e) => e.source === 'both').length}
          </span>
        </div>
      </div>
    </div>
  );
}

function PersonalAssessmentCard({ assessment }: { assessment: PersonalAssessment }) {
  const { t } = useTranslation();

  const difficultyLabels: Record<string, string> = {
    very_easy: t('projectDetail.veryEasy'),
    easy: t('projectDetail.easy'),
    moderate: t('projectDetail.moderate'),
    difficult: t('projectDetail.difficult'),
    very_difficult: t('projectDetail.veryDifficult'),
  };

  const difficultyColors: Record<string, string> = {
    very_easy: 'text-green-500',
    easy: 'text-green-400',
    moderate: 'text-yellow-500',
    difficult: 'text-orange-500',
    very_difficult: 'text-red-500',
  };

  // Render score as stars
  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 10; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i <= score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          {t('sessionDetail.personalAssessment')}
        </CardTitle>
        <CardDescription>{t('sessionDetail.aiEvaluation')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            {renderStars(assessment.overallScore)}
          </div>
          <p className="text-2xl font-bold">{assessment.overallScore}/10</p>
        </div>

        {/* Difficulty and Recommendation */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t('sessionDetail.difficulty')}: </span>
            <span className={difficultyColors[assessment.difficulty] || ''}>
              {difficultyLabels[assessment.difficulty] || assessment.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {assessment.wouldRecommend ? (
              <>
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <span className="text-green-500">{t('sessionDetail.wouldRecommend')}</span>
              </>
            ) : (
              <>
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <span className="text-red-500">{t('sessionDetail.wouldNotRecommend')}</span>
              </>
            )}
          </div>
        </div>

        {/* Positives */}
        {assessment.positives.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('sessionDetail.positives')}</p>
            <ul className="space-y-1">
              {assessment.positives.map((positive, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{positive}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Negatives */}
        {assessment.negatives.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('sessionDetail.negatives')}</p>
            <ul className="space-y-1">
              {assessment.negatives.map((negative, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{negative}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary */}
        {assessment.summary && (
          <div className="pt-2 border-t">
            <p className="text-sm italic text-muted-foreground">
              "{assessment.summary}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
