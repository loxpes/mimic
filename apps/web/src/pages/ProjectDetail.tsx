import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { projectsApi, sessionsApi, personasApi, objectivesApi, trelloApi, type Session, type Persona, type Objective, type TrelloBoardStructure } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Loader2,
  Plus,
  Link2,
  Unlink,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';

export function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isAddSessionsOpen, setIsAddSessionsOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isTrelloDialogOpen, setIsTrelloDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const { data: allSessions = [] } = useQuery({
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

  const { data: trelloStatus, isLoading: isTrelloLoading } = useQuery({
    queryKey: ['trello-status', id],
    queryFn: () => trelloApi.getStatus(id!),
    enabled: !!id,
  });

  const { data: trelloBoards = [], refetch: refetchBoards } = useQuery({
    queryKey: ['trello-boards', id],
    queryFn: () => trelloApi.getBoards(id!),
    enabled: !!id && !!trelloStatus?.connected && !trelloStatus?.integration?.config?.boardId,
  });

  const refreshMutation = useMutation({
    mutationFn: () => projectsApi.refreshStats(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });

  const addSessionsMutation = useMutation({
    mutationFn: (sessionIds: string[]) => projectsApi.addSessions(id!, sessionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setIsAddSessionsOpen(false);
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: { personaIds: string[]; objectiveIds: string[]; isBatch: boolean }) => {
      if (data.isBatch) {
        await sessionsApi.createBatch({
          targetUrl: project!.targetUrl,
          personaIds: data.personaIds,
          objectiveIds: data.objectiveIds,
          projectId: id!,
        });
      } else {
        await sessionsApi.create({
          targetUrl: project!.targetUrl,
          personaId: data.personaIds[0],
          objectiveId: data.objectiveIds[0],
          projectId: id!,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setIsCreateSessionOpen(false);
    },
  });

  const selectBoardMutation = useMutation({
    mutationFn: ({ boardId, boardName }: { boardId: string; boardName: string }) =>
      trelloApi.selectBoard(id!, boardId, boardName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trello-status', id] });
      setIsTrelloDialogOpen(false);
    },
  });

  const analyzeBoardMutation = useMutation({
    mutationFn: () => trelloApi.analyzeBoard(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trello-status', id] });
    },
  });

  const disconnectTrelloMutation = useMutation({
    mutationFn: () => trelloApi.disconnect(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trello-status', id] });
    },
  });

  const connectTrelloMutation = useMutation({
    mutationFn: () => trelloApi.getAuthUrl(id!),
    onSuccess: (data) => {
      // Redirect to Trello authorization
      window.location.href = data.authUrl;
    },
  });

  const removeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => projectsApi.removeSessions(id!, [sessionId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('projectDetail.projectNotFound')}</p>
        <Link to="/projects">
          <Button variant="link">{t('projectDetail.backToProjects')}</Button>
        </Link>
      </div>
    );
  }

  const stats = project.stats;

  // Sessions not in any project
  const availableSessions = allSessions.filter(
    (s) => !project.sessions.find((ps) => ps.id === s.id)
  );

  const difficultyLabels: Record<string, string> = {
    very_easy: t('projectDetail.veryEasy'),
    easy: t('projectDetail.easy'),
    moderate: t('projectDetail.moderate'),
    difficult: t('projectDetail.difficult'),
    very_difficult: t('projectDetail.veryDifficult'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
            <a
              href={project.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {project.targetUrl}
            </a>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {t('projectDetail.refreshStats')}
        </Button>
      </div>

      {project.description && (
        <p className="text-muted-foreground">{project.description}</p>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('projectDetail.totalSessions')}</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalSessions || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-sm">
              {stats?.completedSessions ? (
                <span className="text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {stats.completedSessions}
                </span>
              ) : null}
              {stats?.failedSessions ? (
                <span className="text-red-500 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {stats.failedSessions}
                </span>
              ) : null}
              {stats?.pendingSessions ? (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.pendingSessions}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('projectDetail.totalFindings')}</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalFindings || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {stats?.findingsBySeverity &&
                Object.entries(stats.findingsBySeverity).map(([severity, count]) => (
                  <Badge
                    key={severity}
                    variant={
                      severity === 'critical'
                        ? 'destructive'
                        : severity === 'high'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="text-xs"
                  >
                    {count} {severity}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('projectDetail.averageScore')}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {stats?.averageScore !== null ? (
                <>
                  <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                  {stats?.averageScore}/10
                </>
              ) : (
                <span className="text-muted-foreground text-lg">N/A</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('projectDetail.averageDifficulty')}</CardDescription>
            <CardTitle className="text-xl">
              {stats?.averageDifficulty ? (
                difficultyLabels[stats.averageDifficulty] || stats.averageDifficulty
              ) : (
                <span className="text-muted-foreground text-lg">N/A</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('projectDetail.sessions')}</CardTitle>
              <CardDescription>{t('projectDetail.testingSessions')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isCreateSessionOpen} onOpenChange={setIsCreateSessionOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('projectDetail.createSession')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('projectDetail.createNewSession')}</DialogTitle>
                    <DialogDescription>
                      {t('projectDetail.createSessionFor')} {project.targetUrl}
                    </DialogDescription>
                  </DialogHeader>
                  <CreateSessionDialog
                    personas={personas}
                    objectives={objectives}
                    onCreate={(data) => createSessionMutation.mutate(data)}
                    isLoading={createSessionMutation.isPending}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={isAddSessionsOpen} onOpenChange={setIsAddSessionsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('projectDetail.addExisting')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('projectDetail.addSessions')}</DialogTitle>
                    <DialogDescription>
                      {t('projectDetail.selectSessionsToAdd')}
                    </DialogDescription>
                  </DialogHeader>
                  <AddSessionsDialog
                    availableSessions={availableSessions}
                    onAdd={(ids) => addSessionsMutation.mutate(ids)}
                    isLoading={addSessionsMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {project.sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('projectDetail.noSessions')}</p>
              <p className="text-sm mt-1">{t('projectDetail.noSessionsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onRemove={() => removeSessionMutation.mutate(session.id)}
                  isRemoving={removeSessionMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trello Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                {t('projectDetail.integrations')}
              </CardTitle>
              <CardDescription>{t('projectDetail.connectTools')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isTrelloLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !trelloStatus?.connected ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">{t('projectDetail.trello')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('projectDetail.syncToTrello')}
                </p>
              </div>
              <Button
                onClick={() => connectTrelloMutation.mutate()}
                disabled={connectTrelloMutation.isPending}
              >
                {connectTrelloMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                {t('projectDetail.connectTrello')}
              </Button>
            </div>
          ) : !trelloStatus.integration?.config?.boardId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                <div>
                  <h4 className="font-medium text-green-700 dark:text-green-300">
                    {t('projectDetail.trelloConnected')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('projectDetail.selectBoardToSync')}
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => disconnectTrelloMutation.mutate()}>
                  <Unlink className="h-4 w-4 mr-2" />
                  {t('projectDetail.disconnect')}
                </Button>
              </div>
              <Dialog open={isTrelloDialogOpen} onOpenChange={setIsTrelloDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => refetchBoards()}>{t('projectDetail.selectBoard')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('projectDetail.selectBoard')}</DialogTitle>
                    <DialogDescription>
                      {t('projectDetail.selectBoardDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {trelloBoards.map((board) => (
                      <div
                        key={board.id}
                        className="p-3 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() => selectBoardMutation.mutate({ boardId: board.id, boardName: board.name })}
                      >
                        <div className="font-medium">{board.name}</div>
                        <a
                          href={board.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {board.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Connected to: {trelloStatus.integration.config.boardName}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Board ID: {trelloStatus.integration.config.boardId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Sincronizar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Sincronizar Findings a Trello</DialogTitle>
                        <DialogDescription>
                          Selecciona los findings que quieres crear como tarjetas en "{trelloStatus.integration.config.boardName}"
                        </DialogDescription>
                      </DialogHeader>
                      <TrelloSyncDialog
                        projectId={id!}
                        onClose={() => setIsSyncDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => analyzeBoardMutation.mutate()}
                    disabled={analyzeBoardMutation.isPending}
                  >
                    {analyzeBoardMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {t('projectDetail.analyzeBoard')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disconnectTrelloMutation.mutate()}
                    disabled={disconnectTrelloMutation.isPending}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    {t('projectDetail.disconnect')}
                  </Button>
                </div>
              </div>

              {trelloStatus.integration.config.boardStructure && (
                <TrelloBoardAnalysis
                  boardStructure={trelloStatus.integration.config.boardStructure}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionRow({
  session,
  onRemove,
  isRemoving,
}: {
  session: Session;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: 'bg-gray-500',
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-yellow-500',
  };

  const status = session.state.status;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
      <Link
        to={`/sessions/${session.id}`}
        className="flex items-center gap-4 flex-1"
      >
        <div className={`w-2 h-2 rounded-full ${statusColors[status] || 'bg-gray-500'}`} />
        <div>
          <div className="font-medium">
            {session.personaName || 'Unknown Persona'} - {session.objectiveName || 'Unknown Objective'}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(session.createdAt)}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-4">
        <Badge variant="outline">{status}</Badge>
        <span className="text-sm text-muted-foreground">
          {session.state.actionCount} actions
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function CreateSessionDialog({
  personas,
  objectives,
  onCreate,
  isLoading,
}: {
  personas: Persona[];
  objectives: Objective[];
  onCreate: (data: { personaIds: string[]; objectiveIds: string[]; isBatch: boolean }) => void;
  isLoading: boolean;
}) {
  const [selectedPersonas, setSelectedPersonas] = useState<Set<string>>(new Set());
  const [selectedObjectives, setSelectedObjectives] = useState<Set<string>>(new Set());
  const [isBatch, setIsBatch] = useState(false);

  const togglePersona = (id: string) => {
    const newSet = new Set(selectedPersonas);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (!isBatch) newSet.clear();
      newSet.add(id);
    }
    setSelectedPersonas(newSet);
  };

  const toggleObjective = (id: string) => {
    const newSet = new Set(selectedObjectives);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (!isBatch) newSet.clear();
      newSet.add(id);
    }
    setSelectedObjectives(newSet);
  };

  const sessionCount = isBatch
    ? selectedPersonas.size * selectedObjectives.size
    : selectedPersonas.size > 0 && selectedObjectives.size > 0
    ? 1
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="batch"
          checked={isBatch}
          onCheckedChange={(checked: boolean) => {
            setIsBatch(checked);
            if (!checked) {
              // Reset to single selection
              if (selectedPersonas.size > 1) {
                setSelectedPersonas(new Set([Array.from(selectedPersonas)[0]]));
              }
              if (selectedObjectives.size > 1) {
                setSelectedObjectives(new Set([Array.from(selectedObjectives)[0]]));
              }
            }
          }}
        />
        <Label htmlFor="batch">Batch mode (all combinations)</Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">Personas</Label>
          <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  selectedPersonas.has(persona.id) ? 'bg-primary/10 border border-primary' : 'hover:bg-accent border border-transparent'
                }`}
                onClick={() => togglePersona(persona.id)}
              >
                <div className="font-medium text-sm">{persona.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Objectives</Label>
          <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2">
            {objectives.map((objective) => (
              <div
                key={objective.id}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  selectedObjectives.has(objective.id) ? 'bg-primary/10 border border-primary' : 'hover:bg-accent border border-transparent'
                }`}
                onClick={() => toggleObjective(objective.id)}
              >
                <div className="font-medium text-sm">{objective.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={() =>
            onCreate({
              personaIds: Array.from(selectedPersonas),
              objectiveIds: Array.from(selectedObjectives),
              isBatch,
            })
          }
          disabled={sessionCount === 0 || isLoading}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create {sessionCount} Session{sessionCount !== 1 ? 's' : ''}
        </Button>
      </DialogFooter>
    </div>
  );
}

function TrelloSyncDialog({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: preview, isLoading } = useQuery({
    queryKey: ['trello-sync-preview', projectId],
    queryFn: () => trelloApi.getSyncPreview(projectId),
  });

  const syncMutation = useMutation({
    mutationFn: (findingIds: string[]) => trelloApi.syncFindings(projectId, findingIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trello-sync-preview', projectId] });
      if (result.created > 0) {
        onClose();
      }
    },
  });

  // Auto-select all unsynced findings on load
  useEffect(() => {
    if (preview?.findings && selectedIds.size === 0) {
      const unsyncedIds = preview.findings
        .filter(f => !f.alreadySynced)
        .map(f => f.id);
      if (unsyncedIds.length > 0) {
        setSelectedIds(new Set(unsyncedIds));
      }
    }
  }, [preview]);

  const toggleFinding = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (preview?.findings) {
      const unsyncedIds = preview.findings
        .filter(f => !f.alreadySynced)
        .map(f => f.id);
      setSelectedIds(new Set(unsyncedIds));
    }
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const severityColors: Record<string, string> = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500 text-white',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!preview || preview.findings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hay findings para sincronizar.</p>
        <p className="text-sm mt-1">Ejecuta algunas sesiones primero.</p>
      </div>
    );
  }

  const unsyncedFindings = preview.findings.filter(f => !f.alreadySynced);
  const selectedCount = Array.from(selectedIds).filter(id =>
    unsyncedFindings.some(f => f.id === id)
  ).length;

  // Calculate summary by list for selected
  const selectedByList: Record<string, number> = {};
  for (const id of selectedIds) {
    const finding = preview.findings.find(f => f.id === id);
    if (finding && !finding.alreadySynced) {
      const listName = finding.targetList?.name || 'Unknown';
      selectedByList[listName] = (selectedByList[listName] || 0) + 1;
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span>
          {preview.summary.total} findings total, {preview.summary.alreadySynced} ya sincronizados
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Seleccionar todos
          </Button>
          <Button variant="ghost" size="sm" onClick={selectNone}>
            Ninguno
          </Button>
        </div>
      </div>

      {/* Findings list */}
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        {preview.findings.map((finding) => (
          <div
            key={finding.id}
            className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${
              finding.alreadySynced ? 'bg-muted/50 opacity-60' : 'hover:bg-accent/50 cursor-pointer'
            }`}
            onClick={() => !finding.alreadySynced && toggleFinding(finding.id)}
          >
            <Checkbox
              checked={finding.alreadySynced || selectedIds.has(finding.id)}
              disabled={finding.alreadySynced}
              onCheckedChange={() => toggleFinding(finding.id)}
            />
            <Badge className={`text-xs ${severityColors[finding.severity] || ''}`}>
              {finding.severity.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {finding.type}
            </Badge>
            <span className="flex-1 text-sm truncate" title={finding.description}>
              {finding.description.slice(0, 60)}{finding.description.length > 60 ? '...' : ''}
            </span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-xs font-medium">
              {finding.targetList?.name || 'Unknown'}
            </span>
            {finding.alreadySynced && finding.trelloCardUrl && (
              <a
                href={finding.trelloCardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Ver tarjeta
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Selected summary */}
      {selectedCount > 0 && (
        <div className="p-3 border rounded-lg bg-muted/50 text-sm">
          <p className="font-medium mb-2">Se crearán {selectedCount} tarjetas:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(selectedByList).map(([listName, count]) => (
              <Badge key={listName} variant="secondary">
                {listName}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Sync result */}
      {syncMutation.isSuccess && (
        <div className="p-3 border rounded-lg bg-green-50 text-green-800 text-sm">
          <p className="font-medium">
            {syncMutation.data.created} tarjetas creadas
            {syncMutation.data.failed > 0 && `, ${syncMutation.data.failed} fallaron`}
          </p>
        </div>
      )}

      {syncMutation.isError && (
        <div className="p-3 border rounded-lg bg-red-50 text-red-800 text-sm">
          Error al sincronizar: {(syncMutation.error as Error).message}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={() => syncMutation.mutate(Array.from(selectedIds))}
          disabled={selectedCount === 0 || syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Crear {selectedCount} tarjeta{selectedCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}

function TrelloBoardAnalysis({ boardStructure }: { boardStructure: TrelloBoardStructure }) {
  const typeLabels: Record<string, string> = {
    'bug': 'Bugs',
    'ux-issue': 'UX Issues',
    'accessibility': 'Accessibility',
    'performance': 'Performance',
    'visual-design': 'Visual Design',
    'content': 'Content',
    'default': 'Default',
  };

  return (
    <div className="p-4 border rounded-lg bg-muted/50">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        AI Board Analysis
      </h4>
      <p className="text-sm text-muted-foreground mb-3">
        Claude analyzed your board and will create cards in these lists:
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {boardStructure.recommendedLists && Object.entries(boardStructure.recommendedLists).map(([type, listId]) => {
          const list = boardStructure.lists.find(l => l.id === listId);
          return (
            <div key={type} className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {typeLabels[type] || type}
              </Badge>
              <span className="text-muted-foreground">→</span>
              <span>{list?.name || 'Unknown list'}</span>
            </div>
          );
        })}
      </div>
      {boardStructure.analyzedAt && (
        <p className="text-xs text-muted-foreground mt-3">
          Last analyzed: {new Date(boardStructure.analyzedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function AddSessionsDialog({
  availableSessions,
  onAdd,
  isLoading,
}: {
  availableSessions: Session[];
  onAdd: (ids: string[]) => void;
  isLoading: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const filteredSessions = availableSessions.filter(
    (s) =>
      filter === '' ||
      s.personaName?.toLowerCase().includes(filter.toLowerCase()) ||
      s.objectiveName?.toLowerCase().includes(filter.toLowerCase()) ||
      s.targetUrl.toLowerCase().includes(filter.toLowerCase())
  );

  const toggleSession = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filter sessions..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {filteredSessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No available sessions to add.
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedIds.has(session.id) ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
              }`}
              onClick={() => toggleSession(session.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {session.personaName || 'Unknown'} - {session.objectiveName || 'Unknown'}
                  </div>
                  <div className="text-sm text-muted-foreground">{session.targetUrl}</div>
                </div>
                <Badge variant="outline">{session.state.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <DialogFooter>
        <Button
          onClick={() => onAdd(Array.from(selectedIds))}
          disabled={selectedIds.size === 0 || isLoading}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add {selectedIds.size} Session{selectedIds.size !== 1 ? 's' : ''}
        </Button>
      </DialogFooter>
    </div>
  );
}
