import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { objectivesApi, type Objective, type CreateObjectiveInput, type ImportObjectiveInput } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { parseObjectivesYaml } from '@/lib/yaml-parser';
import { Target, CheckCircle2, AlertCircle, Gauge, Plus, Upload, Pencil, Trash2 } from 'lucide-react';
import { ObjectiveForm } from '@/components/objectives/ObjectiveForm';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';

export function Objectives() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['objectives'],
    queryFn: objectivesApi.list,
  });

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);

  // Mutations
  const createMutation = useMutation({
    mutationFn: objectivesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateObjectiveInput }) =>
      objectivesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      setFormOpen(false);
      setSelectedObjective(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: objectivesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      setDeleteOpen(false);
      setSelectedObjective(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: objectivesApi.importBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });

  const handleCreate = () => {
    setSelectedObjective(null);
    setFormOpen(true);
  };

  const handleEdit = (objective: Objective) => {
    setSelectedObjective(objective);
    setFormOpen(true);
  };

  const handleDelete = (objective: Objective) => {
    setSelectedObjective(objective);
    setDeleteOpen(true);
  };

  const handleSubmit = async (data: CreateObjectiveInput) => {
    if (selectedObjective) {
      await updateMutation.mutateAsync({ id: selectedObjective.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleImport = async (items: ImportObjectiveInput[]) => {
    await importMutation.mutateAsync(items);
  };

  const handleConfirmDelete = async () => {
    if (selectedObjective) {
      await deleteMutation.mutateAsync(selectedObjective.id);
    }
  };

  const parseYamlForImport = (content: string) => {
    const result = parseObjectivesYaml(content);
    return { items: result.objectives, errors: result.errors };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('objectives.title')}</h1>
          <p className="text-muted-foreground">{t('objectives.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('objectives.importYaml')}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('objectives.newObjective')}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">{t('objectives.goalDirected')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('objectives.goalDirectedDesc')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Objectives Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      ) : objectives.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">{t('objectives.noObjectives')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('objectives.noObjectivesDesc')}
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                {t('objectives.importYaml')}
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {t('objectives.newObjective')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {objectives.map((objective) => {
            const definition = objective.definition as {
              goal?: string;
              constraints?: string[];
              successCriteria?: {
                type: 'none' | 'element-present' | 'url-match' | 'custom';
                condition?: string;
              };
            };
            const config = objective.config as {
              autonomyLevel?: string;
              maxActions?: number;
              steps?: string[];
            };

            return (
              <Card key={objective.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                        <Target className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle>{objective.name}</CardTitle>
                        <CardDescription>{t('objectives.added')} {formatDate(objective.createdAt)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.autonomyLevel && (
                        <Badge
                          variant={
                            config.autonomyLevel === 'exploration'
                              ? 'default'
                              : config.autonomyLevel === 'restricted'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {config.autonomyLevel}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(objective)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(objective)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Goal */}
                  {definition.goal && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-1">
                        <Target className="h-4 w-4 text-green-500" />
                        {t('objectives.goal')}
                      </div>
                      <p className="text-sm text-muted-foreground">{definition.goal}</p>
                    </div>
                  )}

                  {/* Success Criteria */}
                  {definition.successCriteria && definition.successCriteria.type !== 'none' && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-1">
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        {t('objectives.successCriteria')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <Badge variant="outline" className="mr-2">{definition.successCriteria.type}</Badge>
                        {definition.successCriteria.condition && (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">{definition.successCriteria.condition}</code>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Constraints */}
                  {definition.constraints && definition.constraints.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        {t('objectives.constraints')}
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {definition.constraints.map((constraint, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-orange-500 mt-1">•</span>
                            {constraint}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Config */}
                  <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
                    {config.maxActions && (
                      <div className="flex items-center gap-1">
                        <Gauge className="h-4 w-4" />
                        {t('objectives.maxActions')} {config.maxActions}
                      </div>
                    )}
                    {config.steps && (
                      <div>{config.steps.length} {t('objectives.guidedSteps')}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ObjectiveForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        objective={selectedObjective}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ImportDialog<ImportObjectiveInput>
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
        parseYaml={parseYamlForImport}
        title={t('objectives.importYaml')}
        description={t('objectives.noObjectivesDesc')}
        itemName="objective"
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        title={t('common.delete')}
        description={`${t('common.delete')} "${selectedObjective?.name}"?`}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
