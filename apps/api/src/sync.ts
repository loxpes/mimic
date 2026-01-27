/**
 * YAML to Database Sync - Auto-sync personas and objectives from YAML files
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { parse as parseYaml } from 'yaml';
import { getDb, personas, objectives } from '@testfarm/db';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// ============================================================================
// Types
// ============================================================================

interface PersonaYaml {
  persona: {
    name: string;
    identity: string;
    techProfile: string;
    personality: string;
    context: string;
    tendencies: string[];
    metadata?: {
      archetype?: string;
      tags?: string[];
    };
  };
}

interface ObjectiveYaml {
  objective: {
    name?: string;
    goal: string;
    autonomy: {
      level: 'exploration' | 'goal-directed' | 'restricted' | 'semi-guided';
      bounds?: {
        maxPages?: number;
        maxDuration?: number;
        maxActions?: number;
      };
      restrictions?: string[];
      steps?: string[];
    };
    successCriteria?: {
      type: 'none' | 'element-present' | 'url-match' | 'custom';
      condition?: string;
    };
    guidedSteps?: string[];
  };
}

// ============================================================================
// Helpers
// ============================================================================

function generateIdFromFile(filePath: string): string {
  // Use file path hash as stable ID
  return createHash('md5').update(filePath).digest('hex').substring(0, 16);
}

function findProjectRoot(): string {
  // Start from current working directory and look for personas/ or objectives/
  let dir = process.cwd();

  // Try common locations
  const candidates = [
    dir,
    join(dir, '..'),
    join(dir, '../..'),
    join(dir, '../../..'),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'personas')) || existsSync(join(candidate, 'objectives'))) {
      return candidate;
    }
  }

  return dir;
}

// ============================================================================
// Sync Functions
// ============================================================================

export async function syncPersonas(personasDir?: string): Promise<number> {
  const projectRoot = findProjectRoot();
  const dir = personasDir || join(projectRoot, 'personas');

  if (!existsSync(dir)) {
    console.log(`Personas directory not found: ${dir}`);
    return 0;
  }

  const files = readdirSync(dir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  const db = getDb();
  let synced = 0;

  for (const file of files) {
    try {
      const filePath = join(dir, file);
      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseYaml(content) as PersonaYaml;

      if (!parsed.persona) {
        console.warn(`Skipping ${file}: no persona definition found`);
        continue;
      }

      const { persona } = parsed;
      const id = generateIdFromFile(filePath);

      // Check if exists
      const existing = await db.select().from(personas).where(eq(personas.id, id)).get();

      const personaData = {
        id,
        name: persona.name,
        definition: {
          identity: persona.identity,
          techProfile: persona.techProfile,
          personality: persona.personality,
          context: persona.context,
          tendencies: persona.tendencies,
        },
        metadata: {
          archetype: persona.metadata?.archetype,
          tags: persona.metadata?.tags,
          createdAt: existing?.metadata?.createdAt || Date.now(),
          updatedAt: Date.now(),
          sourceFile: file,
        },
      };

      if (existing) {
        await db.update(personas).set(personaData).where(eq(personas.id, id));
      } else {
        await db.insert(personas).values(personaData);
      }

      synced++;
    } catch (error) {
      console.error(`Error syncing persona ${file}:`, error);
    }
  }

  return synced;
}

export async function syncObjectives(objectivesDir?: string): Promise<number> {
  const projectRoot = findProjectRoot();
  const dir = objectivesDir || join(projectRoot, 'objectives');

  if (!existsSync(dir)) {
    console.log(`Objectives directory not found: ${dir}`);
    return 0;
  }

  const files = readdirSync(dir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  const db = getDb();
  let synced = 0;

  for (const file of files) {
    try {
      const filePath = join(dir, file);
      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseYaml(content) as ObjectiveYaml;

      if (!parsed.objective) {
        console.warn(`Skipping ${file}: no objective definition found`);
        continue;
      }

      const { objective } = parsed;
      const id = generateIdFromFile(filePath);
      const name = objective.name || basename(file, '.yaml');

      // Check if exists
      const existing = await db.select().from(objectives).where(eq(objectives.id, id)).get();

      const objectiveData = {
        id,
        name,
        definition: {
          goal: objective.goal,
          constraints: objective.autonomy.restrictions,
          successCriteria: objective.successCriteria,
        },
        config: {
          autonomyLevel: objective.autonomy.level,
          maxActions: objective.autonomy.bounds?.maxActions,
          maxDuration: objective.autonomy.bounds?.maxDuration,
          restrictions: objective.autonomy.restrictions,
          steps: objective.guidedSteps || objective.autonomy.steps,
        },
      };

      if (existing) {
        await db.update(objectives).set(objectiveData).where(eq(objectives.id, id));
      } else {
        await db.insert(objectives).values(objectiveData);
      }

      synced++;
    } catch (error) {
      console.error(`Error syncing objective ${file}:`, error);
    }
  }

  return synced;
}

// ============================================================================
// Main Sync Function
// ============================================================================

export async function syncYamlToDatabase(): Promise<{ personas: number; objectives: number }> {
  console.log('Syncing YAML files to database...');

  const personaCount = await syncPersonas();
  const objectiveCount = await syncObjectives();

  console.log(`Synced ${personaCount} personas and ${objectiveCount} objectives`);

  return { personas: personaCount, objectives: objectiveCount };
}
