import yaml from 'js-yaml';
import type { ImportPersonaInput, ImportObjectiveInput } from './api';

export interface ParsedPersonasResult {
  personas: ImportPersonaInput[];
  errors: string[];
}

export interface ParsedObjectivesResult {
  objectives: ImportObjectiveInput[];
  errors: string[];
}

export function parsePersonasYaml(content: string): ParsedPersonasResult {
  const errors: string[] = [];
  const personas: ImportPersonaInput[] = [];

  try {
    const data = yaml.load(content) as Record<string, unknown>;

    if (!data || typeof data !== 'object') {
      errors.push('Invalid YAML format');
      return { personas, errors };
    }

    // Handle both single persona and array format
    let personaList: unknown[];
    if (Array.isArray(data.personas)) {
      personaList = data.personas;
    } else if (data.name) {
      // Single persona format
      personaList = [data];
    } else {
      errors.push('Expected "personas" array or a single persona object with "name" field');
      return { personas, errors };
    }

    for (let i = 0; i < personaList.length; i++) {
      const p = personaList[i] as Record<string, unknown>;

      if (!p.name || typeof p.name !== 'string') {
        errors.push(`Persona at index ${i}: missing or invalid "name" field`);
        continue;
      }

      personas.push({
        name: p.name,
        identity: typeof p.identity === 'string' ? p.identity : undefined,
        techProfile: typeof p.techProfile === 'string' ? p.techProfile : undefined,
        personality: typeof p.personality === 'string' ? p.personality : undefined,
        context: typeof p.context === 'string' ? p.context : undefined,
        tendencies: Array.isArray(p.tendencies) ? p.tendencies.filter((t): t is string => typeof t === 'string') : undefined,
        metadata: p.metadata as { archetype?: string; tags?: string[] } | undefined,
      });
    }
  } catch (err) {
    errors.push(`YAML parse error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return { personas, errors };
}

export function parseObjectivesYaml(content: string): ParsedObjectivesResult {
  const errors: string[] = [];
  const objectives: ImportObjectiveInput[] = [];

  try {
    const data = yaml.load(content) as Record<string, unknown>;

    if (!data || typeof data !== 'object') {
      errors.push('Invalid YAML format');
      return { objectives, errors };
    }

    // Handle both single objective and array format
    let objectiveList: unknown[];
    if (Array.isArray(data.objectives)) {
      objectiveList = data.objectives;
    } else if (data.name) {
      // Single objective format
      objectiveList = [data];
    } else {
      errors.push('Expected "objectives" array or a single objective object with "name" field');
      return { objectives, errors };
    }

    for (let i = 0; i < objectiveList.length; i++) {
      const o = objectiveList[i] as Record<string, unknown>;

      if (!o.name || typeof o.name !== 'string') {
        errors.push(`Objective at index ${i}: missing or invalid "name" field`);
        continue;
      }

      const autonomy = o.autonomy as { level?: string; bounds?: { maxActions?: number; maxDuration?: number } } | undefined;
      const successCriteria = o.successCriteria as { type: 'none' | 'element-present' | 'url-match' | 'custom'; condition?: string } | undefined;

      objectives.push({
        name: o.name,
        goal: typeof o.goal === 'string' ? o.goal : undefined,
        constraints: Array.isArray(o.constraints) ? o.constraints.filter((c): c is string => typeof c === 'string') : undefined,
        successCriteria: successCriteria,
        autonomy: autonomy,
        restrictions: Array.isArray(o.restrictions) ? o.restrictions.filter((r): r is string => typeof r === 'string') : undefined,
        steps: Array.isArray(o.steps) ? o.steps.filter((s): s is string => typeof s === 'string') : undefined,
      });
    }
  } catch (err) {
    errors.push(`YAML parse error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return { objectives, errors };
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
