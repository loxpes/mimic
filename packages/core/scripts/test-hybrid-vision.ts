/**
 * Test script for the hybrid DOM + Vision system
 *
 * Usage:
 *   cd packages/core && npx tsx scripts/test-hybrid-vision.ts
 */

import type { UnifiedElement } from '@testfarm/shared';
import { mergeElements, pageElementToUnified } from '../src/vision/merge-elements.js';
import { findElement, findAllElements } from '../src/vision/find-element.js';

// ============================================================================
// Mock Data
// ============================================================================

// Simulated DOM elements (from read_page)
const mockDomElements: UnifiedElement[] = [
  {
    id: 'dom_1',
    name: 'Email',
    type: 'input',
    x: 400,
    y: 200,
    width: 300,
    height: 40,
    source: 'dom',
    selector: 'input[type="email"]',
    role: 'textbox',
  },
  {
    id: 'dom_2',
    name: 'Password',
    type: 'input',
    x: 400,
    y: 260,
    width: 300,
    height: 40,
    source: 'dom',
    selector: 'input[type="password"]',
    role: 'textbox',
  },
  {
    id: 'dom_3',
    name: '', // Icon button without text in DOM
    type: 'button',
    x: 720,
    y: 200,
    width: 40,
    height: 40,
    source: 'dom',
    selector: 'button.send-btn',
    role: 'button',
  },
  {
    id: 'dom_4',
    name: 'Submit',
    type: 'button',
    x: 400,
    y: 320,
    width: 300,
    height: 48,
    source: 'dom',
    selector: 'button[type="submit"]',
    role: 'button',
  },
];

// Simulated Vision elements (from Haiku analysis)
const mockVisionElements: UnifiedElement[] = [
  {
    id: 'vis_1',
    name: 'Email field',
    type: 'input',
    x: 402,
    y: 198, // Slightly offset, should merge
    width: 298,
    height: 42,
    source: 'vision',
  },
  {
    id: 'vis_2',
    name: 'Send icon', // Vision identified the icon button!
    type: 'button',
    x: 718,
    y: 202,
    width: 42,
    height: 42,
    source: 'vision',
  },
  {
    id: 'vis_3',
    name: 'Login button',
    type: 'button',
    x: 398,
    y: 322,
    width: 302,
    height: 50,
    source: 'vision',
  },
  {
    id: 'vis_4',
    name: 'Profile menu', // Vision-only element (not in DOM)
    type: 'button',
    x: 1200,
    y: 50,
    width: 48,
    height: 48,
    source: 'vision',
  },
];

// ============================================================================
// Test Functions
// ============================================================================

function testMerge() {
  console.log('\n=== Test: Element Merge ===\n');

  const result = mergeElements(mockDomElements, mockVisionElements, {
    threshold: 30,
    preferVisionNames: true,
  });

  console.log(`DOM elements: ${mockDomElements.length}`);
  console.log(`Vision elements: ${mockVisionElements.length}`);
  console.log(`\nMerge stats:`);
  console.log(`  - DOM only: ${result.stats.domOnly}`);
  console.log(`  - Vision only: ${result.stats.visionOnly}`);
  console.log(`  - Merged (both): ${result.stats.merged}`);
  console.log(`  - Total: ${result.stats.total}`);

  console.log('\nMerged elements:');
  for (const el of result.elements) {
    const sourceIcon = el.source === 'both' ? '🔀' : el.source === 'dom' ? '📄' : '👁️';
    console.log(`  ${sourceIcon} ${el.id}: "${el.name}" (${el.type}) at (${el.x}, ${el.y})`);
    if (el.selector) {
      console.log(`      selector: ${el.selector}`);
    }
  }

  return result.elements;
}

function testFind(elements: UnifiedElement[]) {
  console.log('\n=== Test: Element Find ===\n');

  const queries = [
    'send button',
    'email field',
    'login',
    'profile menu',
    'el_3', // By ID
    'password',
    'nonexistent',
  ];

  for (const query of queries) {
    const result = findElement(elements, query);
    if (result.element) {
      console.log(`✅ "${query}" -> ${result.element.id}: "${result.element.name}" (${result.confidence})`);
    } else {
      console.log(`❌ "${query}" -> not found`);
    }
  }
}

function testFindAll(elements: UnifiedElement[]) {
  console.log('\n=== Test: Find All Elements ===\n');

  const query = 'button';
  const results = findAllElements(elements, query, { type: 'button' });

  console.log(`Query: "${query}" (type: button)`);
  console.log(`Found ${results.length} elements:`);
  for (const el of results) {
    console.log(`  - ${el.id}: "${el.name}"`);
  }
}

// ============================================================================
// Run Tests
// ============================================================================

console.log('🧪 Hybrid Vision System Tests');
console.log('=============================');

const mergedElements = testMerge();
testFind(mergedElements);
testFindAll(mergedElements);

console.log('\n✅ All tests completed!\n');
