/**
 * Objectives API Routes
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { objectives } from '@testfarm/db';
import { eq } from 'drizzle-orm';

const app = new Hono();

// GET /api/objectives - List all objectives
app.get('/', async (c) => {
  const db = getDb();
  const allObjectives = await db
    .select()
    .from(objectives)
    .orderBy(objectives.name);
  return c.json(allObjectives);
});

// GET /api/objectives/:id - Get objective by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();
  const result = await db
    .select()
    .from(objectives)
    .where(eq(objectives.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Objective not found' }, 404);
  }

  return c.json(result[0]);
});

// POST /api/objectives - Create new objective
app.post('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const newObjective = {
    id: crypto.randomUUID(),
    name: body.name,
    definition: body.definition,
    config: body.config,
  };

  await db.insert(objectives).values(newObjective);

  return c.json(newObjective, 201);
});

// PUT /api/objectives/:id - Update objective
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = getDb();

  const existing = await db
    .select()
    .from(objectives)
    .where(eq(objectives.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Objective not found' }, 404);
  }

  await db.update(objectives)
    .set({
      name: body.name,
      definition: body.definition,
      config: body.config,
      updatedAt: new Date(),
    })
    .where(eq(objectives.id, id));

  const updated = await db
    .select()
    .from(objectives)
    .where(eq(objectives.id, id))
    .limit(1);
  return c.json(updated[0]);
});

// DELETE /api/objectives/:id - Delete objective
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const existing = await db
    .select()
    .from(objectives)
    .where(eq(objectives.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Objective not found' }, 404);
  }

  await db.delete(objectives).where(eq(objectives.id, id));

  return c.json({ message: 'Objective deleted' });
});

// POST /api/objectives/import - Batch import objectives
app.post('/import', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  if (!body.objectives || !Array.isArray(body.objectives)) {
    return c.json({ error: 'Invalid format: expected { objectives: [...] }' }, 400);
  }

  const importedObjectives = [];

  for (const objectiveData of body.objectives) {
    if (!objectiveData.name) {
      continue;
    }

    const newObjective = {
      id: crypto.randomUUID(),
      name: objectiveData.name,
      definition: {
        goal: objectiveData.goal || '',
        constraints: objectiveData.constraints || [],
        successCriteria: objectiveData.successCriteria || { type: 'none' as const },
      },
      config: {
        autonomyLevel: objectiveData.autonomy?.level || 'exploration' as const,
        maxActions: objectiveData.autonomy?.bounds?.maxActions || 100,
        maxDuration: objectiveData.autonomy?.bounds?.maxDuration || 60,
        restrictions: objectiveData.restrictions || [],
        steps: objectiveData.steps || [],
      },
    };

    await db.insert(objectives).values(newObjective);
    importedObjectives.push(newObjective);
  }

  return c.json({
    imported: importedObjectives.length,
    objectives: importedObjectives,
  }, 201);
});

export default app;
