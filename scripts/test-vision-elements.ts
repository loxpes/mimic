#!/usr/bin/env npx tsx
/**
 * Visual Analysis Script - Interactive Element Detection
 *
 * Receives a screenshot image, passes it to Claude CLI, and returns
 * structured output with all detected interactive elements (buttons,
 * links, inputs, etc.) with name, description, and coordinates.
 *
 * Usage:
 *   npx tsx scripts/test-vision-elements.ts <image-path> [--model sonnet|haiku|opus]
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// Schemas
// ============================================================================

const InteractiveElementSchema = z.object({
  name: z.string().describe('Nombre corto del elemento (ej: "Boton Enviar", "Campo Email")'),
  description: z.string().describe('Descripcion de que hace o para que sirve'),
  type: z.enum(['button', 'link', 'input', 'select', 'checkbox', 'radio', 'icon', 'menu', 'tab', 'other']),
  coordinates: z.object({
    x: z.number().describe('Coordenada X del centro del elemento (px)'),
    y: z.number().describe('Coordenada Y del centro del elemento (px)'),
  }),
  bounds: z.object({
    top: z.number(),
    left: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional().describe('Bounding box del elemento si es estimable'),
});

export const ScreenAnalysisSchema = z.object({
  pageDescription: z.string().describe('Descripcion general de la pagina/pantalla'),
  elements: z.array(InteractiveElementSchema),
});

export type ScreenAnalysis = z.infer<typeof ScreenAnalysisSchema>;

// ============================================================================
// Model Mapping
// ============================================================================

const MODEL_MAP: Record<string, string> = {
  sonnet: 'sonnet',
  haiku: 'haiku',
  opus: 'opus',
};

// ============================================================================
// Utilities
// ============================================================================

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message: string) {
  log(`Error: ${message}`, 'red');
}

function logInfo(message: string) {
  log(message, 'cyan');
}

// ============================================================================
// Pure Functions (exported for testing)
// ============================================================================

export interface ParsedArgs {
  imagePath: string | null;
  model: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  let imagePath: string | null = null;
  let model = 'sonnet';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model') {
      const nextVal = args[i + 1];
      if (nextVal && !nextVal.startsWith('--')) {
        model = nextVal;
        i++;
      }
    } else if (!args[i].startsWith('--')) {
      imagePath = args[i];
    }
  }

  return { imagePath, model };
}

interface ParsedResult {
  result: string;
  structuredOutput?: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  };
  costUsd: number;
}

export function parseNdjsonResult(stdout: string): ParsedResult | null {
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
            cacheTokens: parsed.usage?.cache_creation_input_tokens || 0,
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

export function buildCliArgs(imagePath: string, model: string): string[] {
  const jsonSchema = zodToJsonSchema(ScreenAnalysisSchema, { target: 'jsonSchema7' });
  const modelId = MODEL_MAP[model] || MODEL_MAP['sonnet'];

  return [
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--model', modelId,
    '--max-turns', '3',
    '--dangerously-skip-permissions',
    '--json-schema', JSON.stringify(jsonSchema),
    '-p', '-',
  ];
}

function buildPrompt(imagePath: string): string {
  const absPath = resolve(imagePath);
  return `Read the image at "${absPath}" and analyze it.

Identify ALL visible interactive elements on the screen, including:
- Buttons (submit, cancel, navigation, icon buttons, etc.)
- Links (text links, navigation links)
- Input fields (text, email, password, search, etc.)
- Select dropdowns
- Checkboxes and radio buttons
- Icons that appear clickable
- Menu items and tabs
- Any other clickable or interactive elements

For each element, provide:
1. A short descriptive name
2. What the element does or is for
3. The type from the allowed categories
4. The X,Y coordinates of the center of the element (in pixels)
5. The bounding box (top, left, width, height) if you can estimate it

Be thorough - identify every interactive element visible on the screen.
Also provide a brief description of the overall page/screen.`;
}

function printUsage() {
  console.log(`
Usage: npx tsx scripts/test-vision-elements.ts <image-path> [--model sonnet|haiku|opus]

Arguments:
  image-path    Path to the screenshot image to analyze
  --model       Claude model to use (default: sonnet)
                Options: sonnet, haiku, opus

Examples:
  npx tsx scripts/test-vision-elements.ts screenshot.png
  npx tsx scripts/test-vision-elements.ts ./captures/page.png --model haiku
`);
}

function formatElement(el: z.infer<typeof InteractiveElementSchema>, index: number): string {
  const lines: string[] = [];
  lines.push(`  ${colors.bold}${index + 1}. ${el.name}${colors.reset} ${colors.dim}[${el.type}]${colors.reset}`);
  lines.push(`     ${el.description}`);
  lines.push(`     ${colors.cyan}Center: (${el.coordinates.x}, ${el.coordinates.y})${colors.reset}`);
  if (el.bounds) {
    lines.push(`     ${colors.dim}Bounds: top=${el.bounds.top} left=${el.bounds.left} ${el.bounds.width}x${el.bounds.height}${colors.reset}`);
  }
  return lines.join('\n');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const { imagePath, model } = parseArgs(process.argv);

  if (!imagePath) {
    printUsage();
    process.exit(1);
  }

  if (!existsSync(imagePath)) {
    logError(`File not found: ${imagePath}`);
    process.exit(1);
  }

  if (!MODEL_MAP[model]) {
    logError(`Invalid model: ${model}. Valid options: ${Object.keys(MODEL_MAP).join(', ')}`);
    process.exit(1);
  }

  const absImagePath = resolve(imagePath);
  logInfo(`Analyzing image: ${absImagePath}`);
  logInfo(`Model: ${model} (${MODEL_MAP[model]})`);
  console.log();

  const cliArgs = buildCliArgs(absImagePath, model);
  const prompt = buildPrompt(absImagePath);

  return new Promise<void>((resolvePromise, rejectPromise) => {
    const proc = spawn('claude', cliArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_CODE_NON_INTERACTIVE: '1',
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.stdin.write(prompt);
    proc.stdin.end();

    proc.on('error', (err) => {
      logError(`Failed to spawn Claude CLI: ${err.message}`);
      logInfo('Install with: npm install -g @anthropic-ai/claude-code');
      rejectPromise(err);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        logError(`Claude CLI exited with code ${code}`);
        if (stderr) {
          logError(`Stderr: ${stderr}`);
        }
        process.exit(1);
      }

      const result = parseNdjsonResult(stdout);

      if (!result) {
        logError('Failed to parse NDJSON result from Claude CLI');
        logInfo(`Raw output (first 500 chars):\n${stdout.slice(0, 500)}`);
        process.exit(1);
      }

      // Validate structured output with Zod
      const data = result.structuredOutput ||
        (typeof result.result === 'string' ? (() => { try { return JSON.parse(result.result); } catch { return null; } })() : result.result);

      if (!data) {
        logError('No structured output received from Claude CLI');
        process.exit(1);
      }

      const parsed = ScreenAnalysisSchema.safeParse(data);

      if (!parsed.success) {
        logError('Schema validation failed');
        logInfo(`Errors: ${JSON.stringify(parsed.error.errors, null, 2)}`);
        logInfo(`Raw data: ${JSON.stringify(data, null, 2).slice(0, 1000)}`);
        process.exit(1);
      }

      // Print results
      const analysis = parsed.data;

      console.log('='.repeat(60));
      log('  Screen Analysis Results', 'bold');
      console.log('='.repeat(60));
      console.log();

      log(`Page: ${analysis.pageDescription}`, 'bold');
      console.log();

      log(`Interactive Elements (${analysis.elements.length}):`, 'bold');
      console.log();

      for (let i = 0; i < analysis.elements.length; i++) {
        console.log(formatElement(analysis.elements[i], i));
        console.log();
      }

      console.log('-'.repeat(60));
      logInfo(`Input tokens: ${result.usage.inputTokens}`);
      logInfo(`Output tokens: ${result.usage.outputTokens}`);
      logInfo(`Cost: $${result.costUsd.toFixed(6)}`);

      resolvePromise();
    });
  });
}

// Only run main when executed directly (not imported)
const isDirectRun = process.argv[1]?.includes('test-vision-elements') && !process.argv[1]?.includes('__tests__');
if (isDirectRun) {
  main().catch((error) => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}
