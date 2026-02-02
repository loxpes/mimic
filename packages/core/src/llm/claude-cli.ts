/**
 * Claude CLI Provider - Execute Claude via CLI instead of API
 * Uses the user's Claude Max subscription through the CLI
 */

import { spawn } from 'child_process';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodSchema } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface ClaudeCliOptions {
  systemPrompt: string;
  userPrompt: string;
  schema?: ZodSchema;
  maxTokens?: number;
  model?: string;  // Claude model to use (e.g., 'claude-sonnet-4-20250514')
}

export interface ClaudeCliResult<T = unknown> {
  object: T;
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    cacheTokens?: number;    // cache_creation_input_tokens from CLI
    costUsd?: number;        // total_cost_usd from CLI
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse NDJSON output from Claude CLI stream-json format
 * Returns the result line containing structured_output and usage metrics
 */
function parseNdjsonResult(stdout: string): {
  result: string;
  structuredOutput?: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
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
            cacheTokens: parsed.usage?.cache_creation_input_tokens || 0,
          },
          costUsd: parsed.total_cost_usd || 0,
        };
      }
    } catch {
      // Skip invalid JSON lines (stream-json includes non-JSON lines)
    }
  }

  return null;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Execute Claude CLI with structured output (JSON schema)
 * Uses Claude CLI's native --json-schema support for reliable structured output
 */
export async function executeClaudeCliStructured<T>(
  options: ClaudeCliOptions & { schema: ZodSchema }
): Promise<ClaudeCliResult<T>> {
  // Build a combined prompt with system and user parts
  const fullPrompt = `${options.systemPrompt}

---

${options.userPrompt}`;

  // Use CLI's native JSON schema support
  return executeClaudeCliWithSchema<T>(fullPrompt, options.schema, options.maxTokens, options.model);
}

/**
 * Execute Claude CLI for simple text completion
 */
