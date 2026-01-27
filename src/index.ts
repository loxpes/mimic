/**
 * TestFarm - AI-powered browser testing agent farm
 *
 * Main entry point for programmatic usage
 */

// Core exports
export { Agent, createAgent } from './core/agent.js';
export type {
  AgentConfig,
  AgentEvents,
  AgentResult,
} from './core/agent.js';

// Type exports
export type {
  Persona,
  PersonaContext,
  Objective,
  ObjectiveContext,
  AutonomyLevel,
  AgentContext,
  AgentDecision,
  AgentAction,
  AgentMemory,
  AgentHistory,
  ActionHistory,
  ActionType,
  LLMConfig,
  VisionConfig,
  SessionConfig,
  SessionState,
  SessionResults,
  SessionMetrics,
  Finding,
  FindingType,
  FindingSeverity,
  StructuredDOM,
  ActionableElement,
  TextRegion,
  NavigationElement,
  ElementType,
  PageRegion,
} from './core/types.js';

// LLM exports
export { LLMClient, createLLMClient } from './llm/client.js';
export { AgentDecisionSchema } from './llm/schemas.js';

// Browser exports
export { BrowserController, createBrowser } from './browser/controller.js';
export type { BrowserOptions, BrowserType, ActionResult } from './browser/controller.js';

// Vision exports
export { extractDOM, estimateTokens } from './vision/dom-extractor.js';

// Config exports
export {
  loadPersonaFromFile,
  loadObjectiveFromFile,
  loadPersonasFromDir,
  loadObjectivesFromDir,
  getDefaultPersonasDir,
  getDefaultObjectivesDir,
} from './config/loader.js';

// Database exports
export { getDb, initializeDb, closeDb } from './data/db.js';
export * as schema from './data/schema.js';
