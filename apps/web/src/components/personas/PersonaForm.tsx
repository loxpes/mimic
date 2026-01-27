import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Persona, CreatePersonaInput } from '@/lib/api';

interface PersonaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePersonaInput) => Promise<void>;
  persona?: Persona | null;
  isSubmitting?: boolean;
}

const ARCHETYPES = [
  'novice',
  'tech-savvy',
  'power-user',
  'casual-browser',
  'cautious-shopper',
  'professional',
  'elderly',
  'mobile-first',
];

export function PersonaForm({
  open,
  onOpenChange,
  onSubmit,
  persona,
  isSubmitting = false,
}: PersonaFormProps) {
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [techProfile, setTechProfile] = useState('');
  const [personality, setPersonality] = useState('');
  const [context, setContext] = useState('');
  const [tendencies, setTendencies] = useState('');
  const [archetype, setArchetype] = useState('');
  const [tags, setTags] = useState('');
  const [credentialsEmail, setCredentialsEmail] = useState('');
  const [credentialsPassword, setCredentialsPassword] = useState('');

  // Sync form state when persona changes
  useEffect(() => {
    if (persona) {
      const definition = persona.definition as {
        identity?: string;
        techProfile?: string;
        personality?: string;
        context?: string;
        tendencies?: string[];
        credentials?: { email?: string; password?: string };
      } | undefined;

      const metadata = persona.metadata as {
        archetype?: string;
        tags?: string[];
      } | undefined;

      setName(persona.name || '');
      setIdentity(definition?.identity || '');
      setTechProfile(definition?.techProfile || '');
      setPersonality(definition?.personality || '');
      setContext(definition?.context || '');
      setTendencies(definition?.tendencies?.join('\n') || '');
      setArchetype(metadata?.archetype || '');
      setTags(metadata?.tags?.join(', ') || '');
      setCredentialsEmail(definition?.credentials?.email || '');
      setCredentialsPassword(definition?.credentials?.password || '');
    } else {
      // Reset form for new persona
      setName('');
      setIdentity('');
      setTechProfile('');
      setPersonality('');
      setContext('');
      setTendencies('');
      setArchetype('');
      setTags('');
      setCredentialsEmail('');
      setCredentialsPassword('');
    }
  }, [persona, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tendenciesArray = tendencies
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);

    const tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Build credentials object only if both email and password are provided
    const credentials = credentialsEmail.trim() && credentialsPassword.trim()
      ? { email: credentialsEmail.trim(), password: credentialsPassword.trim() }
      : undefined;

    await onSubmit({
      name,
      definition: {
        identity: identity || undefined,
        techProfile: techProfile || undefined,
        personality: personality || undefined,
        context: context || undefined,
        tendencies: tendenciesArray.length > 0 ? tendenciesArray : undefined,
        credentials,
      },
      metadata: {
        archetype: archetype || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      },
    });
  };

  const isEditing = !!persona;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Persona' : 'Create New Persona'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the persona definition and metadata.'
              : 'Define a new AI persona with unique characteristics and behaviors.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Maria Garcia"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="identity">Identity</Label>
            <Textarea
              id="identity"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="Describe who this persona is..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="techProfile">Tech Profile</Label>
            <Textarea
              id="techProfile"
              value={techProfile}
              onChange={(e) => setTechProfile(e.target.value)}
              placeholder="Describe their technical abilities..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">Personality</Label>
            <Textarea
              id="personality"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Describe their personality traits..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What brings them to this website..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tendencies">Behavioral Tendencies (one per line)</Label>
            <Textarea
              id="tendencies"
              value={tendencies}
              onChange={(e) => setTendencies(e.target.value)}
              placeholder="Reads descriptions carefully&#10;Compares prices before buying&#10;Looks for reviews"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="archetype">Archetype</Label>
              <Select value={archetype} onValueChange={setArchetype}>
                <SelectTrigger id="archetype">
                  <SelectValue placeholder="Select archetype" />
                </SelectTrigger>
                <SelectContent>
                  {ARCHETYPES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., elderly, low-tech"
              />
            </div>
          </div>

          {/* Credentials Section */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Credenciales de Prueba (opcional)</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Si no defines credenciales, se generarán automáticamente para registro.
              Si las defines, se usarán para login directo.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credentialsEmail">Email</Label>
                <Input
                  id="credentialsEmail"
                  type="email"
                  value={credentialsEmail}
                  onChange={(e) => setCredentialsEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credentialsPassword">Password</Label>
                <Input
                  id="credentialsPassword"
                  type="text"
                  value={credentialsPassword}
                  onChange={(e) => setCredentialsPassword(e.target.value)}
                  placeholder="Contraseña"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Persona'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
