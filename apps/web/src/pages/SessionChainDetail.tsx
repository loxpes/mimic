import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sessionChainsApi, sessionsApi, type ChainSchedule } from '@/lib/api';
import {
  ArrowLeft,
  PlayCircle,
  Pause,
  Play,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export function SessionChainDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSchedule, setShowSchedule] = useState(false);

  const { data: chain, isLoading, error } = useQuery({
    queryKey: ['session-chain', id],
    queryFn: () => sessionChainsApi.get(id!),
    enabled: !!id,
  });

  const continueMutation = useMutation({
    mutationFn: async () => {
      const result = await sessionChainsApi.continue(id!);
      await sessionsApi.start(result.session.id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-chain', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => sessionChainsApi.pause(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-chain', id] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => sessionChainsApi.resume(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-chain', id] });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (schedule: ChainSchedule) => sessionChainsApi.setSchedule(id!, schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-chain', id] });
      setShowSchedule(false);
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>;
  }

  if (error || !chain) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{t('sessionChains.notFound')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/session-chains')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const getTrendIcon = (trend: string | null | undefined) => {
    if (trend === 'improving') return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
      active: 'success',
      paused: 'warning',
      completed: 'secondary',
      archived: 'secondary',
      pending: 'secondary',
      running: 'default',
      failed: 'destructive',
      cancelled: 'warning',
    };
    return variants[status] || 'secondary';
  };

  const isActionLoading = continueMutation.isPending || pauseMutation.isPending || resumeMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/session-chains')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {chain.name || chain.personaName || t('sessionChains.untitled')}
            </h1>
            <Badge variant={getStatusVariant(chain.status)}>
              {t(`status.${chain.status}`)}
            </Badge>
          </div>
          <p className="text-muted-foreground">{chain.objectiveName}</p>
        </div>
        <div className="flex items-center gap-2">
          {chain.status === 'active' && (
            <>
              <Button onClick={() => continueMutation.mutate()} disabled={isActionLoading}>
                <PlayCircle className="h-4 w-4 mr-2" />
                {t('sessionChains.continueNow')}
              </Button>
              <Button variant="outline" onClick={() => pauseMutation.mutate()} disabled={isActionLoading}>
                <Pause className="h-4 w-4 mr-2" />
                {t('common.pause')}
              </Button>
            </>
          )}
          {chain.status === 'paused' && (
            <Button onClick={() => resumeMutation.mutate()} disabled={isActionLoading}>
              <Play className="h-4 w-4 mr-2" />
              {t('sessionChains.resume')}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowSchedule(!showSchedule)}>
            <Calendar className="h-4 w-4 mr-2" />
            {t('sessionChains.schedule')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('sessionChains.totalSessions')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{chain.sessionCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('sessionChains.weightedScore')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">
                {chain.aggregatedScore?.weightedScore?.toFixed(1) || '-'}
              </span>
              {chain.aggregatedScore && getTrendIcon(chain.aggregatedScore.trend)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('sessionChains.nextScheduled')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {chain.schedule?.enabled && chain.schedule.nextRunAt ? (
                formatDistanceToNow(new Date(chain.schedule.nextRunAt), { addSuffix: true })
              ) : (
                t('sessionChains.notScheduled')
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('sessionChains.targetUrl')}</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={chain.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:text-primary flex items-center gap-1"
            >
              <span className="truncate">{new URL(chain.targetUrl).hostname}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Config */}
      {showSchedule && (
        <ScheduleConfig
          currentSchedule={chain.schedule}
          onSave={(schedule) => scheduleMutation.mutate(schedule)}
          onCancel={() => setShowSchedule(false)}
          isLoading={scheduleMutation.isPending}
        />
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sessions Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('sessionChains.sessionsTimeline')}</CardTitle>
            <CardDescription>{t('sessionChains.sessionsTimelineDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {chain.sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('sessionChains.noSessionsYet')}</p>
                <Button className="mt-4" onClick={() => continueMutation.mutate()} disabled={isActionLoading}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {t('sessionChains.startFirst')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {chain.sessions.map((session, index) => {
                  const results = session.results as {
                    personalAssessment?: { overallScore: number };
                    outcome?: string;
                    actionsTaken?: number;
                  } | null;

                  return (
                    <div key={session.id} className="flex gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          session.state.status === 'completed' ? 'bg-green-100 text-green-700' :
                          session.state.status === 'failed' ? 'bg-red-100 text-red-700' :
                          session.state.status === 'running' ? 'bg-blue-100 text-blue-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        {index < chain.sessions.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>

                      {/* Session info */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {t('sessionChains.session')} #{index + 1}
                            </span>
                            <Badge variant={getStatusVariant(session.state.status)}>
                              {t(`status.${session.state.status}`)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {results?.personalAssessment?.overallScore && (
                              <span className="text-sm font-medium">
                                {results.personalAssessment.overallScore}/10
                              </span>
                            )}
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/sessions/${session.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {format(new Date(session.createdAt), 'PPp')}
                          {results?.actionsTaken && ` - ${results.actionsTaken} ${t('sessionChains.actions')}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Persistent Memory */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sessionChains.accumulatedMemory')}</CardTitle>
            <CardDescription>{t('sessionChains.accumulatedMemoryDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Discoveries */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                {t('sessionChains.discoveries')} ({chain.persistentMemory?.discoveries?.length || 0})
              </div>
              {chain.persistentMemory?.discoveries?.length ? (
                <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {chain.persistentMemory.discoveries.slice(-5).map((d, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-yellow-500 mt-1">-</span>
                      {d}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t('sessionChains.noDiscoveries')}</p>
              )}
            </div>

            {/* Frustrations */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                {t('sessionChains.frustrations')} ({chain.persistentMemory?.frustrations?.length || 0})
              </div>
              {chain.persistentMemory?.frustrations?.length ? (
                <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {chain.persistentMemory.frustrations.slice(-5).map((f, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-orange-500 mt-1">-</span>
                      {f}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t('sessionChains.noFrustrations')}</p>
              )}
            </div>

            {/* Decisions */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                {t('sessionChains.decisions')} ({chain.persistentMemory?.decisions?.length || 0})
              </div>
              {chain.persistentMemory?.decisions?.length ? (
                <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {chain.persistentMemory.decisions.slice(-5).map((d, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-blue-500 mt-1">-</span>
                      {d}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t('sessionChains.noDecisions')}</p>
              )}
            </div>

            {/* Visited Pages */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <MapPin className="h-4 w-4 text-purple-500" />
                {t('sessionChains.visitedPages')} ({chain.persistentMemory?.visitedPages?.length || 0})
              </div>
              {chain.persistentMemory?.visitedPages?.length ? (
                <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {chain.persistentMemory.visitedPages.slice(-5).map((p, i) => (
                    <li key={i} className="truncate" title={p}>
                      <span className="text-purple-500">-</span> {new URL(p).pathname}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t('sessionChains.noPagesVisited')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score History Chart */}
      {chain.aggregatedScore && chain.aggregatedScore.scores.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sessionChains.scoreHistory')}</CardTitle>
            <CardDescription>{t('sessionChains.scoreHistoryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {chain.aggregatedScore.scores.map((score, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-t"
                    style={{ height: `${(score.score / 10) * 100}%` }}
                    title={`Session ${i + 1}: ${score.score}/10`}
                  />
                  <span className="text-xs text-muted-foreground">{score.score}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ScheduleConfigProps {
  currentSchedule?: ChainSchedule;
  onSave: (schedule: ChainSchedule) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ScheduleConfig({ currentSchedule, onSave, onCancel, isLoading }: ScheduleConfigProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(currentSchedule?.enabled || false);
  const [preset, setPreset] = useState('daily-9am');
  const [customCron, setCustomCron] = useState(currentSchedule?.cronExpression || '0 9 * * *');
  const [maxSessions, setMaxSessions] = useState(currentSchedule?.maxSessions || 0);

  const presets: Record<string, string> = {
    'daily-9am': '0 9 * * *',
    'daily-14pm': '0 14 * * *',
    'weekdays-9am': '0 9 * * 1-5',
    'custom': customCron,
  };

  const handleSave = () => {
    const cronExpression = presets[preset] || customCron;
    const nextRunAt = calculateNextRun(cronExpression);

    onSave({
      enabled,
      cronExpression,
      nextRunAt,
      maxSessions: maxSessions > 0 ? maxSessions : undefined,
    });
  };

  const calculateNextRun = (cron: string): number => {
    // Simple calculation for next run
    const parts = cron.split(' ');
    const [minute, hour] = parts;
    const now = new Date();
    const next = new Date(now);
    next.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next.getTime();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sessionChains.scheduleConfig')}</CardTitle>
        <CardDescription>{t('sessionChains.scheduleConfigDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">{t('sessionChains.enableSchedule')}</span>
          </label>
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sessionChains.frequency')}</label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background"
              >
                <option value="daily-9am">{t('sessionChains.daily9am')}</option>
                <option value="daily-14pm">{t('sessionChains.daily14pm')}</option>
                <option value="weekdays-9am">{t('sessionChains.weekdays9am')}</option>
                <option value="custom">{t('sessionChains.custom')}</option>
              </select>
            </div>

            {preset === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('sessionChains.cronExpression')}</label>
                <input
                  type="text"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background font-mono"
                  placeholder="0 9 * * *"
                />
                <p className="text-xs text-muted-foreground">{t('sessionChains.cronHelp')}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sessionChains.maxSessions')}</label>
              <input
                type="number"
                value={maxSessions}
                onChange={(e) => setMaxSessions(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-md border bg-background"
                min="0"
                placeholder="0 = unlimited"
              />
              <p className="text-xs text-muted-foreground">{t('sessionChains.maxSessionsHelp')}</p>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
