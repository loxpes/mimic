/**
 * Screenshot Storage Utility
 * Saves screenshots to disk and returns file paths
 */

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

/**
 * Save a screenshot to disk
 * @param sessionId - The session ID (used for directory organization)
 * @param actionNumber - The action number (used for filename)
 * @param base64Data - The base64-encoded screenshot data
 * @param baseDir - Base directory for screenshots (default: data/screenshots)
 * @returns The relative file path to the saved screenshot
 */
export async function saveScreenshot(
  sessionId: string,
  actionNumber: number,
  base64Data: string,
  baseDir: string = 'data/screenshots'
): Promise<string> {
  const dir = path.join(baseDir, sessionId);
  await mkdir(dir, { recursive: true });

  const filename = `action-${String(actionNumber).padStart(3, '0')}.jpg`;
  const filepath = path.join(dir, filename);

  // Remove data URL prefix if present
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');

  await writeFile(filepath, Buffer.from(base64Content, 'base64'));

  // Return relative path for storage in DB
  return filepath;
}

/**
 * Get the full path for a screenshot
 * @param sessionId - The session ID
 * @param filename - The screenshot filename
 * @param baseDir - Base directory for screenshots
 * @returns The full file path
 */
export function getScreenshotPath(
  sessionId: string,
  filename: string,
  baseDir: string = 'data/screenshots'
): string {
  return path.join(baseDir, sessionId, filename);
}
