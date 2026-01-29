import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { projectsApi, type Project } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  FolderOpen,
  Plus,
  ExternalLink,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Loader2,
} from 'lucide-react';

export function Projects() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', targetUrl: '', description: '' });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateOpen(false);
      setNewProject({ name: '', targetUrl: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCreate = () => {
    if (newProject.name && newProject.targetUrl) {
      createMutation.mutate(newProject);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Group and track testing sessions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a project to group related testing sessions together.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g., Evy Chat Testing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetUrl">Target URL</Label>
                <Input
                  id="targetUrl"
                  value={newProject.targetUrl}
                  onChange={(e) => setNewProject({ ...newProject, targetUrl: e.target.value })}
                  placeholder="https://app.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Brief description of the project"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newProject.name || !newProject.targetUrl || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create a project to start grouping your testing sessions.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={() => deleteMutation.mutate(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const stats = project.stats;

  const getSeverityBadge = (severity: string, count: number) => {
    const variants: Record<string, 'destructive' | 'warning' | 'default' | 'secondary'> = {
      critical: 'destructive',
      high: 'warning',
      medium: 'default',
      low: 'secondary',
    };
    return (
      <Badge key={severity} variant={variants[severity] || 'secondary'} className="text-xs">
        {count} {severity}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              {project.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {project.targetUrl}
            </CardDescription>
          </div>
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-2">{project.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="font-medium">{stats?.totalSessions || 0}</span>
            <span className="text-muted-foreground">sessions</span>
          </div>
          {stats && stats.completedSessions > 0 && (
            <div className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span>{stats.completedSessions}</span>
            </div>
          )}
          {stats && stats.failedSessions > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <XCircle className="h-4 w-4" />
              <span>{stats.failedSessions}</span>
            </div>
          )}
          {stats && stats.pendingSessions > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{stats.pendingSessions}</span>
            </div>
          )}
        </div>

        {/* Findings */}
        {stats && stats.totalFindings > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{stats.totalFindings} findings</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.findingsBySeverity)
                .sort((a, b) => {
                  const order = { critical: 0, high: 1, medium: 2, low: 3 };
                  return (order[a[0] as keyof typeof order] || 4) - (order[b[0] as keyof typeof order] || 4);
                })
                .map(([severity, count]) => getSeverityBadge(severity, count))}
            </div>
          </div>
        )}

        {/* Average Score */}
        {stats?.averageScore !== null && stats?.averageScore !== undefined && (
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm">
              Avg Score: <span className="font-medium">{stats.averageScore}/10</span>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Link to={`/projects/${project.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Created date */}
        <p className="text-xs text-muted-foreground">
          Created {formatDate(project.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}
