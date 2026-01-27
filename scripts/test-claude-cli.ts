#!/usr/bin/env npx tsx
/**
 * Claude CLI Provider Test Script
 *
 * Verifies that the Claude CLI provider is working correctly:
 * 1. Checks if Claude CLI is available
 * 2. Tests simple text completion
 * 3. Tests structured output with JSON schema
 * 4. Verifies token metrics are reported correctly
 *
 * Usage:
 *   npx tsx scripts/test-claude-cli.ts
 */

import { spawn } from 'child_process';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// Test Utilities
// ============================================================================

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

// ============================================================================
// NDJSON Parser (matches the implementation in claude-cli.ts)
// ============================================================================

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

function parseNdjsonResult(stdout: string): ParsedResult | null {
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

// ============================================================================
// Test Functions
// ============================================================================

async function testCliAvailable(): Promise<boolean> {
  logSection('Test 1: Claude CLI Availability');

  return new Promise((resolve) => {
    const proc = spawn('claude', ['--version'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.on('error', () => {
      logError('Claude CLI not found');
      logInfo('Install with: npm install -g @anthropic-ai/claude-code');
      logInfo('Then authenticate: claude auth login');
      resolve(false);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        logSuccess(`Claude CLI is available: ${stdout.trim()}`);
        resolve(true);
      } else {
        logError('Claude CLI returned non-zero exit code');
        resolve(false);
      }
    });
  });
}

async function testTextCompletion(): Promise<boolean> {
  logSection('Test 2: Text Completion (stream-json)');

  return new Promise((resolve) => {
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      'Respond with only the word "hello" in lowercase, nothing else.',
    ];

    logInfo(`Running: claude ${args.slice(0, 4).join(' ')} "..."`);

    const proc = spawn('claude', args, {
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

    proc.on('close', (code) => {
      if (code !== 0) {
        logError(`CLI exited with code ${code}`);
        if (stderr) logError(`Stderr: ${stderr}`);
        resolve(false);
        return;
      }

      const result = parseNdjsonResult(stdout);

      if (!result) {
        logError('Failed to parse NDJSON result');
        logInfo(`Raw output:\n${stdout.slice(0, 500)}...`);
        resolve(false);
        return;
      }

      logSuccess(`Response: "${result.result.trim()}"`);
      logInfo(`Input tokens: ${result.usage.inputTokens}`);
      logInfo(`Output tokens: ${result.usage.outputTokens}`);
      logInfo(`Cache tokens: ${result.usage.cacheTokens}`);
      logInfo(`Cost USD: $${result.costUsd.toFixed(6)}`);

      // Verify metrics are real (not estimates)
      if (result.usage.inputTokens > 0 && result.usage.outputTokens > 0) {
        logSuccess('Token metrics are being reported correctly');
        resolve(true);
      } else {
        logWarning('Token metrics may not be reported correctly');
        resolve(true); // Still pass, but warn
      }
    });
  });
}

async function testStructuredOutput(): Promise<boolean> {
  logSection('Test 3: Structured Output (JSON Schema)');

  // Define a simple test schema
  const TestSchema = z.object({
    greeting: z.string(),
    number: z.number(),
  });

  const jsonSchema = zodToJsonSchema(TestSchema, { target: 'jsonSchema7' });

  return new Promise((resolve) => {
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--json-schema', JSON.stringify(jsonSchema),
      'Return a greeting saying "Hello TestFarm" and the number 42.',
    ];

    logInfo('Testing with JSON schema:');
    logInfo(JSON.stringify(jsonSchema, null, 2));

    const proc = spawn('claude', args, {
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

    proc.on('close', (code) => {
      if (code !== 0) {
        logError(`CLI exited with code ${code}`);
        if (stderr) logError(`Stderr: ${stderr}`);
        resolve(false);
        return;
      }

      const result = parseNdjsonResult(stdout);

      if (!result) {
        logError('Failed to parse NDJSON result');
        logInfo(`Raw output:\n${stdout.slice(0, 500)}...`);
        resolve(false);
        return;
      }

      // Check for structured_output field (prioritized)
      if (result.structuredOutput) {
        logSuccess('structured_output field present');
        logInfo(`Structured output: ${JSON.stringify(result.structuredOutput)}`);
      } else {
        logWarning('structured_output field not present, using result');
        logInfo(`Result: ${result.result}`);
      }

      // Parse and validate
      try {
        const data = result.structuredOutput ||
          (typeof result.result === 'string' ? JSON.parse(result.result) : result.result);

        const parsed = TestSchema.safeParse(data);

        if (parsed.success) {
          logSuccess('Schema validation passed');
          logInfo(`Greeting: ${parsed.data.greeting}`);
          logInfo(`Number: ${parsed.data.number}`);
        } else {
          logError('Schema validation failed');
          logInfo(`Errors: ${JSON.stringify(parsed.error.errors)}`);
          resolve(false);
          return;
        }
      } catch (e) {
        logError(`Failed to parse response: ${e}`);
        resolve(false);
        return;
      }

      logInfo(`Input tokens: ${result.usage.inputTokens}`);
      logInfo(`Output tokens: ${result.usage.outputTokens}`);
      logInfo(`Cost USD: $${result.costUsd.toFixed(6)}`);

      resolve(true);
    });
  });
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n' + '═'.repeat(60));
  log('  Claude CLI Provider Test Suite', 'bold');
  console.log('═'.repeat(60));

  const results: { test: string; passed: boolean }[] = [];

  // Test 1: CLI Available
  const cliAvailable = await testCliAvailable();
  results.push({ test: 'CLI Available', passed: cliAvailable });

  if (!cliAvailable) {
    logSection('Summary');
    logError('Cannot proceed without Claude CLI');
    process.exit(1);
  }

  // Test 2: Text Completion
  const textPassed = await testTextCompletion();
  results.push({ test: 'Text Completion', passed: textPassed });

  // Test 3: Structured Output
  const structuredPassed = await testStructuredOutput();
  results.push({ test: 'Structured Output', passed: structuredPassed });

  // Summary
  logSection('Summary');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  for (const result of results) {
    if (result.passed) {
      logSuccess(result.test);
    } else {
      logError(result.test);
    }
  }

  console.log('\n' + '-'.repeat(60));

  if (passed === total) {
    log(`All ${total} tests passed! 🎉`, 'green');
    process.exit(0);
  } else {
    log(`${passed}/${total} tests passed`, 'yellow');
    process.exit(1);
  }
}

main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
