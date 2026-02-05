/**
 * Sessions API Routes
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { sessions, personas, objectives, events, findings, sessionReports, appSettings } from '@testfarm/db';
import { eq, inArray } from 'drizzle-orm';
import { decrypt, isEncryptionConfigured } from '../crypto.js';
import { createAgent, loadKnownIssues, generateSessionReport, deleteSessionScreenshots, type AgentConfig } from '@testfarm/core';
import type { Persona, Objective, ExistingFindingsContext, SessionReportData, ChainContext, AgentMemory } from '@testfarm/shared';
import { broadcastSessionEvent } from './events.js';
import { getChainContextForSession, updateChainAfterSession } from './session-chains.js';
import { getGlobalLLMConfig } from '../lib/llm-config.js';
import { requireUser } from '../middleware/auth.js';

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
  const sessionResult = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  const session = sessionResult[0];

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json(session);
});

const DEFAULT_VISION_CONFIG = {
  screenshotInterval: 5,
  screenshotOnLowConfidence: true,
  confidenceThreshold: 0.5,
};

/**
 * Resolve API key with priority: user DB (encrypted) > env var
 */
async function resolveApiKey(provider: string, userId?: string): Promise<string | undefined> {
  const db = getDb();

  // 1. Try to get from user's DB settings (encrypted)
  if (userId && isEncryptionConfigured()) {
    const userSettings = await db.select().from(appSettings).where(eq(appSettings.userId, userId)).limit(1);
    const settings = userSettings[0];

    if (settings) {
      try {
        if (provider === 'anthropic' && settings.encryptedAnthropicKey) {
          return decrypt(settings.encryptedAnthropicKey);
        }
        if (provider === 'openai' && settings.encryptedOpenaiKey) {
          return decrypt(settings.encryptedOpenaiKey);
        }
        if (provider === 'google' && settings.encryptedGoogleKey) {
          return decrypt(settings.encryptedGoogleKey);
        }
      } catch (e) {
        console.error('Failed to decrypt API key:', e);
      }
    }
  }

  // 2. Fallback to env vars
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'google':
      return process.env.GOOGLE_API_KEY;
    case 'claude-cli':
      return undefined; // Don't need API key
    default:
      return undefined;
  }
}

