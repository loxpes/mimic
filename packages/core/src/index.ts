/**
 * @testfarm/core - AI Agent Core Runtime
 */

// Re-export from shared types
export type {
  Persona,
  Objective,
  AgentContext,
  AgentDecision,
  LLMConfig,
  VisionConfig,
  Finding,
  SessionMetrics,
  ActionHistory,
  UnifiedElement,
  UnifiedElementType,
  UnifiedElementSource,
} from '@testfarm/shared';

// Export agent
export { Agent, createAgent } from './agent.js';
export type { AgentConfig, AgentEvents, AgentResult, HybridVisionConfig } from './agent.js';

// Export LLM
export { LLMClient, createLLMClient } from './llm/client.js';
export type { LLMClientOptions } from './llm/client.js';

// Export browser
export { BrowserController, createBrowser } from './browser/controller.js';
export type { BrowserOptions, ActionResult, BrowserType } from './browser/controller.js';

// Export vision
export { extractDOM, estimateTokens } from './vision/dom-extractor.js';
export { readPage, formatElementsForLLM } from './vision/read-page.js';
export { analyzeWithVision } from './vision/image-analyzer.js';
export type { VisionAnalysisOptions, VisionAnalysisResult } from './vision/image-analyzer.js';
export { mergeElements, pageElementToUnified } from './vision/merge-elements.js';
export type { MergeOptions, MergeResult } from './vision/merge-elements.js';
export { findElement, findAllElements, findElementByPosition } from './vision/find-element.js';
export type { FindOptions, FindResult } from './vision/find-element.js';

// Export config
export {
  loadPersonaFromFile,
  loadObjectiveFromFile,
  loadPersonasFromDir,
  loadObjectivesFromDir,
  getDefaultPersonasDir,
  getDefaultObjectivesDir,
} from './config/loader.js';

// Export findings (deduplication)
export {
  generateFingerprint,
  normalizeUrl,
  normalizeDescription,
  descriptionSimilarity,
  checkAndDeduplicateFinding,
  loadKnownIssues,
  incrementSessionCount,
} from './findings/index.js';
export type { FingerprintInput, FindingInput } from './findings/index.js';

// Export reports
export { generateSessionReport, generateSessionReportBasic } from './reports/index.js';

// Export utilities
export { saveScreenshot, getScreenshotPath } from './utils/screenshot-storage.js';
