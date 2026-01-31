import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  sessionChainsApi,
  sessionsApi,
  personasApi,
  objectivesApi,
  projectsApi,
  type CreateSessionChainInput,
  type SessionChain,
  type Project,
} from '@/lib/api';
import {
  Link2,
  Plus,
  ExternalLink,
  Play,
  Pause,
  PlayCircle,
  Trash2,
  Eye,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SessionChains() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: chains = [], isLoading } = useQuery({
    queryKey: ['session-chains'],
    queryFn: () => sessionChainsApi.list(),
  });

  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: personasApi.list,
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ['objectives'],
    queryFn: objectivesApi.list,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: sessionChainsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-chains'] });
      setShowCreate(false);
    },
  });

  const continueMutation = useMutation({
    mutationFn: async (chainId: string) => {
      const result = await sessionChainsApi.continue(chainId);
      // Start the session automatically
      await sessionsApi.start(result.session.id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-chains'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: sessionChainsApi.pause,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-chains'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: sessionChainsApi.resume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-chains'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionChainsApi.delete(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-chains'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('sessionChains.title')}</h1>
          <p className="text-muted-foreground">{t('sessionChains.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('sessionChains.newChain')}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">{t('sessionChains.multiDay')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('sessionChains.multiDayDesc')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Form */}
      {showCreate && (
        <CreateChainForm
          personas={personas}
          objectives={objectives}
          projects={projects}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowCreate(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Chains List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      ) : chains.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">{t('sessionChains.noChains')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('sessionChains.noChainsDesc')}
            </p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('sessionChains.newChain')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chains.map((chain) => (
            <ChainCard
              key={chain.id}
              chain={chain}
              onContinue={() => continueMutation.mutate(chain.id)}
              onPause={() => pauseMutation.mutate(chain.id)}
              onResume={() => resumeMutation.mutate(chain.id)}
              onDelete={() => deleteMutation.mutate(chain.id)}
              isLoading={
                continueMutation.isPending ||
                pauseMutation.isPending ||
                resumeMutation.isPending ||
                deleteMutation.isPending
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChainCardProps {
  chain: SessionChain;
  onContinue: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  isLoading: boolean;
}

function ChainCard({ chain, onContinue, onPause, onResume, onDelete, isLoading }: ChainCardProps) {
  const { t } = useTranslation();

  const getTrendIcon = (trend: string | null | undefined) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'success' | 'warning' => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
      active: 'success',
      paused: 'warning',
      completed: 'secondary',
      archived: 'secondary',
    };
    return variants[status] || 'secondary';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {chain.name || chain.personaName || t('sessionChains.untitled')}
            </CardTitle>
            <CardDescription className="text-xs">
              {chain.objectiveName}
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(chain.status)}>
            {t(`status.${chain.status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-2xl font-bold">{chain.sessionCount}</div>
            <div className="text-xs text-muted-foreground">{t('sessionChains.sessions')}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              {chain.aggregatedScore?.weightedScore?.toFixed(1) || '-'}
              {chain.aggregatedScore && getTrendIcon(chain.aggregatedScore.trend)}
            </div>
            <div className="text-xs text-muted-foreground">{t('sessionChains.score')}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-2xl font-bold">
              {chain.schedule?.enabled ? (
                <Calendar className="h-5 w-5 mx-auto text-primary" />
              ) : (
                '-'
              )}
            </div>
            <div className="text-xs text-muted-foreground">{t('sessionChains.schedule')}</div>
          </div>
        </div>

        {/* URL */}
        <a
          href={chain.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
        >
          <span className="truncate">{new URL(chain.targetUrl).hostname}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>

        {/* Next Run */}
        {chain.schedule?.enabled && chain.schedule.nextRunAt && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {t('sessionChains.nextRun')}: {formatDistanceToNow(new Date(chain.schedule.nextRunAt), { addSuffix: true })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {chain.status === 'active' && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={onContinue}
                disabled={isLoading}
                className="flex-1"
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                {t('sessionChains.continue')}
              </Button>
              <Button size="sm" variant="outline" onClick={onPause} disabled={isLoading}>
                <Pause className="h-4 w-4" />
              </Button>
            </>
          )}
          {chain.status === 'paused' && (
            <Button
              size="sm"
              variant="default"
              onClick={onResume}
              disabled={isLoading}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-1" />
              {t('sessionChains.resume')}
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/session-chains/${chain.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} disabled={isLoading}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreateChainFormProps {
  personas: { id: string; name: string }[];
  objectives: { id: string; name: string }[];
  projects: Project[];
  onSubmit: (data: CreateSessionChainInput) => void;
  onCancel: () => void;
  isLoading: boolean;
  defaultProjectId?: string;
}

function CreateChainForm({ personas, objectives, projects, onSubmit, onCancel, isLoading, defaultProjectId }: CreateChainFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [personaId, setPersonaId] = useState(personas[0]?.id || '');
  const [objectiveId, setObjectiveId] = useState(objectives[0]?.id || '');
  const [projectId, setProjectId] = useState(defaultProjectId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUrl && personaId && objectiveId) {
      const language = localStorage.getItem('testfarm_language') || 'es';
      onSubmit({
        name: name || undefined,
        targetUrl,
        personaId,
        objectiveId,
        projectId: projectId || undefined,
        llmConfig: { language },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sessionChains.createChain')}</CardTitle>
        <CardDescription>{t('sessionChains.createChainDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sessionChains.chainName')}</label>
              <input
                type="text"
                placeholder={t('sessionChains.chainNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sessions.targetUrl')}</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sessions.persona')}</label>
              <select
                value={personaId}
                onChange={(e) => setPersonaId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background"
                required
              >
                {personas.length === 0 ? (
                  <option value="">{t('sessions.noPersonas')}</option>
                ) : (
                  personas.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sessions.objective')}</label>
              <select
                value={objectiveId}
                onChange={(e) => setObjectiveId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background"
                required
              >
                {objectives.length === 0 ? (
                  <option value="">{t('sessions.noObjectives')}</option>
                ) : (
                  objectives.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{t('projectDetail.project')}</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background"
              >
                <option value="">{t('projectDetail.noProject')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isLoading || !targetUrl}>
              {isLoading ? t('common.creating') : t('sessionChains.createChain')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export { CreateChainForm };
