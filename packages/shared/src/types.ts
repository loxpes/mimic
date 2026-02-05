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
  viewportSize?: {          // Viewport dimensions for coordinate reference
    width: number;
    height: number;
  };
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
  language?: string;        // Response language for the agent
  chainContext?: ChainContext;  // Multi-session chain context
}

export type ObjectiveStatus = 'pursuing' | 'blocked' | 'completed' | 'abandoned' | 'waiting-for-user';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface AgentReasoning {
  state: string;           // "Login form, 2 fields, submit disabled"
  action_reason: string;   // "Fill credentials to enable submit"
  confidence: ConfidenceLevel;
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
  /** What behavior was expected vs what happened - only relevant when addFrustration is set */
  expectedBehavior?: string;
}

/** Request for user input (2FA, CAPTCHA, etc.) */
export type UserInputType = 'verification-code' | 'captcha' | 'custom';

export interface UserInputRequest {
  /** Type of verification needed */
  type: UserInputType;
  /** Message to show to the user explaining what is needed */
  prompt: string;
  /** ID of the field where the value should be entered (if applicable) */
  fieldId?: string;
}

export interface AgentDecision {
  action: AgentAction;
  reasoning: AgentReasoning;
  progress: AgentProgress;
  memoryUpdates?: MemoryUpdates;
  requestScreenshot?: boolean;
  /** Request for user input when objectiveStatus is 'waiting-for-user' */
  userInputRequest?: UserInputRequest;
}

// ============================================================================
// Session Types
// ============================================================================

export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'custom' | 'claude-cli' | 'google';
  model: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;         // For custom providers
  apiKey?: string;
  language?: string;        // Response language (es, en, pt, fr, de)
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
  personalAssessment?: PersonalAssessment;
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
// Personal Assessment Types
// ============================================================================

export type DifficultyLevel = 'very_easy' | 'easy' | 'moderate' | 'difficult' | 'very_difficult';

export interface PersonalAssessment {
  overallScore: number;        // 1-10
  difficulty: DifficultyLevel;
  wouldRecommend: boolean;
  positives: string[];         // max 3
  negatives: string[];         // max 3
  summary: string;             // max 200 chars
}

// ============================================================================
// Findings Types
// ============================================================================

export type FindingType = 'ux-issue' | 'bug' | 'accessibility' | 'performance' | 'content' | 'visual-design';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingGroupStatus = 'open' | 'acknowledged' | 'resolved' | 'wont-fix';

export interface ConsoleLogEntry {
  level: string;
  message: string;
  timestamp: number;
}

export interface FindingEvidence {
  screenshotPath?: string;
  consoleLogs?: ConsoleLogEntry[];
  actionContext?: {
    actionNumber: number;
    previousActions?: Array<{
      type: string;
      target?: string;
      success: boolean;
    }>;
  };
  /** Complete steps to reproduce the issue from session start */
  stepsToReproduce?: string[];
}

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
  evidence?: FindingEvidence;
  /** What behavior was expected vs what happened */
  expectedBehavior?: string;
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
  groupId?: string; // Optional if deduplication is skipped
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

// ============================================================================
// Session Chain Types (Multi-Day Persistent Sessions)
// ============================================================================

export interface ChainSchedule {
  enabled: boolean;
  cronExpression?: string;  // "0 9 * * 1-5" (weekdays 9am)
  nextRunAt?: number;       // Unix timestamp
  timezone?: string;
  maxSessions?: number;     // Optional limit
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

export type SessionChainStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface SessionChain {
  id: string;
  projectId?: string;
  personaId: string;
  objectiveId: string;
  targetUrl: string;
  name?: string;
  llmConfig?: LLMConfig;
  visionConfig?: VisionConfig;
  status: SessionChainStatus;
  sessionCount: number;
  schedule?: ChainSchedule;
  persistentMemory?: PersistentMemory;
  aggregatedScore?: AggregatedScore;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChainContext {
  chainId: string;
  sequence: number;
  visitedPages: string[];
  totalPreviousActions: number;
}

// Extended AgentConfig for chain support
export interface AgentConfigWithChain extends AgentConfig {
  initialMemory?: AgentMemory;
  chainContext?: ChainContext;
}
