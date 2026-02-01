/**
 * Crypto utilities for secure API key storage
 * Uses AES-256-GCM for encryption
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Get the encryption key from environment
 * @throws Error if ENCRYPTION_KEY is not configured
 */
function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string using AES-256-GCM
 * @param text Plain text to encrypt
 * @returns Base64 encoded encrypted string (iv + auth tag + ciphertext)
 */
export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: [16 bytes IV][16 bytes auth tag][ciphertext]
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a string encrypted with encrypt()
 * @param encryptedBase64 Base64 encoded encrypted string
 * @returns Decrypted plain text
 */
export function decrypt(encryptedBase64: string): string {
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * Check if encryption is configured
 * @returns true if ENCRYPTION_KEY is set in environment
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  return !!key && key.length === 64;
}
