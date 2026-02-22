/**
 * Projects API Routes
 */

import { Hono } from 'hono';
import { eq, desc, inArray } from 'drizzle-orm';
import { getDb, projects, sessions, findings, personas, objectives, sessionChains } from '@testfarm/db';

// Simple ID generator
function generateId(): string {
  return `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const app = new Hono();

// ============================================================================
// Types
// ============================================================================

interface ProjectStats {
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  pendingSessions: number;
  runningSessions: number;
  totalFindings: number;
  findingsBySeverity: Record<string, number>;
  averageScore: number | null;
  averageDifficulty: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function calculateProjectStats(projectId: string): Promise<ProjectStats> {
  const projectSessions = await getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.projectId, projectId));

  const statusCounts = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  const scores: number[] = [];
  const difficulties: string[] = [];

  for (const session of projectSessions) {
    const status = session.state?.status || 'pending';
    if (status in statusCounts) {
      statusCounts[status as keyof typeof statusCounts]++;
    }

    const results = session.results as { personalAssessment?: { overallScore: number; difficulty: string } } | null;
    if (results?.personalAssessment) {
      scores.push(results.personalAssessment.overallScore);
      difficulties.push(results.personalAssessment.difficulty);
    }
  }

  const sessionIds = projectSessions.map((s) => s.id);
  let findingsData: { severity: string }[] = [];
  if (sessionIds.length > 0) {
    findingsData = await getDb()
      .select({ severity: findings.severity })
      .from(findings)
      .where(inArray(findings.sessionId, sessionIds));
  }

  const findingsBySeverity: Record<string, number> = {};
  for (const finding of findingsData) {
    findingsBySeverity[finding.severity] = (findingsBySeverity[finding.severity] || 0) + 1;
  }

  const averageScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  const difficultyCount: Record<string, number> = {};
  for (const d of difficulties) {
    difficultyCount[d] = (difficultyCount[d] || 0) + 1;
  }
  const averageDifficulty = Object.entries(difficultyCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalSessions: projectSessions.length,
    completedSessions: statusCounts.completed,
    failedSessions: statusCounts.failed,
    pendingSessions: statusCounts.pending,
    runningSessions: statusCounts.running,
    totalFindings: findingsData.length,
    findingsBySeverity,
    averageScore,
    averageDifficulty,
  };
}

// ============================================================================
// Routes
// ============================================================================

// GET /api/projects - List all projects
app.get('/', async (c) => {
  const allProjects = await getDb()
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt));

  const projectsWithStats = await Promise.all(
    allProjects.map(async (project) => {
      const stats = await calculateProjectStats(project.id);
      return { ...project, stats };
    })
  );

  return c.json(projectsWithStats);
});

// GET /api/projects/:id - Get project details
app.get('/:id', async (c) => {
  const { id } = c.req.param();

  const project = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const stats = await calculateProjectStats(id);
  const projectSessions = await getDb()
    .select({
      id: sessions.id,
      projectId: sessions.projectId,
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
    .where(eq(sessions.projectId, id))
    .orderBy(desc(sessions.createdAt));

  return c.json({
    ...project[0],
    stats,
    sessions: projectSessions,
  });
});

// POST /api/projects - Create project
app.post('/', async (c) => {
  const body = await c.req.json();
  const { name, description, targetUrl } = body;

  if (!name || !targetUrl) {
    return c.json({ error: 'Name and targetUrl are required' }, 400);
  }

  const id = generateId();
  const now = new Date();

  const newProject = {
    id,
    name,
    description: description || null,
    targetUrl,
    stats: {
      totalSessions: 0,
      completedSessions: 0,
      failedSessions: 0,
      pendingSessions: 0,
      runningSessions: 0,
      totalFindings: 0,
      findingsBySeverity: {},
      averageScore: null,
      averageDifficulty: null,
    },
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(projects).values(newProject);

  return c.json(newProject, 201);
});

// PATCH /api/projects/:id - Update project
app.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { name, description } = body;

  const existing = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;

  await getDb().update(projects).set(updates).where(eq(projects.id, id));

  const updated = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  return c.json(updated[0]);
});

// DELETE /api/projects/:id - Delete project
app.delete('/:id', async (c) => {
  const { id } = c.req.param();

  const existing = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  await getDb().update(sessions).set({ projectId: null }).where(eq(sessions.projectId, id));
  await getDb().delete(projects).where(eq(projects.id, id));

  return c.json({ message: 'Project deleted' });
});

// POST /api/projects/:id/sessions - Add sessions to project
app.post('/:id/sessions', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { sessionIds } = body;

  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return c.json({ error: 'sessionIds array is required' }, 400);
  }

  const project = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  await getDb()
    .update(sessions)
    .set({ projectId: id, updatedAt: new Date() })
    .where(inArray(sessions.id, sessionIds));

  const stats = await calculateProjectStats(id);
  await getDb().update(projects).set({ stats, updatedAt: new Date() }).where(eq(projects.id, id));

  return c.json({ message: `Added ${sessionIds.length} sessions to project`, stats });
});

// DELETE /api/projects/:id/sessions - Remove sessions from project
app.delete('/:id/sessions', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { sessionIds } = body;

  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return c.json({ error: 'sessionIds array is required' }, 400);
  }

  const project = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  await getDb()
    .update(sessions)
    .set({ projectId: null, updatedAt: new Date() })
    .where(inArray(sessions.id, sessionIds));

  const stats = await calculateProjectStats(id);
  await getDb().update(projects).set({ stats, updatedAt: new Date() }).where(eq(projects.id, id));

  return c.json({ message: `Removed ${sessionIds.length} sessions from project`, stats });
});

// POST /api/projects/:id/refresh-stats - Refresh project stats
app.post('/:id/refresh-stats', async (c) => {
  const { id } = c.req.param();

  const project = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const stats = await calculateProjectStats(id);
  await getDb().update(projects).set({ stats, updatedAt: new Date() }).where(eq(projects.id, id));

  return c.json({ ...project[0], stats });
});

// GET /api/projects/:id/chains - Get session chains for project
app.get('/:id/chains', async (c) => {
  const { id } = c.req.param();

  const project = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const chains = await getDb()
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
    .where(eq(sessionChains.projectId, id))
    .orderBy(desc(sessionChains.createdAt));

  return c.json(chains);
});

// POST /api/projects/:id/chains - Add chains to project
app.post('/:id/chains', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { chainIds } = body;

  if (!Array.isArray(chainIds) || chainIds.length === 0) {
    return c.json({ error: 'chainIds array is required' }, 400);
  }

  const project = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  await getDb()
    .update(sessionChains)
    .set({ projectId: id, updatedAt: new Date() })
    .where(inArray(sessionChains.id, chainIds));

  await getDb()
    .update(sessions)
    .set({ projectId: id, updatedAt: new Date() })
    .where(inArray(sessions.parentChainId, chainIds));

  const stats = await calculateProjectStats(id);
  await getDb().update(projects).set({ stats, updatedAt: new Date() }).where(eq(projects.id, id));

  return c.json({ message: `Added ${chainIds.length} chains to project`, stats });
});

// DELETE /api/projects/:id/chains - Remove chains from project
app.delete('/:id/chains', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { chainIds } = body;

  if (!Array.isArray(chainIds) || chainIds.length === 0) {
    return c.json({ error: 'chainIds array is required' }, 400);
  }

  const project = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (project.length === 0) {
    return c.json({ error: 'Project not found' }, 404);
  }

  await getDb()
    .update(sessionChains)
    .set({ projectId: null, updatedAt: new Date() })
    .where(inArray(sessionChains.id, chainIds));

  await getDb()
    .update(sessions)
    .set({ projectId: null, updatedAt: new Date() })
    .where(inArray(sessions.parentChainId, chainIds));

  const stats = await calculateProjectStats(id);
  await getDb().update(projects).set({ stats, updatedAt: new Date() }).where(eq(projects.id, id));

  return c.json({ message: `Removed ${chainIds.length} chains from project`, stats });
});

export default app;
