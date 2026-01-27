/**
 * Test script for read_page with CDP
 * Usage: cd packages/core && npx tsx scripts/test-read-page.ts
 */

import { chromium } from 'playwright';
import { readPage, formatElementsForLLM } from '../src/vision/read-page.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const testFilePath = path.resolve(__dirname, '../../../data/test-read-page.html');
  const fileUrl = `file://${testFilePath}`;

  console.log('Testing read_page with CDP...');
  console.log('File:', fileUrl);
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    console.log('Page loaded');
    console.log('');

    // Test read_page with interactive filter
    const result = await readPage(page, { filter: 'interactive' });

    console.log('=== READ PAGE RESULT ===');
    console.log(`Total AX nodes: ${result.totalNodes}`);
    console.log(`Interactive elements: ${result.elements.length}`);
    console.log(`Viewport: ${result.viewport.width}x${result.viewport.height}`);
    console.log('');

    // Print elements in detail
    console.log('=== ELEMENTS (JSON) ===');
    for (const el of result.elements) {
      console.log(JSON.stringify(el, null, 2));
      console.log('---');
    }
    console.log('');

    // Print formatted for LLM
    console.log('=== FORMATTED FOR LLM ===');
    console.log(formatElementsForLLM(result));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