export async function executeClaudeCliText(
  prompt: string,
  systemPrompt?: string,
  maxTokens?: number,
  model?: string
): Promise<ClaudeCliResult<string>> {
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${prompt}`
    : prompt;

  return executeClaudeCli(fullPrompt, maxTokens, model);
}

/**
 * Core function to execute Claude CLI with JSON schema support
 */
async function executeClaudeCliWithSchema<T>(
  prompt: string,
  schema: ZodSchema,
  _maxTokens?: number, // Currently unused - Claude CLI doesn't support max-tokens directly
  model?: string
): Promise<ClaudeCliResult<T>> {
  const jsonSchema = zodToJsonSchema(schema, { target: 'jsonSchema7' });

  return new Promise((resolve, reject) => {
    // Build CLI arguments with stream-json for real metrics
    // Use stdin (-p -) for prompt to avoid command line length limits
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
      '--json-schema', JSON.stringify(jsonSchema),
      '-p', '-',  // Read prompt from stdin
    ];

    // Add model flag if specified
    if (model) {
      args.push('--model', model);
    }

    console.log('[Claude CLI] Executing structured call with JSON schema...');
    console.log('[Claude CLI] Prompt length:', prompt.length, 'chars');
    const proc = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure no interactive prompts
        CLAUDE_CODE_NON_INTERACTIVE: '1',
      },
    });

    // Write prompt to stdin and close it
    proc.stdin.write(prompt);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      // Log streaming output (truncated for readability)
      const preview = chunk.replace(/\n/g, ' ').substring(0, 150);
      console.log('[Claude CLI stdout]', preview + (chunk.length > 150 ? '...' : ''));
    });

    proc.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      console.log('[Claude CLI stderr]', chunk.trim());
    });

    proc.on('error', (error) => {
      console.error('[Claude CLI] Process spawn error:', error);
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(
          'Claude CLI not found. Install:\n' +
          '  npm install -g @anthropic-ai/claude-code\n\n' +
          'Authenticate using ONE of:\n' +
          '  Local dev:  claude auth login\n' +
          '  Docker/CI:  Set CLAUDE_CODE_OAUTH_TOKEN env var\n' +
          '              (API auto-configures ~/.claude.json on startup)'
        ));
      } else {
        reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
      }
    });

    proc.on('close', (code) => {
      console.log(`[Claude CLI] Process closed with code ${code}`);
      if (code !== 0) {
        console.error('[Claude CLI] Error output:', stderr);
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse NDJSON stream-json output
        console.log('[Claude CLI] Parsing response...');
        const resultLine = parseNdjsonResult(stdout);

        if (!resultLine) {
          throw new Error('No result found in CLI output');
        }

        // Prioritize structured_output (from --json-schema), fallback to result
        let object: T;
        if (resultLine.structuredOutput !== undefined) {
          object = resultLine.structuredOutput as T;
        } else if (typeof resultLine.result === 'string') {
          object = JSON.parse(resultLine.result) as T;
        } else {
          object = resultLine.result as T;
        }

        resolve({
          object,
          text: typeof resultLine.result === 'string'
            ? resultLine.result
            : JSON.stringify(resultLine.result || object),
          usage: {
            promptTokens: resultLine.usage.inputTokens,
            completionTokens: resultLine.usage.outputTokens,
            cacheTokens: resultLine.usage.cacheTokens,
            costUsd: resultLine.costUsd,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        reject(new Error(`Failed to parse Claude CLI response: ${message}\n\nRaw output:\n${stdout}`));
      }
    });
  });
}

/**
 * Core function to execute Claude CLI for text output
 */
async function executeClaudeCli(
  prompt: string,
  _maxTokens?: number, // Currently unused - Claude CLI doesn't support max-tokens directly
  model?: string
): Promise<ClaudeCliResult<string>> {
  return new Promise((resolve, reject) => {
    // Build CLI arguments with stream-json for real metrics
    // Use stdin (-p -) for prompt to avoid command line length limits
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
      '-p', '-',  // Read prompt from stdin
    ];

    // Add model flag if specified
    if (model) {
      args.push('--model', model);
    }

    console.log('[Claude CLI] Executing text call, prompt length:', prompt.length);
    const proc = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure no interactive prompts
        CLAUDE_CODE_NON_INTERACTIVE: '1',
      },
    });

    // Write prompt to stdin and close it
    proc.stdin.write(prompt);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(
          'Claude CLI not found. Install:\n' +
          '  npm install -g @anthropic-ai/claude-code\n\n' +
          'Authenticate using ONE of:\n' +
          '  Local dev:  claude auth login\n' +
          '  Docker/CI:  Set CLAUDE_CODE_OAUTH_TOKEN env var\n' +
          '              (API auto-configures ~/.claude.json on startup)'
        ));
      } else {
        reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
      }
    });

    proc.on('close', (code) => {
      console.log(`[Claude CLI] Process closed with code ${code}`);
      if (code !== 0) {
        console.error('[Claude CLI] Error output:', stderr);
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse NDJSON stream-json output
        console.log('[Claude CLI] Parsing response...');
        const resultLine = parseNdjsonResult(stdout);

        if (!resultLine) {
          throw new Error('No result found in CLI output');
        }

        console.log('[Claude CLI] Text response parsed successfully, length:', resultLine.result.length);
        resolve({
          object: resultLine.result,
          text: resultLine.result,
          usage: {
            promptTokens: resultLine.usage.inputTokens,
            completionTokens: resultLine.usage.outputTokens,
            cacheTokens: resultLine.usage.cacheTokens,
            costUsd: resultLine.costUsd,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Claude CLI] Parse error:', message);
        reject(new Error(`Failed to parse Claude CLI response: ${message}\n\nRaw output:\n${stdout}`));
      }
    });
  });
}

/**
 * Check if Claude CLI is available and authenticated
 */
export async function isClaudeCliAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['--version'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.on('error', () => {
      resolve(false);
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}
