/**
 * Zod schemas for structured LLM output parsing
 */

import { z } from 'zod';

// ============================================================================
// Action Schema
// ============================================================================

export const ActionTypeSchema = z.enum([
  'click',
  'type',
  'fillForm',
  'scroll',
  'wait',
  'navigate',
  'back',
  'hover',
  'select',
  'abandon'
]);

export const ActionTargetSchema = z.object({
  elementId: z.string().optional().describe('The element ID if known (e.g., "ref_5"). Optional if using coordinates.'),
  description: z.string().describe('Human-readable description of the element'),
  coordinates: z.object({
    x: z.number().describe('X coordinate (pixels from left)'),
    y: z.number().describe('Y coordinate (pixels from top)'),
  }).optional().describe('Click coordinates. Use this for visual elements like icon buttons.'),
});

export const FormFieldSchema = z.object({
  elementId: z.string().describe('Element ID of the form field (e.g., "e2")'),
  value: z.string().describe('Value to enter in the field'),
});

export const AgentActionSchema = z.object({
  type: ActionTypeSchema.describe('The type of action to perform'),
  target: ActionTargetSchema.optional().describe('Target element for the action'),
  // ref and coordinate removed - using legacy target system for now
  value: z.string().optional().describe('Value for type/select actions'),
  duration: z.number().optional().describe('Duration in ms for wait actions'),
  direction: z.enum(['up', 'down']).optional().describe('Direction for scroll actions'),
  fields: z.array(FormFieldSchema).optional().describe('Array of fields for fillForm action'),
});

// ============================================================================
// Reasoning Schema (Concise format to reduce tokens)
// ============================================================================

export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);

export const ReasoningSchema = z.object({
  state: z.string().describe('Current page state in 1 sentence (e.g., "Login form, 2 fields, submit disabled")'),
  action_reason: z.string().describe('Why this action in 1 sentence (e.g., "Fill credentials to enable submit")'),
  confidence: ConfidenceLevelSchema.describe('Confidence level: high, medium, or low')
});

// ============================================================================
// Progress Schema
// ============================================================================

export const ObjectiveStatusSchema = z.enum([
  'pursuing',
  'blocked',
  'completed',
  'abandoned'
]);

export const ProgressSchema = z.object({
  objectiveStatus: ObjectiveStatusSchema.describe('Current status toward the objective'),
  completionEstimate: z.number().min(0).max(1).describe('Estimated progress toward objective (0-1)'),
  nextSteps: z.array(z.string()).describe('What are the next 1-3 steps to achieve the objective?')
});

// ============================================================================
// Memory Updates Schema
// ============================================================================

export const MemoryUpdatesSchema = z.object({
  addDiscovery: z.string().optional().describe('Something useful discovered about the site'),
  addFrustration: z.string().optional().describe('Something frustrating encountered'),
  addDecision: z.string().optional().describe('An important decision made')
});

// ============================================================================
// Complete Decision Schema
// ============================================================================

export const AgentDecisionSchema = z.object({
  action: AgentActionSchema.describe('The action to perform'),
  reasoning: ReasoningSchema.describe('Your reasoning process'),
  progress: ProgressSchema.describe('Progress toward the objective'),
  memoryUpdates: MemoryUpdatesSchema.optional().describe('Updates to agent memory'),
  requestScreenshot: z.boolean().optional().describe('Request a screenshot for more visual context')
});

// ============================================================================
// Personal Assessment Schema (Session End Evaluation)
// ============================================================================

export const DifficultyLevelSchema = z.enum([
  'very_easy',
  'easy',
  'moderate',
  'difficult',
  'very_difficult'
]);

export const PersonalAssessmentSchema = z.object({
  overallScore: z.number().min(1).max(10).describe('Overall experience score from 1 (terrible) to 10 (excellent)'),
  difficulty: DifficultyLevelSchema.describe('How difficult was it to achieve the objective?'),
  wouldRecommend: z.boolean().describe('Would you recommend this website/app to others?'),
  positives: z.array(z.string()).max(3).describe('Up to 3 positive aspects (short phrases)'),
  negatives: z.array(z.string()).max(3).describe('Up to 3 negative aspects (short phrases)'),
  summary: z.string().describe('1-2 sentence summary of the experience (max 200 chars)')
});

// Export types derived from schemas
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type ActionTarget = z.infer<typeof ActionTargetSchema>;
export type AgentActionZ = z.infer<typeof AgentActionSchema>;
export type Reasoning = z.infer<typeof ReasoningSchema>;
export type ObjectiveStatusZ = z.infer<typeof ObjectiveStatusSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type MemoryUpdates = z.infer<typeof MemoryUpdatesSchema>;
export type AgentDecisionZ = z.infer<typeof AgentDecisionSchema>;
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;
export type PersonalAssessmentZ = z.infer<typeof PersonalAssessmentSchema>;
