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
  llmConfig?: Record<string, unknown>;
  visionConfig?: Record<string, unknown>;
}

export interface CreateBatchSessionInput {
  targetUrl: string;
  personaIds: string[];
  objectiveIds: string[];
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
