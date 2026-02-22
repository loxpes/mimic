import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sessionsApi, personasApi, objectivesApi, type CreateSessionInput, type CreateBatchSessionInput } from '@/lib/api';
import { PlayCircle, Plus, ExternalLink, Play, XCircle, Trash2, Eye, RotateCcw } from 'lucide-react';
import { LocalhostWarning } from '@/components/shared/LocalhostWarning';
import { toast } from '@/components/shared/Toast';

export function Sessions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.list,
  });

  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: personasApi.list,
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ['objectives'],
    queryFn: objectivesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: sessionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowCreate(false);
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: sessionsApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowCreate(false);
    },
  });

  const startMutation = useMutation({
    mutationFn: sessionsApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.error(error.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: sessionsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sessionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const deleteManyMutation = useMutation({
    mutationFn: sessionsApi.deleteMany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setSelectedIds(new Set());
    },
  });

  const retryMutation = useMutation({
    mutationFn: sessionsApi.retry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(sessions.map(s => s.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const allSelected = sessions.length > 0 && selectedIds.size === sessions.length;

  const handleDeleteSelected = () => {
    if (selectedIds.size > 0) {
      deleteManyMutation.mutate(Array.from(selectedIds));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('sessions.title')}</h1>
          <p className="text-muted-foreground">{t('sessions.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} {t('common.selected')}
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={deleteManyMutation.isPending}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                {t('common.delete')}
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                {t('common.clear')}
              </Button>
            </>
          )}
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('sessions.newSession')}
          </Button>
        </div>
      </div>

      {/* Create Session Form */}
      {showCreate && (
        <CreateSessionForm
          personas={personas}
          objectives={objectives}
          onSubmit={(data) => createMutation.mutate(data)}
          onBatchSubmit={(data) => createBatchMutation.mutate(data)}
          onCancel={() => setShowCreate(false)}
          isLoading={createMutation.isPending || createBatchMutation.isPending}
        />
      )}

      {/* Sessions List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">{t('sessions.noSessions')}</p>
            <p className="text-sm text-muted-foreground">
              {t('sessions.noSessionsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          {/* Table Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => allSelected ? clearSelection() : selectAll()}
              className="h-4 w-4 rounded border-gray-300"
            />
            <div className="flex-1 grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3">{t('sessions.persona')}</span>
              <span className="col-span-3">{t('sessions.objective')}</span>
              <span className="col-span-3">{t('common.url')}</span>
              <span className="col-span-1 text-center">{t('common.status')}</span>
              <span className="col-span-2 text-right">{t('common.actions')}</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${
                  selectedIds.has(session.id) ? 'bg-primary/5' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(session.id)}
                  onChange={() => toggleSelect(session.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div className="flex-1 grid grid-cols-12 gap-2 items-center min-w-0">
                  {/* Persona */}
                  <div className="col-span-3 truncate" title={session.personaName || session.personaId}>
                    <span className="text-sm font-medium">
                      {session.personaName || session.personaId}
                    </span>
                  </div>

                  {/* Objective */}
                  <div className="col-span-3 truncate" title={session.objectiveName || session.objectiveId}>
                    <span className="text-sm text-muted-foreground">
                      {session.objectiveName || session.objectiveId}
                    </span>
                  </div>

                  {/* URL */}
                  <div className="col-span-3 truncate" title={session.targetUrl}>
                    <a
                      href={session.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <span className="truncate">{new URL(session.targetUrl).hostname}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 flex justify-center">
                    <StatusBadge status={session.state.status} />
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    {session.state.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startMutation.mutate(session.id)}
                        disabled={startMutation.isPending}
                        title={t('common.start')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {session.state.status === 'running' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelMutation.mutate(session.id)}
                        disabled={cancelMutation.isPending}
                        title={t('common.cancel')}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    {['completed', 'failed', 'cancelled'].includes(session.state.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => retryMutation.mutate(session.id)}
                        disabled={retryMutation.isPending}
                        title={t('common.retry')}
                      >
                        <RotateCcw className="h-4 w-4 text-blue-500" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild title={t('common.view')}>
                      <Link to={`/sessions/${session.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(session.id)}
                      disabled={deleteMutation.isPending}
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface CreateSessionFormProps {
  personas: { id: string; name: string }[];
  objectives: { id: string; name: string }[];
  onSubmit: (data: CreateSessionInput) => void;
  onBatchSubmit: (data: CreateBatchSessionInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function CreateSessionForm({
  personas,
  objectives,
  onSubmit,
  onBatchSubmit,
  onCancel,
  isLoading,
}: CreateSessionFormProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [targetUrl, setTargetUrl] = useState('');
  const [singlePersonaId, setSinglePersonaId] = useState(personas[0]?.id || '');
  const [singleObjectiveId, setSingleObjectiveId] = useState(objectives[0]?.id || '');
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUrl && singlePersonaId && singleObjectiveId) {
      const language = localStorage.getItem('testfarm_language') || 'es';
      onSubmit({
        targetUrl,
        personaId: singlePersonaId,
        objectiveId: singleObjectiveId,
        llmConfig: { language },
      });
    }
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUrl && selectedPersonaIds.length > 0 && selectedObjectiveIds.length > 0) {
      const language = localStorage.getItem('testfarm_language') || 'es';
      onBatchSubmit({
        targetUrl,
        personaIds: selectedPersonaIds,
        objectiveIds: selectedObjectiveIds,
        llmConfig: { language },
      });
    }
  };

  const togglePersona = (id: string) => {
    setSelectedPersonaIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleObjective = (id: string) => {
    setSelectedObjectiveIds(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const selectAllPersonas = () => setSelectedPersonaIds(personas.map(p => p.id));
  const selectAllObjectives = () => setSelectedObjectiveIds(objectives.map(o => o.id));
  const clearPersonas = () => setSelectedPersonaIds([]);
  const clearObjectives = () => setSelectedObjectiveIds([]);

  const totalBatchSessions = selectedPersonaIds.length * selectedObjectiveIds.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('sessions.createSession')}</CardTitle>
            <CardDescription>
              {mode === 'single' ? t('sessions.configureSingle') : t('sessions.launchMultiple')}
            </CardDescription>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <Button
              size="sm"
              variant={mode === 'single' ? 'default' : 'ghost'}
              onClick={() => setMode('single')}
            >
              {t('sessions.single')}
            </Button>
            <Button
              size="sm"
              variant={mode === 'batch' ? 'default' : 'ghost'}
              onClick={() => setMode('batch')}
            >
              {t('sessions.batch')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                  value={singlePersonaId}
                  onChange={(e) => setSinglePersonaId(e.target.value)}
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
                  value={singleObjectiveId}
                  onChange={(e) => setSingleObjectiveId(e.target.value)}
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
            </div>
            <LocalhostWarning targetUrl={targetUrl} onReplace={setTargetUrl} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={isLoading || !targetUrl}>
                {isLoading ? t('sessions.creating') : t('sessions.createSession')}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBatchSubmit} className="space-y-4">
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
            <LocalhostWarning targetUrl={targetUrl} onReplace={setTargetUrl} />

            <div className="grid gap-4 md:grid-cols-2">
              {/* Personas Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {t('nav.personas')} ({selectedPersonaIds.length}/{personas.length})
                  </label>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={selectAllPersonas}>{t('common.all')}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearPersonas}>{t('common.clear')}</Button>
                  </div>
                </div>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {personas.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPersonaIds.includes(p.id)}
                        onChange={() => togglePersona(p.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Objectives Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {t('nav.objectives')} ({selectedObjectiveIds.length}/{objectives.length})
                  </label>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={selectAllObjectives}>{t('common.all')}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearObjectives}>{t('common.clear')}</Button>
                  </div>
                </div>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {objectives.map((o) => (
                    <label
                      key={o.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedObjectiveIds.includes(o.id)}
                        onChange={() => toggleObjective(o.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{o.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {totalBatchSessions > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                {t('sessions.sessionsWillBeCreated', { count: totalBatchSessions })}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
              <Button
                type="submit"
                disabled={isLoading || !targetUrl || totalBatchSessions === 0}
              >
                {isLoading ? t('sessions.creating') : t('sessions.createSessions', { count: totalBatchSessions })}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
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
