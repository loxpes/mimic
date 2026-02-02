/**
 * LLM Client - Multi-provider support using Vercel AI SDK
 * Also supports Claude CLI for users with Claude Max subscription
 */

import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { AgentDecisionSchema, PersonalAssessmentSchema } from './schemas.js';
import { executeClaudeCliStructured, executeClaudeCliText } from './claude-cli.js';
import type { LLMConfig, AgentContext, AgentDecision, PersonalAssessment } from '@testfarm/shared';

// ============================================================================
// Provider Factory
// ============================================================================

function createProvider(config: LLMConfig) {
  switch (config.provider) {
    case 'anthropic':
      return createAnthropic({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      });

    case 'openai':
      return createOpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      });

    case 'google':
      return createGoogleGenerativeAI({
        apiKey: config.apiKey || process.env.GOOGLE_API_KEY,
      });

    case 'ollama':
      return createOpenAI({
        baseURL: config.baseUrl || 'http://localhost:11434/v1',
        apiKey: 'ollama', // Ollama doesn't need real key
      });

    case 'custom':
      return createOpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
      });

    case 'claude-cli':
      // Claude CLI is handled separately in the LLMClient methods
      // This case returns null to indicate CLI usage
      return null;

    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

function getModelId(config: LLMConfig): string {
  // Return model as-is, provider SDK will handle it
  return config.model;
}

// ============================================================================
// Language Support
// ============================================================================

function getLanguageInstruction(language?: string): string {
  const languageMap: Record<string, string> = {
    'es': 'Spanish (Español)',
    'en': 'English',
    'pt': 'Portuguese (Português)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
  };

  // Spanish is default, no instruction needed
  if (!language || language === 'es') return '';

  const langName = languageMap[language] || language;
  return `**LANGUAGE REQUIREMENT**: You MUST respond in ${langName}. All your reasoning, discoveries, frustrations, memory updates, and reports should be written in ${langName}.

`;
}

// ============================================================================
// Prompt Builder
// ============================================================================

function buildSystemPrompt(context: AgentContext): string {
  const { persona, objective, language } = context;
  const languageInstruction = getLanguageInstruction(language);

  return `${languageInstruction}# Your Identity

${persona.systemPrompt}

## Your Traits
${persona.traits.map(t => `- ${t}`).join('\n')}

## Your Preferences
${persona.preferences.map(p => `- ${p}`).join('\n')}

# Your Objective

**Goal**: ${objective.goal}

**Constraints**:
${objective.constraints.map(c => `- ${c}`).join('\n')}

**Success Criteria**: ${objective.successCriteria}

**Autonomy Level**: ${objective.autonomyLevel}

# Instructions

You are a testing agent interacting with a website as a real user would.

## YOUR RESPONSIBILITIES

1. **INTERACT** with the page to achieve your objective
2. **OBSERVE** the visual state through the screenshot
3. **REPORT** problems you encounter as frustrations

## HOW TO USE SCREENSHOTS

When a screenshot path is provided, READ the image file to:
- See what elements are actually visible on screen
- Evaluate the design and visual style
- Detect UX/UI problems
- Understand the current page state

## VISUAL AND STYLE FEEDBACK

While navigating, EVALUATE and REPORT visual issues in memoryUpdates.addFrustration:

### Design Problems:
- Colors with low contrast or hard to read
- Text too small or too large
- Inconsistent spacing or misaligned elements
- Blurry, stretched, or poorly cropped images
- Confusing or unclear icons

### UX Problems:
- Buttons that don't look clickable
- Links that don't stand out from regular text
- Confusing forms or unclear fields
- Error messages that are hard to understand
- Loading states that don't indicate progress

### Visual Accessibility Problems:
- Insufficient contrast
- Text over images without background
- Interactive elements that are too small
- Missing focus indicators

EXAMPLE frustration report:
memoryUpdates: {
  addFrustration: "The 'Submit' button has very low contrast - light gray on white background, barely visible"
}

## ACTION GUIDELINES

- **click**: Click on buttons, links, or other clickable elements
  - You can specify the element by ID (e.g., "e9") OR by coordinates {x, y}
  - For icon buttons without clear names, USE COORDINATES from the screenshot
- **type**: Enter text into a SINGLE input field
- **fillForm**: Fill MULTIPLE form fields in ONE action - USE THIS for forms with 2+ fields!
  - Provide an array of {elementId, value} for each field
  - Example: fillForm with fields: [{elementId: "e2", value: "Juan"}, {elementId: "e3", value: "juan@email.com"}]
  - IMPORTANT: Use the credentials from the Authentication section if available
  - This is MORE EFFICIENT than using type multiple times
- **scroll**: Scroll up or down to see more content
- **wait**: Pause to simulate reading or thinking (duration in ms)
- **navigate**: Go directly to a URL
- **back**: Go back to the previous page
- **hover**: Hover over an element
- **select**: Select an option from a dropdown
- **abandon**: Give up on the current objective (use sparingly)

**IMPORTANT**: When you see a form with multiple input fields (login, registration, contact, etc.), ALWAYS use fillForm instead of multiple type actions. This is more efficient and natural.

## HOW TO CLICK ELEMENTS

You have TWO options for clicking:

1. **By Element ID**: Use the element ID from the element list (e.g., "e9")
   - Example target: { elementId: "e9", description: "Enviar button" }

2. **By Coordinates**: Look at the screenshot and specify exact pixel coordinates
   - Example target: { coordinates: { x: 1027, y: 345 }, description: "Send icon button" }
   - USE THIS for icon buttons, visual elements, or when element IDs are ambiguous

**CRITICAL**: Before clicking, VERIFY in the screenshot that you are clicking the RIGHT element:
- Look at the element's POSITION on screen
- Check the coordinates match what you see visually
- For chat interfaces, the SEND button is usually to the RIGHT of the input field

## IMPORTANT RULES

1. Reference elements by their ID from the list (e.g., "e1", "e9") exactly as shown
2. For icon buttons without text, USE COORDINATES from the screenshot
3. ALWAYS verify visually: check the screenshot to confirm you're clicking the right element
4. Stay in character - your actions should reflect the persona's behavior
5. If stuck, try alternative approaches before abandoning
6. Update memory with discoveries, frustrations, and decisions
7. **OBJECTIVE STATUS**: Only mark as "completed" AFTER you have VERIFIED the result:
   - If you need to wait for a response, use action "wait" with status "pursuing"
   - After waiting, check the result in the next action
   - Only mark "completed" when you CONFIRM the objective was achieved
   - Don't mark "completed" during a wait action - wait first, then verify

## Memory

${context.memory.discoveries.length > 0
      ? `**Discoveries**: ${context.memory.discoveries.join(', ')}`
      : '**Discoveries**: None yet'}

${context.memory.frustrations.length > 0
      ? `**Frustrations**: ${context.memory.frustrations.join(', ')}`
      : '**Frustrations**: None yet'}

${context.memory.decisions.length > 0
      ? `**Decisions**: ${context.memory.decisions.join(', ')}`
      : '**Decisions**: None yet'}${buildChainContextSection(context)}${buildAuthInstructions(context)}${buildKnownIssuesSection(context)}`;
}

