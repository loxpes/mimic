/**
 * Screenshots API Routes - Serve screenshot images from disk
 */

import { Hono } from 'hono';
import { readFile, stat } from 'fs/promises';
import path from 'path';

const app = new Hono();

// Base directory for screenshots (relative to API working directory)
const SCREENSHOTS_BASE_DIR = 'data/screenshots';

// GET /api/screenshots/:sessionId/:filename - Serve a screenshot image
app.get('/:sessionId/:filename', async (c) => {
  const sessionId = c.req.param('sessionId');
  const filename = c.req.param('filename');

  // Sanitize inputs to prevent path traversal
  if (sessionId.includes('..') || filename.includes('..')) {
    return c.json({ error: 'Invalid path' }, 400);
  }

  // Only allow .jpg and .png files
  if (!filename.endsWith('.jpg') && !filename.endsWith('.png')) {
    return c.json({ error: 'Invalid file type' }, 400);
  }

  const filepath = path.join(SCREENSHOTS_BASE_DIR, sessionId, filename);

  try {
    // Check if file exists
    await stat(filepath);

    // Read the file
    const data = await readFile(filepath);

    // Determine content type
    const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch {
    return c.json({ error: 'Screenshot not found' }, 404);
  }
});

// GET /api/screenshots/:sessionId - List all screenshots for a session
app.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  // Sanitize input
  if (sessionId.includes('..')) {
    return c.json({ error: 'Invalid session ID' }, 400);
  }

  const dirPath = path.join(SCREENSHOTS_BASE_DIR, sessionId);

  try {
    const { readdir } = await import('fs/promises');
    const files = await readdir(dirPath);

    // Filter to only image files and sort
    const screenshots = files
      .filter((f) => f.endsWith('.jpg') || f.endsWith('.png'))
      .sort();

    return c.json({
      sessionId,
      screenshots: screenshots.map((filename) => ({
        filename,
        url: `/api/screenshots/${sessionId}/${filename}`,
      })),
    });
  } catch {
    return c.json({ sessionId, screenshots: [] });
  }
});

export default app;
