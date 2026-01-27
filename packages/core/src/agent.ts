/**
 * AI Agent Core - The main observe-decide-act loop
 */

import { nanoid } from 'nanoid';
import type {
  Persona,
  Objective,
  AgentContext,
  AgentDecision,
  AgentMemory,
  AgentHistory,
  ActionHistory,
  LLMConfig,
  VisionConfig,
  SessionMetrics,
  Finding,
  PersonaContext,
  ObjectiveContext,
  ExistingFindingsContext,
  DeduplicationResult,
  AuthCredentials,
} from '@testfarm/shared';
import { LLMClient } from './llm/client.js';
import { BrowserController, createBrowser } from './browser/controller.js';
import { extractDOM } from './vision/dom-extractor.js';
import { checkAndDeduplicateFinding, generateFingerprint } from './findings/index.js';
import { saveScreenshot } from './utils/screenshot-storage.js';

// ============================================================================
// Types
// ============================================================================

export interface AgentConfig {
  persona: Persona;
  objective: Objective;
  targetUrl: string;
  llm: LLMConfig;
  vision: VisionConfig;
  maxActions: number;
  timeout: number; // ms
  sessionId?: string; // For deduplication
  existingFindings?: ExistingFindingsContext;
}

export interface AgentEvents {
  onAction?: (action: ActionHistory, decision: AgentDecision, screenshotPath?: string) => void;
  onScreenshot?: (screenshot: string, screenshotPath?: string) => void;
  onFinding?: (finding: Finding, deduplication?: DeduplicationResult) => void;
  onProgress?: (progress: { actionCount: number; status: string; url: string }) => void;
  onComplete?: (result: AgentResult) => void;
  onError?: (error: Error) => void;
}

export interface AgentResult {
  success: boolean;
  outcome: 'completed' | 'abandoned' | 'blocked' | 'timeout' | 'error';
  summary: string;
  actionsTaken: number;
  duration: number;
  findings: Finding[];
  metrics: SessionMetrics;
  history: ActionHistory[];
}

// ============================================================================
// Agent Class
// ============================================================================

export class Agent {
  private config: AgentConfig;
  private events: AgentEvents;
  private llmClient: LLMClient;
  private browser: BrowserController | null = null;
  private memory: AgentMemory;
  private history: AgentHistory;
  private actionCount: number = 0;
  private startTime: number = 0;
  private findings: Finding[] = [];
  private metrics: SessionMetrics;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;

