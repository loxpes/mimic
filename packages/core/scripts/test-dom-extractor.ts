/**
 * Test script v3 - Test the actual extractDOM function
 * Run with: npx tsx test-dom-extractor-v3.ts
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the actual extractDOM function
import { extractDOM } from './dist/vision/index.js';

async function testDOMExtraction() {
  console.log('Starting DOM extraction test v3 - Testing actual extractDOM function...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const htmlPath = path.resolve(__dirname, '../../data/htlm_ejemplo.html');
  console.log(`Loading HTML from: ${htmlPath}`);

  await page.goto(`file://${htmlPath}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  console.log('\n=== Calling extractDOM() ===\n');

  try {
    const dom = await extractDOM(page);

    console.log('Metadata:');
    console.log(`  Title: ${dom.metadata.title}`);
    console.log(`  URL: ${dom.metadata.url}`);
    console.log(`  Elements count: ${dom.elements.length}`);

    console.log('\n=== All Extracted Elements ===\n');

    dom.elements.forEach((el, i) => {
      console.log(`${el.id}: [${el.type}] "${el.text}"`);
      console.log(`     Selector: ${el.selector}`);
      console.log(`     State: visible=${el.state.visible}, enabled=${el.state.enabled}`);
      console.log('');
    });

    // Group by type
    console.log('\n=== Summary by Type ===\n');
    const byType: Record<string, number> = {};
    dom.elements.forEach(el => {
      byType[el.type] = (byType[el.type] || 0) + 1;
    });
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Verify expected elements are present
    console.log('\n=== Verification: Expected Elements ===\n');

    const expectedElements = [
      { name: 'Textarea (¿En qué puedo ayudarte?)', match: (el: any) => el.type === 'textarea' || el.text.includes('En qué puedo') },
      { name: 'Tareas button/card', match: (el: any) => el.text.toLowerCase().includes('tareas') },
      { name: 'Buscar información card', match: (el: any) => el.text.toLowerCase().includes('buscar') },
      { name: 'Proyectos card', match: (el: any) => el.text.toLowerCase().includes('proyecto') },
      { name: 'Gemini dropdown', match: (el: any) => el.text.toLowerCase().includes('gemini') },
      { name: 'E-commerce dropdown', match: (el: any) => el.text.toLowerCase().includes('commerce') || el.text.toLowerCase().includes('techstore') },
      { name: 'Avatar (J)', match: (el: any) => el.text === 'J' },
    ];

    for (const expected of expectedElements) {
      const found = dom.elements.find(expected.match);
      if (found) {
        console.log(`✓ ${expected.name}`);
        console.log(`   Found: ${found.id} [${found.type}] "${found.text.slice(0, 40)}"`);
      } else {
        console.log(`✗ ${expected.name} - NOT FOUND`);
      }
    }

    // Test that we can interact with extracted elements
    console.log('\n=== Testing Selector Validity ===\n');

    let validSelectors = 0;
    let invalidSelectors = 0;

    for (const el of dom.elements) {
      try {
        const count = await page.locator(el.selector).count();
        if (count > 0) {
          validSelectors++;
        } else {
          invalidSelectors++;
          console.log(`Invalid selector (no match): ${el.id} "${el.text.slice(0, 30)}" - ${el.selector}`);
        }
      } catch (e: any) {
        invalidSelectors++;
        console.log(`Invalid selector (error): ${el.id} "${el.text.slice(0, 30)}" - ${e.message.slice(0, 50)}`);
      }
    }

    console.log(`\nSelector validity: ${validSelectors} valid, ${invalidSelectors} invalid`);

  } catch (error) {
    console.error('Error running extractDOM:', error);
  }

  await browser.close();
  console.log('\n=== Test Complete ===\n');
}

testDOMExtraction().catch(console.error);
