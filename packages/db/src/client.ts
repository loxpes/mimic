/**
 * Database Connection - SQLite with Drizzle ORM
 */

import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { resolve } from 'path';
import { mkdirSync } from 'fs';
import * as schema from './schema.js';

// ============================================================================
// Database Path
// ============================================================================

function getDbPath(): string {
  const dbPath = process.env.DATABASE_PATH;
  if (dbPath) return dbPath;

  // Default: data/testfarm.db relative to project root
  const dataDir = resolve(process.cwd(), 'data');
  mkdirSync(dataDir, { recursive: true });
  return resolve(dataDir, 'testfarm.db');
}

// ============================================================================
// Database Instance
// ============================================================================

let dbInstance: BetterSQLite3Database<typeof schema> | null = null;
let sqliteDb: Database.Database | null = null;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!dbInstance) {
    const dbPath = getDbPath();
    sqliteDb = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');

    dbInstance = drizzle(sqliteDb, { schema });
  }

  return dbInstance;
}

// ============================================================================
// Initialization (auto-create tables)
// ============================================================================

export async function initializeDb(): Promise<void> {
  getDb();

  // Create tables if they don't exist
  sqliteDb!.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      definition TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS objectives (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      definition TEXT NOT NULL,
      config TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      target_url TEXT NOT NULL,
      stats TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_chains (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      persona_id TEXT NOT NULL REFERENCES personas(id),
      objective_id TEXT NOT NULL REFERENCES objectives(id),
      target_url TEXT NOT NULL,
      name TEXT,
      llm_config TEXT,
      vision_config TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      session_count INTEGER NOT NULL DEFAULT 0,
      schedule TEXT,
      persistent_memory TEXT,
      aggregated_score TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      parent_chain_id TEXT REFERENCES session_chains(id),
      chain_sequence INTEGER,
      scheduled_at INTEGER,
      persona_id TEXT NOT NULL REFERENCES personas(id),
      objective_id TEXT NOT NULL REFERENCES objectives(id),
      target_url TEXT NOT NULL,
      llm_config TEXT NOT NULL,
      vision_config TEXT NOT NULL,
      state TEXT NOT NULL,
      results TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      scheduled_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at INTEGER,
      error TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      sequence INTEGER NOT NULL,
      context TEXT NOT NULL,
      decision TEXT NOT NULL,
      outcome TEXT NOT NULL,
      screenshot TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS finding_groups (
      id TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      canonical_description TEXT NOT NULL,
      url_pattern TEXT NOT NULL,
      element_selector TEXT,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      session_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'open',
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      event_id TEXT REFERENCES events(id),
      group_id TEXT REFERENCES finding_groups(id),
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      persona_perspective TEXT NOT NULL,
      url TEXT NOT NULL,
      element_id TEXT,
      fingerprint TEXT,
      is_duplicate INTEGER NOT NULL DEFAULT 0,
      evidence TEXT,
      trello_card_id TEXT,
      trello_card_url TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_reports (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      summary TEXT NOT NULL,
      findings_summary TEXT NOT NULL,
      markdown_report TEXT NOT NULL,
      metrics TEXT,
      recommendations TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      type TEXT NOT NULL,
      config TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY DEFAULT 'global',
      llm_provider TEXT DEFAULT 'anthropic',
      llm_model TEXT DEFAULT 'claude-sonnet-4-20250514',
      updated_at INTEGER
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_session_chains_project ON session_chains(project_id);
    CREATE INDEX IF NOT EXISTS idx_session_chains_status ON session_chains(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_persona ON sessions(persona_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_objective ON sessions(objective_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_chain ON sessions(parent_chain_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status ON scheduled_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_scheduled_at ON scheduled_tasks(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_finding_groups_fingerprint ON finding_groups(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_finding_groups_type ON finding_groups(type);
    CREATE INDEX IF NOT EXISTS idx_finding_groups_severity ON finding_groups(severity);
    CREATE INDEX IF NOT EXISTS idx_finding_groups_status ON finding_groups(status);
    CREATE INDEX IF NOT EXISTS idx_findings_session ON findings(session_id);
    CREATE INDEX IF NOT EXISTS idx_findings_group ON findings(group_id);
    CREATE INDEX IF NOT EXISTS idx_findings_fingerprint ON findings(fingerprint);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_session_reports_session ON session_reports(session_id);
    CREATE INDEX IF NOT EXISTS idx_integrations_project ON integrations(project_id);
    CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
  `);

  console.log('[DB] SQLite database initialized at', getDbPath());
}

// ============================================================================
// Cleanup
// ============================================================================

export async function closeDb(): Promise<void> {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    dbInstance = null;
    console.log('[DB] SQLite connection closed');
  }
}
