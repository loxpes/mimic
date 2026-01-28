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
  credentials?: {
    email: string;
    password: string;
  };
}

export interface AuthCredentials {
  email: string;
  password: string;
  isNewUser: boolean;  // true = needs to register, false = can login
}

export interface PersonaContext {
  systemPrompt: string;
  traits: string[];
  preferences: string[];
  credentials?: AuthCredentials;
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
// DOM & Vision Types (CDP-based read_page)
// ============================================================================

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface PageElement {
  /** Reference ID for this element (ref_1, ref_2, etc.) */
  ref: string;
  /** ARIA role (button, textbox, link, etc.) */
  role: string;
  /** Accessible name (from text, aria-label, alt, title) */
  name: string;
  /** Current value for inputs */
  value?: string;
  /** Backend node ID for CDP operations */
  backendNodeId: number;
  /** Bounding box with center coordinates */
  bbox: BoundingBox;
  /** Element state */
  state: {
    focused: boolean;
    disabled: boolean;
    expanded?: boolean;
    checked?: boolean;
  };
}

export interface ReadPageResult {
  elements: PageElement[];
  /** Total elements found before filtering */
  totalNodes: number;
  /** Viewport dimensions */
  viewport: { width: number; height: number };
}

// ============================================================================
// Unified Element Types (Hybrid DOM + Vision)
// ============================================================================

export type UnifiedElementType =
  | 'button'
  | 'link'
  | 'input'
  | 'checkbox'
  | 'select'
  | 'textarea'
  | 'radio'
  | 'other';

export type UnifiedElementSource = 'dom' | 'vision' | 'both';

export interface UnifiedElement {
  /** Unique ID for this element (el_1, el_2, etc.) */
  id: string;
  /** Human-readable name (e.g., "Enviar", "Perfil", "Campo email") */
  name: string;
  /** Element type */
  type: UnifiedElementType;
  /** Center X coordinate */
  x: number;
  /** Center Y coordinate */
  y: number;
  /** Element width */
  width: number;
  /** Element height */
  height: number;
  /** Origin of this element */
  source: UnifiedElementSource;
  /** CSS selector (only if from DOM) */
  selector?: string;
  /** Current value (for inputs) */
  value?: string;
  /** Whether element is disabled */
  disabled?: boolean;
  /** ARIA role from DOM */
  role?: string;
  /** Backend node ID for CDP operations */
  backendNodeId?: number;
}

// ============================================================================
// DOM & Vision Types (Legacy)
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
  | 'fillForm'
  | 'scroll'
  | 'wait'
  | 'navigate'
  | 'back'
  | 'hover'
  | 'select'
  | 'abandon';

export interface FormField {
  elementId: string;
  value: string;
}

export interface AgentAction {
  type: ActionType;
  target?: {
    elementId?: string;      // Element ref ID (e.g., "ref_9")
    description: string;
    coordinates?: {          // Click coordinates for visual targeting
      x: number;
      y: number;
    };
  };
  value?: string;           // For type, select
  duration?: number;        // For wait (ms)
  direction?: 'up' | 'down'; // For scroll
  fields?: FormField[];     // For fillForm
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
  screenshotPath?: string;  // File path for Claude CLI vision
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
  existingFindings?: ExistingFindingsContext;
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
  provider: 'anthropic' | 'openai' | 'ollama' | 'custom' | 'claude-cli';
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

export type FindingType = 'ux-issue' | 'bug' | 'accessibility' | 'performance' | 'content' | 'visual-design';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingGroupStatus = 'open' | 'acknowledged' | 'resolved' | 'wont-fix';

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
  groupId?: string;
  fingerprint?: string;
  isDuplicate?: boolean;
}

export interface KnownIssue {
  groupId: string;
  type: FindingType;
  severity: FindingSeverity;
  description: string;
  urlPattern: string;
  occurrenceCount: number;
  status: FindingGroupStatus;
}

export interface ExistingFindingsContext {
  knownIssues: KnownIssue[];
  deduplicationEnabled: boolean;
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  groupId: string;
  isNewGroup: boolean;
  existingOccurrences: number;
}

// ============================================================================
// Session Report Types
// ============================================================================

export interface FindingsSummary {
  total: number;
  byType: Record<FindingType, number>;
  bySeverity: Record<FindingSeverity, number>;
  newFindings: number;
  duplicateFindings: number;
}

export interface SessionReportData {
  sessionId: string;
  targetUrl: string;
  personaName: string;
  objectiveName: string;
  duration: number;
  outcome: ObjectiveStatus;
  findings: Finding[];
  metrics: SessionMetrics;
}

export interface GeneratedReport {
  summary: string;
  findingsSummary: FindingsSummary;
  markdownReport: string;
  recommendations: string[];
}

// ============================================================================
// Agent Runtime Types (Extended for createAgent)
// ============================================================================

export interface AgentConfig {
  persona: Persona;
  objective: Objective;
  targetUrl: string;
  llm: LLMConfig;
  vision: VisionConfig;
  maxActions: number;
  timeout: number;
  existingFindings?: ExistingFindingsContext;
}

export interface ActionResult {
  action: AgentAction;
  success: boolean;
  error?: string;
  duration: number;
}

export interface AgentCallbacks {
  onAction?: (result: ActionResult, decision: AgentDecision) => void;
  onProgress?: (progress: { actionCount: number; status: ObjectiveStatus }) => void;
  onFinding?: (finding: Finding) => void;
  onError?: (error: Error) => void;
}

export interface AgentResult {
  success: boolean;
  outcome: ObjectiveStatus;
  summary: string;
  actionsTaken: number;
  duration: number;
  findings: Finding[];
  metrics: SessionMetrics;
}

export interface Agent {
  run(): Promise<AgentResult>;
  stop(): void;
}
