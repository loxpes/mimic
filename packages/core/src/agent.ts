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
  FindingEvidence,
  PersonaContext,
  ObjectiveContext,
  ExistingFindingsContext,
  DeduplicationResult,
  AuthCredentials,
  UnifiedElement,
  PersonalAssessment,
  ChainContext,
  UserInputRequest,
} from '@testfarm/shared';
import { LLMClient } from './llm/client.js';
import { BrowserController, createBrowser } from './browser/controller.js';
import { extractDOM } from './vision/dom-extractor.js';
import { readPage } from './vision/read-page.js';
import { analyzeWithVision } from './vision/image-analyzer.js';
import { mergeElements, pageElementToUnified } from './vision/merge-elements.js';
import { findElement } from './vision/find-element.js';
import { checkAndDeduplicateFinding, generateFingerprint } from './findings/index.js';
import { saveScreenshot } from './utils/screenshot-storage.js';

// Initial wait time for page to fully load (ms)
const INITIAL_LOAD_WAIT = 3000;

// ============================================================================
// Types
// ============================================================================

export interface HybridVisionConfig {
  /** Enable hybrid DOM + Vision system (default: false) */
  enabled: boolean;
  /** Model for vision analysis (default: claude-haiku-4-5-20251001) */
  model?: string;
  /** Timeout for vision analysis in ms (default: 30000) */
  timeout?: number;
  /** Pixel threshold for merge deduplication (default: 30) */
  mergeThreshold?: number;
}

export interface AgentConfig {
  persona: Persona;
  objective: Objective;
  targetUrl: string;
  llm: LLMConfig;
  vision: VisionConfig;
  /** Hybrid DOM + Vision configuration */
  hybridVision?: HybridVisionConfig;
  maxActions: number;
  timeout: number; // ms
  sessionId?: string; // For deduplication
  existingFindings?: ExistingFindingsContext;
  /** Initial memory for session chain continuation */
  initialMemory?: AgentMemory;
  /** Chain context for multi-session continuity */
  chainContext?: ChainContext;
}

export interface AgentEvents {
  onAction?: (action: ActionHistory, decision: AgentDecision, screenshotPath?: string, elements?: UnifiedElement[]) => void;
  onScreenshot?: (screenshot: string, screenshotPath?: string) => void;
  onFinding?: (finding: Finding, deduplication?: DeduplicationResult) => void;
  onProgress?: (progress: { actionCount: number; status: string; url: string }) => void;
  onComplete?: (result: AgentResult) => void;
  onError?: (error: Error) => void;
  /** Called when the agent needs user input (2FA, CAPTCHA, etc.) */
  onWaitingForUser?: (request: UserInputRequest) => void;
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
  personalAssessment?: PersonalAssessment;
  /** Memory state at session end (for chain persistence) */
  memory?: AgentMemory;
  /** Pages visited during this session */
  visitedPages?: string[];
  /** Current URL at session end (for continuation) */
  currentUrl?: string;
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
  /** Current unified elements from hybrid DOM + Vision extraction */
  private unifiedElements: UnifiedElement[] = [];
  /** Current screenshot path for findings evidence */
  private currentScreenshotPath: string | undefined;
  /** Pending user input request for 2FA/CAPTCHA */
  private pendingUserInput: {
    request: UserInputRequest;
    resolve: (value: string) => void;
  } | null = null;
  /** Track consecutive LLM decision failures to avoid killing session on isolated errors */
  private consecutiveFailures: number = 0;
  /** Track repeated actions to detect loops */
  private recentActionSignatures: string[] = [];

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

    // Initialize memory (from chain continuation or empty)
    this.memory = config.initialMemory
      ? {
          discoveries: [...config.initialMemory.discoveries],
          frustrations: [...config.initialMemory.frustrations],
          decisions: [...config.initialMemory.decisions],
        }
      : {
          discoveries: [],
          frustrations: [],
          decisions: [],
        };

    // Initialize history (with visited pages from chain context if continuing)
    this.history = {
      recentActions: [],
      visitedPages: config.chainContext?.visitedPages ? [...config.chainContext.visitedPages] : [],
      failedAttempts: [],
    };

