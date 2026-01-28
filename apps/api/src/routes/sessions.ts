/**
 * Sessions API Routes
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { sessions, personas, objectives, events, findings, sessionReports } from '@testfarm/db';
import { eq, inArray } from 'drizzle-orm';
import { createAgent, loadKnownIssues, generateSessionReport, type AgentConfig } from '@testfarm/core';
import type { Persona, Objective, ExistingFindingsContext, SessionReportData } from '@testfarm/shared';
import { broadcastSessionEvent } from './events.js';

// Store running agents to allow cancellation
const runningAgents = new Map<string, ReturnType<typeof createAgent>>();
// Track cancelled sessions to prevent onComplete from overwriting
const cancelledSessions = new Set<string>();

const app = new Hono();

// GET /api/sessions - List all sessions with persona and objective names
app.get('/', async (c) => {
  const db = getDb();
  const allSessions = await db
    .select({
      id: sessions.id,
      personaId: sessions.personaId,
      objectiveId: sessions.objectiveId,
      targetUrl: sessions.targetUrl,
      llmConfig: sessions.llmConfig,
      visionConfig: sessions.visionConfig,
      state: sessions.state,
      results: sessions.results,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
      personaName: personas.name,
      objectiveName: objectives.name,
    })
    .from(sessions)
    .leftJoin(personas, eq(sessions.personaId, personas.id))
    .leftJoin(objectives, eq(sessions.objectiveId, objectives.id))
    .orderBy(sessions.createdAt);
  return c.json(allSessions);
});

// GET /api/sessions/:id - Get session by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();
  const session = await db.select().from(sessions).where(eq(sessions.id, id)).get();

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json(session);
});

// Default configurations
// Using claude-cli to leverage Claude Max subscription instead of API
const DEFAULT_LLM_CONFIG = {
  provider: 'claude-cli' as const,
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 2048,
};

const DEFAULT_VISION_CONFIG = {
  screenshotInterval: 5,
  screenshotOnLowConfidence: true,
  confidenceThreshold: 0.5,
};

// POST /api/sessions - Create new session
app.post('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const newSession = {
    id: crypto.randomUUID(),
    personaId: body.personaId,
    objectiveId: body.objectiveId,
    targetUrl: body.targetUrl,
    llmConfig: body.llmConfig || DEFAULT_LLM_CONFIG,
    visionConfig: body.visionConfig || DEFAULT_VISION_CONFIG,
    state: {
      status: 'pending' as const,
      actionCount: 0,
      progress: 0,
      currentUrl: body.targetUrl,
    },
    results: null,
  };

  await db.insert(sessions).values(newSession);

  return c.json(newSession, 201);
});

// POST /api/sessions/batch - Create multiple sessions at once
app.post('/batch', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const { targetUrl, personaIds, objectiveIds, llmConfig, visionConfig } = body;

  // Create a session for each persona-objective combination
  const sessionsToCreate = [];

  for (const personaId of personaIds) {
    for (const objectiveId of objectiveIds) {
      sessionsToCreate.push({
        id: crypto.randomUUID(),
        personaId,
        objectiveId,
        targetUrl,
        llmConfig: llmConfig || DEFAULT_LLM_CONFIG,
        visionConfig: visionConfig || DEFAULT_VISION_CONFIG,
        state: {
          status: 'pending' as const,
          actionCount: 0,
          progress: 0,
          currentUrl: targetUrl,
        },
        results: null,
      });
    }
  }

  if (sessionsToCreate.length > 0) {
    await db.insert(sessions).values(sessionsToCreate);
  }

  return c.json({
    message: `Created ${sessionsToCreate.length} sessions`,
    sessions: sessionsToCreate,
  }, 201);
});

// POST /api/sessions/:id/start - Start a session
app.post('/:id/start', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  // Get session
  const session = await db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (session.state.status === 'running') {
    return c.json({ error: 'Session is already running' }, 400);
  }

  // Get persona
  const persona = await db.select().from(personas).where(eq(personas.id, session.personaId)).get();
  if (!persona) {
    return c.json({ error: 'Persona not found' }, 404);
  }

  // Get objective
  const objective = await db.select().from(objectives).where(eq(objectives.id, session.objectiveId)).get();
  if (!objective) {
    return c.json({ error: 'Objective not found' }, 404);
  }

  // Transform database format to Agent format
  const agentPersona: Persona = {
    id: persona.id,
    name: persona.name,
    identity: persona.definition.identity,
    techProfile: persona.definition.techProfile,
    personality: persona.definition.personality,
    context: persona.definition.context,
    tendencies: persona.definition.tendencies,
    metadata: {
      archetype: persona.metadata?.archetype,
      tags: persona.metadata?.tags,
    },
    credentials: persona.definition.credentials,
  };

  const agentObjective: Objective = {
    id: objective.id,
    name: objective.name,
    goal: objective.definition.goal,
    autonomy: {
      level: objective.config.autonomyLevel,
      bounds: {
        maxActions: objective.config.maxActions,
        maxDuration: objective.config.maxDuration,
      },
      restrictions: objective.config.restrictions,
      steps: objective.config.steps,
    },
    successCriteria: objective.definition.successCriteria,
  };

  // Update session status to running
  const maxActions = objective.config.maxActions || 50;
  await db.update(sessions).set({
    state: {
      ...session.state,
      status: 'running',
      progress: 0,
      startedAt: Date.now(),
    },
  }).where(eq(sessions.id, id));

  // Load existing findings context for deduplication
  let existingFindingsContext: ExistingFindingsContext | undefined;
  try {
    const knownIssues = await loadKnownIssues(50);
    if (knownIssues.length > 0) {
      existingFindingsContext = {
        knownIssues,
        deduplicationEnabled: true,
      };
    }
  } catch (error) {
    console.warn('Failed to load known issues for deduplication:', error);
  }

  // Create agent config
  const agentConfig: AgentConfig = {
    persona: agentPersona,
    objective: agentObjective,
    targetUrl: session.targetUrl,
    llm: session.llmConfig as AgentConfig['llm'],
    vision: session.visionConfig as AgentConfig['vision'],
    maxActions: objective.config.maxActions || 50,
    timeout: (objective.config.maxDuration || 10) * 60 * 1000, // Convert minutes to ms
    sessionId: id,
    existingFindings: existingFindingsContext,
  };

  let eventSequence = 0;

  // Create agent with event handlers
  const agent = createAgent(agentConfig, {
    onAction: async (action, decision, screenshotPath, elements) => {
      // Save event to database with screenshot path and elements for debugging
      await db.insert(events).values({
        id: crypto.randomUUID(),
        sessionId: id,
        sequence: eventSequence++,
        context: {
          url: action.url,
          pageTitle: '',
          elementCount: elements?.length || 0,
          // Store elements for debugging (limited to avoid huge payloads)
          elements: elements?.slice(0, 100).map(el => ({
            id: el.id,
            name: el.name,
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            source: el.source,
            selector: el.selector,
            disabled: el.disabled,
            role: el.role,
          })),
        },
        decision: {
          action: action.action,
          reasoning: decision.reasoning,
          progress: decision.progress,
        },
        outcome: {
          success: action.success,
          error: action.error,
          duration: 0,
        },
        screenshot: screenshotPath, // Store screenshot file path
      });

      // Update session action count and progress
      const progress = Math.min(eventSequence / maxActions, 1);
      await db.update(sessions).set({
        state: {
          status: 'running',
          actionCount: eventSequence,
          progress,
          currentUrl: action.url,
          startedAt: session.state.startedAt,
        },
      }).where(eq(sessions.id, id));

      // Broadcast real-time update
      broadcastSessionEvent(id, {
        type: 'action',
        data: { action, decision, sequence: eventSequence, progress },
      });
    },

    onFinding: async (finding, _deduplicationResult) => {
      // Save finding to database with deduplication info
      await db.insert(findings).values({
        id: finding.id,
        sessionId: id,
        type: finding.type,
        severity: finding.severity,
        description: finding.description,
        personaPerspective: finding.personaPerspective,
        url: finding.url,
        elementId: finding.elementId,
        groupId: finding.groupId,
        fingerprint: finding.fingerprint,
        isDuplicate: finding.isDuplicate ?? false,
      });

      // Broadcast finding
      broadcastSessionEvent(id, {
        type: 'finding',
        data: finding,
      });
    },

    onComplete: async (result) => {
      // Check if session was cancelled - don't overwrite cancelled status
      if (cancelledSessions.has(id)) {
        console.log(`[Session ${id}] Ignoring onComplete - session was cancelled`);
        cancelledSessions.delete(id);
        runningAgents.delete(id);
        return;
      }

      // Map agent outcome to database outcome type
      const outcomeMap: Record<string, 'completed' | 'pursuing' | 'blocked' | 'abandoned'> = {
        completed: 'completed',
        abandoned: 'abandoned',
        blocked: 'blocked',
        timeout: 'blocked',
        error: 'abandoned',
      };
      const dbOutcome = outcomeMap[result.outcome] || 'abandoned';

      // Update session with results
      await db.update(sessions).set({
        state: {
          status: result.success ? 'completed' : 'failed',
          actionCount: result.actionsTaken,
          progress: 1,
          currentUrl: session.targetUrl,
          startedAt: session.state.startedAt,
          completedAt: Date.now(),
        },
        results: {
          outcome: dbOutcome,
          summary: result.summary,
          actionsTaken: result.actionsTaken,
          duration: result.duration,
          metrics: result.metrics,
        },
      }).where(eq(sessions.id, id));

      // Generate session report
      try {
        const reportData: SessionReportData = {
          sessionId: id,
          targetUrl: session.targetUrl,
          personaName: agentPersona.name,
          objectiveName: agentObjective.name,
          duration: result.duration,
          outcome: dbOutcome,
          findings: result.findings,
          metrics: result.metrics,
        };

        const report = await generateSessionReport(
          reportData,
          session.llmConfig as AgentConfig['llm']
        );

        // Save report to database
        await db.insert(sessionReports).values({
          id: crypto.randomUUID(),
          sessionId: id,
          summary: report.summary,
          findingsSummary: report.findingsSummary,
          markdownReport: report.markdownReport,
          metrics: result.metrics,
          recommendations: report.recommendations,
        });
      } catch (reportError) {
        console.error('Failed to generate session report:', reportError);
        // Don't fail the session completion if report generation fails
      }

      // Broadcast completion
      broadcastSessionEvent(id, {
        type: 'complete',
        data: { result, outcome: dbOutcome },
      });

      // Remove from running agents
      runningAgents.delete(id);
    },

    onError: async (error) => {
      // Check if session was cancelled - don't overwrite cancelled status
      if (cancelledSessions.has(id)) {
        console.log(`[Session ${id}] Ignoring onError - session was cancelled`);
        cancelledSessions.delete(id);
        runningAgents.delete(id);
        return;
      }

      // Update session with error
      const progress = Math.min(eventSequence / maxActions, 1);
      await db.update(sessions).set({
        state: {
          status: 'failed',
          actionCount: eventSequence,
          progress,
          currentUrl: session.targetUrl,
          startedAt: session.state.startedAt,
          completedAt: Date.now(),
        },
        results: {
          outcome: 'abandoned', // Map error to abandoned
          summary: error.message,
          actionsTaken: eventSequence,
          duration: Date.now() - (session.state.startedAt || Date.now()),
          metrics: {
            totalActions: eventSequence,
            successfulActions: 0,
            failedActions: 0,
            pagesVisited: 0,
            screenshotsTaken: 0,
            llmCalls: 0,
            totalTokens: 0,
          },
        },
      }).where(eq(sessions.id, id));

      // Broadcast error
      broadcastSessionEvent(id, {
        type: 'error',
        data: { message: error.message },
      });

      // Remove from running agents
      runningAgents.delete(id);
    },
  });

  // Store agent reference for cancellation
  runningAgents.set(id, agent);

  // Run agent in background (don't await)
  console.log(`[Session ${id}] Starting agent...`);
  agent.run()
    .then((result) => {
      console.log(`[Session ${id}] Agent completed:`, result.outcome, result.summary);
    })
    .catch((error) => {
      console.error(`[Session ${id}] Agent execution failed:`, error);
    });

  return c.json({ message: 'Session started', sessionId: id });
});

// POST /api/sessions/:id/retry - Clone and start a fresh session
app.post('/:id/retry', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  // Get original session
  const original = await db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!original) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Create a clone with fresh state
  const newSession = {
    id: crypto.randomUUID(),
    personaId: original.personaId,
    objectiveId: original.objectiveId,
    targetUrl: original.targetUrl,
    llmConfig: original.llmConfig,
    visionConfig: original.visionConfig,
    state: {
      status: 'pending' as const,
      actionCount: 0,
      progress: 0,
      currentUrl: original.targetUrl,
    },
    results: null,
  };

  await db.insert(sessions).values(newSession);

  return c.json({
    message: 'Session cloned successfully',
    originalId: id,
    newSession,
  }, 201);
});

// POST /api/sessions/:id/cancel - Cancel a running session
app.post('/:id/cancel', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const session = await db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Mark as cancelled BEFORE stopping (to prevent race condition)
  cancelledSessions.add(id);

  // Stop the running agent
  const agent = runningAgents.get(id);
  if (agent) {
    agent.stop();
    runningAgents.delete(id);
  }

  // Update session status
  await db.update(sessions).set({
    state: {
      ...session.state,
      status: 'cancelled',
      progress: session.state.progress || 0,
      completedAt: Date.now(),
    },
  }).where(eq(sessions.id, id));

  return c.json({ message: 'Session cancelled', sessionId: id });
});

// DELETE /api/sessions/batch - Delete multiple sessions
app.delete('/batch', async (c) => {
  const body = await c.req.json();
  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'ids array is required' }, 400);
  }

  const db = getDb();

  // Check if any sessions are running
  const sessionsToDelete = await db.select().from(sessions).where(inArray(sessions.id, ids));
  const runningSessions = sessionsToDelete.filter(s => s.state.status === 'running');

  if (runningSessions.length > 0) {
    // Stop running agents first
    for (const session of runningSessions) {
      const agent = runningAgents.get(session.id);
      if (agent) {
        agent.stop();
        runningAgents.delete(session.id);
      }
    }
  }

  // Delete related data in order (foreign key constraints)
  await db.delete(sessionReports).where(inArray(sessionReports.sessionId, ids));
  await db.delete(findings).where(inArray(findings.sessionId, ids));
  await db.delete(events).where(inArray(events.sessionId, ids));
  await db.delete(sessions).where(inArray(sessions.id, ids));

  return c.json({ message: `Deleted ${ids.length} sessions`, deleted: ids.length });
});

// DELETE /api/sessions/:id - Delete a single session
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const session = await db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Stop running agent if exists
  if (session.state.status === 'running') {
    const agent = runningAgents.get(id);
    if (agent) {
      agent.stop();
      runningAgents.delete(id);
    }
  }

  // Delete related data in order (foreign key constraints)
  await db.delete(sessionReports).where(eq(sessionReports.sessionId, id));
  await db.delete(findings).where(eq(findings.sessionId, id));
  await db.delete(events).where(eq(events.sessionId, id));
  await db.delete(sessions).where(eq(sessions.id, id));

  return c.json({ message: 'Session deleted', sessionId: id });
});

export default app;
