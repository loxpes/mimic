import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { projectsApi, sessionsApi, type Session } from '@/lib/api';
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
} from 'lucide-react';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isAddSessionsOpen, setIsAddSessionsOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.list,
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
        <p className="text-muted-foreground">Project not found</p>
        <Link to="/projects">
          <Button variant="link">Back to Projects</Button>
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
    very_easy: 'Very Easy',
    easy: 'Easy',
    moderate: 'Moderate',
    difficult: 'Difficult',
    very_difficult: 'Very Difficult',
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
          Refresh Stats
        </Button>
      </div>

      {project.description && (
        <p className="text-muted-foreground">{project.description}</p>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sessions</CardDescription>
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
            <CardDescription>Total Findings</CardDescription>
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
            <CardDescription>Average Score</CardDescription>
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
            <CardDescription>Average Difficulty</CardDescription>
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
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Testing sessions in this project</CardDescription>
            </div>
            <Dialog open={isAddSessionsOpen} onOpenChange={setIsAddSessionsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sessions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Sessions to Project</DialogTitle>
                  <DialogDescription>
                    Select sessions to add to this project.
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
        </CardHeader>
        <CardContent>
          {project.sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No sessions in this project yet.</p>
              <p className="text-sm mt-1">Add existing sessions or create new ones.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-gray-500',
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-yellow-500',
  };

  const status = session.state.status;

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${statusColors[status] || 'bg-gray-500'}`} />
        <div>
          <div className="font-medium">
            {session.personaName || 'Unknown Persona'} - {session.objectiveName || 'Unknown Objective'}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(session.createdAt)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant="outline">{status}</Badge>
        <span className="text-sm text-muted-foreground">
          {session.state.actionCount} actions
        </span>
      </div>
    </Link>
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
