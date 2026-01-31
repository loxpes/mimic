/**
 * API Client for TestFarm Backend
 */

const API_BASE = '/api';

// ============================================================================
// Types
// ============================================================================

export interface Session {
  id: string;
  personaId: string;
  objectiveId: string;
  targetUrl: string;
  llmConfig: Record<string, unknown>;
  visionConfig: Record<string, unknown>;
  state: {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    actionCount: number;
    progress: number;
  };
  results: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  personaName?: string;
  objectiveName?: string;
}

export interface Persona {
  id: string;
  name: string;
  definition: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Objective {
  id: string;
  name: string;
  definition: Record<string, unknown>;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  sequence: number;
  context: Record<string, unknown>;
  decision: Record<string, unknown>;
  outcome: Record<string, unknown>;
  screenshot?: string; // Path to screenshot file
  createdAt: string;
}

export interface Finding {
  id: string;
  sessionId: string;
  eventId: string;
  type: string;
  severity: string;
  description: string;
  personaPerspective: string;
  evidence: Record<string, unknown>;
  createdAt: string;
}

export interface CreateSessionInput {
  personaId: string;
  objectiveId: string;
  targetUrl: string;
  projectId?: string;
  llmConfig?: Record<string, unknown>;
  visionConfig?: Record<string, unknown>;
}

export interface CreateBatchSessionInput {
  targetUrl: string;
  personaIds: string[];
  objectiveIds: string[];
  projectId?: string;
  llmConfig?: Record<string, unknown>;
  visionConfig?: Record<string, unknown>;
}

export interface CreatePersonaInput {
  name: string;
  definition: {
    identity?: string;
    techProfile?: string;
    personality?: string;
    context?: string;
    tendencies?: string[];
    credentials?: {
      email: string;
      password: string;
    };
  };
  metadata?: {
    archetype?: string;
    tags?: string[];
  };
}

export interface UpdatePersonaInput extends CreatePersonaInput {}

export interface CreateObjectiveInput {
  name: string;
  definition: {
    goal?: string;
    constraints?: string[];
    successCriteria?: {
      type: 'none' | 'element-present' | 'url-match' | 'custom';
      condition?: string;
    };
  };
  config: {
    autonomyLevel?: string;
    maxActions?: number;
    maxDuration?: number;
    restrictions?: string[];
    steps?: string[];
  };
}

export interface UpdateObjectiveInput extends CreateObjectiveInput {}

export interface ImportPersonaInput {
  name: string;
  identity?: string;
  techProfile?: string;
  personality?: string;
  context?: string;
  tendencies?: string[];
  metadata?: {
    archetype?: string;
    tags?: string[];
  };
}

export interface ImportObjectiveInput {
  name: string;
  goal?: string;
  constraints?: string[];
  successCriteria?: {
    type: 'none' | 'element-present' | 'url-match' | 'custom';
    condition?: string;
  };
  autonomy?: {
    level?: string;
    bounds?: {
      maxActions?: number;
      maxDuration?: number;
    };
  };
  restrictions?: string[];
  steps?: string[];
}

// ============================================================================
// API Functions
// ============================================================================

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Sessions
export const sessionsApi = {
  list: () => request<Session[]>('/sessions'),
  get: (id: string) => request<Session>(`/sessions/${id}`),
  create: (data: CreateSessionInput) =>
    request<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createBatch: (data: CreateBatchSessionInput) =>
    request<{ message: string; sessions: Session[] }>('/sessions/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  start: (id: string) =>
    request<{ message: string }>(`/sessions/${id}/start`, {
      method: 'POST',
    }),
  cancel: (id: string) =>
    request<{ message: string }>(`/sessions/${id}/cancel`, {
      method: 'POST',
    }),
  retry: (id: string) =>
    request<{ message: string; newSession: Session }>(`/sessions/${id}/retry`, {
      method: 'POST',
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/sessions/${id}`, {
      method: 'DELETE',
    }),
  deleteMany: (ids: string[]) =>
    request<{ message: string; deleted: number }>('/sessions/batch', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    }),
};

// Personas
export const personasApi = {
  list: () => request<Persona[]>('/personas'),
  get: (id: string) => request<Persona>(`/personas/${id}`),
  create: (data: CreatePersonaInput) =>
    request<Persona>('/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdatePersonaInput) =>
    request<Persona>(`/personas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/personas/${id}`, {
      method: 'DELETE',
    }),
  importBatch: (personas: ImportPersonaInput[]) =>
    request<{ imported: number; personas: Persona[] }>('/personas/import', {
      method: 'POST',
      body: JSON.stringify({ personas }),
    }),
};

// Objectives
export const objectivesApi = {
  list: () => request<Objective[]>('/objectives'),
  get: (id: string) => request<Objective>(`/objectives/${id}`),
  create: (data: CreateObjectiveInput) =>
    request<Objective>('/objectives', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateObjectiveInput) =>
    request<Objective>(`/objectives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/objectives/${id}`, {
      method: 'DELETE',
    }),
  importBatch: (objectives: ImportObjectiveInput[]) =>
    request<{ imported: number; objectives: Objective[] }>('/objectives/import', {
      method: 'POST',
      body: JSON.stringify({ objectives }),
    }),
};

// Events
export const eventsApi = {
  list: (sessionId: string) => request<SessionEvent[]>(`/events/${sessionId}`),
  findings: (sessionId: string) => request<Finding[]>(`/events/${sessionId}/findings`),
  stream: (sessionId: string) => {
    return new EventSource(`${API_BASE}/events/${sessionId}/stream`);
  },
};

// Projects
export interface ProjectStats {
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

export interface Project {
  id: string;
  name: string;
  description: string | null;
  targetUrl: string;
  stats: ProjectStats | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  sessions: Session[];
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  targetUrl: string;
}

export const projectsApi = {
  list: () => request<Project[]>('/projects'),
  get: (id: string) => request<ProjectDetail>(`/projects/${id}`),
  create: (data: CreateProjectInput) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
  addSessions: (id: string, sessionIds: string[]) =>
    request<{ message: string; stats: ProjectStats }>(`/projects/${id}/sessions`, {
      method: 'POST',
      body: JSON.stringify({ sessionIds }),
    }),
  removeSessions: (id: string, sessionIds: string[]) =>
    request<{ message: string; stats: ProjectStats }>(`/projects/${id}/sessions`, {
      method: 'DELETE',
      body: JSON.stringify({ sessionIds }),
    }),
  refreshStats: (id: string) =>
    request<Project>(`/projects/${id}/refresh-stats`, {
      method: 'POST',
    }),
  getChains: (id: string) =>
    request<SessionChain[]>(`/projects/${id}/chains`),
  addChains: (id: string, chainIds: string[]) =>
    request<{ message: string }>(`/projects/${id}/chains`, {
      method: 'POST',
      body: JSON.stringify({ chainIds }),
    }),
  removeChains: (id: string, chainIds: string[]) =>
    request<{ message: string }>(`/projects/${id}/chains`, {
      method: 'DELETE',
      body: JSON.stringify({ chainIds }),
    }),
};

// Trello Integration
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

export interface TrelloIntegration {
  id: string;
  projectId: string;
  type: 'trello';
  config: TrelloConfig;
  createdAt: string;
  updatedAt: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

export interface TrelloStatus {
  connected: boolean;
  integration?: TrelloIntegration;
  boards?: TrelloBoard[];
}

export interface TrelloCard {
  id: string;
  name: string;
  url: string;
  shortUrl: string;
}

export const trelloApi = {
  getAuthUrl: async (projectId: string) => {
    const result = await request<{ authUrl: string; state: string }>(`/integrations/trello/auth/${projectId}`);
    return result;
  },

  getStatus: (projectId: string) =>
    request<TrelloStatus>(`/integrations/trello/${projectId}/status`),

  getBoards: async (projectId: string) => {
    const result = await request<{ boards: TrelloBoard[] }>(`/integrations/trello/${projectId}/boards`);
    return result.boards;
  },

  selectBoard: (projectId: string, boardId: string, boardName: string) =>
    request<TrelloIntegration>(`/integrations/trello/${projectId}/board`, {
      method: 'POST',
      body: JSON.stringify({ boardId, boardName }),
    }),

  analyzeBoard: (projectId: string) =>
    request<{ boardStructure: TrelloBoardStructure }>(`/integrations/trello/${projectId}/analyze`, {
      method: 'POST',
    }),

  createCard: (projectId: string, finding: { id: string; type: string; severity: string; description: string; personaPerspective: string; url: string; evidence?: Record<string, unknown> }) =>
    request<TrelloCard>(`/integrations/trello/${projectId}/cards`, {
      method: 'POST',
      body: JSON.stringify({ finding }),
    }),

  disconnect: (projectId: string) =>
    request<{ message: string }>(`/integrations/trello/${projectId}`, {
      method: 'DELETE',
    }),

  getSyncPreview: (projectId: string) =>
    request<TrelloSyncPreview>(`/integrations/trello/${projectId}/sync-preview`),

  syncFindings: (projectId: string, findingIds: string[]) =>
    request<TrelloSyncResult>(`/integrations/trello/${projectId}/sync`, {
      method: 'POST',
      body: JSON.stringify({ findingIds }),
    }),
};

// Types for sync
export interface TrelloFindingPreview {
  id: string;
  type: string;
  severity: string;
  description: string;
  url: string;
  sessionId: string;
  targetList: { id: string; name: string } | null;
  targetLabel?: { id: string; name: string; color: string };
  alreadySynced: boolean;
  trelloCardUrl?: string;
}

export interface TrelloSyncPreview {
  findings: TrelloFindingPreview[];
  summary: {
    total: number;
    toCreate: number;
    alreadySynced: number;
    byList: Record<string, number>;
  };
}

export interface TrelloSyncResult {
  created: number;
  failed: number;
  cards: Array<{ findingId: string; cardId: string; cardUrl: string }>;
  errors: Array<{ findingId: string; error: string }>;
}

// Session Chains (Multi-Day Persistent Sessions)
export interface ChainSchedule {
  enabled: boolean;
  cronExpression?: string;
  nextRunAt?: number;
  timezone?: string;
  maxSessions?: number;
}

export interface PersistentMemory {
  discoveries: string[];
  frustrations: string[];
  decisions: string[];
  visitedPages: string[];
}

export interface ChainScoreEntry {
  sessionId: string;
  score: number;
  weight: number;
  timestamp: number;
}

export interface AggregatedScore {
  totalSessions: number;
  weightedScore: number;
  scores: ChainScoreEntry[];
  trend: 'improving' | 'stable' | 'declining' | null;
}

export interface SessionChain {
  id: string;
  projectId?: string;
  personaId: string;
  objectiveId: string;
  targetUrl: string;
  name?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  sessionCount: number;
  schedule?: ChainSchedule;
  aggregatedScore?: AggregatedScore;
  createdAt: string;
  updatedAt: string;
  personaName?: string;
  objectiveName?: string;
}

export interface SessionChainDetail extends SessionChain {
  persistentMemory?: PersistentMemory;
  sessions: Session[];
}

export interface CreateSessionChainInput {
  personaId: string;
  objectiveId: string;
  targetUrl: string;
  projectId?: string;
  name?: string;
  llmConfig?: Record<string, unknown>;
  visionConfig?: Record<string, unknown>;
  schedule?: ChainSchedule;
}

export interface UpdateSessionChainInput {
  name?: string;
  status?: 'active' | 'paused' | 'completed' | 'archived';
  schedule?: ChainSchedule;
  projectId?: string | null;
}

export const sessionChainsApi = {
  list: (projectId?: string) =>
    request<SessionChain[]>(projectId ? `/session-chains?projectId=${projectId}` : '/session-chains'),

  get: (id: string) => request<SessionChainDetail>(`/session-chains/${id}`),

  create: (data: CreateSessionChainInput) =>
    request<SessionChain>('/session-chains', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateSessionChainInput) =>
    request<{ message: string }>(`/session-chains/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string, deleteSessions = false) =>
    request<{ message: string }>(`/session-chains/${id}?deleteSessions=${deleteSessions}`, {
      method: 'DELETE',
    }),

  continue: (id: string) =>
    request<{ message: string; session: Session; chainSequence: number }>(`/session-chains/${id}/continue`, {
      method: 'POST',
    }),

  setSchedule: (id: string, schedule: ChainSchedule) =>
    request<{ message: string; schedule: ChainSchedule }>(`/session-chains/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify(schedule),
    }),

  pause: (id: string) =>
    request<{ message: string }>(`/session-chains/${id}/pause`, {
      method: 'POST',
    }),

  resume: (id: string) =>
    request<{ message: string }>(`/session-chains/${id}/resume`, {
      method: 'POST',
    }),
};
