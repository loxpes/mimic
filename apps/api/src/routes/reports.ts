/**
 * Reports API Routes - Session report management
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { sessionReports, sessions } from '@testfarm/db';
import { eq, desc } from 'drizzle-orm';

const app = new Hono();

// GET /api/reports - List all reports
app.get('/', async (c) => {
  const db = getDb();

  const reports = await db
    .select({
      report: sessionReports,
      sessionTargetUrl: sessions.targetUrl,
    })
    .from(sessionReports)
    .leftJoin(sessions, eq(sessionReports.sessionId, sessions.id))
    .orderBy(desc(sessionReports.createdAt));

  return c.json(
    reports.map((r) => ({
      ...r.report,
      targetUrl: r.sessionTargetUrl,
    }))
  );
});

// GET /api/reports/:sessionId - Get report for a session
app.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const db = getDb();

  const report = await db
    .select()
    .from(sessionReports)
    .where(eq(sessionReports.sessionId, sessionId))
    .get();

  if (!report) {
    return c.json({ error: 'Report not found for this session' }, 404);
  }

  return c.json(report);
});

// GET /api/reports/:sessionId/markdown - Download report as markdown
app.get('/:sessionId/markdown', async (c) => {
  const sessionId = c.req.param('sessionId');
  const db = getDb();

  const report = await db
    .select()
    .from(sessionReports)
    .where(eq(sessionReports.sessionId, sessionId))
    .get();

  if (!report) {
    return c.json({ error: 'Report not found for this session' }, 404);
  }

  // Set headers for file download
  c.header('Content-Type', 'text/markdown; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="report-${sessionId}.md"`);

  return c.body(report.markdownReport);
});

// GET /api/reports/:sessionId/summary - Get just the summary
app.get('/:sessionId/summary', async (c) => {
  const sessionId = c.req.param('sessionId');
  const db = getDb();

  const report = await db
    .select({
      summary: sessionReports.summary,
      findingsSummary: sessionReports.findingsSummary,
      recommendations: sessionReports.recommendations,
    })
    .from(sessionReports)
    .where(eq(sessionReports.sessionId, sessionId))
    .get();

  if (!report) {
    return c.json({ error: 'Report not found for this session' }, 404);
  }

  return c.json(report);
});

export default app;
