import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
} from '@/components/ui/dialog';
import { projectsApi, type Project } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  FolderOpen,
  Plus,
  ExternalLink,
  Trash2,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Loader2,
} from 'lucide-react';

export function Projects() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: '', targetUrl: '', description: '' });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDialogOpen(false);
      setFormData({ name: '', targetUrl: '', description: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; targetUrl?: string } }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDialogOpen(false);
      setSelectedProject(null);
      setFormData({ name: '', targetUrl: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCreate = () => {
    setSelectedProject(null);
    setFormData({ name: '', targetUrl: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      targetUrl: project.targetUrl,
      description: project.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.targetUrl) return;

    if (selectedProject) {
      updateMutation.mutate({
        id: selectedProject.id,
        data: {
          name: formData.name,
          targetUrl: formData.targetUrl,
          description: formData.description,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
          <h1 className="text-3xl font-bold">{t('projects.title')}</h1>
          <p className="text-muted-foreground">{t('projects.subtitle')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('projects.newProject')}
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProject ? t('projects.editProject') : t('projects.createProject')}
            </DialogTitle>
            <DialogDescription>
              {selectedProject ? t('projects.editProjectDesc') : t('projects.noProjectsDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('projects.projectName')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Chat Testing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetUrl">{t('projects.targetUrl')}</Label>
              <Input
                id="targetUrl"
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                placeholder="https://app.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('common.description')}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('common.description')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.targetUrl || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedProject ? t('common.save') : t('projects.createProject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('projects.noProjects')}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('projects.noProjectsDesc')}
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('projects.createProject')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => handleEdit(project)}
              onDelete={() => deleteMutation.mutate(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
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
        {count} {t(`findings.severities.${severity}`)}
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
            <span className="text-muted-foreground">{t('nav.sessions').toLowerCase()}</span>
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
              <span className="text-sm font-medium">{stats.totalFindings} {t('projects.findings').toLowerCase()}</span>
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
              {t('common.view')}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
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
          {formatDate(project.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}
