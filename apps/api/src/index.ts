/**
 * TestFarm API Server - Hono REST API
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try multiple locations for .env
const envPaths = [
  resolve(__dirname, '../../../.env'),      // From dist: apps/api/dist -> root
  resolve(__dirname, '../../../../.env'),   // From src: apps/api/src -> root
  resolve(process.cwd(), '.env'),           // Current working directory
  resolve(process.cwd(), '../../.env'),     // If running from apps/api
];

for (const envPath of envPaths) {
  const result = config({ path: envPath });
  if (result.parsed) {
    console.log(`[ENV] Loaded from: ${envPath}`);
    break;
  }
}
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initializeDb } from '@testfarm/db';
import sessions from './routes/sessions.js';
import personas from './routes/personas.js';
import objectives from './routes/objectives.js';
import events from './routes/events.js';
import findings from './routes/findings.js';
import reports from './routes/reports.js';
import screenshots from './routes/screenshots.js';
import projects from './routes/projects.js';
import trello from './routes/integrations/trello.js';
// YAML sync removed - personas now managed 100% via DB and frontend
// import { syncYamlToDatabase } from './sync.js';

// ============================================================================
// App Setup
// ============================================================================

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'TestFarm API',
    version: '0.1.0',
    status: 'healthy',
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Routes
app.route('/api/sessions', sessions);
app.route('/api/personas', personas);
app.route('/api/objectives', objectives);
app.route('/api/events', events);
app.route('/api/findings', findings);
app.route('/api/reports', reports);
app.route('/api/screenshots', screenshots);
app.route('/api/projects', projects);
app.route('/api/integrations/trello', trello);

// ============================================================================
// Start Server
// ============================================================================

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  // Initialize database
  await initializeDb();
  console.log('Database initialized');

  // Start server
  console.log(`TestFarm API running on http://localhost:${PORT}`);
  serve({
    fetch: app.fetch,
    port: PORT,
  });
}

main().catch(console.error);
