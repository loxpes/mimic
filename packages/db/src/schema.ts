/**
 * Database Schema - Drizzle ORM definitions for PostgreSQL/Supabase
 */

import { pgTable, text, integer, timestamp, boolean, uuid, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';

// ============================================================================
// Personas Table
// ============================================================================

export const personas = pgTable('personas', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(), // Supabase auth.uid()
  name: text('name').notNull(),
  definition: jsonb('definition').notNull().$type<{
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
  metadata: jsonb('metadata').$type<{
    archetype?: string;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_personas_user_id').on(table.userId),
]);

// ============================================================================
// Objectives Table
// ============================================================================

export const objectives = pgTable('objectives', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  definition: jsonb('definition').notNull().$type<{
    goal: string;
    constraints?: string[];
    successCriteria?: {
      type: 'none' | 'element-present' | 'url-match' | 'custom';
      condition?: string;
    };
  }>(),
  config: jsonb('config').notNull().$type<{
    autonomyLevel: 'exploration' | 'goal-directed' | 'restricted' | 'semi-guided';
    maxActions?: number;
    maxDuration?: number;
    restrictions?: string[];
    steps?: string[];
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_objectives_user_id').on(table.userId),
]);

// ============================================================================
// Projects Table
// ============================================================================

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  targetUrl: text('target_url').notNull(),
  stats: jsonb('stats').$type<{
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_projects_user_id').on(table.userId),
]);

// ============================================================================
// Session Chains Table (Multi-Day Persistent Sessions)
// ============================================================================

export const sessionChains = pgTable('session_chains', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  personaId: text('persona_id').notNull().references(() => personas.id),
  objectiveId: text('objective_id').notNull().references(() => objectives.id),
  targetUrl: text('target_url').notNull(),
  name: text('name'),
  llmConfig: jsonb('llm_config').$type<{
    provider: 'anthropic' | 'openai' | 'claude-cli' | 'custom' | 'google';
    model: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
    language?: string;
  }>(),
  visionConfig: jsonb('vision_config').$type<{
    screenshotInterval: number;
    screenshotOnLowConfidence: boolean;
    confidenceThreshold: number;
  }>(),
  status: text('status').notNull().default('active').$type<'active' | 'paused' | 'completed' | 'archived'>(),
  sessionCount: integer('session_count').notNull().default(0),
  schedule: jsonb('schedule').$type<{
    enabled: boolean;
    cronExpression?: string;
    nextRunAt?: number;
    timezone?: string;
    maxSessions?: number;
  }>(),
  persistentMemory: jsonb('persistent_memory').$type<{
    discoveries: string[];
    frustrations: string[];
    decisions: string[];
    visitedPages: string[];
  }>(),
  aggregatedScore: jsonb('aggregated_score').$type<{
    totalSessions: number;
    weightedScore: number;
    scores: Array<{ sessionId: string; score: number; weight: number; timestamp: number }>;
    trend: 'improving' | 'stable' | 'declining' | null;
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_session_chains_project').on(table.projectId),
  index('idx_session_chains_status').on(table.status),
]);

// ============================================================================
// Sessions Table
// ============================================================================

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  // Chain support
  parentChainId: text('parent_chain_id').references(() => sessionChains.id),
  chainSequence: integer('chain_sequence'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  personaId: text('persona_id').notNull().references(() => personas.id),
  objectiveId: text('objective_id').notNull().references(() => objectives.id),
  targetUrl: text('target_url').notNull(),
  llmConfig: jsonb('llm_config').notNull().$type<{
    provider: 'anthropic' | 'openai' | 'claude-cli' | 'custom' | 'google';
    model: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
  }>(),
  visionConfig: jsonb('vision_config').notNull().$type<{
    screenshotInterval: number;
    screenshotOnLowConfidence: boolean;
    confidenceThreshold: number;
  }>(),
  state: jsonb('state').notNull().$type<{
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    actionCount: number;
    progress: number;
    currentUrl: string;
    startedAt?: number;
    completedAt?: number;
  }>(),
  results: jsonb('results').$type<{
    outcome: 'pursuing' | 'blocked' | 'completed' | 'abandoned';
    summary: string;
    actionsTaken: number;
    duration: number;
    currentUrl?: string;
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
    // Memory state for session continuation
    memory?: {
      discoveries: string[];
      frustrations: string[];
      decisions: string[];
    };
    // Pages visited during session
    visitedPages?: string[];
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_sessions_persona').on(table.personaId),
  index('idx_sessions_objective').on(table.objectiveId),
  index('idx_sessions_project').on(table.projectId),
  index('idx_sessions_chain').on(table.parentChainId),
]);

// ============================================================================
// Scheduled Tasks Table
// ============================================================================

export const scheduledTasks = pgTable('scheduled_tasks', {
  id: text('id').primaryKey(),
  type: text('type').notNull().$type<'chain_continue' | 'session_start'>(),
  targetId: text('target_id').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('pending').$type<'pending' | 'running' | 'completed' | 'failed' | 'cancelled'>(),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_scheduled_tasks_status').on(table.status),
  index('idx_scheduled_tasks_scheduled_at').on(table.scheduledAt),
]);

// ============================================================================
// Events Table (Action History)
// ============================================================================

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  sequence: integer('sequence').notNull(),
  context: jsonb('context').notNull().$type<{
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
  decision: jsonb('decision').notNull().$type<{
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
  outcome: jsonb('outcome').notNull().$type<{
    success: boolean;
    error?: string;
    duration: number;
  }>(),
  screenshot: text('screenshot'), // Base64 or file path
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_events_session').on(table.sessionId),
]);

// ============================================================================
// Finding Groups Table (for deduplication)
// ============================================================================

export const findingGroups = pgTable('finding_groups', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  fingerprint: text('fingerprint').notNull(),
  type: text('type').notNull().$type<'ux-issue' | 'bug' | 'accessibility' | 'performance' | 'content' | 'visual-design'>(),
  severity: text('severity').notNull().$type<'low' | 'medium' | 'high' | 'critical'>(),
  canonicalDescription: text('canonical_description').notNull(),
  urlPattern: text('url_pattern').notNull(),
  elementSelector: text('element_selector'),
  occurrenceCount: integer('occurrence_count').notNull().default(1),
  sessionCount: integer('session_count').notNull().default(1),
  status: text('status').notNull().default('open').$type<'open' | 'acknowledged' | 'resolved' | 'wont-fix'>(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_finding_groups_fingerprint_user').on(table.fingerprint, table.userId),
  index('idx_finding_groups_user_id').on(table.userId),
  index('idx_finding_groups_type').on(table.type),
  index('idx_finding_groups_severity').on(table.severity),
  index('idx_finding_groups_status').on(table.status),
]);

// ============================================================================
// Findings Table
// ============================================================================

export const findings = pgTable('findings', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  eventId: text('event_id').references(() => events.id),
  groupId: text('group_id').references(() => findingGroups.id),
  type: text('type').notNull().$type<'ux-issue' | 'bug' | 'accessibility' | 'performance' | 'content' | 'visual-design'>(),
  severity: text('severity').notNull().$type<'low' | 'medium' | 'high' | 'critical'>(),
  description: text('description').notNull(),
  personaPerspective: text('persona_perspective').notNull(), // "Maria se frustro porque..."
  url: text('url').notNull(),
  elementId: text('element_id'),
  fingerprint: text('fingerprint'),
  isDuplicate: boolean('is_duplicate').notNull().default(false),
  evidence: jsonb('evidence').$type<{
    screenshot?: string;
    selector?: string;
    errorMessage?: string;
    additionalContext?: string;
  }>(),
  trelloCardId: text('trello_card_id'),
  trelloCardUrl: text('trello_card_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_findings_session').on(table.sessionId),
  index('idx_findings_group').on(table.groupId),
  index('idx_findings_fingerprint').on(table.fingerprint),
]);

