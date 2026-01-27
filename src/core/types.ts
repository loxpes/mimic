/**
 * Core types for TestFarm AI Agent
 */

// ============================================================================
// Persona Types
// ============================================================================

export interface Persona {
  id: string;
  name: string;
  identity: string;
  techProfile: string;
  personality: string;
  context: string;
  tendencies: string[];
  metadata?: {
    archetype?: string;
    tags?: string[];
  };
}

export interface PersonaContext {
  systemPrompt: string;
  traits: string[];
  preferences: string[];
}

// ============================================================================
// Objective Types
// ============================================================================

export type AutonomyLevel = 'exploration' | 'goal-directed' | 'restricted' | 'semi-guided';

export interface Objective {
  id: string;
  name: string;
  goal: string;
  autonomy: {
    level: AutonomyLevel;
    bounds?: {
      maxPages?: number;
      maxDuration?: number; // minutes
      maxActions?: number;
    };
    restrictions?: string[];
    steps?: string[];
  };
  successCriteria?: {
    type: 'none' | 'element-present' | 'url-match' | 'custom';
    condition?: string;
  };
}

export interface ObjectiveContext {
  goal: string;
  constraints: string[];
  successCriteria: string;
  autonomyLevel: AutonomyLevel;
}

// ============================================================================
// DOM & Vision Types
// ============================================================================

export type ElementType =
  | 'button'
  | 'link'
  | 'input-text'
  | 'input-password'
  | 'input-email'
  | 'input-search'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'image'
  | 'heading'
  | 'navigation'
  | 'other';

export type PageRegion = 'header' | 'nav' | 'main' | 'sidebar' | 'footer' | 'modal' | 'unknown';

export interface ActionableElement {
  id: string;               // "e15" - referenced by LLM
  type: ElementType;
  text: string;             // Visible text or aria-label
  location: {
    region: PageRegion;
    x?: number;
    y?: number;
  };
  state: {
    visible: boolean;
    enabled: boolean;
    focused?: boolean;
  };
  selector: string;         // CSS selector for Playwright
  attributes?: {
    href?: string;
    placeholder?: string;
    ariaLabel?: string;
  };
}

export interface TextRegion {
  id: string;
  region: PageRegion;
  summary: string;          // Summarized text content
  wordCount: number;
}

export interface NavigationElement {
  id: string;
  text: string;
  href?: string;
  isCurrent: boolean;
}

export interface StructuredDOM {
  metadata: {
    title: string;
    url: string;
    timestamp: number;
  };
  elements: ActionableElement[];
  textRegions: TextRegion[];
  navigation: NavigationElement[];
}

// ============================================================================
// Agent State Types
// ============================================================================

export type ActionType =
  | 'click'
  | 'type'
  | 'scroll'
  | 'wait'
  | 'navigate'
  | 'back'
  | 'hover'
  | 'select'
  | 'abandon';

export interface AgentAction {
  type: ActionType;
  target?: {
    elementId: string;
    description: string;
  };
  value?: string;           // For type, select
  duration?: number;        // For wait (ms)
  direction?: 'up' | 'down'; // For scroll
}

export interface ActionHistory {
  action: AgentAction;
  timestamp: number;
  url: string;
  success: boolean;
  error?: string;
}

export interface AgentMemory {
  discoveries: string[];    // "Found garden section in nav"
  frustrations: string[];   // "Login popup keeps appearing"
  decisions: string[];      // "Decided to skip newsletter"
}

export interface CurrentState {
  url: string;
  pageTitle: string;
  dom: StructuredDOM;
  screenshot?: string;      // Base64, only when needed
}

export interface AgentHistory {
  recentActions: ActionHistory[];
  visitedPages: string[];
  failedAttempts: ActionHistory[];
}

// ============================================================================
// Agent Context & Decision Types
// ============================================================================

export interface AgentContext {
  persona: PersonaContext;
  objective: ObjectiveContext;
  currentState: CurrentState;
  history: AgentHistory;
  memory: AgentMemory;
}

export type ObjectiveStatus = 'pursuing' | 'blocked' | 'completed' | 'abandoned';

export interface AgentReasoning {
  observation: string;      // "I see a search bar at the top"
  thought: string;          // "María would search for gardening"
  confidence: number;       // 0-1
}

export interface AgentProgress {
  objectiveStatus: ObjectiveStatus;
  completionEstimate: number; // 0-1
  nextSteps: string[];
}

export interface MemoryUpdates {
  addDiscovery?: string;
  addFrustration?: string;
  addDecision?: string;
}

export interface AgentDecision {
  action: AgentAction;
  reasoning: AgentReasoning;
  progress: AgentProgress;
  memoryUpdates?: MemoryUpdates;
  requestScreenshot?: boolean;
}

// ============================================================================
// Session Types
// ============================================================================

export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'ollama' | 'custom';
  model: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;         // For custom/ollama
  apiKey?: string;
}

export interface VisionConfig {
  screenshotInterval: number;  // Every N actions
  screenshotOnLowConfidence: boolean;
  confidenceThreshold: number;
}

export interface SessionConfig {
  personaId: string;
  objectiveId: string;
  targetUrl: string;
  llm: LLMConfig;
  vision: VisionConfig;
  maxActions: number;
  timeout: number;          // ms
}

export interface SessionState {
  status: SessionStatus;
  actionCount: number;
  currentUrl: string;
  startedAt?: number;
  completedAt?: number;
}

export interface SessionResults {
  outcome: ObjectiveStatus;
  summary: string;
  actionsTaken: number;
  duration: number;         // ms
  findings: Finding[];
  metrics: SessionMetrics;
}

export interface SessionMetrics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  pagesVisited: number;
  screenshotsTaken: number;
  llmCalls: number;
  totalTokens: number;
}

// ============================================================================
// Findings Types
// ============================================================================

export type FindingType = 'ux-issue' | 'bug' | 'accessibility' | 'performance' | 'content';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Finding {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  description: string;
  personaPerspective: string;  // "María se frustró porque..."
  url: string;
  elementId?: string;
  screenshot?: string;
  timestamp: number;
}