function buildChainContextSection(context: AgentContext): string {
  const { chainContext } = context;

  if (!chainContext) {
    return '';
  }

  return `

# Session Chain Context

**IMPORTANT**: This is session #${chainContext.sequence} in an ongoing multi-day testing journey.

You have been testing this site over multiple sessions. Here's your accumulated context:

## Previous Progress
- **Total actions across all previous sessions**: ${chainContext.totalPreviousActions}
- **Pages you've already explored**: ${chainContext.visitedPages.length > 0
    ? chainContext.visitedPages.slice(-10).join(', ')
    : 'None recorded'}

## Your Accumulated Knowledge
The discoveries, frustrations, and decisions listed in the Memory section above include knowledge from previous sessions.

## Continuation Guidelines
1. **Build on previous work**: Don't repeat explorations you've already done
2. **Remember your context**: Use your accumulated knowledge to make better decisions
3. **Focus on depth**: Since you've already explored the surface, go deeper into specific features
4. **Track new findings**: Any NEW discoveries or frustrations should be added to memory
5. **Be efficient**: Skip steps you've already completed in previous sessions`;
}

function buildKnownIssuesSection(context: AgentContext): string {
  const { existingFindings } = context;

  if (!existingFindings?.knownIssues?.length) {
    return '';
  }

  const issuesList = existingFindings.knownIssues
    .slice(0, 10) // Limit to top 10 to avoid context overload
    .map((issue) => `- [${issue.type}/${issue.severity}] ${issue.description} (seen ${issue.occurrenceCount} times, status: ${issue.status})`)
    .join('\n');

  return `

# Known Issues (Do NOT Report Again)

The following issues have already been identified in previous testing sessions. Do NOT create new findings for these known issues:

${issuesList}

**Important**: If you encounter any of these known issues:
1. You may note them in your memory for context awareness
2. Do NOT add them to memoryUpdates.addFrustration as new findings
3. Focus your attention on discovering NEW issues not in this list
4. Only report issues that are genuinely different from the ones listed above`;
}