// ============================================================================
// Session Reports Table
// ============================================================================

export const sessionReports = pgTable('session_reports', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  summary: text('summary').notNull(),
  findingsSummary: jsonb('findings_summary').notNull().$type<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    newFindings: number;
    duplicateFindings: number;
  }>(),
  markdownReport: text('markdown_report').notNull(),
  metrics: jsonb('metrics').$type<{
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    pagesVisited: number;
    screenshotsTaken: number;
    llmCalls: number;
    totalTokens: number;
  }>(),
  recommendations: jsonb('recommendations').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_session_reports_session').on(table.sessionId),
]);

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

export const integrations = pgTable('integrations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  type: text('type').notNull(),  // 'trello', 'jira', etc.
  config: jsonb('config').$type<TrelloConfig>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_integrations_project').on(table.projectId),
  index('idx_integrations_type').on(table.type),
]);

// ============================================================================
// App Settings Table (Per-User Configuration)
// ============================================================================

export const appSettings = pgTable('app_settings', {
  id: text('id').primaryKey(), // Format: "user_{userId}" or "global" for defaults
  userId: uuid('user_id'), // null for global defaults

  // LLM Configuration
  llmProvider: text('llm_provider').default('claude-cli').$type<'anthropic' | 'openai' | 'claude-cli' | 'google'>(),
  llmModel: text('llm_model').default('claude-sonnet-4-20250514'),

  // Encrypted API Keys (AES-256-GCM, base64 encoded)
  encryptedAnthropicKey: text('encrypted_anthropic_key'),
  encryptedOpenaiKey: text('encrypted_openai_key'),
  encryptedGoogleKey: text('encrypted_google_key'),

  // Timestamps
  updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
  index('idx_app_settings_user_id').on(table.userId),
]);

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

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
