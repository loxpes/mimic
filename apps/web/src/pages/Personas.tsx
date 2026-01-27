import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { personasApi, type Persona, type CreatePersonaInput, type ImportPersonaInput } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { parsePersonasYaml } from '@/lib/yaml-parser';
import { Users, Brain, Heart, Zap, Plus, Upload, Pencil, Trash2 } from 'lucide-react';
import { PersonaForm } from '@/components/personas/PersonaForm';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';

export function Personas() {
  const queryClient = useQueryClient();

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: personasApi.list,
  });

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  // Mutations
  const createMutation = useMutation({
    mutationFn: personasApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePersonaInput }) =>
      personasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      setFormOpen(false);
      setSelectedPersona(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: personasApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      setDeleteOpen(false);
      setSelectedPersona(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: personasApi.importBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
  });

  const handleCreate = () => {
    setSelectedPersona(null);
    setFormOpen(true);
  };

  const handleEdit = (persona: Persona) => {
    setSelectedPersona(persona);
    setFormOpen(true);
  };

  const handleDelete = (persona: Persona) => {
    setSelectedPersona(persona);
    setDeleteOpen(true);
  };

  const handleSubmit = async (data: CreatePersonaInput) => {
    if (selectedPersona) {
      await updateMutation.mutateAsync({ id: selectedPersona.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleImport = async (items: ImportPersonaInput[]) => {
    await importMutation.mutateAsync(items);
  };

  const handleConfirmDelete = async () => {
    if (selectedPersona) {
      await deleteMutation.mutateAsync(selectedPersona.id);
    }
  };

  const parseYamlForImport = (content: string) => {
    const result = parsePersonasYaml(content);
    return { items: result.personas, errors: result.errors };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personas</h1>
          <p className="text-muted-foreground">
            AI agents with unique personalities and behaviors
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import YAML
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Persona
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">AI-Powered Personas</h3>
            <p className="text-sm text-muted-foreground">
              Personas are defined in natural language. The AI agent embodies each persona's
              characteristics, making decisions based on their personality, tech-savviness,
              and behavioral tendencies.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Personas Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading personas...</div>
      ) : personas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No personas defined yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new persona or import from YAML
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import YAML
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Persona
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {personas.map((persona) => {
            const definition = persona.definition as {
              identity?: string;
              techProfile?: string;
              personality?: string;
              tendencies?: string[];
            };
            const metadata = persona.metadata as {
              archetype?: string;
              tags?: string[];
            };

            return (
              <Card key={persona.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{persona.name}</CardTitle>
                        <CardDescription>Added {formatDate(persona.createdAt)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {metadata.archetype && <Badge variant="outline">{metadata.archetype}</Badge>}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(persona)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(persona)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Identity */}
                  {definition.identity && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-1">
                        <Heart className="h-4 w-4 text-pink-500" />
                        Identity
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {definition.identity}
                      </p>
                    </div>
                  )}

                  {/* Tech Profile */}
                  {definition.techProfile && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-1">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        Tech Profile
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {definition.techProfile}
                      </p>
                    </div>
                  )}

                  {/* Tendencies */}
                  {definition.tendencies && definition.tendencies.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Behavioral Tendencies</div>
                      <div className="flex flex-wrap gap-1">
                        {definition.tendencies.slice(0, 4).map((tendency, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tendency.length > 40 ? tendency.substring(0, 40) + '...' : tendency}
                          </Badge>
                        ))}
                        {definition.tendencies.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{definition.tendencies.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {metadata.tags && metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t">
                      {metadata.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <PersonaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        persona={selectedPersona}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ImportDialog<ImportPersonaInput>
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
        parseYaml={parseYamlForImport}
        title="Import Personas"
        description="Upload a YAML file containing persona definitions"
        itemName="persona"
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Persona"
        description={`Are you sure you want to delete "${selectedPersona?.name}"? This action cannot be undone.`}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
