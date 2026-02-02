/**
 * Events API Routes - SSE Streaming for real-time updates
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getDb } from '@testfarm/db';
import { events, findings } from '@testfarm/db';
import { eq } from 'drizzle-orm';

const app = new Hono();

// Store active session streams
const activeStreams = new Map<string, Set<(data: unknown) => void>>();

// GET /api/events/:sessionId - Get all events for a session
app.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const db = getDb();
  const sessionEvents = await db
    .select()
    .from(events)
    .where(eq(events.sessionId, sessionId))
    .orderBy(events.sequence);
  return c.json(sessionEvents);
});

// GET /api/events/:sessionId/findings - Get all findings for a session
app.get('/:sessionId/findings', async (c) => {
  const sessionId = c.req.param('sessionId');
  const db = getDb();
  const sessionFindings = await db
    .select()
    .from(findings)
    .where(eq(findings.sessionId, sessionId))
    .orderBy(findings.createdAt);
  return c.json(sessionFindings);
});

// GET /api/events/:sessionId/stream - SSE stream for real-time updates
app.get('/:sessionId/stream', async (c) => {
  const sessionId = c.req.param('sessionId');

  return streamSSE(c, async (stream) => {
    // Send initial connection message
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ sessionId, timestamp: Date.now() }),
    });

    // Create callback for this stream
    const sendEvent = async (data: unknown) => {
      try {
        await stream.writeSSE({
          event: 'update',
          data: JSON.stringify(data),
        });
      } catch {
        // Stream closed, remove from active streams
        const streams = activeStreams.get(sessionId);
        if (streams) {
          streams.delete(sendEvent);
          if (streams.size === 0) {
            activeStreams.delete(sessionId);
          }
        }
      }
    };

    // Register this stream
    if (!activeStreams.has(sessionId)) {
      activeStreams.set(sessionId, new Set());
    }
    activeStreams.get(sessionId)!.add(sendEvent);

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: 'heartbeat',
          data: JSON.stringify({ timestamp: Date.now() }),
        });
      } catch {
        clearInterval(heartbeat);
      }
    }, 30000);

    // Wait for stream to close
    // Use 1 hour timeout - stream will be kept alive by heartbeat
    // Max safe setTimeout is 2^31-1 ms (~24.8 days)
    const ONE_HOUR_MS = 60 * 60 * 1000;
    try {
      while (true) {
        await stream.sleep(ONE_HOUR_MS);
      }
    } catch {
      // Stream closed by client
    }

    // Cleanup
    clearInterval(heartbeat);
    const streams = activeStreams.get(sessionId);
    if (streams) {
      streams.delete(sendEvent);
      if (streams.size === 0) {
        activeStreams.delete(sessionId);
      }
    }
  });
});

// Helper function to broadcast events to all listeners
export function broadcastSessionEvent(sessionId: string, event: {
  type: 'action' | 'progress' | 'finding' | 'complete' | 'error' | 'user-input-required';
  data: unknown;
}) {
  const streams = activeStreams.get(sessionId);
  if (streams) {
    for (const sendEvent of streams) {
      sendEvent(event);
    }
  }
}

export default app;
