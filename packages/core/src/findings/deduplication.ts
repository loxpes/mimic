/**
 * Finding deduplication service
 */

import { nanoid } from 'nanoid';
import { getDb, findingGroups } from '@testfarm/db';
import { eq } from 'drizzle-orm';
import type { FindingType, FindingSeverity, DeduplicationResult } from '@testfarm/shared';
import {
  generateFingerprint,
  descriptionSimilarity,
  normalizeUrl,
  type FingerprintInput,
} from './fingerprint.js';

const SIMILARITY_THRESHOLD = 0.85; // 85% similarity to consider duplicate

export interface FindingInput {
  type: FindingType;
  severity: FindingSeverity;
  description: string;
  url: string;
  elementId?: string;
  sessionId: string;
}

/**
 * Checks if a finding already exists and handles deduplication
 * Returns info about whether it's a duplicate and the group it belongs to
 */
export async function checkAndDeduplicateFinding(
  input: FindingInput
): Promise<DeduplicationResult> {
  const db = getDb();

  const fingerprintInput: FingerprintInput = {
    type: input.type,
    severity: input.severity,
    description: input.description,
    url: input.url,
    elementId: input.elementId,
  };

  const fingerprint = generateFingerprint(fingerprintInput);
  const normalizedUrl = normalizeUrl(input.url);
  const now = new Date();

  // 1. Check for exact fingerprint match
  const existingGroup = await db
    .select()
    .from(findingGroups)
    .where(eq(findingGroups.fingerprint, fingerprint))
    .get();

  if (existingGroup) {
    // Update occurrence count and last seen timestamp
    await db
      .update(findingGroups)
      .set({
        occurrenceCount: existingGroup.occurrenceCount + 1,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(findingGroups.id, existingGroup.id));

    return {
      isDuplicate: true,
      groupId: existingGroup.id,
      isNewGroup: false,
      existingOccurrences: existingGroup.occurrenceCount,
    };
  }

  // 2. Check for similar findings (fuzzy matching)
  const similarGroups = await db
    .select()
    .from(findingGroups)
    .where(eq(findingGroups.type, input.type))
    .all();

  for (const group of similarGroups) {
    const similarity = descriptionSimilarity(input.description, group.canonicalDescription);

    if (similarity >= SIMILARITY_THRESHOLD) {
      // Found similar group - update it
      await db
        .update(findingGroups)
        .set({
          occurrenceCount: group.occurrenceCount + 1,
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(eq(findingGroups.id, group.id));

      return {
        isDuplicate: true,
        groupId: group.id,
        isNewGroup: false,
        existingOccurrences: group.occurrenceCount,
      };
    }
  }

  // 3. No duplicate found - create new group
  const newGroupId = nanoid();
  await db.insert(findingGroups).values({
    id: newGroupId,
    fingerprint,
    type: input.type,
    severity: input.severity,
    canonicalDescription: input.description,
    urlPattern: normalizedUrl,
    elementSelector: input.elementId,
    occurrenceCount: 1,
    sessionCount: 1,
    status: 'open',
    firstSeenAt: now,
    lastSeenAt: now,
  });

  return {
    isDuplicate: false,
    groupId: newGroupId,
    isNewGroup: true,
    existingOccurrences: 0,
  };
}

/**
 * Loads known issues from the database for agent context
 */
export async function loadKnownIssues(limit: number = 50) {
  const db = getDb();

  const groups = await db
    .select({
      id: findingGroups.id,
      type: findingGroups.type,
      severity: findingGroups.severity,
      canonicalDescription: findingGroups.canonicalDescription,
      urlPattern: findingGroups.urlPattern,
      occurrenceCount: findingGroups.occurrenceCount,
      status: findingGroups.status,
    })
    .from(findingGroups)
    .where(eq(findingGroups.status, 'open'))
    .orderBy(findingGroups.occurrenceCount)
    .limit(limit)
    .all();

  return groups.map((g) => ({
    groupId: g.id,
    type: g.type as FindingType,
    severity: g.severity as FindingSeverity,
    description: g.canonicalDescription,
    urlPattern: g.urlPattern,
    occurrenceCount: g.occurrenceCount,
    status: g.status as 'open' | 'acknowledged' | 'resolved' | 'wont-fix',
  }));
}

/**
 * Updates the session count for a group when a new session encounters the same issue
 */
export async function incrementSessionCount(groupId: string): Promise<void> {
  const db = getDb();
  const now = new Date();

  const group = await db
    .select()
    .from(findingGroups)
    .where(eq(findingGroups.id, groupId))
    .get();

  if (group) {
    await db
      .update(findingGroups)
      .set({
        sessionCount: group.sessionCount + 1,
        updatedAt: now,
      })
      .where(eq(findingGroups.id, groupId));
  }
}
