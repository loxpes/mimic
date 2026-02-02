/**
 * Tests for screenshot-storage utility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readdir } from 'fs/promises';
import path from 'path';
import { saveScreenshot, deleteSessionScreenshots } from '../screenshot-storage.js';

const TEST_BASE_DIR = '/tmp/testfarm-test-screenshots';

describe('screenshot-storage', () => {
  beforeEach(async () => {
    // Clean up test directory before each test
    await rm(TEST_BASE_DIR, { recursive: true, force: true });
    await mkdir(TEST_BASE_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory after each test
    await rm(TEST_BASE_DIR, { recursive: true, force: true });
  });

  describe('deleteSessionScreenshots', () => {
    it('should delete session screenshot directory and all its contents', async () => {
      const sessionId = 'test-session-123';
      const sessionDir = path.join(TEST_BASE_DIR, sessionId);

      // Create a session directory with some screenshots
      await mkdir(sessionDir, { recursive: true });
      await writeFile(path.join(sessionDir, 'action-001.jpg'), 'fake-image-1');
      await writeFile(path.join(sessionDir, 'action-002.jpg'), 'fake-image-2');
      await writeFile(path.join(sessionDir, 'action-003.jpg'), 'fake-image-3');

      // Verify files exist
      const filesBefore = await readdir(sessionDir);
      expect(filesBefore).toHaveLength(3);

      // Delete session screenshots
      await deleteSessionScreenshots(sessionId, TEST_BASE_DIR);

      // Verify directory no longer exists
      await expect(readdir(sessionDir)).rejects.toThrow();
    });

    it('should not throw when session directory does not exist', async () => {
      const sessionId = 'non-existent-session';

      // Should not throw
      await expect(
        deleteSessionScreenshots(sessionId, TEST_BASE_DIR)
      ).resolves.not.toThrow();
    });

    it('should delete empty session directory', async () => {
      const sessionId = 'empty-session';
      const sessionDir = path.join(TEST_BASE_DIR, sessionId);

      // Create an empty directory
      await mkdir(sessionDir, { recursive: true });

      // Delete session screenshots
      await deleteSessionScreenshots(sessionId, TEST_BASE_DIR);

      // Verify directory no longer exists
      await expect(readdir(sessionDir)).rejects.toThrow();
    });

    it('should not affect other session directories', async () => {
      const sessionId1 = 'session-to-delete';
      const sessionId2 = 'session-to-keep';
      const sessionDir1 = path.join(TEST_BASE_DIR, sessionId1);
      const sessionDir2 = path.join(TEST_BASE_DIR, sessionId2);

      // Create two session directories
      await mkdir(sessionDir1, { recursive: true });
      await mkdir(sessionDir2, { recursive: true });
      await writeFile(path.join(sessionDir1, 'action-001.jpg'), 'delete-me');
      await writeFile(path.join(sessionDir2, 'action-001.jpg'), 'keep-me');

      // Delete only the first session
      await deleteSessionScreenshots(sessionId1, TEST_BASE_DIR);

      // Verify first directory is gone
      await expect(readdir(sessionDir1)).rejects.toThrow();

      // Verify second directory still exists
      const files = await readdir(sessionDir2);
      expect(files).toHaveLength(1);
      expect(files[0]).toBe('action-001.jpg');
    });
  });

  describe('saveScreenshot', () => {
    it('should save screenshot to correct path', async () => {
      const sessionId = 'save-test-session';
      const actionNumber = 5;
      const base64Data = Buffer.from('fake-image-data').toString('base64');

      const filepath = await saveScreenshot(sessionId, actionNumber, base64Data, TEST_BASE_DIR);

      expect(filepath).toBe(path.join(TEST_BASE_DIR, sessionId, 'action-005.jpg'));

      // Verify file exists
      const files = await readdir(path.join(TEST_BASE_DIR, sessionId));
      expect(files).toContain('action-005.jpg');
    });
  });
});