    // Log chain continuation context
    if (config.chainContext) {
      console.log(`[Agent] Continuing session chain #${config.chainContext.sequence} with ${config.chainContext.totalPreviousActions} previous actions`);
      console.log(`[Agent] Inherited memory: ${this.memory.discoveries.length} discoveries, ${this.memory.frustrations.length} frustrations, ${this.memory.decisions.length} decisions`);
    }

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
  // Loop Detection & Action Verification
  // ============================================================================

  /**
   * Generate a signature for an action to detect repeated actions
   */
  private getActionSignature(decision: AgentDecision): string {
    const { action } = decision;
    const parts: string[] = [action.type];

    if (action.target?.elementId) {
      parts.push(`id:${action.target.elementId}`);
    }
    if (action.target?.coordinates) {
      // Round coordinates to detect near-identical clicks
      const x = Math.round(action.target.coordinates.x / 5) * 5;
      const y = Math.round(action.target.coordinates.y / 5) * 5;
      parts.push(`coord:${x},${y}`);
    }
    if (action.value) {
      parts.push(`val:${action.value.substring(0, 20)}`);
    }

    return parts.join('|');
  }

  /**
   * Check if the current action is part of a loop (same action repeated without progress)
   * Returns the number of consecutive repetitions
   */
  private detectLoop(signature: string): number {
    // Keep last 10 action signatures
    this.recentActionSignatures.push(signature);
    if (this.recentActionSignatures.length > 10) {
      this.recentActionSignatures.shift();
    }

    // Count consecutive repetitions of this signature at the end
    let count = 0;
    for (let i = this.recentActionSignatures.length - 1; i >= 0; i--) {
      if (this.recentActionSignatures[i] === signature) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Check if page state changed after an action
   */
  private checkForStateChange(previousUrl: string, currentUrl: string): boolean {
    return previousUrl !== currentUrl;
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

  private async buildContext(screenshotPath?: string): Promise<AgentContext> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = this.browser.getPage();
    const dom = await extractDOM(page);

    // Extract elements with read_page for ref-based actions
    let domElements: UnifiedElement[] = [];
    try {
      const readPageResult = await readPage(page, { filter: 'interactive' });
      this.browser.registerElements(readPageResult.elements);

      // Convert to UnifiedElements for hybrid system
      domElements = readPageResult.elements.map(el => pageElementToUnified(el));

      console.log(`[Agent] Registered ${readPageResult.elements.length} elements for ref-based actions`);
    } catch (err) {
      console.warn('[Agent] Failed to register elements from read_page:', err);
    }

    // Hybrid DOM + Vision system
    if (this.config.hybridVision?.enabled && screenshotPath) {
      try {
        console.log('[Agent] Running hybrid vision analysis...');

        const visionResult = await analyzeWithVision(screenshotPath, {
          model: this.config.hybridVision.model,
          timeout: this.config.hybridVision.timeout,
        });

        // Merge DOM and vision elements
        const mergeResult = mergeElements(
          domElements,
          visionResult.elements,
          { threshold: this.config.hybridVision.mergeThreshold }
        );

        this.unifiedElements = mergeResult.elements;

        console.log(`[Agent] Hybrid merge: ${mergeResult.stats.domOnly} DOM-only, ` +
          `${mergeResult.stats.visionOnly} vision-only, ${mergeResult.stats.merged} merged ` +
          `= ${mergeResult.stats.total} total elements`);

        if (visionResult.usage) {
          console.log(`[Agent] Vision cost: $${visionResult.usage.costUsd.toFixed(4)} ` +
            `(${visionResult.usage.inputTokens} in, ${visionResult.usage.outputTokens} out)`);
        }
      } catch (err) {
        console.warn('[Agent] Hybrid vision analysis failed, using DOM only:', err);
        this.unifiedElements = domElements;
      }
    } else {
      // Use DOM elements only
      this.unifiedElements = domElements;
    }

    return {
      persona: this.buildPersonaContext(),
      objective: this.buildObjectiveContext(),
      currentState: {
        url: this.browser.getCurrentUrl(),
        pageTitle: await this.browser.getTitle(),
        dom,
        viewportSize: this.browser.getViewportSize(),
      },
      history: this.history,
      memory: this.memory,
      existingFindings: this.config.existingFindings,
      language: this.config.llm.language,
      chainContext: this.config.chainContext,
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

    // Try unified element action first if hybrid vision is enabled and we have unified elements
    let result;
    if (this.config.hybridVision?.enabled && this.unifiedElements.length > 0) {
      // Check if action target uses query or unified element ID (el_*)
      const targetId = action.target?.elementId;
      const targetQuery = (action.target as { query?: string })?.query;

      if (targetQuery || (targetId && targetId.startsWith('el_'))) {
        result = await this.browser.executeUnifiedAction(
          {
            type: action.type,
            elementId: targetId,
            query: targetQuery,
            value: action.value,
            direction: action.direction,
            duration: action.duration,
          },
          this.unifiedElements,
          findElement
        );
      }
    }

    // Fallback to legacy action execution if unified action wasn't used or failed
    if (!result) {
      // Execute the action using the element map from when the LLM made its decision
      // IMPORTANT: Do NOT re-extract DOM here - the element IDs must match what the LLM saw
      result = await this.browser.executeAction(action, elementMap);
    }

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
        const expectedBehavior = decision.memoryUpdates.expectedBehavior;
        await this.createFinding(findingType, 'medium', decision.memoryUpdates.addFrustration, currentUrl, undefined, expectedBehavior);
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
    elementId?: string,
    expectedBehavior?: string
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

    // Build steps to reproduce from the full action history
    const stepsToReproduce = this.buildStepsToReproduce();

    // Build evidence with screenshot, console logs, action context, and steps to reproduce
    const evidence: FindingEvidence = {
      screenshotPath: this.currentScreenshotPath,
      consoleLogs: this.browser?.getRecentConsoleLogs(10),
      actionContext: {
        actionNumber: this.actionCount,
        previousActions: this.history.recentActions.slice(-3).map(a => ({
          type: a.action.type,
          target: a.action.target?.description,
          success: a.success,
        })),
      },
      stepsToReproduce,
    };

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
      evidence,
      expectedBehavior,
    };

    this.findings.push(finding);
    this.events.onFinding?.(finding, deduplicationResult);
  }

  /**
   * Build human-readable steps to reproduce from the action history
   */
  private buildStepsToReproduce(): string[] {
    const steps: string[] = [];

    // Start with navigation to target URL
    steps.push(`Navigate to ${this.config.targetUrl}`);

    // Add each action as a step
    for (const action of this.history.recentActions) {
      const step = this.formatActionAsStep(action);
      if (step) {
        steps.push(step);
      }
    }

    return steps;
  }

  /**
   * Format a single action as a human-readable step
   */
  private formatActionAsStep(action: ActionHistory): string {
    const { type, target, value, direction, duration } = action.action;
    const status = action.success ? '' : ' (failed)';

    switch (type) {
      case 'click':
        return `Click on "${target?.description || 'element'}"${status}`;
      case 'type':
        return `Type "${value}" into "${target?.description || 'field'}"${status}`;
      case 'fillForm':
        return `Fill form${status}`;
      case 'scroll':
        return `Scroll ${direction || 'down'}${status}`;
      case 'wait':
        return `Wait ${duration || 1000}ms${status}`;
      case 'navigate':
        return `Navigate to ${value || 'URL'}${status}`;
      case 'back':
        return `Go back${status}`;
      case 'hover':
        return `Hover over "${target?.description || 'element'}"${status}`;
      case 'select':
        return `Select "${value}" from "${target?.description || 'dropdown'}"${status}`;
      case 'abandon':
        return `Abandon objective${status}`;
      default:
        return `${type}${status}`;
    }
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

      // Wait for initial page load (apps often have loading spinners)
      console.log(`[Agent] Waiting ${INITIAL_LOAD_WAIT}ms for initial page load...`);
      await new Promise((resolve) => setTimeout(resolve, INITIAL_LOAD_WAIT));
      console.log('[Agent] Initial load wait complete');

      // Main loop
      while (!this.shouldStop && this.actionCount < this.config.maxActions) {
        // Check timeout
        if (Date.now() - this.startTime > this.config.timeout) {
          outcome = 'timeout';
          summary = 'Session timed out before completing objective';
          break;
        }

        // ALWAYS take a screenshot before each action to see what the agent sees
        const screenshot = await this.browser.takeScreenshot();
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
            this.currentScreenshotPath = screenshotPath; // Store for findings evidence
            console.log(`[Agent] Screenshot saved: ${screenshotPath}`);
          } catch (err) {
            console.warn('[Agent] Failed to save screenshot:', err);
          }
        }

        // Build context (pass screenshotPath for hybrid vision)
        const context = await this.buildContext(screenshotPath);
        context.currentState.screenshot = screenshot;
        context.currentState.screenshotPath = screenshotPath;

        // Emit screenshot event
        this.events.onScreenshot?.(screenshot, screenshotPath);

        // Get decision from LLM (with retry logic)
        console.log(`[Agent] Requesting decision from LLM (action #${this.actionCount + 1})...`);
        const MAX_DECISION_RETRIES = 2;
        let decision: AgentDecision | null = null;

        for (let attempt = 0; attempt <= MAX_DECISION_RETRIES; attempt++) {
          try {
            decision = await this.llmClient.decide(context);
            break;
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`[Agent] LLM decision failed (attempt ${attempt + 1}/${MAX_DECISION_RETRIES + 1}): ${msg.substring(0, 300)}`);

            if (attempt === MAX_DECISION_RETRIES) {
              this.consecutiveFailures++;
              console.error(`[Agent] All LLM retries exhausted. Consecutive failures: ${this.consecutiveFailures}`);

              if (this.consecutiveFailures >= 3) {
                throw error; // 3 consecutive failures → fail session
              }
              break; // Skip this action, continue loop
            }
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (!decision) {
          // Could not get a decision, skip and try next iteration
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // Reset consecutive failures on success
        this.consecutiveFailures = 0;
        console.log(`[Agent] LLM decision: ${decision.action.type} - ${decision.reasoning.action_reason}`);

        // Detect action loops before executing
        const actionSignature = this.getActionSignature(decision);
        const loopCount = this.detectLoop(actionSignature);

        if (loopCount >= 3) {
          console.warn(`[Agent] Loop detected: action "${actionSignature}" repeated ${loopCount} times`);

          // Add frustration to memory so LLM knows about the loop
          const loopMessage = `Action loop detected: tried "${decision.action.target?.description || decision.action.type}" ${loopCount} times at similar coordinates without success. The element may not be clickable at these coordinates, or requires a different interaction.`;

          if (!this.memory.frustrations.includes(loopMessage)) {
            this.memory.frustrations.push(loopMessage);
          }

          // If loop count is very high, mark as blocked
          if (loopCount >= 5) {
            console.error(`[Agent] Severe loop detected (${loopCount} repetitions), marking as blocked`);
            this.history.failedAttempts.push({
              action: decision.action,
              success: false,
              error: `Loop detected: ${loopCount} repetitions without state change`,
              timestamp: Date.now(),
              url: this.browser.getCurrentUrl(),
            });
          }
        }

        // Store URL before action for state change detection
        const urlBeforeAction = this.browser.getCurrentUrl();

        // Build element map from the DOM that the LLM saw (NOT a new extraction!)
        // This ensures element IDs match what the LLM decided to interact with
        const elementMap = new Map<string, string>();
        for (const el of context.currentState.dom.elements) {
          elementMap.set(el.id, el.selector);
        }

        // Also add unified elements to the map (hybrid system)
        for (const el of this.unifiedElements) {
          if (el.selector) {
            elementMap.set(el.id, el.selector);
          }
        }

        // Execute action
        const actionHistory = await this.executeAction(decision, elementMap);
        this.actionCount++;

        // Check for state change after action
        const urlAfterAction = this.browser.getCurrentUrl();
        const stateChanged = this.checkForStateChange(urlBeforeAction, urlAfterAction);

        if (!stateChanged && decision.action.type === 'click' && loopCount >= 2) {
          console.warn(`[Agent] Click action did not change page state (URL unchanged)`);
          // Mark action as potentially ineffective for context
          actionHistory.error = actionHistory.error || 'No visible state change after click';
        }

        // Emit events with screenshot path and elements for debugging
        this.events.onAction?.(actionHistory, decision, screenshotPath, this.unifiedElements);
        this.events.onProgress?.({
          actionCount: this.actionCount,
          status: decision.progress.objectiveStatus,
          url: this.browser.getCurrentUrl(),
        });

        // Check objective status - trust the LLM's assessment
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

        // Handle waiting-for-user status (2FA, CAPTCHA, etc.)
        if (decision.progress.objectiveStatus === 'waiting-for-user') {
          const userInputRequest = decision.userInputRequest;
          if (userInputRequest) {
            console.log(`[Agent] Waiting for user input: ${userInputRequest.type} - ${userInputRequest.prompt}`);

            // Emit event and wait for user input
            this.events.onWaitingForUser?.(userInputRequest);

            // Create a promise that will be resolved when user provides input
            const userInput = await new Promise<string>((resolve) => {
              this.pendingUserInput = { request: userInputRequest, resolve };
            });

            // If we got empty input (cancelled) or shouldStop, break
            if (!userInput || this.shouldStop) {
              outcome = 'abandoned';
              summary = 'User cancelled the verification request';
              break;
            }

            // Type the user input into the specified field
            if (userInputRequest.fieldId && this.browser) {
              console.log(`[Agent] Entering user input into field ${userInputRequest.fieldId}`);
              const typeAction = {
                type: 'type' as const,
                target: {
                  elementId: userInputRequest.fieldId,
                  description: 'Verification code field',
                },
                value: userInput,
              };
              await this.browser.executeAction(typeAction, elementMap);
            }

            // Continue the loop - the agent will decide what to do next
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
    }

    // Get current URL before closing browser
    const finalUrl = this.browser ? this.browser.getCurrentUrl() : this.config.targetUrl;

    // Cleanup
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.isRunning = false;

    // Generate personal assessment at session end
    let personalAssessment: PersonalAssessment | undefined;
    try {
      console.log('[Agent] Generating personal assessment...');
      personalAssessment = await this.llmClient.assess({
        personaName: this.config.persona.name,
        targetUrl: this.config.targetUrl,
        actionCount: this.actionCount,
        findingsCount: this.findings.length,
        frustrations: this.memory.frustrations,
        discoveries: this.memory.discoveries,
        outcome,
      });
      console.log(`[Agent] Assessment complete: ${personalAssessment.overallScore}/10`);
    } catch (error) {
      console.warn('[Agent] Failed to generate assessment:', error);
      // Assessment is optional, don't fail the session
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
      personalAssessment,
      memory: this.getMemorySnapshot(),
      visitedPages: this.getVisitedPages(),
      currentUrl: finalUrl,
    };

    this.events.onComplete?.(result);

    return result;
  }

  // ============================================================================
  // Control
  // ============================================================================

  stop(): void {
    this.shouldStop = true;
    // Also resolve any pending user input to unblock the loop
    if (this.pendingUserInput) {
      this.pendingUserInput.resolve('');
      this.pendingUserInput = null;
    }
  }

  /**
   * Provide user input for 2FA/CAPTCHA verification
   * @param value The verification code or user input
   * @returns true if there was a pending request, false otherwise
   */
  provideUserInput(value: string): boolean {
    if (this.pendingUserInput) {
      console.log(`[Agent] User provided input: ${value.substring(0, 3)}***`);
      this.pendingUserInput.resolve(value);
      this.pendingUserInput = null;
      return true;
    }
    console.warn('[Agent] No pending user input request');
    return false;
  }

  /**
   * Check if the agent is waiting for user input
   */
  isWaitingForUserInput(): boolean {
    return this.pendingUserInput !== null;
  }

  /**
   * Get the current user input request (if any)
   */
  getPendingUserInputRequest(): UserInputRequest | null {
    return this.pendingUserInput?.request ?? null;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current memory state for persistence (used by session chains)
   */
  getMemorySnapshot(): AgentMemory {
    return {
      discoveries: [...this.memory.discoveries],
      frustrations: [...this.memory.frustrations],
      decisions: [...this.memory.decisions],
    };
  }

  /**
   * Get visited pages for chain persistence
   */
  getVisitedPages(): string[] {
    return [...this.history.visitedPages];
  }

  /**
   * Get chain context if this is a chain session
   */
  getChainContext(): ChainContext | undefined {
    return this.config.chainContext;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAgent(config: AgentConfig, events?: AgentEvents): Agent {
  return new Agent(config, events);
}
