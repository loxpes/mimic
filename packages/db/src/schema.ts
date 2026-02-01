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
// Projects Table
// ============================================================================

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  targetUrl: text('target_url').notNull(),
  stats: text('stats', { mode: 'json' }).$type<{
    totalSessions: number;
    completedSessions: number;
    failedSessions: number;
    pendingSessions: number;
    runningSessions: number;
    totalFindings: number;
    findingsBySeverity: Record<string, number>;
    averageScore: number | null;
    averageDifficulty: string | null;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Session Chains Table (Multi-Day Persistent Sessions)
// ============================================================================

export const sessionChains = sqliteTable('session_chains', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  personaId: text('persona_id').notNull().references(() => personas.id),
  objectiveId: text('objective_id').notNull().references(() => objectives.id),
  targetUrl: text('target_url').notNull(),
  name: text('name'),
  llmConfig: text('llm_config', { mode: 'json' }).$type<{
    provider: 'anthropic' | 'openai' | 'ollama' | 'claude-cli' | 'custom' | 'google';
    model: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
    language?: string;
  }>(),
  visionConfig: text('vision_config', { mode: 'json' }).$type<{
    screenshotInterval: number;
    screenshotOnLowConfidence: boolean;
    confidenceThreshold: number;
  }>(),
  status: text('status').notNull().default('active').$type<'active' | 'paused' | 'completed' | 'archived'>(),
  sessionCount: integer('session_count').notNull().default(0),
  schedule: text('schedule', { mode: 'json' }).$type<{
    enabled: boolean;
    cronExpression?: string;
    nextRunAt?: number;
    timezone?: string;
    maxSessions?: number;
  }>(),
  persistentMemory: text('persistent_memory', { mode: 'json' }).$type<{
    discoveries: string[];
    frustrations: string[];
    decisions: string[];
    visitedPages: string[];
  }>(),
  aggregatedScore: text('aggregated_score', { mode: 'json' }).$type<{
    totalSessions: number;
    weightedScore: number;
    scores: Array<{ sessionId: string; score: number; weight: number; timestamp: number }>;
    trend: 'improving' | 'stable' | 'declining' | null;
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
  projectId: text('project_id').references(() => projects.id),
  // Chain support
  parentChainId: text('parent_chain_id').references(() => sessionChains.id),
  chainSequence: integer('chain_sequence'),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  personaId: text('persona_id').notNull().references(() => personas.id),
  objectiveId: text('objective_id').notNull().references(() => objectives.id),
  targetUrl: text('target_url').notNull(),
  llmConfig: text('llm_config', { mode: 'json' }).notNull().$type<{
    provider: 'anthropic' | 'openai' | 'ollama' | 'claude-cli' | 'custom' | 'google';
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
    personalAssessment?: {
      overallScore: number;
      difficulty: string;
      wouldRecommend: boolean;
      positives: string[];
      negatives: string[];
      summary: string;
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
// Scheduled Tasks Table
// ============================================================================

export const scheduledTasks = sqliteTable('scheduled_tasks', {
  id: text('id').primaryKey(),
  type: text('type').notNull().$type<'chain_continue' | 'session_start'>(),
  targetId: text('target_id').notNull(),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull().default('pending').$type<'pending' | 'running' | 'completed' | 'failed' | 'cancelled'>(),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp' }),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
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
      state: string;
      action_reason: string;
      confidence: 'high' | 'medium' | 'low';
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
  trelloCardId: text('trello_card_id'),
  trelloCardUrl: text('trello_card_url'),
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
// Integrations Table
// ============================================================================

export interface TrelloBoardStructure {
  lists: Array<{ id: string; name: string; cardCount?: number }>;
  labels: Array<{ id: string; name: string; color: string }>;
  analyzedAt: number;
  recommendedLists?: Record<string, string>;
  labelMapping?: Record<string, string>;
}

export interface TrelloConfig {
  accessToken: string;
  tokenSecret?: string;
  boardId: string;
  boardName: string;
  boardStructure?: TrelloBoardStructure;
}

export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  type: text('type').notNull(),  // 'trello', 'jira', etc.
  config: text('config', { mode: 'json' }).$type<TrelloConfig>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// App Settings Table (Global Configuration)
// ============================================================================

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey().default('global'),

  // LLM Configuration
  llmProvider: text('llm_provider').default('anthropic').$type<'anthropic' | 'openai' | 'ollama' | 'claude-cli' | 'google'>(),
  llmModel: text('llm_model').default('claude-sonnet-4-20250514'),

  // Encrypted API Keys (AES-256-GCM, base64 encoded)
  encryptedAnthropicKey: text('encrypted_anthropic_key'),
  encryptedOpenaiKey: text('encrypted_openai_key'),
  encryptedGoogleKey: text('encrypted_google_key'),

  // Ollama config (no key needed)
  ollamaBaseUrl: text('ollama_base_url').default('http://localhost:11434/v1'),

  // Timestamps
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type AppSettings = typeof appSettings.$inferSelect;
export type NewAppSettings = typeof appSettings.$inferInsert;

export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;

export type Objective = typeof objectives.$inferSelect;
export type NewObjective = typeof objectives.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

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

export type SessionChain = typeof sessionChains.$inferSelect;
export type NewSessionChain = typeof sessionChains.$inferInsert;

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type NewScheduledTask = typeof scheduledTasks.$inferInsert;
