/**
 * Session Chains API Routes
 * Multi-day persistent sessions with memory continuity
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { sessionChains, sessions, personas, objectives, scheduledTasks } from '@testfarm/db';
import { eq, desc, sql } from 'drizzle-orm';
import {
  addScoreToAggregate,
  mergeMemoryArray,
  mergeVisitedPages,
} from '@testfarm/core';
import type { PersistentMemory, AggregatedScore, ChainSchedule } from '@testfarm/shared';
import { getGlobalLLMConfig } from '../lib/llm-config.js';

const app = new Hono();

const DEFAULT_VISION_CONFIG = {
  screenshotInterval: 5,
  screenshotOnLowConfidence: true,
  confidenceThreshold: 0.5,
};

// GET /api/session-chains - List all chains with persona/objective names
// Supports optional ?projectId=xxx filter
app.get('/', async (c) => {
  const db = getDb();
  const projectIdFilter = c.req.query('projectId');

  let query = db
    .select({
      id: sessionChains.id,
      projectId: sessionChains.projectId,
      personaId: sessionChains.personaId,
      objectiveId: sessionChains.objectiveId,
      targetUrl: sessionChains.targetUrl,
      name: sessionChains.name,
      status: sessionChains.status,
      sessionCount: sessionChains.sessionCount,
      schedule: sessionChains.schedule,
      aggregatedScore: sessionChains.aggregatedScore,
      createdAt: sessionChains.createdAt,
      updatedAt: sessionChains.updatedAt,
      personaName: personas.name,
      objectiveName: objectives.name,
    })
    .from(sessionChains)
    .leftJoin(personas, eq(sessionChains.personaId, personas.id))
    .leftJoin(objectives, eq(sessionChains.objectiveId, objectives.id))
    .$dynamic();

  if (projectIdFilter) {
    query = query.where(eq(sessionChains.projectId, projectIdFilter));
  }

  const chains = await query.orderBy(desc(sessionChains.createdAt));

  return c.json(chains);
});

// GET /api/session-chains/:id - Get chain detail with sessions
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const chainResult = await db
    .select({
      id: sessionChains.id,
      projectId: sessionChains.projectId,
      personaId: sessionChains.personaId,
      objectiveId: sessionChains.objectiveId,
      targetUrl: sessionChains.targetUrl,
      name: sessionChains.name,
      llmConfig: sessionChains.llmConfig,
      visionConfig: sessionChains.visionConfig,
      status: sessionChains.status,
      sessionCount: sessionChains.sessionCount,
      schedule: sessionChains.schedule,
      persistentMemory: sessionChains.persistentMemory,
      aggregatedScore: sessionChains.aggregatedScore,
      createdAt: sessionChains.createdAt,
      updatedAt: sessionChains.updatedAt,
      personaName: personas.name,
      objectiveName: objectives.name,
    })
    .from(sessionChains)
    .leftJoin(personas, eq(sessionChains.personaId, personas.id))
    .leftJoin(objectives, eq(sessionChains.objectiveId, objectives.id))
    .where(eq(sessionChains.id, id))
    .limit(1);
  const chain = chainResult[0];

  if (!chain) {
    return c.json({ error: 'Session chain not found' }, 404);
  }

  // Get all sessions in this chain
  const chainSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.parentChainId, id))
    .orderBy(sessions.chainSequence);

  return c.json({
    ...chain,
    sessions: chainSessions,
  });
});

// POST /api/session-chains - Create new chain
app.post('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  // Get global LLM config and merge with body config
  const globalLlmConfig = await getGlobalLLMConfig();
  const llmConfig = {
    ...globalLlmConfig,
    ...(body.llmConfig || {}),
  };

  const newChain = {
    id: crypto.randomUUID(),
    projectId: body.projectId || null,
    personaId: body.personaId,
    objectiveId: body.objectiveId,
    targetUrl: body.targetUrl,
    name: body.name || null,
    llmConfig,
    visionConfig: { ...DEFAULT_VISION_CONFIG, ...body.visionConfig },
    status: 'active' as const,
    sessionCount: 0,
    schedule: body.schedule || null,
    persistentMemory: null,
    aggregatedScore: null,
  };

  await db.insert(sessionChains).values(newChain);

  return c.json(newChain, 201);
});

// PATCH /api/session-chains/:id - Update chain
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = getDb();

  const chainResult = await db.select().from(sessionChains).where(eq(sessionChains.id, id)).limit(1);
  const chain = chainResult[0];
  if (!chain) {
    return c.json({ error: 'Session chain not found' }, 404);
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) updates.name = body.name;
  if (body.status !== undefined) updates.status = body.status;
  if (body.schedule !== undefined) updates.schedule = body.schedule;
  if (body.projectId !== undefined) updates.projectId = body.projectId;
  if (body.llmConfig !== undefined) {
    const globalLlmConfig = await getGlobalLLMConfig();
    updates.llmConfig = { ...globalLlmConfig, ...body.llmConfig };
  }
  if (body.visionConfig !== undefined) updates.visionConfig = { ...DEFAULT_VISION_CONFIG, ...body.visionConfig };

  await db.update(sessionChains).set(updates).where(eq(sessionChains.id, id));

  return c.json({ message: 'Chain updated', id });
});

// DELETE /api/session-chains/:id - Delete chain (and optionally its sessions)
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const deleteSessionsToo = c.req.query('deleteSessions') === 'true';
  const db = getDb();

  const chainResultDel = await db.select().from(sessionChains).where(eq(sessionChains.id, id)).limit(1);
  const chain = chainResultDel[0];
  if (!chain) {
    return c.json({ error: 'Session chain not found' }, 404);
  }

  if (deleteSessionsToo) {
    // Delete all sessions in the chain (foreign key cascade would be better but let's be explicit)
    await db.delete(sessions).where(eq(sessions.parentChainId, id));
  } else {
    // Just unlink sessions from the chain
    await db.update(sessions).set({ parentChainId: null, chainSequence: null }).where(eq(sessions.parentChainId, id));
  }

  // Delete scheduled tasks for this chain
  await db.delete(scheduledTasks).where(eq(scheduledTasks.targetId, id));

  // Delete the chain
  await db.delete(sessionChains).where(eq(sessionChains.id, id));

  return c.json({ message: 'Chain deleted', id });
});

// POST /api/session-chains/:id/continue - Create next session in chain
app.post('/:id/continue', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const chainResultCont = await db.select().from(sessionChains).where(eq(sessionChains.id, id)).limit(1);
  const chain = chainResultCont[0];
  if (!chain) {
    return c.json({ error: 'Session chain not found' }, 404);
  }

  if (chain.status !== 'active') {
    return c.json({ error: 'Chain is not active' }, 400);
  }

  // Get the last session in the chain to determine sequence
  const lastSessionResult = await db
    .select()
    .from(sessions)
    .where(eq(sessions.parentChainId, id))
    .orderBy(desc(sessions.chainSequence))
    .limit(1);
  const lastSession = lastSessionResult[0];

  const nextSequence = (lastSession?.chainSequence ?? 0) + 1;

  // Get global LLM config and merge with chain config
  const globalLlmConfig = await getGlobalLLMConfig();
  const llmConfig = {
    ...globalLlmConfig,
    ...(chain.llmConfig as object || {}),
  };

  // Create new session with chain context
  const newSession = {
    id: crypto.randomUUID(),
    projectId: chain.projectId,
    parentChainId: id,
    chainSequence: nextSequence,
    scheduledAt: null,
    personaId: chain.personaId,
    objectiveId: chain.objectiveId,
    targetUrl: chain.targetUrl,
    llmConfig,
    visionConfig: { ...DEFAULT_VISION_CONFIG, ...(chain.visionConfig as object) },
    state: {
      status: 'pending' as const,
      actionCount: 0,
      progress: 0,
      currentUrl: chain.targetUrl,
    },
    results: null,
  };

  await db.insert(sessions).values(newSession);

  // Update chain session count
  await db.update(sessionChains).set({
    sessionCount: sql`${sessionChains.sessionCount} + 1`,
    updatedAt: new Date(),
  }).where(eq(sessionChains.id, id));

  return c.json({
    message: 'Session created in chain',
    session: newSession,
    chainSequence: nextSequence,
  }, 201);
});

// POST /api/session-chains/:id/schedule - Configure schedule
app.post('/:id/schedule', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = getDb();

  const chainResultSched = await db.select().from(sessionChains).where(eq(sessionChains.id, id)).limit(1);
  const chain = chainResultSched[0];
  if (!chain) {
    return c.json({ error: 'Session chain not found' }, 404);
  }

  const schedule: ChainSchedule = {
    enabled: body.enabled ?? false,
    cronExpression: body.cronExpression,
    nextRunAt: body.nextRunAt,
    timezone: body.timezone,
    maxSessions: body.maxSessions,
  };

  // Update chain schedule
  await db.update(sessionChains).set({
    schedule,
    updatedAt: new Date(),
  }).where(eq(sessionChains.id, id));

  // If scheduling is enabled and we have a next run time, create a scheduled task
  if (schedule.enabled && schedule.nextRunAt) {
    // Remove any existing scheduled tasks for this chain
    await db.delete(scheduledTasks).where(eq(scheduledTasks.targetId, id));

    // Create new scheduled task
    await db.insert(scheduledTasks).values({
      id: crypto.randomUUID(),
      type: 'chain_continue',
      targetId: id,
      scheduledAt: new Date(schedule.nextRunAt),
      status: 'pending',
    });
  } else {
    // Remove any scheduled tasks if scheduling is disabled
    await db.delete(scheduledTasks).where(eq(scheduledTasks.targetId, id));
  }

  return c.json({
    message: 'Schedule updated',
    schedule,
  });
});

// POST /api/session-chains/:id/pause - Pause the chain
app.post('/:id/pause', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const chainResultPause = await db.select().from(sessionChains).where(eq(sessionChains.id, id)).limit(1);
  const chain = chainResultPause[0];
  if (!chain) {
    return c.json({ error: 'Session chain not found' }, 404);
  }

  await db.update(sessionChains).set({
    status: 'paused',
    updatedAt: new Date(),
  }).where(eq(sessionChains.id, id));

  // Cancel any pending scheduled tasks
  await db.update(scheduledTasks).set({
    status: 'cancelled',
  }).where(eq(scheduledTasks.targetId, id));

  return c.json({ message: 'Chain paused', id });
});

// POST /api/session-chains/:id/resume - Resume a paused chain
app.post('/:id/resume', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const chainResultRes = await db.select().from(sessionChains).where(eq(sessionChains.id, id)).limit(1);
  const chain = chainResultRes[0];
  if (!chain) {
    return c.json({ error: 'Session chain not found' }, 404);
  }

  if (chain.status !== 'paused') {
    return c.json({ error: 'Chain is not paused' }, 400);
  }

  await db.update(sessionChains).set({
    status: 'active',
    updatedAt: new Date(),
  }).where(eq(sessionChains.id, id));

  // Reschedule if there was a schedule configured
  if (chain.schedule?.enabled && chain.schedule.nextRunAt) {
    await db.insert(scheduledTasks).values({
      id: crypto.randomUUID(),
      type: 'chain_continue',
      targetId: id,
      scheduledAt: new Date(chain.schedule.nextRunAt),
      status: 'pending',
    });
  }

  return c.json({ message: 'Chain resumed', id });
});

// Internal: Update chain memory after session completes
export async function updateChainAfterSession(
  chainId: string,
  sessionId: string,
  sessionMemory: { discoveries: string[]; frustrations: string[]; decisions: string[] } | undefined,
  visitedPages: string[] | undefined,
  score: number | undefined
): Promise<void> {
  const db = getDb();

  const chainResultUpd = await db.select().from(sessionChains).where(eq(sessionChains.id, chainId)).limit(1);
  const chain = chainResultUpd[0];
  if (!chain) {
    console.warn(`[Chain] Chain ${chainId} not found for update`);
    return;
  }

  // Merge memory
  const existingMemory = chain.persistentMemory as PersistentMemory | null;
  const newMemory: PersistentMemory = {
    discoveries: mergeMemoryArray(
      existingMemory?.discoveries ?? [],
      sessionMemory?.discoveries ?? [],
      50
    ),
    frustrations: mergeMemoryArray(
      existingMemory?.frustrations ?? [],
      sessionMemory?.frustrations ?? [],
      50
    ),
    decisions: mergeMemoryArray(
      existingMemory?.decisions ?? [],
      sessionMemory?.decisions ?? [],
      50
    ),
    visitedPages: mergeVisitedPages(
      existingMemory?.visitedPages ?? [],
      visitedPages ?? []
    ),
  };

  // Update aggregated score if we have a score
  let newAggregatedScore: AggregatedScore | undefined;
  if (score !== undefined && score >= 1 && score <= 10) {
    newAggregatedScore = addScoreToAggregate(
      chain.aggregatedScore as AggregatedScore | null,
      sessionId,
      score
    );
  }

  // Update chain
  await db.update(sessionChains).set({
    persistentMemory: newMemory,
    aggregatedScore: newAggregatedScore ?? chain.aggregatedScore,
    updatedAt: new Date(),
  }).where(eq(sessionChains.id, chainId));

  console.log(`[Chain] Updated chain ${chainId} after session ${sessionId}`);
}

// Internal: Get chain context for session start
export async function getChainContextForSession(chainId: string, sequence: number): Promise<{
  initialMemory: { discoveries: string[]; frustrations: string[]; decisions: string[] } | undefined;
  chainContext: {
    chainId: string;
    sequence: number;
    visitedPages: string[];
    totalPreviousActions: number;
  } | undefined;
}> {
  const db = getDb();

  const chainResultCtx = await db.select().from(sessionChains).where(eq(sessionChains.id, chainId)).limit(1);
  const chain = chainResultCtx[0];
  if (!chain) {
    return { initialMemory: undefined, chainContext: undefined };
  }

  const memory = chain.persistentMemory as PersistentMemory | null;

  // Count total actions from previous sessions in this chain
  const previousSessions = await db
    .select({ actionCount: sessions.state })
    .from(sessions)
    .where(eq(sessions.parentChainId, chainId));

  const totalPreviousActions = previousSessions.reduce(
    (sum, s) => sum + ((s.actionCount as { actionCount?: number })?.actionCount ?? 0),
    0
  );

  return {
    initialMemory: memory ? {
      discoveries: memory.discoveries,
      frustrations: memory.frustrations,
      decisions: memory.decisions,
    } : undefined,
    chainContext: {
      chainId,
      sequence,
      visitedPages: memory?.visitedPages ?? [],
      totalPreviousActions,
    },
  };
}

export default app;
