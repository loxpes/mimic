import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sessionsApi, personasApi, objectivesApi, type CreateSessionInput, type CreateBatchSessionInput } from '@/lib/api';
import { PlayCircle, Plus, ExternalLink, Play, XCircle, Trash2, Eye } from 'lucide-react';

export function Sessions() {
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
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">Manage your AI testing sessions</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={deleteManyMutation.isPending}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Clear
              </Button>
            </>
          )}
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="mr-2 h-4 w-4" />
            New Session
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
        <div className="text-center py-12 text-muted-foreground">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No sessions yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first testing session to get started
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
              <span className="col-span-3">Persona</span>
              <span className="col-span-3">Objective</span>
              <span className="col-span-3">URL</span>
              <span className="col-span-1 text-center">Status</span>
              <span className="col-span-2 text-right">Actions</span>
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
                        title="Start"
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
                        title="Cancel"
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild title="View Details">
                      <Link to={`/sessions/${session.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(session.id)}
                      disabled={deleteMutation.isPending}
                      title="Delete"
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
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [targetUrl, setTargetUrl] = useState('');
  const [singlePersonaId, setSinglePersonaId] = useState(personas[0]?.id || '');
  const [singleObjectiveId, setSingleObjectiveId] = useState(objectives[0]?.id || '');
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUrl && singlePersonaId && singleObjectiveId) {
      onSubmit({ targetUrl, personaId: singlePersonaId, objectiveId: singleObjectiveId });
    }
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUrl && selectedPersonaIds.length > 0 && selectedObjectiveIds.length > 0) {
      onBatchSubmit({ targetUrl, personaIds: selectedPersonaIds, objectiveIds: selectedObjectiveIds });
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
            <CardTitle>Create New Session</CardTitle>
            <CardDescription>
              {mode === 'single' ? 'Configure a single testing session' : 'Launch multiple agents at once'}
            </CardDescription>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <Button
              size="sm"
              variant={mode === 'single' ? 'default' : 'ghost'}
              onClick={() => setMode('single')}
            >
              Single
            </Button>
            <Button
              size="sm"
              variant={mode === 'batch' ? 'default' : 'ghost'}
              onClick={() => setMode('batch')}
            >
              Batch
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target URL</label>
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
                <label className="text-sm font-medium">Persona</label>
                <select
                  value={singlePersonaId}
                  onChange={(e) => setSinglePersonaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background"
                  required
                >
                  {personas.length === 0 ? (
                    <option value="">No personas available</option>
                  ) : (
                    personas.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Objective</label>
                <select
                  value={singleObjectiveId}
                  onChange={(e) => setSingleObjectiveId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background"
                  required
                >
                  {objectives.length === 0 ? (
                    <option value="">No objectives available</option>
                  ) : (
                    objectives.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !targetUrl}>
                {isLoading ? 'Creating...' : 'Create Session'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target URL</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Personas Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Personas ({selectedPersonaIds.length}/{personas.length})
                  </label>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={selectAllPersonas}>All</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearPersonas}>Clear</Button>
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
                    Objectives ({selectedObjectiveIds.length}/{objectives.length})
                  </label>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={selectAllObjectives}>All</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearObjectives}>Clear</Button>
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
                <strong>{totalBatchSessions}</strong> sessions will be created
                ({selectedPersonaIds.length} personas × {selectedObjectiveIds.length} objectives)
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
              <Button
                type="submit"
                disabled={isLoading || !targetUrl || totalBatchSessions === 0}
              >
                {isLoading ? 'Creating...' : `Create ${totalBatchSessions} Sessions`}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
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
