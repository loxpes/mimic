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
  elementId: z.string().describe('The element ID from the DOM snapshot (e.g., "e15")'),
  description: z.string().describe('Human-readable description of the element')
});

// CoordinateSchema removed - using legacy target system for now
// export const CoordinateSchema = z.tuple([z.number(), z.number()]).describe('Click coordinate [x, y]');

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
// Reasoning Schema
// ============================================================================

export const ReasoningSchema = z.object({
  observation: z.string().describe('What do you observe on the current page?'),
  thought: z.string().describe('What would the persona think/do in this situation?'),
  confidence: z.number().min(0).max(1).describe('How confident are you in this decision? (0-1)')
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

// Export types derived from schemas
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type ActionTarget = z.infer<typeof ActionTargetSchema>;
export type AgentActionZ = z.infer<typeof AgentActionSchema>;
export type Reasoning = z.infer<typeof ReasoningSchema>;
export type ObjectiveStatusZ = z.infer<typeof ObjectiveStatusSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type MemoryUpdates = z.infer<typeof MemoryUpdatesSchema>;
export type AgentDecisionZ = z.infer<typeof AgentDecisionSchema>;