// POST /api/sessions - Create new session
app.post('/', async (c) => {
  const user = requireUser(c);
  const body = await c.req.json();
  const db = getDb();

  // Get user's LLM config as base and merge with body config
  const globalConfig = await getGlobalLLMConfig(user.id);
  const llmConfig = {
    ...globalConfig,
    ...(body.llmConfig || {}),
  };

  const newSession = {
    id: crypto.randomUUID(),
    projectId: body.projectId || null,
    personaId: body.personaId,
    objectiveId: body.objectiveId,
    targetUrl: body.targetUrl,
    llmConfig,
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
  const user = requireUser(c);
  const body = await c.req.json();
  const db = getDb();

  const { targetUrl, personaIds, objectiveIds, llmConfig, visionConfig, projectId } = body;

  // Get user's LLM config as base and merge with body config
  const globalConfig = await getGlobalLLMConfig(user.id);
  const mergedLlmConfig = {
    ...globalConfig,
    ...(llmConfig || {}),
  };

  // Create a session for each persona-objective combination
  const sessionsToCreate = [];

  for (const personaId of personaIds) {
    for (const objectiveId of objectiveIds) {
      sessionsToCreate.push({
        id: crypto.randomUUID(),
        projectId: projectId || null,
        personaId,
        objectiveId,
        targetUrl,
        llmConfig: mergedLlmConfig,
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

  console.log(`[Session ${id}] Starting session...`);

  // Get session
  const sessionResult = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  const session = sessionResult[0];
  if (!session) {
    console.error(`[Session ${id}] Session not found in database`);
    return c.json({ error: 'Session not found' }, 404);
  }

  console.log(`[Session ${id}] Session state:`, session.state.status);
  console.log(`[Session ${id}] LLM config:`, session.llmConfig);

  if (session.state.status === 'running') {
    console.error(`[Session ${id}] Session is already running`);
    return c.json({ error: 'Session is already running' }, 400);
  }

  // Get persona
  const personaResult = await db.select().from(personas).where(eq(personas.id, session.personaId)).limit(1);
  const persona = personaResult[0];
  if (!persona) {
    return c.json({ error: 'Persona not found' }, 404);
  }

  // Get objective
  const objectiveResult = await db.select().from(objectives).where(eq(objectives.id, session.objectiveId)).limit(1);
  const objective = objectiveResult[0];
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

  // Get user for user-specific config resolution
  const user = requireUser(c);

  // Get LLM config - use session config or fall back to user settings
  const baseLLMConfig = session.llmConfig || await getGlobalLLMConfig(user.id);
  const provider = baseLLMConfig.provider;

  console.log(`[Session ${id}] LLM Provider: ${provider}`);
  console.log(`[Session ${id}] LLM Model: ${baseLLMConfig.model}`);
  console.log(`[Session ${id}] Using session config:`, !!session.llmConfig);

  // Resolve API key from user's DB settings or env vars
  const apiKey = await resolveApiKey(provider, user.id);

  console.log(`[Session ${id}] API key resolved:`, apiKey ? 'YES' : 'NO');

  // Validate BEFORE marking as running (so session stays pending on failure)
  if ((provider === 'anthropic' || provider === 'openai' || provider === 'google') && !apiKey) {
    const envVarMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_API_KEY',
    };
    const errorMsg = `API key not configured for provider: ${provider}. Configure it in Settings or set ${envVarMap[provider]} environment variable.`;
    console.error(`[Session ${id}] VALIDATION FAILED: ${errorMsg}`);
    return c.json({ error: errorMsg }, 400);
  }

  // Update session status to running (only after validation passes)
  const maxActions = objective.config.maxActions || 100;
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
    const knownIssues = await loadKnownIssues(user.id, 50);
    if (knownIssues.length > 0) {
      existingFindingsContext = {
        knownIssues,
        deduplicationEnabled: true,
      };
    }
  } catch (error) {
    console.warn('Failed to load known issues for deduplication:', error);
  }

  // Load chain context if this session is part of a chain
  let initialMemory: AgentMemory | undefined;
  let chainContext: ChainContext | undefined;

  if (session.parentChainId && session.chainSequence) {
    try {
      const chainData = await getChainContextForSession(session.parentChainId, session.chainSequence);
      initialMemory = chainData.initialMemory;
      chainContext = chainData.chainContext;
      console.log(`[Session ${id}] Loaded chain context: sequence #${session.chainSequence}, ${chainContext?.totalPreviousActions ?? 0} previous actions`);
    } catch (error) {
      console.warn(`[Session ${id}] Failed to load chain context:`, error);
    }
  }

  // If session has previous results (continuing), load memory from there
  if (session.results?.memory && !initialMemory) {
    initialMemory = session.results.memory;
    chainContext = {
      chainId: id, // Use session ID as pseudo-chain ID
      sequence: 2, // At least second run
      totalPreviousActions: session.results.actionsTaken || session.state.actionCount || 0,
      visitedPages: session.results.visitedPages || [],
    };
    console.log(`[Session ${id}] Continuing session with ${initialMemory.discoveries?.length || 0} discoveries, ${initialMemory.frustrations?.length || 0} frustrations`);
  }

  // Build final LLM config with resolved API key
  const llmConfig = {
    ...baseLLMConfig,
    apiKey,
  };

  // Create agent config
  const agentConfig: AgentConfig = {
    persona: agentPersona,
    objective: agentObjective,
    targetUrl: session.targetUrl,
    llm: llmConfig as AgentConfig['llm'],
    vision: session.visionConfig as AgentConfig['vision'],
    maxActions: objective.config.maxActions || 100,
    timeout: (objective.config.maxDuration || 60) * 60 * 1000, // Convert minutes to ms (default: 1 hour)
    sessionId: id,
    existingFindings: existingFindingsContext,
    // Chain continuation support
    initialMemory,
    chainContext,
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

    onWaitingForUser: (request) => {
      console.log(`[Session ${id}] Waiting for user input: ${request.type}`);

      // Broadcast user input required event
      broadcastSessionEvent(id, {
        type: 'user-input-required',
        data: request,
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
          personalAssessment: result.personalAssessment,
          // For session continuation
          currentUrl: result.currentUrl,
          memory: result.memory,
          visitedPages: result.visitedPages,
        },
      }).where(eq(sessions.id, id));

      // Update chain if this session is part of one
      if (session.parentChainId) {
        try {
          const score = result.personalAssessment?.overallScore;
          await updateChainAfterSession(
            session.parentChainId,
            id,
            result.memory,
            result.visitedPages,
            score
          );
          console.log(`[Session ${id}] Updated chain ${session.parentChainId} with session results`);
        } catch (chainError) {
          console.error(`[Session ${id}] Failed to update chain:`, chainError);
        }
      }

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
          llmConfig as AgentConfig['llm']
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
  console.log(`[Session ${id}] Starting agent with provider: ${llmConfig.provider}, model: ${llmConfig.model}`);
  agent.run()
    .then((result) => {
      console.log(`[Session ${id}] Agent completed:`, result.outcome, result.summary);
    })
    .catch(async (error) => {
      console.error(`[Session ${id}] Agent execution failed:`, error);

      // Broadcast error to frontend
      broadcastSessionEvent(id, {
        type: 'error',
        data: {
          message: `Agent execution failed: ${error.message}`,
          provider: llmConfig.provider,
          model: llmConfig.model,
        },
      });

      // Update session state to failed
      try {
        await db.update(sessions).set({
          state: {
            status: 'failed',
            actionCount: 0,
            progress: 0,
            currentUrl: session.targetUrl,
            startedAt: session.state.startedAt,
            completedAt: Date.now(),
          },
        }).where(eq(sessions.id, id));
      } catch (dbError) {
        console.error(`[Session ${id}] Failed to update session state:`, dbError);
      }

      // Remove from running agents
      runningAgents.delete(id);
    });

  return c.json({ message: 'Session started', sessionId: id });
});

// POST /api/sessions/:id/retry - Clone and start a fresh session
app.post('/:id/retry', async (c) => {
  const user = requireUser(c);
  const id = c.req.param('id');
  const db = getDb();

  // Get original session
  const originalResult = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  const original = originalResult[0];
  if (!original) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Use current user's LLM config (don't copy old session config)
  // This ensures retry always uses the latest settings
  const llmConfig = await getGlobalLLMConfig(user.id);

  console.log(`[Retry] Creating new session with user config: ${llmConfig.provider}`);

  // Create a clone with fresh state
  const newSession = {
    id: crypto.randomUUID(),
    personaId: original.personaId,
    objectiveId: original.objectiveId,
    targetUrl: original.targetUrl,
    llmConfig,
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

// POST /api/sessions/:id/continue - Continue a finished session (resets to pending, preserving memory)
app.post('/:id/continue', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  // Get session
  const sessionResult = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  const session = sessionResult[0];
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Only allow continuing finished sessions
  if (!['completed', 'failed', 'cancelled'].includes(session.state.status)) {
    return c.json({ error: 'Can only continue finished sessions' }, 400);
  }

  // Get memory from previous results
  const previousMemory = session.results?.memory || {
    discoveries: [],
    frustrations: [],
    decisions: [],
  };

  console.log(`[Continue] Resetting session ${id} to pending with ${previousMemory.discoveries?.length || 0} discoveries, ${previousMemory.frustrations?.length || 0} frustrations`);

  // Reset session state to pending, but keep the results (which contain memory)
  // The /start endpoint will load memory from results
  await db.update(sessions).set({
    state: {
      status: 'pending' as const,
      actionCount: session.state.actionCount, // Keep previous action count
      progress: 0,
      currentUrl: session.results?.currentUrl || session.targetUrl,
    },
    // Update targetUrl to continue from where we left off
    targetUrl: session.results?.currentUrl || session.targetUrl,
  }).where(eq(sessions.id, id));

  return c.json({
    message: 'Session reset to pending - ready to continue',
    sessionId: id,
    inheritedMemory: {
      discoveries: previousMemory.discoveries?.length || 0,
      frustrations: previousMemory.frustrations?.length || 0,
      decisions: previousMemory.decisions?.length || 0,
    },
  });
});

// POST /api/sessions/:id/cancel - Cancel a running session
app.post('/:id/cancel', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const sessionResultCancel = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  const session = sessionResultCancel[0];
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

  // Delete screenshots from disk before deleting DB records
  for (const sessionId of ids) {
    await deleteSessionScreenshots(sessionId);
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

  const sessionResultDel = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  const session = sessionResultDel[0];
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

  // Delete screenshots from disk before deleting DB records
  await deleteSessionScreenshots(id);

  // Delete related data in order (foreign key constraints)
  await db.delete(sessionReports).where(eq(sessionReports.sessionId, id));
  await db.delete(findings).where(eq(findings.sessionId, id));
  await db.delete(events).where(eq(events.sessionId, id));
  await db.delete(sessions).where(eq(sessions.id, id));

  return c.json({ message: 'Session deleted', sessionId: id });
});

// POST /api/sessions/:id/input - Provide user input for 2FA/CAPTCHA
app.post('/:id/input', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { value } = body;

  if (!value) {
    return c.json({ error: 'value is required' }, 400);
  }

  // Get the running agent
  const agent = runningAgents.get(id);
  if (!agent) {
    return c.json({ error: 'Session is not running or agent not found' }, 404);
  }

  // Check if the agent is waiting for user input
  if (!agent.isWaitingForUserInput()) {
    return c.json({ error: 'Agent is not waiting for user input' }, 400);
  }

  // Provide the user input to the agent
  const success = agent.provideUserInput(value);

  if (success) {
    return c.json({ message: 'Input provided successfully', sessionId: id });
  } else {
    return c.json({ error: 'Failed to provide input' }, 500);
  }
});

// GET /api/sessions/:id/input-status - Check if session is waiting for user input
app.get('/:id/input-status', async (c) => {
  const id = c.req.param('id');

  // Get the running agent
  const agent = runningAgents.get(id);
  if (!agent) {
    return c.json({ waiting: false, message: 'Session is not running' });
  }

  const isWaiting = agent.isWaitingForUserInput();
  const request = agent.getPendingUserInputRequest();

  return c.json({
    waiting: isWaiting,
    request: request,
  });
});

export default app;
