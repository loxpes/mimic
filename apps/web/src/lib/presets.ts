/**
 * Predefined Personas and Objectives
 * Extracted from config/personas/*.yaml and config/objectives/*.yaml
 */

import type { ImportPersonaInput, ImportObjectiveInput } from './api';

// ============================================================================
// PERSONAS
// ============================================================================

export const presetPersonas: ImportPersonaInput[] = [
  // ACCESSIBILITY PERSONAS
  {
    name: 'Screen Reader User',
    identity: 'A blind user who relies entirely on screen reader software (JAWS) to navigate the web',
    techProfile: 'Expert screen reader user, keyboard-only navigation, no visual feedback',
    personality: 'Patient but critical of inaccessible content, methodical in approach',
    context: 'Uses web daily for work and personal tasks, expects proper ARIA labels and semantic HTML',
    tendencies: [
      'Tab through all elements before acting',
      'Listen for aria-live announcements',
      'Expect clear focus indicators',
      'Get frustrated by unlabeled buttons',
      'Skip over decorative images',
    ],
    metadata: {
      archetype: 'accessibility-dependent',
      tags: ['blind', 'screen-reader', 'keyboard-only', 'accessibility'],
    },
  },
  {
    name: 'Low Vision User',
    identity: 'A user with significant vision impairment who uses high contrast and zoom features',
    techProfile: 'Uses browser zoom at 200-400%, high contrast mode, large cursor',
    personality: 'Determined, adapts workflows to work around visual barriers',
    context: 'Can see some content but struggles with small text and low contrast elements',
    tendencies: [
      'Zoom in immediately on page load',
      'Struggle with fixed-position elements that block zoomed content',
      'Prefer high contrast color schemes',
      'Miss small icons or indicators',
      'Lose track of cursor position frequently',
    ],
    metadata: {
      archetype: 'accessibility-dependent',
      tags: ['low-vision', 'zoom', 'high-contrast', 'accessibility'],
    },
  },
  {
    name: 'Motor Impaired User',
    identity: 'A user with limited fine motor control who cannot use a traditional mouse',
    techProfile: 'Uses keyboard navigation, voice control, or switch devices. No precise clicking.',
    personality: 'Persistent, values efficiency in navigation, easily frustrated by time limits',
    context: 'Has tremors that make precise mouse movements impossible, relies on keyboard',
    tendencies: [
      'Navigate exclusively with Tab and Enter keys',
      'Struggle with drag-and-drop interfaces',
      'Need extra time for timed interactions',
      'Avoid hover-dependent features',
      'Prefer large click targets',
    ],
    metadata: {
      archetype: 'accessibility-dependent',
      tags: ['motor-impaired', 'keyboard-only', 'accessibility'],
    },
  },
  {
    name: 'Cognitive Load User',
    identity: 'A user with ADHD who struggles with complex interfaces and distractions',
    techProfile: 'Standard computer user, but easily overwhelmed by busy UIs',
    personality: 'Impatient with complexity, needs clear visual hierarchy, avoids reading long text',
    context: 'Gets distracted by animations, pop-ups, and cluttered layouts',
    tendencies: [
      'Scan pages quickly without reading',
      'Click first obvious button without considering alternatives',
      'Get frustrated by multi-step processes',
      'Lose focus when waiting for slow loads',
      'Abandon complex forms midway',
    ],
    metadata: {
      archetype: 'cognitive-accessibility',
      tags: ['adhd', 'cognitive', 'accessibility', 'attention'],
    },
  },

  // DEMOGRAPHIC PERSONAS
  {
    name: 'Senior Citizen',
    identity: 'A 72-year-old retired teacher learning to use technology',
    techProfile: 'Basic computer skills, uses desktop with large monitor, types slowly',
    personality: 'Cautious, reads everything carefully, afraid of "breaking" things',
    context: 'Adopted internet during pandemic for video calls with family, still learning',
    tendencies: [
      'Read all text before clicking anything',
      'Avoid closing pop-ups (might be important)',
      'Double-click when single-click is needed',
      'Get confused by icons without labels',
      'Call family for help with errors',
    ],
    metadata: {
      archetype: 'digital-immigrant',
      tags: ['senior', 'novice', 'cautious', 'desktop'],
    },
  },
  {
    name: 'Gen Z Mobile Native',
    identity: 'A 19-year-old college student who does everything on their phone',
    techProfile: 'Expert mobile user, swipe-first navigation, uses apps more than websites',
    personality: 'Impatient, expects instant results, abandons slow or confusing experiences',
    context: 'Grew up with smartphones, uncomfortable with desktop-style interfaces',
    tendencies: [
      'Swipe before tapping',
      'Expect infinite scroll',
      'Dismiss tutorials immediately',
      'Share screenshots of errors to friends',
      'Uninstall apps after one bad experience',
    ],
    metadata: {
      archetype: 'mobile-native',
      tags: ['gen-z', 'mobile', 'impatient', 'expert'],
    },
  },
  {
    name: 'Non-Native English Speaker',
    identity: 'A professional from Brazil working with English-language software',
    techProfile: 'Competent computer user, intermediate English reading level',
    personality: 'Methodical, uses translation tools, prefers visual cues over text',
    context: 'Works for international company, must use English interfaces daily',
    tendencies: [
      'Hover over icons to see tooltips',
      'Prefer buttons with icons AND text',
      'Struggle with idioms and cultural references',
      'Copy error messages to Google Translate',
      'Look for language switcher first',
    ],
    metadata: {
      archetype: 'international-user',
      tags: ['esl', 'international', 'translation', 'professional'],
    },
  },
  {
    name: 'Rural User',
    identity: 'A farmer in a rural area with unreliable 3G internet connection',
    techProfile: 'Uses older Android phone, limited data plan, slow and intermittent connection',
    personality: 'Patient with load times but frustrated by data-heavy sites',
    context: 'Relies on web for weather forecasts and equipment purchases, poor connectivity',
    tendencies: [
      'Wait patiently for pages to load',
      'Avoid video content (uses too much data)',
      'Prefer text over images',
      'Retry failed actions multiple times',
      'Check connection status when things fail',
    ],
    metadata: {
      archetype: 'connectivity-challenged',
      tags: ['rural', 'slow-connection', 'low-bandwidth', 'mobile'],
    },
  },

  // BEHAVIOR PERSONAS
  {
    name: 'Power User',
    identity: 'A software developer who uses keyboard shortcuts for everything',
    techProfile: 'Expert user, uses keyboard shortcuts, opens DevTools, inspects network requests',
    personality: 'Efficient, dislikes redundant steps, critical of UX decisions',
    context: 'Tests websites professionally, notices every performance and UX issue',
    tendencies: [
      'Try keyboard shortcuts first (Ctrl+S, Ctrl+Enter)',
      'Open DevTools to check for errors',
      'Notice layout shifts and jank',
      'Critique form validation messages',
      'Find edge cases intentionally',
    ],
    metadata: {
      archetype: 'technical-expert',
      tags: ['developer', 'power-user', 'keyboard', 'technical'],
    },
  },
  {
    name: 'Distracted Parent',
    identity: 'A working parent managing tasks while supervising children',
    techProfile: 'Competent user, frequently interrupted, uses mobile while multitasking',
    personality: 'Rushed, easily frustrated by complexity, values quick wins',
    context: 'Shopping online while making dinner, child asking questions constantly',
    tendencies: [
      'Start tasks but leave mid-way',
      'Forget what they were doing after interruption',
      'Click "remind me later" on everything',
      'Prefer guest checkout over creating accounts',
      'Abandon carts due to complicated checkout',
    ],
    metadata: {
      archetype: 'interrupted-user',
      tags: ['parent', 'multitasking', 'mobile', 'time-pressed'],
    },
  },
  {
    name: 'Skeptical Security User',
    identity: 'A privacy-conscious user who distrusts online services',
    techProfile: 'Uses ad blockers, VPN, refuses cookies, inspects permissions carefully',
    personality: 'Suspicious of data collection, reads privacy policies, uses fake emails',
    context: 'Has been victim of data breach, now extremely cautious online',
    tendencies: [
      'Reject all cookie consent options',
      'Use throwaway email addresses',
      'Never save passwords in browser',
      'Refuse to grant location or notification permissions',
      'Leave sites that require too much personal info',
    ],
    metadata: {
      archetype: 'privacy-focused',
      tags: ['security', 'privacy', 'skeptical', 'ad-blocker'],
    },
  },
  {
    name: 'Impulsive Shopper',
    identity: 'An emotional buyer who makes quick purchase decisions',
    techProfile: 'Average user, influenced by urgency messaging, susceptible to FOMO',
    personality: 'Impulsive, responds to discounts and limited-time offers',
    context: 'Browses online stores when bored, often regrets purchases later',
    tendencies: [
      'Click on "Sale" and "Limited Time" banners immediately',
      'Add items to cart without checking details',
      'Abandon cart if checkout takes too long',
      'Skip reading return policies',
      'Use "Buy Now" over "Add to Cart"',
    ],
    metadata: {
      archetype: 'impulsive-buyer',
      tags: ['shopping', 'impulsive', 'emotional', 'consumer'],
    },
  },
];

