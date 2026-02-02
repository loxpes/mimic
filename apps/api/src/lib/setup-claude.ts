/**
 * Claude Code CLI Authentication Setup
 *
 * Automates authentication for Docker/CI environments using CLAUDE_CODE_OAUTH_TOKEN.
 * Creates/updates ~/.claude.json with required onboarding flag.
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

interface ClaudeConfig {
  hasCompletedOnboarding: boolean;
  bypassPermissionsModeAccepted?: boolean;
  [key: string]: unknown;
}

/**
 * Setup Claude CLI authentication automatically if CLAUDE_CODE_OAUTH_TOKEN is set.
 *
 * @throws Error if setup fails (permissions, etc)
 */
export async function setupClaudeAuth(): Promise<void> {
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;

  if (!oauthToken) {
    console.log('[Claude Setup] No CLAUDE_CODE_OAUTH_TOKEN, skipping automated setup');
    return;
  }

  console.log('[Claude Setup] Token detected, configuring automated auth...');

  const claudeJsonPath = join(homedir(), '.claude.json');

  try {
    let config: ClaudeConfig;

    if (existsSync(claudeJsonPath)) {
      config = JSON.parse(readFileSync(claudeJsonPath, 'utf-8'));

      if (config.hasCompletedOnboarding === true) {
        console.log('[Claude Setup] Already configured ✓');
        return;
      }

      console.log('[Claude Setup] Updating existing config...');
      config.hasCompletedOnboarding = true;
    } else {
      console.log('[Claude Setup] Creating new ~/.claude.json');
      config = {
        hasCompletedOnboarding: true,
        bypassPermissionsModeAccepted: true,
      };
    }

    writeFileSync(claudeJsonPath, JSON.stringify(config, null, 2), {
      mode: 0o600  // Owner read/write only
    });

    console.log('[Claude Setup] ✅ Successfully configured for automated auth');

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to setup Claude authentication: ${message}\n\n` +
      `Required when using CLAUDE_CODE_OAUTH_TOKEN.\n` +
      `Ensure write permissions to ${homedir()}`
    );
  }
}
