/**
 * Personas API Routes
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { personas } from '@testfarm/db';
import { eq } from 'drizzle-orm';

const app = new Hono();

// GET /api/personas - List all personas
app.get('/', async (c) => {
  const db = getDb();
  const allPersonas = await db.select().from(personas).orderBy(personas.name);
  return c.json(allPersonas);
});

// GET /api/personas/:id - Get persona by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();
  const persona = await db.select().from(personas).where(eq(personas.id, id)).get();

  if (!persona) {
    return c.json({ error: 'Persona not found' }, 404);
  }

  return c.json(persona);
});

// POST /api/personas - Create new persona
app.post('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const newPersona = {
    id: crypto.randomUUID(),
    name: body.name,
    definition: body.definition,
    metadata: body.metadata || {},
  };

  await db.insert(personas).values(newPersona);

  return c.json(newPersona, 201);
});

// PUT /api/personas/:id - Update persona
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = getDb();

  await db.update(personas)
    .set({
      name: body.name,
      definition: body.definition,
      metadata: body.metadata,
    })
    .where(eq(personas.id, id));

  const updated = await db.select().from(personas).where(eq(personas.id, id)).get();
  return c.json(updated);
});

// DELETE /api/personas/:id - Delete persona
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  await db.delete(personas).where(eq(personas.id, id));

  return c.json({ message: 'Persona deleted' });
});

// POST /api/personas/import - Batch import personas
app.post('/import', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  if (!body.personas || !Array.isArray(body.personas)) {
    return c.json({ error: 'Invalid format: expected { personas: [...] }' }, 400);
  }

  const importedPersonas = [];

  for (const personaData of body.personas) {
    if (!personaData.name) {
      continue; // Skip invalid entries
    }

    const newPersona = {
      id: crypto.randomUUID(),
      name: personaData.name,
      definition: {
        identity: personaData.identity || '',
        techProfile: personaData.techProfile || '',
        personality: personaData.personality || '',
        context: personaData.context || '',
        tendencies: personaData.tendencies || [],
      },
      metadata: personaData.metadata || {},
    };

    await db.insert(personas).values(newPersona);
    importedPersonas.push(newPersona);
  }

  return c.json({
    imported: importedPersonas.length,
    personas: importedPersonas,
  }, 201);
});

export default app;
