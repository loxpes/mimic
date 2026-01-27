#!/usr/bin/env node

/**
 * TestFarm CLI - Command-line interface for running AI testing agents
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createAgent } from '../core/agent.js';
import { loadPersonaFromFile, loadObjectiveFromFile } from '../config/loader.js';
import { initializeDb } from '../data/db.js';
import type { LLMConfig, VisionConfig } from '../core/types.js';

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program
  .name('testfarm')
  .description('AI-powered browser testing agent farm')
  .version('0.1.0');

// ============================================================================
// Run Command
// ============================================================================

program
  .command('run')
  .description('Run a testing session with an AI agent')
  .requiredOption('-u, --url <url>', 'Target URL to test')
  .requiredOption('-p, --persona <file>', 'Path to persona YAML file')
  .requiredOption('-o, --objective <file>', 'Path to objective YAML file')
  .option('-m, --model <model>', 'LLM model to use', 'claude-3-5-sonnet-20241022')
  .option('--provider <provider>', 'LLM provider (anthropic, openai, ollama)', 'anthropic')
  .option('--max-actions <number>', 'Maximum number of actions', '50')
  .option('--timeout <ms>', 'Session timeout in milliseconds', '300000')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--no-headless', 'Run browser with visible window')
  .action(async (options) => {
    const spinner = ora('Initializing TestFarm...').start();

    try {
      // Initialize database
      await initializeDb();

      // Load persona
      spinner.text = 'Loading persona...';
      const persona = loadPersonaFromFile(options.persona);

      // Load objective
      spinner.text = 'Loading objective...';
      const objective = loadObjectiveFromFile(options.objective);

      // Build LLM config
      const llmConfig: LLMConfig = {
        provider: options.provider as LLMConfig['provider'],
        model: options.model,
        temperature: 0.7,
        maxTokens: 2048,
      };

      // Build vision config
      const visionConfig: VisionConfig = {
        screenshotInterval: 5,
        screenshotOnLowConfidence: true,
        confidenceThreshold: 0.5,
      };

      spinner.succeed('Configuration loaded');

      console.log(chalk.blue('\n--- Session Configuration ---'));
      console.log(`  ${chalk.gray('Target:')} ${options.url}`);
      console.log(`  ${chalk.gray('Persona:')} ${persona.name}`);
      console.log(`  ${chalk.gray('Objective:')} ${objective.name}`);
      console.log(`  ${chalk.gray('Model:')} ${llmConfig.provider}/${llmConfig.model}`);
      console.log(`  ${chalk.gray('Max Actions:')} ${options.maxActions}`);
      console.log();

      // Create agent
      const agent = createAgent(
        {
          persona,
          objective,
          targetUrl: options.url,
          llm: llmConfig,
          vision: visionConfig,
          maxActions: parseInt(options.maxActions, 10),
          timeout: parseInt(options.timeout, 10),
        },
        {
          onAction: (action, decision) => {
            const status = action.success ? chalk.green('✓') : chalk.red('✗');
            console.log(
              `${status} [${decision.reasoning.confidence.toFixed(2)}] ${action.action.type}` +
              (action.action.target ? ` → ${action.action.target.description}` : '') +
              (action.action.value ? ` = "${action.action.value}"` : '')
            );
            console.log(chalk.gray(`   ${decision.reasoning.thought}`));
          },
          onProgress: (progress) => {
            console.log(
              chalk.cyan(`   Actions: ${progress.actionCount} | Status: ${progress.status}`)
            );
          },
          onFinding: (finding) => {
            const severityColor =
              finding.severity === 'critical' ? chalk.red :
              finding.severity === 'high' ? chalk.yellow :
              finding.severity === 'medium' ? chalk.blue :
              chalk.gray;
            console.log(
              severityColor(`   📋 Finding [${finding.severity}]: ${finding.description}`)
            );
          },
          onError: (error) => {
            console.error(chalk.red(`   ❌ Error: ${error.message}`));
          },
        }
      );

      console.log(chalk.blue('--- Starting Session ---\n'));

      // Run agent
      const result = await agent.run();

      // Print results
      console.log(chalk.blue('\n--- Session Results ---'));
      console.log(`  ${chalk.gray('Outcome:')} ${result.success ? chalk.green(result.outcome) : chalk.red(result.outcome)}`);
      console.log(`  ${chalk.gray('Summary:')} ${result.summary}`);
      console.log(`  ${chalk.gray('Actions:')} ${result.actionsTaken} (${result.metrics.successfulActions} successful, ${result.metrics.failedActions} failed)`);
      console.log(`  ${chalk.gray('Duration:')} ${(result.duration / 1000).toFixed(1)}s`);
      console.log(`  ${chalk.gray('Pages Visited:')} ${result.metrics.pagesVisited}`);
      console.log(`  ${chalk.gray('LLM Calls:')} ${result.metrics.llmCalls} (${result.metrics.totalTokens} tokens)`);
      console.log(`  ${chalk.gray('Findings:')} ${result.findings.length}`);

      if (result.findings.length > 0) {
        console.log(chalk.blue('\n--- Findings ---'));
        for (const finding of result.findings) {
          console.log(`  [${finding.severity}] ${finding.type}: ${finding.description}`);
          console.log(chalk.gray(`    → ${finding.personaPerspective}`));
        }
      }

      console.log();

      process.exit(result.success ? 0 : 1);

    } catch (error) {
      spinner.fail('Session failed');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// ============================================================================
// List Commands
// ============================================================================

program
  .command('list-personas')
  .description('List available personas')
  .option('-d, --dir <directory>', 'Personas directory', './personas')
  .action(async (options) => {
    const { loadPersonasFromDir } = await import('../config/loader.js');
    const personas = loadPersonasFromDir(options.dir);

    if (personas.length === 0) {
      console.log(chalk.yellow('No personas found in ' + options.dir));
      return;
    }

    console.log(chalk.blue('Available Personas:\n'));
    for (const persona of personas) {
      console.log(`  ${chalk.white(persona.name)}`);
      if (persona.metadata?.archetype) {
        console.log(chalk.gray(`    Archetype: ${persona.metadata.archetype}`));
      }
      if (persona.metadata?.tags) {
        console.log(chalk.gray(`    Tags: ${persona.metadata.tags.join(', ')}`));
      }
      console.log();
    }
  });

program
  .command('list-objectives')
  .description('List available objectives')
  .option('-d, --dir <directory>', 'Objectives directory', './objectives')
  .action(async (options) => {
    const { loadObjectivesFromDir } = await import('../config/loader.js');
    const objectives = loadObjectivesFromDir(options.dir);

    if (objectives.length === 0) {
      console.log(chalk.yellow('No objectives found in ' + options.dir));
      return;
    }

    console.log(chalk.blue('Available Objectives:\n'));
    for (const obj of objectives) {
      console.log(`  ${chalk.white(obj.name)}`);
      console.log(chalk.gray(`    Level: ${obj.autonomy.level}`));
      console.log(chalk.gray(`    Goal: ${obj.goal.split('\n')[0].trim()}`));
      console.log();
    }
  });

// ============================================================================
// Init Command
// ============================================================================

program
  .command('init')
  .description('Initialize TestFarm in current directory')
  .action(async () => {
    const spinner = ora('Initializing TestFarm...').start();

    try {
      const { mkdirSync, existsSync } = await import('fs');
      const { join } = await import('path');

      // Create directories
      const dirs = ['personas', 'objectives', 'data'];
      for (const dir of dirs) {
        const path = join(process.cwd(), dir);
        if (!existsSync(path)) {
          mkdirSync(path, { recursive: true });
        }
      }

      // Initialize database
      await initializeDb();

      spinner.succeed('TestFarm initialized');

      console.log(chalk.blue('\nCreated directories:'));
      console.log('  - personas/   (store persona YAML files)');
      console.log('  - objectives/ (store objective YAML files)');
      console.log('  - data/       (database and screenshots)');

      console.log(chalk.blue('\nNext steps:'));
      console.log('  1. Create personas in personas/ directory');
      console.log('  2. Create objectives in objectives/ directory');
      console.log('  3. Run: testfarm run -u <url> -p <persona.yaml> -o <objective.yaml>');

    } catch (error) {
      spinner.fail('Initialization failed');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// ============================================================================
// Parse
// ============================================================================

program.parse();
