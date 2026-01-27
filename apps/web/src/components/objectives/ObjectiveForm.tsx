import { useState } from 'react';
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
import type { Objective, CreateObjectiveInput } from '@/lib/api';

interface ObjectiveFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateObjectiveInput) => Promise<void>;
  objective?: Objective | null;
  isSubmitting?: boolean;
}

const AUTONOMY_LEVELS = [
  { value: 'exploration', label: 'Exploration - Free to explore' },
  { value: 'guided', label: 'Guided - Follow specific steps' },
  { value: 'restricted', label: 'Restricted - Limited actions' },
];

const SUCCESS_CRITERIA_TYPES = [
  { value: 'none', label: 'None - No specific success criteria' },
  { value: 'element-present', label: 'Element Present - Check for element' },
  { value: 'url-match', label: 'URL Match - Check URL pattern' },
  { value: 'custom', label: 'Custom - Custom validation' },
];

export function ObjectiveForm({
  open,
  onOpenChange,
  onSubmit,
  objective,
  isSubmitting = false,
}: ObjectiveFormProps) {
  const definition = objective?.definition as {
    goal?: string;
    constraints?: string[];
    successCriteria?: {
      type: 'none' | 'element-present' | 'url-match' | 'custom';
      condition?: string;
    };
  } | undefined;

  const config = objective?.config as {
    autonomyLevel?: string;
    maxActions?: number;
    maxDuration?: number;
    restrictions?: string[];
    steps?: string[];
  } | undefined;

  const [name, setName] = useState(objective?.name || '');
  const [goal, setGoal] = useState(definition?.goal || '');
  const [constraints, setConstraints] = useState(definition?.constraints?.join('\n') || '');
  const [successType, setSuccessType] = useState<'none' | 'element-present' | 'url-match' | 'custom'>(definition?.successCriteria?.type || 'none');
  const [successCondition, setSuccessCondition] = useState(
    definition?.successCriteria?.condition || ''
  );
  const [autonomyLevel, setAutonomyLevel] = useState(config?.autonomyLevel || 'exploration');
  const [maxActions, setMaxActions] = useState(config?.maxActions?.toString() || '50');
  const [maxDuration, setMaxDuration] = useState(config?.maxDuration?.toString() || '10');
  const [restrictions, setRestrictions] = useState(config?.restrictions?.join('\n') || '');
  const [steps, setSteps] = useState(config?.steps?.join('\n') || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const constraintsArray = constraints
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean);

    const restrictionsArray = restrictions
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const stepsArray = steps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    await onSubmit({
      name,
      definition: {
        goal: goal || undefined,
        constraints: constraintsArray.length > 0 ? constraintsArray : undefined,
        successCriteria: {
          type: successType as 'none' | 'element-present' | 'url-match' | 'custom',
          condition: successCondition || undefined,
        },
      },
      config: {
        autonomyLevel: autonomyLevel || undefined,
        maxActions: parseInt(maxActions) || 50,
        maxDuration: parseInt(maxDuration) || 10,
        restrictions: restrictionsArray.length > 0 ? restrictionsArray : undefined,
        steps: stepsArray.length > 0 ? stepsArray : undefined,
      },
    });

    // Reset form on success
    if (!objective) {
      setName('');
      setGoal('');
      setConstraints('');
      setSuccessType('none');
      setSuccessCondition('');
      setAutonomyLevel('exploration');
      setMaxActions('50');
      setMaxDuration('10');
      setRestrictions('');
      setSteps('');
    }
  };

  const isEditing = !!objective;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Objective' : 'Create New Objective'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the objective definition and configuration.'
              : 'Define a new testing objective with goals and constraints.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Complete Checkout Flow"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Goal</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe what the agent should accomplish..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="autonomyLevel">Autonomy Level</Label>
              <Select value={autonomyLevel} onValueChange={setAutonomyLevel}>
                <SelectTrigger id="autonomyLevel">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {AUTONOMY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="successType">Success Criteria</Label>
              <Select value={successType} onValueChange={(value) => setSuccessType(value as 'none' | 'element-present' | 'url-match' | 'custom')}>
                <SelectTrigger id="successType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SUCCESS_CRITERIA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {successType !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="successCondition">Success Condition</Label>
              <Input
                id="successCondition"
                value={successCondition}
                onChange={(e) => setSuccessCondition(e.target.value)}
                placeholder={
                  successType === 'element-present'
                    ? 'e.g., .order-confirmation'
                    : successType === 'url-match'
                    ? 'e.g., /thank-you'
                    : 'Custom condition...'
                }
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxActions">Max Actions</Label>
              <Input
                id="maxActions"
                type="number"
                value={maxActions}
                onChange={(e) => setMaxActions(e.target.value)}
                min="1"
                max="200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDuration">Max Duration (minutes)</Label>
              <Input
                id="maxDuration"
                type="number"
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
                min="1"
                max="60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="constraints">Constraints (one per line)</Label>
            <Textarea
              id="constraints"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Do not click on ads&#10;Stay within the shop section&#10;Do not submit real payment info"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="restrictions">Restrictions (one per line)</Label>
            <Textarea
              id="restrictions"
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
              placeholder="No external links&#10;No downloads"
              rows={2}
            />
          </div>

          {autonomyLevel === 'guided' && (
            <div className="space-y-2">
              <Label htmlFor="steps">Guided Steps (one per line)</Label>
              <Textarea
                id="steps"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="1. Navigate to the shop page&#10;2. Add an item to cart&#10;3. Go to checkout"
                rows={4}
              />
            </div>
          )}

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
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Objective'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
