/**
 * Image Analyzer - Vision analysis using Claude Haiku via CLI
 *
 * Analyzes screenshots to extract UI elements that may be missed by DOM extraction,
 * such as icon buttons without text labels.
 */

import { spawn } from 'child_process';
import type { UnifiedElement, UnifiedElementType } from '@testfarm/shared';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface VisionAnalysisOptions {
  /** Model to use (default: claude-haiku-4-5-20251001) */
  model?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export interface VisionAnalysisResult {
  elements: UnifiedElement[];
  viewport: { width: number; height: number };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
}

// Schema for vision output
const VisionElementSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  type: z.string().optional(),
});

const VisionOutputSchema = z.object({
  buttons: z.array(VisionElementSchema),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
});

type VisionOutput = z.infer<typeof VisionOutputSchema>;

// ============================================================================
// Prompt
// ============================================================================

const VISION_PROMPT = `<task>
Analyze this screenshot and extract all interactive UI elements (buttons, links, inputs).
</task>

<output_format>
Return a JSON object with this exact structure:
{
  "buttons": [
    {
      "id": "btn_1",
      "name": "short descriptive name",
      "x": center_x_coordinate,
      "y": center_y_coordinate,
      "width": element_width,
      "height": element_height,
      "type": "button|link|input|checkbox|select|other"
    }
  ],
  "viewport": { "width": 1280, "height": 720 }
}
</output_format>

<rules>
- Include ALL clickable elements: buttons, links, icons, inputs, tabs
- Coordinates must be the CENTER of each element
- Names should be brief (1-3 words): "Send", "Profile", "Menu", "Search"
- For icon buttons without text, describe the icon: "Send icon", "Close X"
- Order by visual importance (primary actions first)
- type should be one of: button, link, input, checkbox, select, other
</rules>

<important>
- Coordinates are in pixels from top-left (0,0)
- Be precise - these coordinates will be used for automated clicking
- Include disabled elements but mark them with "(disabled)" in name
- Return ONLY valid JSON, no additional text
</important>`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse NDJSON output from Claude CLI stream-json format
 */
function parseNdjsonResult(stdout: string): {
  result: string;
  structuredOutput?: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  costUsd: number;
} | null {
  const lines = stdout.trim().split('\n');

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'result') {
        return {
          result: parsed.result || '',
          structuredOutput: parsed.structured_output,
          usage: {
            inputTokens: parsed.usage?.input_tokens || 0,
            outputTokens: parsed.usage?.output_tokens || 0,
          },
          costUsd: parsed.total_cost_usd || 0,
        };
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  return null;
}

/**
 * Map vision type string to UnifiedElementType
 */
function mapToUnifiedType(typeStr: string | undefined): UnifiedElementType {
  if (!typeStr) return 'button';
  const normalized = typeStr.toLowerCase();
  if (normalized === 'button') return 'button';
  if (normalized === 'link') return 'link';
  if (normalized === 'input') return 'input';
  if (normalized === 'checkbox') return 'checkbox';
  if (normalized === 'select') return 'select';
  if (normalized === 'textarea') return 'textarea';
  if (normalized === 'radio') return 'radio';
  return 'other';
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Analyze a screenshot with Claude Haiku to extract UI elements
 *
 * @param imagePath - Absolute path to the screenshot image
 * @param options - Analysis options
 * @returns List of unified elements with coordinates
 */
export async function analyzeWithVision(
  imagePath: string,
  options: VisionAnalysisOptions = {}
): Promise<VisionAnalysisResult> {
  const {
    model = 'claude-haiku-4-5-20251001',
    timeout = 30000,
  } = options;

  return new Promise((resolve, reject) => {
    // Build CLI arguments with model and image file
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--model', model,
      '--dangerously-skip-permissions',
      '--file', imagePath,
      '-p', '-', // Read prompt from stdin
    ];

    console.log(`[Vision] Analyzing screenshot with ${model}...`);
    console.log(`[Vision] Image path: ${imagePath}`);

    const proc = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_CODE_NON_INTERACTIVE: '1',
      },
    });

    // Write prompt to stdin and close it
    proc.stdin.write(VISION_PROMPT);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    // Set timeout
    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Vision analysis timed out after ${timeout}ms`));
    }, timeout);

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(
          'Claude CLI not found. Please install it:\n' +
          '  npm install -g @anthropic-ai/claude-code'
        ));
      } else {
        reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        console.error('[Vision] Error output:', stderr);
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse NDJSON stream-json output
        const resultLine = parseNdjsonResult(stdout);

        if (!resultLine) {
          throw new Error('No result found in CLI output');
        }

        // Parse the vision output
        let visionOutput: VisionOutput;

        if (resultLine.structuredOutput !== undefined) {
          visionOutput = VisionOutputSchema.parse(resultLine.structuredOutput);
        } else if (typeof resultLine.result === 'string') {
          // Try to extract JSON from the result text
          const jsonMatch = resultLine.result.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in result');
          }
          visionOutput = VisionOutputSchema.parse(JSON.parse(jsonMatch[0]));
        } else {
          throw new Error('No valid output from vision analysis');
        }

        // Convert to UnifiedElements
        const elements: UnifiedElement[] = visionOutput.buttons.map((btn, index) => ({
          id: `vis_${index + 1}`,
          name: btn.name,
          type: mapToUnifiedType(btn.type),
          x: btn.x,
          y: btn.y,
          width: btn.width,
          height: btn.height,
          source: 'vision' as const,
        }));

        console.log(`[Vision] Extracted ${elements.length} elements`);

        resolve({
          elements,
          viewport: visionOutput.viewport,
          usage: {
            inputTokens: resultLine.usage.inputTokens,
            outputTokens: resultLine.usage.outputTokens,
            costUsd: resultLine.costUsd,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Vision] Parse error:', message);
        console.error('[Vision] Raw output:', stdout.slice(0, 500));
        reject(new Error(`Failed to parse vision response: ${message}`));
      }
    });
  });
}