function buildAuthInstructions(context: AgentContext): string {
  const { credentials } = context.persona;

  if (!credentials) {
    return '';
  }

  const { email, password, isNewUser } = credentials;

  return `

# Autenticación

Tienes las siguientes credenciales para usar en esta web:
- **Email**: ${email}
- **Contraseña**: ${password}
- **Estado**: ${isNewUser ? 'Usuario nuevo - NECESITAS REGISTRARTE primero' : 'Usuario existente - puedes hacer login directamente'}

## Instrucciones de Autenticación

1. **Si ves una página de login/registro**:
   - ${isNewUser
      ? 'Busca el enlace o botón para "Registrarse", "Sign Up", "Crear cuenta", "Register" y úsalo PRIMERO'
      : 'Usa el formulario de login directamente'}
   - Usa las credenciales proporcionadas arriba
   - Si hay campos adicionales (nombre, empresa, teléfono, etc.), invéntalos según tu persona

2. **Si el registro requiere verificación de email**:
   - Marca el objetivo como "blocked" con el motivo "Requiere verificación de email"

3. **Si hay login social (Google, GitHub, Apple, etc.)**:
   - NO lo uses, usa siempre el registro/login con email y contraseña

4. **Después de autenticarte exitosamente**:
   - Continúa con tu objetivo principal
   - Añade "Autenticación completada" a tus discoveries`;
}

function buildUserPrompt(context: AgentContext): string {
  const { currentState, history } = context;

  let prompt = `# Current Page State

**URL**: ${currentState.url}
**Title**: ${currentState.pageTitle}

`;

  // If there's a screenshot saved to disk, instruct Claude CLI to read it
  if (currentState.screenshotPath) {
    prompt += `## Visual Context

**IMPORTANTE**: Hay un screenshot de la página actual guardado en:
\`${currentState.screenshotPath}\`

Por favor, LEE este archivo de imagen usando el tool Read para ver el estado visual actual de la página. Esto te ayudará a:
- Ver qué elementos están realmente visibles en pantalla
- Entender el diseño y disposición de la página
- Identificar botones, formularios y otros elementos interactivos
- Detectar mensajes de error o estado que no aparecen en el DOM

`;
  }

  prompt += `## Interactive Elements

`;

  // Add elements in cleaner format
  for (const element of currentState.dom.elements) {
    const stateInfo = [];
    if (!element.state.enabled) stateInfo.push('disabled');
    if (element.state.focused) stateInfo.push('focused');

    prompt += `${element.id}: [${element.type}] "${element.text}"`;
    if (stateInfo.length > 0) {
      prompt += ` (${stateInfo.join(', ')})`;
    }
    prompt += '\n';
  }

  // Add text regions summary
  if (currentState.dom.textRegions.length > 0) {
    prompt += '\n## Page Content Summary\n\n';
    for (const region of currentState.dom.textRegions) {
      prompt += `- ${region.region}: ${region.summary} (~${region.wordCount} words)\n`;
    }
  }

  // Add navigation
  if (currentState.dom.navigation.length > 0) {
    prompt += '\n## Navigation\n\n';
    for (const nav of currentState.dom.navigation) {
      prompt += `- ${nav.text}${nav.isCurrent ? ' (current)' : ''}\n`;
    }
  }

  // Add recent history
  if (history.recentActions.length > 0) {
    prompt += '\n## Recent Actions\n\n';
    const recent = history.recentActions.slice(-5);
    for (const action of recent) {
      const status = action.success ? '✓' : '✗';
      prompt += `${status} ${action.action.type}`;
      if (action.action.target) {
        prompt += ` on "${action.action.target.description}"`;
      }
      if (action.action.value) {
        prompt += ` with value "${action.action.value}"`;
      }
      if (!action.success && action.error) {
        prompt += ` (error: ${action.error})`;
      }
      prompt += '\n';
    }
  }

  // Add failed attempts warning
  if (history.failedAttempts.length > 0) {
    prompt += `\n⚠️ ${history.failedAttempts.length} actions have failed recently. Consider a different approach.\n`;
  }

  prompt += '\n---\n\nBased on the current state, decide your next action:';

  return prompt;
}

// ============================================================================
// LLM Client Class
// ============================================================================

export interface LLMClientOptions {
  config: LLMConfig;
  onTokenUsage?: (tokens: { prompt: number; completion: number }) => void;
}

export class LLMClient {
  private config: LLMConfig;
  private onTokenUsage?: (tokens: { prompt: number; completion: number }) => void;

  constructor(options: LLMClientOptions) {
    this.config = options.config;
    this.onTokenUsage = options.onTokenUsage;
  }