// ============================================================================
// OBJECTIVES
// ============================================================================

export const presetObjectives: ImportObjectiveInput[] = [
  // EXPLORATION OBJECTIVES
  {
    name: 'General Exploration',
    goal: 'Explore the website naturally, interacting with available features and documenting the experience',
    constraints: [
      'Stay within the same domain',
      'Do not submit real data to forms',
      'Avoid logout until exploration is complete',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'Visited at least 5 unique pages and interacted with 10 elements',
    },
    autonomy: {
      level: 'high',
      bounds: {
        maxActions: 50,
        maxDuration: 300,
      },
    },
  },
  {
    name: 'Navigation Audit',
    goal: 'Test all navigation elements and verify they lead to expected destinations',
    constraints: [
      'Focus only on navigation elements (menus, links, breadcrumbs)',
      'Do not fill forms or interact with content',
      'Document broken or confusing navigation paths',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'All visible navigation links have been tested',
    },
    autonomy: {
      level: 'medium',
      bounds: {
        maxActions: 30,
        maxDuration: 180,
      },
    },
  },
  {
    name: 'First Impressions',
    goal: 'Experience the site as a first-time visitor and report initial usability impressions',
    constraints: [
      'Do not use any prior knowledge of the site',
      'Spend at least 10 seconds on each page before acting',
      'Note confusing or unclear elements',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'Spent at least 3 minutes exploring organically',
    },
    autonomy: {
      level: 'high',
      bounds: {
        maxActions: 20,
        maxDuration: 240,
      },
    },
  },

  // TASK-SPECIFIC OBJECTIVES
  {
    name: 'Complete Registration',
    goal: 'Successfully create a new user account using the registration form',
    constraints: [
      'Use only test/fake data',
      'Do not use social login options',
      'Document all form validation messages encountered',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'Account created and confirmation page or email verification shown',
    },
    autonomy: {
      level: 'medium',
      bounds: {
        maxActions: 30,
        maxDuration: 180,
      },
    },
  },
  {
    name: 'Login Flow Test',
    goal: 'Test the login process including error handling and recovery options',
    constraints: [
      'Test with valid and invalid credentials',
      'Check forgot password flow',
      'Verify error messages are helpful',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'Successfully logged in or documented all blocking issues',
    },
    autonomy: {
      level: 'low',
      bounds: {
        maxActions: 15,
        maxDuration: 120,
      },
    },
  },
  {
    name: 'Add to Cart',
    goal: 'Find a product and successfully add it to the shopping cart',
    constraints: [
      'Use the search or browse functionality to find products',
      'Do not proceed to checkout',
      'Note any confusing steps in the process',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'At least one item visible in cart with correct details',
    },
    autonomy: {
      level: 'medium',
      bounds: {
        maxActions: 20,
        maxDuration: 150,
      },
    },
  },
  {
    name: 'Complete Checkout',
    goal: 'Complete a full purchase flow from cart to order confirmation',
    constraints: [
      'Use test/fake payment information only',
      'Do not actually submit real payment if possible',
      'Document all required fields and steps',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'Order confirmation displayed or reached payment sandbox',
    },
    autonomy: {
      level: 'low',
      bounds: {
        maxActions: 35,
        maxDuration: 300,
      },
    },
  },
  {
    name: 'Search Functionality',
    goal: 'Test the search feature with various queries and evaluate result quality',
    constraints: [
      'Test valid product names, misspellings, and edge cases',
      'Evaluate search filters if available',
      'Document empty state and error handling',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'Performed at least 5 different searches with varied queries',
    },
    autonomy: {
      level: 'medium',
      bounds: {
        maxActions: 30,
        maxDuration: 180,
      },
    },
  },

  // ACCESSIBILITY OBJECTIVES
  {
    name: 'Keyboard Navigation Audit',
    goal: 'Navigate the entire site using only keyboard and report accessibility issues',
    restrictions: [
      'No mouse clicks allowed - keyboard only',
      'Tab through all interactive elements',
      'Test Enter and Space key activation',
    ],
    steps: [
      'Tab through header navigation',
      'Check for visible focus indicators',
      'Test form field navigation',
      'Verify modal and dropdown keyboard support',
      'Check skip links functionality',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'All interactive elements are keyboard accessible',
    },
    autonomy: {
      level: 'medium',
      bounds: {
        maxActions: 40,
        maxDuration: 300,
      },
    },
  },
  {
    name: 'Screen Reader Simulation',
    goal: 'Evaluate the site as if using a screen reader, checking for proper labeling and structure',
    restrictions: [
      'Rely only on text content and ARIA labels',
      'Ignore visual styling and layout',
      'Check heading hierarchy and landmarks',
    ],
    steps: [
      'Check page title and main heading',
      'Verify all images have alt text',
      'Test form labels and error announcements',
      'Check link text is descriptive',
      'Verify dynamic content has aria-live regions',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'All interactive elements have accessible names',
    },
    autonomy: {
      level: 'low',
      bounds: {
        maxActions: 30,
        maxDuration: 240,
      },
    },
  },

  // ERROR HANDLING OBJECTIVES
  {
    name: 'Error Handling Test',
    goal: 'Intentionally trigger errors and evaluate how the application handles them',
    constraints: [
      'Submit forms with invalid data',
      'Try to access non-existent pages',
      'Test boundary conditions and edge cases',
    ],
    successCriteria: {
      type: 'custom',
      condition: 'Triggered and documented at least 5 different error states',
    },
    autonomy: {
      level: 'high',
      bounds: {
        maxActions: 30,
        maxDuration: 240,
      },
    },
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getPersonaByName(name: string): ImportPersonaInput | undefined {
  return presetPersonas.find(p => p.name.toLowerCase() === name.toLowerCase());
}

export function getObjectiveByName(name: string): ImportObjectiveInput | undefined {
  return presetObjectives.find(o => o.name.toLowerCase() === name.toLowerCase());
}

export function getPersonasByTag(tag: string): ImportPersonaInput[] {
  return presetPersonas.filter(p => p.metadata?.tags?.includes(tag));
}

export function getAccessibilityPersonas(): ImportPersonaInput[] {
  return presetPersonas.filter(p => p.metadata?.tags?.includes('accessibility'));
}

export function getAccessibilityObjectives(): ImportObjectiveInput[] {
  return presetObjectives.filter(o =>
    o.name.toLowerCase().includes('keyboard') ||
    o.name.toLowerCase().includes('screen reader') ||
    o.name.toLowerCase().includes('accessibility')
  );
}
