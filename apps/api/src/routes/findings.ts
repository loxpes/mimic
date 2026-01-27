/**
 * Findings API Routes - Global findings management
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { findings, findingGroups, sessions } from '@testfarm/db';
import { eq, desc, sql, and, like, type SQL } from 'drizzle-orm';
import type { FindingType, FindingSeverity, FindingGroupStatus } from '@testfarm/shared';

const app = new Hono();

// GET /api/findings - List all finding groups (paginated)
app.get('/', async (c) => {
  const db = getDb();

  const {
    type,
    severity,
    status,
    url,
    page = '1',
    limit = '20',
  } = c.req.query();

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  // Build conditions array
  const conditions: SQL[] = [];
  if (type) conditions.push(eq(findingGroups.type, type as FindingType));
  if (severity) conditions.push(eq(findingGroups.severity, severity as FindingSeverity));
  if (status) conditions.push(eq(findingGroups.status, status as FindingGroupStatus));
  if (url) conditions.push(like(findingGroups.urlPattern, `%${url}%`));

  // Get total count
  const totalResult = conditions.length > 0
    ? await db.select({ count: sql<number>`count(*)` }).from(findingGroups).where(and(...conditions))
    : await db.select({ count: sql<number>`count(*)` }).from(findingGroups);

  const total = totalResult[0]?.count ?? 0;

  // Get paginated results
  const groups = conditions.length > 0
    ? await db
        .select()
        .from(findingGroups)
        .where(and(...conditions))
        .orderBy(desc(findingGroups.lastSeenAt))
        .limit(limitNum)
        .offset(offset)
    : await db
        .select()
        .from(findingGroups)
        .orderBy(desc(findingGroups.lastSeenAt))
        .limit(limitNum)
        .offset(offset);

  return c.json({
    data: groups,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/findings/stats - Get global statistics
app.get('/stats', async (c) => {
  const db = getDb();

  // Get counts by type
  const byType = await db
    .select({
      type: findingGroups.type,
      count: sql<number>`count(*)`,
      totalOccurrences: sql<number>`sum(${findingGroups.occurrenceCount})`,
    })
    .from(findingGroups)
    .groupBy(findingGroups.type);

  // Get counts by severity
  const bySeverity = await db
    .select({
      severity: findingGroups.severity,
      count: sql<number>`count(*)`,
      totalOccurrences: sql<number>`sum(${findingGroups.occurrenceCount})`,
    })
    .from(findingGroups)
    .groupBy(findingGroups.severity);

  // Get counts by status
  const byStatus = await db
    .select({
      status: findingGroups.status,
      count: sql<number>`count(*)`,
    })
    .from(findingGroups)
    .groupBy(findingGroups.status);

  // Get total
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(findingGroups);

  // Get total occurrences
  const [{ totalOccurrences }] = await db
    .select({ totalOccurrences: sql<number>`sum(${findingGroups.occurrenceCount})` })
    .from(findingGroups);

  return c.json({
    total,
    totalOccurrences: totalOccurrences || 0,
    byType: Object.fromEntries(byType.map((r) => [r.type, { count: r.count, occurrences: r.totalOccurrences }])),
    bySeverity: Object.fromEntries(bySeverity.map((r) => [r.severity, { count: r.count, occurrences: r.totalOccurrences }])),
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
  });
});

// GET /api/findings/groups/:id - Get a finding group with all occurrences
app.get('/groups/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  // Get the group
  const group = await db
    .select()
    .from(findingGroups)
    .where(eq(findingGroups.id, id))
    .get();

  if (!group) {
    return c.json({ error: 'Finding group not found' }, 404);
  }

  // Get all occurrences with session info
  const occurrences = await db
    .select({
      finding: findings,
      sessionTargetUrl: sessions.targetUrl,
      sessionCreatedAt: sessions.createdAt,
    })
    .from(findings)
    .leftJoin(sessions, eq(findings.sessionId, sessions.id))
    .where(eq(findings.groupId, id))
    .orderBy(desc(findings.createdAt));

  return c.json({
    group,
    occurrences: occurrences.map((o) => ({
      ...o.finding,
      session: {
        targetUrl: o.sessionTargetUrl,
        createdAt: o.sessionCreatedAt,
      },
    })),
  });
});

// PATCH /api/findings/groups/:id - Update a finding group (status)
app.patch('/groups/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = getDb();

  const { status } = body;

  // Validate status
  const validStatuses = ['open', 'acknowledged', 'resolved', 'wont-fix'];
  if (status && !validStatuses.includes(status)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  // Check if group exists
  const group = await db
    .select()
    .from(findingGroups)
    .where(eq(findingGroups.id, id))
    .get();

  if (!group) {
    return c.json({ error: 'Finding group not found' }, 404);
  }

  // Update the group
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (status) {
    updates.status = status;
  }

  await db
    .update(findingGroups)
    .set(updates)
    .where(eq(findingGroups.id, id));

  // Get updated group
  const updatedGroup = await db
    .select()
    .from(findingGroups)
    .where(eq(findingGroups.id, id))
    .get();

  return c.json(updatedGroup);
});

// GET /api/findings/recent - Get most recent findings
app.get('/recent', async (c) => {
  const db = getDb();
  const limit = parseInt(c.req.query('limit') || '10', 10);

  const recentFindings = await db
    .select({
      finding: findings,
      group: findingGroups,
    })
    .from(findings)
    .leftJoin(findingGroups, eq(findings.groupId, findingGroups.id))
    .orderBy(desc(findings.createdAt))
    .limit(limit);

  return c.json(recentFindings);
});

// GET /api/findings/top - Get most frequent finding groups
app.get('/top', async (c) => {
  const db = getDb();
  const limit = parseInt(c.req.query('limit') || '10', 10);

  const topGroups = await db
    .select()
    .from(findingGroups)
    .where(eq(findingGroups.status, 'open'))
    .orderBy(desc(findingGroups.occurrenceCount))
    .limit(limit);

  return c.json(topGroups);
});

export default app;
