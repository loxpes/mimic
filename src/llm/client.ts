/**
 * LLM Client - Multi-provider support using Vercel AI SDK
 */

import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { AgentDecisionSchema, type AgentDecision } from './schemas.js';
import type { LLMConfig, AgentContext } from '../core/types.js';

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

    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

function getModelId(config: LLMConfig): string {
  // Return model as-is, provider SDK will handle it
  return config.model;
}

// ============================================================================
// Prompt Builder
// ============================================================================

function buildSystemPrompt(context: AgentContext): string {
  const { persona, objective } = context;

  return `# Your Identity

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

You are interacting with a website as the persona described above. At each step:

1. **OBSERVE**: Look at the current page state (DOM elements, text, navigation)
2. **THINK**: Consider what the persona would naturally do next
3. **DECIDE**: Choose an action that moves toward the objective while staying in character

## Action Guidelines

- **click**: Click on buttons, links, or other clickable elements
- **type**: Enter text into input fields (consider the persona's typing style)
- **scroll**: Scroll up or down to see more content
- **wait**: Pause to simulate reading or thinking (duration in ms)
- **navigate**: Go directly to a URL
- **back**: Go back to the previous page
- **hover**: Hover over an element
- **select**: Select an option from a dropdown
- **abandon**: Give up on the current objective (use sparingly)

## Important Rules

1. Always reference elements by their ID from the DOM snapshot (e.g., "e15")
2. Stay in character - your actions should reflect the persona's behavior
3. If stuck, try alternative approaches before abandoning
4. Request a screenshot when you need visual context (images, layouts)
5. Update memory with discoveries, frustrations, and decisions

## Memory

${context.memory.discoveries.length > 0
  ? `**Discoveries**: ${context.memory.discoveries.join(', ')}`
  : '**Discoveries**: None yet'}

${context.memory.frustrations.length > 0
  ? `**Frustrations**: ${context.memory.frustrations.join(', ')}`
  : '**Frustrations**: None yet'}

${context.memory.decisions.length > 0
  ? `**Decisions**: ${context.memory.decisions.join(', ')}`
  : '**Decisions**: None yet'}`;
}

function buildUserPrompt(context: AgentContext): string {
  const { currentState, history } = context;

  let prompt = `# Current Page State

**URL**: ${currentState.url}
**Title**: ${currentState.pageTitle}

## Available Elements

`;

  // Add elements
  for (const element of currentState.dom.elements) {
    const stateInfo = [];
    if (!element.state.visible) stateInfo.push('hidden');
    if (!element.state.enabled) stateInfo.push('disabled');

    prompt += `[${element.id}] ${element.type}: "${element.text}"`;
    if (element.location.region !== 'unknown') {
      prompt += ` (${element.location.region})`;
    }
    if (stateInfo.length > 0) {
      prompt += ` [${stateInfo.join(', ')}]`;
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
    const provider = createProvider(this.config);
    const modelId = getModelId(this.config);

    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(context);

    try {
      const result = await generateObject({
        model: provider(modelId),
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

      return result.object;
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
    const provider = createProvider(this.config);
    const modelId = getModelId(this.config);

    const { generateText } = await import('ai');

    const result = await generateText({
      model: provider(modelId),
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
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLLMClient(config: LLMConfig): LLMClient {
  return new LLMClient({ config });
}
