/**
 * Configuration Loader - YAML persona and objective loading
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { Persona, Objective } from '@testfarm/shared';
import { nanoid } from 'nanoid';

// ============================================================================
// Schemas
// ============================================================================

const PersonaDefinitionSchema = z.object({
  persona: z.object({
    name: z.string(),
    identity: z.string(),
    techProfile: z.string(),
    personality: z.string(),
    context: z.string(),
    tendencies: z.array(z.string()),
    metadata: z.object({
      archetype: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }).optional(),
  }),
});

const ObjectiveDefinitionSchema = z.object({
  objective: z.object({
    name: z.string().optional(),
    goal: z.string(),
    autonomy: z.object({
      level: z.enum(['exploration', 'goal-directed', 'restricted', 'semi-guided']),
      bounds: z.object({
        maxPages: z.number().optional(),
        maxDuration: z.number().optional(),
        maxActions: z.number().optional(),
      }).optional(),
      restrictions: z.array(z.string()).optional(),
      steps: z.array(z.string()).optional(),
    }),
    successCriteria: z.object({
      type: z.enum(['none', 'element-present', 'url-match', 'custom']),
      condition: z.string().optional(),
    }).optional(),
  }),
});

// ============================================================================
// Loader Functions
// ============================================================================

export function loadPersonaFromFile(filePath: string): Persona {
  if (!existsSync(filePath)) {
    throw new Error(`Persona file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(content);
  const validated = PersonaDefinitionSchema.parse(parsed);

  const { persona } = validated;

  return {
    id: nanoid(),
    name: persona.name,
    identity: persona.identity,
    techProfile: persona.techProfile,
    personality: persona.personality,
    context: persona.context,
    tendencies: persona.tendencies,
    metadata: persona.metadata,
  };
}

export function loadObjectiveFromFile(filePath: string): Objective {
  if (!existsSync(filePath)) {
    throw new Error(`Objective file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(content);
  const validated = ObjectiveDefinitionSchema.parse(parsed);

  const { objective } = validated;

  return {
    id: nanoid(),
    name: objective.name || basename(filePath, '.yaml'),
    goal: objective.goal,
    autonomy: {
      level: objective.autonomy.level,
      bounds: objective.autonomy.bounds,
      restrictions: objective.autonomy.restrictions,
      steps: objective.autonomy.steps,
    },
    successCriteria: objective.successCriteria,
  };
}

// ============================================================================
// Directory Loaders
// ============================================================================

export function loadPersonasFromDir(dirPath: string): Persona[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const files = readdirSync(dirPath).filter(
    (f) => f.endsWith('.yaml') || f.endsWith('.yml')
  );

  return files.map((file) => loadPersonaFromFile(join(dirPath, file)));
}

export function loadObjectivesFromDir(dirPath: string): Objective[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const files = readdirSync(dirPath).filter(
    (f) => f.endsWith('.yaml') || f.endsWith('.yml')
  );

  return files.map((file) => loadObjectiveFromFile(join(dirPath, file)));
}

// ============================================================================
// Default Paths
// ============================================================================

export function getDefaultPersonasDir(): string {
  return join(process.cwd(), 'personas');
}

export function getDefaultObjectivesDir(): string {
  return join(process.cwd(), 'objectives');
}