  constructor(config: AgentConfig, events: AgentEvents = {}) {
    this.config = config;
    this.events = events;

    // Initialize LLM client
    this.llmClient = new LLMClient({
      config: config.llm,
      onTokenUsage: (tokens) => {
        this.metrics.llmCalls++;
        this.metrics.totalTokens += tokens.prompt + tokens.completion;
      },
    });

    // Initialize memory
    this.memory = {
      discoveries: [],
      frustrations: [],
      decisions: [],
    };

    // Initialize history
    this.history = {
      recentActions: [],
      visitedPages: [],
      failedAttempts: [],
    };

    // Initialize metrics
    this.metrics = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      pagesVisited: 0,
      screenshotsTaken: 0,
      llmCalls: 0,
      totalTokens: 0,
    };
  }

  // ============================================================================
  // Context Building
  // ============================================================================

  private buildPersonaContext(): PersonaContext {
    const { persona } = this.config;

    // Build system prompt from persona definition
    const systemPrompt = `${persona.identity}

${persona.techProfile}

${persona.personality}

${persona.context}`;

    // Build credentials: use configured or auto-generate
    let credentials: AuthCredentials;

    if (persona.credentials?.email && persona.credentials?.password) {
      // Use configured credentials (existing user)
      credentials = {
        email: persona.credentials.email,
        password: persona.credentials.password,
        isNewUser: false,  // Configured credentials = existing user
      };
      console.log(`[Agent] Using configured credentials: ${credentials.email} (isNewUser: ${credentials.isNewUser})`);
    } else {
      // Auto-generate credentials (new user)
      const sanitizedName = persona.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      credentials = {
        email: `${sanitizedName}+test@testfarm.dev`,
        password: `Test${sanitizedName.charAt(0).toUpperCase()}${sanitizedName.slice(1)}123!`,
        isNewUser: true,  // Auto-generated = needs to register
      };
      console.log(`[Agent] Using auto-generated credentials: ${credentials.email} (isNewUser: ${credentials.isNewUser})`);
    }

    return {
      systemPrompt,
      traits: persona.tendencies,
      preferences: [],
      credentials,
    };
  }

  private buildObjectiveContext(): ObjectiveContext {
    const { objective } = this.config;

    return {
      goal: objective.goal,
      constraints: objective.autonomy.restrictions || [],
      successCriteria: objective.successCriteria?.condition || 'No specific success criteria',
      autonomyLevel: objective.autonomy.level,
    };
  }

  private async buildContext(): Promise<AgentContext> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = this.browser.getPage();
    const dom = await extractDOM(page);

    return {
      persona: this.buildPersonaContext(),
      objective: this.buildObjectiveContext(),
      currentState: {
        url: this.browser.getCurrentUrl(),
        pageTitle: await this.browser.getTitle(),
        dom,
      },
      history: this.history,
      memory: this.memory,
      existingFindings: this.config.existingFindings,
    };
  }

  // ============================================================================
  // Action Execution
  // ============================================================================

  private async executeAction(decision: AgentDecision, elementMap: Map<string, string>): Promise<ActionHistory> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const { action } = decision;

    // Execute the action using the element map from when the LLM made its decision
    // IMPORTANT: Do NOT re-extract DOM here - the element IDs must match what the LLM saw
    const result = await this.browser.executeAction(action, elementMap);

    // Build action history entry
    const historyEntry: ActionHistory = {
      action,
      timestamp: Date.now(),
      url: this.browser.getCurrentUrl(),
      success: result.success,
      error: result.error,
    };

    // Update metrics
    this.metrics.totalActions++;
    if (result.success) {
      this.metrics.successfulActions++;
    } else {
      this.metrics.failedActions++;
      this.history.failedAttempts.push(historyEntry);
    }

    // Update history
    this.history.recentActions.push(historyEntry);
    if (this.history.recentActions.length > 20) {
      this.history.recentActions.shift();
    }

    // Track visited pages
    const currentUrl = this.browser.getCurrentUrl();
    if (!this.history.visitedPages.includes(currentUrl)) {
      this.history.visitedPages.push(currentUrl);
      this.metrics.pagesVisited++;
    }

    // Update memory if decision includes updates
    if (decision.memoryUpdates) {
      if (decision.memoryUpdates.addDiscovery) {
        this.memory.discoveries.push(decision.memoryUpdates.addDiscovery);
      }
      if (decision.memoryUpdates.addFrustration) {
        this.memory.frustrations.push(decision.memoryUpdates.addFrustration);

        // Detect if this is a visual design issue based on keywords
        const visualKeywords = [
          'contraste', 'color', 'fuente', 'tamaño', 'alineación',
          'espaciado', 'imagen', 'icono', 'borroso', 'estirado',
          'pequeño', 'grande', 'difícil de ver', 'no se ve', 'design',
          'contrast', 'font', 'size', 'alignment', 'spacing',
          'image', 'icon', 'blurry', 'stretched', 'small', 'large',
          'hard to see', 'can\'t see', 'barely visible', 'layout'
        ];
        const frustrationLower = decision.memoryUpdates.addFrustration.toLowerCase();
        const isVisualIssue = visualKeywords.some(kw => frustrationLower.includes(kw));

        // Create a finding with appropriate type
        const findingType = isVisualIssue ? 'visual-design' : 'ux-issue';
        await this.createFinding(findingType, 'medium', decision.memoryUpdates.addFrustration, currentUrl);
      }
      if (decision.memoryUpdates.addDecision) {
        this.memory.decisions.push(decision.memoryUpdates.addDecision);
      }
    }

    return historyEntry;
  }

  // ============================================================================
  // Findings
  // ============================================================================

  private async createFinding(
    type: Finding['type'],
    severity: Finding['severity'],
    description: string,
    url: string,
    elementId?: string
  ): Promise<void> {
    // Check for deduplication if enabled
    let deduplicationResult: DeduplicationResult | undefined;
    let groupId: string | undefined;
    let isDuplicate = false;
    let fingerprint: string | undefined;

    if (this.config.existingFindings?.deduplicationEnabled && this.config.sessionId) {
      try {
        deduplicationResult = await checkAndDeduplicateFinding({
          type,
          severity,
          description,
          url,
          elementId,
          sessionId: this.config.sessionId,
        });

        groupId = deduplicationResult.groupId;
        isDuplicate = deduplicationResult.isDuplicate;
        fingerprint = generateFingerprint({ type, severity, description, url, elementId });
      } catch (error) {
        // If deduplication fails, continue without it
        console.warn('Deduplication check failed:', error);
      }
    }

    const finding: Finding = {
      id: nanoid(),
      type,
      severity,
      description,
      personaPerspective: `${this.config.persona.name} experienced: ${description}`,
      url,
      elementId,
      timestamp: Date.now(),
      groupId,
      fingerprint,
      isDuplicate,
    };

    this.findings.push(finding);
    this.events.onFinding?.(finding, deduplicationResult);
  }

  // ============================================================================
  // Main Loop
  // ============================================================================

  async run(): Promise<AgentResult> {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.startTime = Date.now();

    let outcome: AgentResult['outcome'] = 'completed';
    let summary = '';

    try {
      // Launch browser
      console.log('[Agent] Launching browser...');
      this.browser = await createBrowser({
        headless: true, // TODO: make configurable
      });
      console.log('[Agent] Browser launched successfully');

      // Navigate to target URL
      console.log(`[Agent] Navigating to ${this.config.targetUrl}...`);
      const navResult = await this.browser.navigate(this.config.targetUrl);
      if (!navResult.success) {
        throw new Error(`Failed to navigate to ${this.config.targetUrl}: ${navResult.error}`);
      }
      console.log('[Agent] Navigation successful');

      // Main loop
      while (!this.shouldStop && this.actionCount < this.config.maxActions) {
        // Check timeout
        if (Date.now() - this.startTime > this.config.timeout) {
          outcome = 'timeout';
          summary = 'Session timed out before completing objective';
          break;
        }

        // Build context
        const context = await this.buildContext();

        // ALWAYS take a screenshot before each action to see what the agent sees
        const screenshot = await this.browser.takeScreenshot();
        context.currentState.screenshot = screenshot;
        this.metrics.screenshotsTaken++;

        // Save screenshot to disk if sessionId is provided
        let screenshotPath: string | undefined;
        if (this.config.sessionId) {
          try {
            screenshotPath = await saveScreenshot(
              this.config.sessionId,
              this.actionCount + 1,
              screenshot
            );
            console.log(`[Agent] Screenshot saved: ${screenshotPath}`);
            // Pass screenshot path to context for Claude CLI vision
            context.currentState.screenshotPath = screenshotPath;
          } catch (err) {
            console.warn('[Agent] Failed to save screenshot:', err);
          }
        }

        // Emit screenshot event
        this.events.onScreenshot?.(screenshot, screenshotPath);

        // Get decision from LLM
        console.log(`[Agent] Requesting decision from LLM (action #${this.actionCount + 1})...`);
        const decision = await this.llmClient.decide(context);
        console.log(`[Agent] LLM decision: ${decision.action.type} - ${decision.reasoning.thought}`);

        // Build element map from the DOM that the LLM saw (NOT a new extraction!)
        // This ensures element IDs match what the LLM decided to interact with
        const elementMap = new Map<string, string>();
        for (const el of context.currentState.dom.elements) {
          elementMap.set(el.id, el.selector);
        }

        // Execute action
        const actionHistory = await this.executeAction(decision, elementMap);
        this.actionCount++;

        // Emit events with screenshot path
        this.events.onAction?.(actionHistory, decision, screenshotPath);
        this.events.onProgress?.({
          actionCount: this.actionCount,
          status: decision.progress.objectiveStatus,
          url: this.browser.getCurrentUrl(),
        });

        // Check objective status
        if (decision.progress.objectiveStatus === 'completed') {
          outcome = 'completed';
          summary = 'Objective completed successfully';
          break;
        }

        if (decision.progress.objectiveStatus === 'abandoned') {
          outcome = 'abandoned';
          summary = 'Agent abandoned the objective';
          break;
        }

        if (decision.progress.objectiveStatus === 'blocked') {
          // Give it a few more tries
          if (this.history.failedAttempts.length > 5) {
            outcome = 'blocked';
            summary = 'Agent was blocked and could not proceed';
            break;
          }
        }

        // Small delay between actions
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (this.actionCount >= this.config.maxActions && outcome === 'completed') {
        outcome = 'blocked';
        summary = 'Reached maximum action limit without completing objective';
      }

    } catch (error) {
      outcome = 'error';
      summary = error instanceof Error ? error.message : 'Unknown error occurred';
      this.events.onError?.(error instanceof Error ? error : new Error(summary));
    } finally {
      // Cleanup
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.isRunning = false;
    }

    const result: AgentResult = {
      success: outcome === 'completed',
      outcome,
      summary,
      actionsTaken: this.actionCount,
      duration: Date.now() - this.startTime,
      findings: this.findings,
      metrics: this.metrics,
      history: this.history.recentActions,
    };

    this.events.onComplete?.(result);

    return result;
  }

  // ============================================================================
  // Control
  // ============================================================================

  stop(): void {
    this.shouldStop = true;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAgent(config: AgentConfig, events?: AgentEvents): Agent {
  return new Agent(config, events);
}
