/**
 * Scheduler Service - Handles scheduled session chain executions
 */

import { getDb } from '@testfarm/db';
import { scheduledTasks, sessionChains, sessions } from '@testfarm/db';
import { eq, and, lte, desc, sql } from 'drizzle-orm';

// Check interval in milliseconds (1 minute)
const CHECK_INTERVAL = 60 * 1000;

// Maximum concurrent scheduled tasks to process
const MAX_CONCURRENT = 3;

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Process due scheduled tasks
 */
async function processDueTasks(): Promise<void> {
  if (isProcessing) {
    console.log('[Scheduler] Already processing, skipping this cycle');
    return;
  }

  isProcessing = true;

  try {
    const db = getDb();
    const now = new Date();

    // Get pending tasks that are due
    const dueTasks = await db
      .select()
      .from(scheduledTasks)
      .where(
        and(
          eq(scheduledTasks.status, 'pending'),
          lte(scheduledTasks.scheduledAt, now)
        )
      )
      .limit(MAX_CONCURRENT);

    if (dueTasks.length === 0) {
      return;
    }

    console.log(`[Scheduler] Processing ${dueTasks.length} due tasks`);

    for (const task of dueTasks) {
      try {
        // Mark task as running
        await db
          .update(scheduledTasks)
          .set({
            status: 'running',
            lastAttemptAt: new Date(),
            attempts: sql`${scheduledTasks.attempts} + 1`,
          })
          .where(eq(scheduledTasks.id, task.id));

        if (task.type === 'chain_continue') {
          await continueChain(task.targetId);
        }

        // Mark task as completed
        await db
          .update(scheduledTasks)
          .set({ status: 'completed' })
          .where(eq(scheduledTasks.id, task.id));

        console.log(`[Scheduler] Task ${task.id} completed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Scheduler] Task ${task.id} failed:`, errorMessage);

        // Mark task as failed
        await db
          .update(scheduledTasks)
          .set({
            status: 'failed',
            error: errorMessage,
          })
          .where(eq(scheduledTasks.id, task.id));
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error processing tasks:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Continue a session chain by creating and starting the next session
 */
async function continueChain(chainId: string): Promise<void> {
  const db = getDb();

  // Get the chain
  const chain = await db
    .select()
    .from(sessionChains)
    .where(eq(sessionChains.id, chainId))
    .get();

  if (!chain) {
    throw new Error(`Chain ${chainId} not found`);
  }

  if (chain.status !== 'active') {
    console.log(`[Scheduler] Chain ${chainId} is not active (status: ${chain.status}), skipping`);
    return;
  }

  // Check if max sessions reached
  if (chain.schedule?.maxSessions && chain.sessionCount >= chain.schedule.maxSessions) {
    console.log(`[Scheduler] Chain ${chainId} reached max sessions (${chain.schedule.maxSessions}), marking as completed`);
    await db
      .update(sessionChains)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(sessionChains.id, chainId));
    return;
  }

  // Get the last session sequence
  const lastSession = await db
    .select()
    .from(sessions)
    .where(eq(sessions.parentChainId, chainId))
    .orderBy(desc(sessions.chainSequence))
    .limit(1)
    .get();

  const nextSequence = (lastSession?.chainSequence ?? 0) + 1;

  // Create the new session
  const newSession = {
    id: crypto.randomUUID(),
    projectId: chain.projectId,
    parentChainId: chainId,
    chainSequence: nextSequence,
    scheduledAt: null,
    personaId: chain.personaId,
    objectiveId: chain.objectiveId,
    targetUrl: chain.targetUrl,
    llmConfig: chain.llmConfig || {
      provider: 'claude-cli' as const,
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      maxTokens: 2048,
    },
    visionConfig: chain.visionConfig || {
      screenshotInterval: 5,
      screenshotOnLowConfidence: true,
      confidenceThreshold: 0.5,
    },
    state: {
      status: 'pending' as const,
      actionCount: 0,
      progress: 0,
      currentUrl: chain.targetUrl,
    },
    results: null,
  };

  await db.insert(sessions).values(newSession);

  // Update chain session count
  await db
    .update(sessionChains)
    .set({
      sessionCount: sql`${sessionChains.sessionCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(sessionChains.id, chainId));

  console.log(`[Scheduler] Created session ${newSession.id} for chain ${chainId} (sequence #${nextSequence})`);

  // Schedule the next run if enabled
  if (chain.schedule?.enabled && chain.schedule.cronExpression) {
    const nextRunAt = calculateNextCronRun(chain.schedule.cronExpression, chain.schedule.timezone);
    if (nextRunAt) {
      // Update chain schedule
      await db
        .update(sessionChains)
        .set({
          schedule: {
            ...chain.schedule,
            nextRunAt,
          },
        })
        .where(eq(sessionChains.id, chainId));

      // Create next scheduled task
      await db.insert(scheduledTasks).values({
        id: crypto.randomUUID(),
        type: 'chain_continue',
        targetId: chainId,
        scheduledAt: new Date(nextRunAt),
        status: 'pending',
      });

      console.log(`[Scheduler] Scheduled next run for chain ${chainId} at ${new Date(nextRunAt).toISOString()}`);
    }
  }

  // Start the session via API call (internal)
  // For now, we just create the session in pending state
  // The user or another process can start it
  // TODO: Consider auto-starting sessions
}

/**
 * Calculate the next cron run time
 * Simplified implementation - supports basic patterns
 */
function calculateNextCronRun(cronExpression: string, _timezone?: string): number | null {
  // Simplified cron parser for common patterns
  // Format: minute hour day month dayOfWeek

  const parts = cronExpression.split(' ');
  if (parts.length !== 5) {
    console.warn(`[Scheduler] Invalid cron expression: ${cronExpression}`);
    return null;
  }

  const [minute, hour] = parts;
  const now = new Date();

  // Simple case: daily at specific time (e.g., "0 9 * * *")
  if (minute !== '*' && hour !== '*') {
    const targetMinute = parseInt(minute, 10);
    const targetHour = parseInt(hour, 10);

    const nextRun = new Date(now);
    nextRun.setHours(targetHour, targetMinute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.getTime();
  }

  // Default: run in 24 hours
  return now.getTime() + 24 * 60 * 60 * 1000;
}

/**
 * Start the scheduler
 */
export function startScheduler(): void {
  if (schedulerInterval) {
    console.log('[Scheduler] Already running');
    return;
  }

  console.log('[Scheduler] Starting scheduler service');

  // Run immediately on start
  processDueTasks().catch(console.error);

  // Then run every CHECK_INTERVAL
  schedulerInterval = setInterval(() => {
    processDueTasks().catch(console.error);
  }, CHECK_INTERVAL);
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Scheduler stopped');
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}