  async decide(context: AgentContext): Promise<AgentDecision> {
    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(context);

    try {
      // Handle Claude CLI provider separately
      if (this.config.provider === 'claude-cli') {
        const result = await executeClaudeCliStructured<AgentDecision>({
          systemPrompt,
          userPrompt,
          schema: AgentDecisionSchema,
          maxTokens: this.config.maxTokens ?? 2048,
        });

        // Report token usage if callback provided
        if (this.onTokenUsage) {
          this.onTokenUsage({
            prompt: result.usage.promptTokens,
            completion: result.usage.completionTokens,
          });
        }

        return result.object;
      }

      // Use Vercel AI SDK for other providers
      const provider = createProvider(this.config);
      const modelId = getModelId(this.config);

      const result = await generateObject({
        model: provider!(modelId),
        schema: AgentDecisionSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: this.config.temperature ?? 0.7,
        maxTokens: this.config.maxTokens ?? 2048,
      });

      // Report token usage if callback provided
      if (this.onTokenUsage && result.usage) {
        this.onTokenUsage({
          prompt: result.usage.promptTokens,
          completion: result.usage.completionTokens,
        });
      }

      return result.object as AgentDecision;
    } catch (error) {
      // Wrap error with more context
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`LLM decision failed: ${message}`);
    }
  }

  /**
   * Get a simple text completion (for summaries, reports, etc.)
   */
  async complete(prompt: string, system?: string): Promise<string> {
    // Handle Claude CLI provider separately
    if (this.config.provider === 'claude-cli') {
      const result = await executeClaudeCliText(
        prompt,
        system,
        this.config.maxTokens ?? 2048
      );

      if (this.onTokenUsage) {
        this.onTokenUsage({
          prompt: result.usage.promptTokens,
          completion: result.usage.completionTokens,
        });
      }

      return result.text;
    }

    // Use Vercel AI SDK for other providers
    const provider = createProvider(this.config);
    const modelId = getModelId(this.config);

    const { generateText } = await import('ai');

    const result = await generateText({
      model: provider!(modelId),
      system,
      prompt,
      temperature: this.config.temperature ?? 0.7,
      maxTokens: this.config.maxTokens ?? 2048,
    });

    if (this.onTokenUsage && result.usage) {
      this.onTokenUsage({
        prompt: result.usage.promptTokens,
        completion: result.usage.completionTokens,
      });
    }

    return result.text;
  }

  /**
   * Generate a personal assessment of the session experience
   */
  async assess(sessionContext: {
    personaName: string;
    targetUrl: string;
    actionCount: number;
    findingsCount: number;
    frustrations: string[];
    discoveries: string[];
    outcome: string;
  }): Promise<PersonalAssessment> {
    const systemPrompt = `You are ${sessionContext.personaName}, a user who just finished testing a website.
Rate your experience HONESTLY and CONCISELY.

Rules:
- overallScore: 1-10 (1=terrible, 10=excellent)
- difficulty: very_easy, easy, moderate, difficult, very_difficult
- wouldRecommend: true/false
- positives: up to 3 SHORT phrases (max 50 chars each)
- negatives: up to 3 SHORT phrases (max 50 chars each)
- summary: 1-2 sentences (max 200 chars total)`;

    const userPrompt = `Session completed:
- URL: ${sessionContext.targetUrl}
- Actions: ${sessionContext.actionCount}
- Issues found: ${sessionContext.findingsCount}
- Outcome: ${sessionContext.outcome}
- Frustrations: ${sessionContext.frustrations.length > 0 ? sessionContext.frustrations.join('; ') : 'None'}
- Discoveries: ${sessionContext.discoveries.length > 0 ? sessionContext.discoveries.join('; ') : 'None'}

Rate this experience:`;

    try {
      if (this.config.provider === 'claude-cli') {
        const result = await executeClaudeCliStructured<PersonalAssessment>({
          systemPrompt,
          userPrompt,
          schema: PersonalAssessmentSchema,
          maxTokens: 512,
        });

        if (this.onTokenUsage) {
          this.onTokenUsage({
            prompt: result.usage.promptTokens,
            completion: result.usage.completionTokens,
          });
        }

        return result.object;
      }

      const provider = createProvider(this.config);
      const modelId = getModelId(this.config);

      const result = await generateObject({
        model: provider!(modelId),
        schema: PersonalAssessmentSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
        maxTokens: 512,
      });

      if (this.onTokenUsage && result.usage) {
        this.onTokenUsage({
          prompt: result.usage.promptTokens,
          completion: result.usage.completionTokens,
        });
      }

      return result.object as PersonalAssessment;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Personal assessment failed: ${message}`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLLMClient(config: LLMConfig): LLMClient {
  return new LLMClient({ config });
}
