/**
 * Database Schema - Drizzle ORM definitions
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// Personas Table
// ============================================================================

export const personas = sqliteTable('personas', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  definition: text('definition', { mode: 'json' }).notNull().$type<{
    identity: string;
    techProfile: string;
    personality: string;
    context: string;
    tendencies: string[];
    credentials?: {
      email: string;
      password: string;
    };
  }>(),
  metadata: text('metadata', { mode: 'json' }).$type<{
    archetype?: string;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Objectives Table
// ============================================================================

export const objectives = sqliteTable('objectives', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  definition: text('definition', { mode: 'json' }).notNull().$type<{
    goal: string;
    constraints?: string[];
    successCriteria?: {
      type: 'none' | 'element-present' | 'url-match' | 'custom';
      condition?: string;
    };
  }>(),
  config: text('config', { mode: 'json' }).notNull().$type<{
    autonomyLevel: 'exploration' | 'goal-directed' | 'restricted' | 'semi-guided';
    maxActions?: number;
    maxDuration?: number;
    restrictions?: string[];
    steps?: string[];
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Sessions Table
// ============================================================================

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  personaId: text('persona_id').notNull().references(() => personas.id),
  objectiveId: text('objective_id').notNull().references(() => objectives.id),
  targetUrl: text('target_url').notNull(),
  llmConfig: text('llm_config', { mode: 'json' }).notNull().$type<{
    provider: 'anthropic' | 'openai' | 'ollama' | 'claude-cli' | 'custom';
    model: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
  }>(),
  visionConfig: text('vision_config', { mode: 'json' }).notNull().$type<{
    screenshotInterval: number;
    screenshotOnLowConfidence: boolean;
    confidenceThreshold: number;
  }>(),
  state: text('state', { mode: 'json' }).notNull().$type<{
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    actionCount: number;
    progress: number;
    currentUrl: string;
    startedAt?: number;
    completedAt?: number;
  }>(),
  results: text('results', { mode: 'json' }).$type<{
    outcome: 'pursuing' | 'blocked' | 'completed' | 'abandoned';
    summary: string;
    actionsTaken: number;
    duration: number;
    metrics: {
      totalActions: number;
      successfulActions: number;
      failedActions: number;
      pagesVisited: number;
      screenshotsTaken: number;
      llmCalls: number;
      totalTokens: number;
    };
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Events Table (Action History)
// ============================================================================

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  sequence: integer('sequence').notNull(),
  context: text('context', { mode: 'json' }).notNull().$type<{
    url: string;
    pageTitle: string;
    elementCount: number;
    /** DOM elements extracted at this action (for debugging) */
    elements?: Array<{
      id: string;
      name: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      source: string;
      selector?: string;
      disabled?: boolean;
      role?: string;
      attributes?: {
        id?: string;
        className?: string;
        dataTestId?: string;
        type?: string;
        tagName?: string;
      };
    }>;
  }>(),
  decision: text('decision', { mode: 'json' }).notNull().$type<{
    action: {
      type: string;
      target?: {
        elementId?: string;
        description: string;
        coordinates?: { x: number; y: number };
      };
      value?: string;
      duration?: number;
      direction?: string;
    };
    reasoning: {
      observation: string;
      thought: string;
      confidence: number;
    };
    progress: {
      objectiveStatus: string;
      completionEstimate: number;
      nextSteps: string[];
    };
  }>(),
  outcome: text('outcome', { mode: 'json' }).notNull().$type<{
    success: boolean;
    error?: string;
    duration: number;
  }>(),
  screenshot: text('screenshot'), // Base64 or file path
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Finding Groups Table (for deduplication)
// ============================================================================

export const findingGroups = sqliteTable('finding_groups', {
  id: text('id').primaryKey(),
  fingerprint: text('fingerprint').notNull().unique(),
  type: text('type').notNull().$type<'ux-issue' | 'bug' | 'accessibility' | 'performance' | 'content' | 'visual-design'>(),
  severity: text('severity').notNull().$type<'low' | 'medium' | 'high' | 'critical'>(),
  canonicalDescription: text('canonical_description').notNull(),
  urlPattern: text('url_pattern').notNull(),
  elementSelector: text('element_selector'),
  occurrenceCount: integer('occurrence_count').notNull().default(1),
  sessionCount: integer('session_count').notNull().default(1),
  status: text('status').notNull().default('open').$type<'open' | 'acknowledged' | 'resolved' | 'wont-fix'>(),
  firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }).notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Findings Table
// ============================================================================

export const findings = sqliteTable('findings', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  eventId: text('event_id').references(() => events.id),
  groupId: text('group_id').references(() => findingGroups.id),
  type: text('type').notNull().$type<'ux-issue' | 'bug' | 'accessibility' | 'performance' | 'content' | 'visual-design'>(),
  severity: text('severity').notNull().$type<'low' | 'medium' | 'high' | 'critical'>(),
  description: text('description').notNull(),
  personaPerspective: text('persona_perspective').notNull(), // "María se frustró porque..."
  url: text('url').notNull(),
  elementId: text('element_id'),
  fingerprint: text('fingerprint'),
  isDuplicate: integer('is_duplicate', { mode: 'boolean' }).notNull().default(false),
  evidence: text('evidence', { mode: 'json' }).$type<{
    screenshot?: string;
    selector?: string;
    errorMessage?: string;
    additionalContext?: string;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Session Reports Table
// ============================================================================

export const sessionReports = sqliteTable('session_reports', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id).unique(),
  summary: text('summary').notNull(),
  findingsSummary: text('findings_summary', { mode: 'json' }).notNull().$type<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    newFindings: number;
    duplicateFindings: number;
  }>(),
  markdownReport: text('markdown_report').notNull(),
  metrics: text('metrics', { mode: 'json' }).$type<{
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    pagesVisited: number;
    screenshotsTaken: number;
    llmCalls: number;
    totalTokens: number;
  }>(),
  recommendations: text('recommendations', { mode: 'json' }).$type<string[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;

export type Objective = typeof objectives.$inferSelect;
export type NewObjective = typeof objectives.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type FindingGroup = typeof findingGroups.$inferSelect;
export type NewFindingGroup = typeof findingGroups.$inferInsert;

export type Finding = typeof findings.$inferSelect;
export type NewFinding = typeof findings.$inferInsert;

export type SessionReport = typeof sessionReports.$inferSelect;
export type NewSessionReport = typeof sessionReports.$inferInsert;
