/**
 * Browser Controller - Playwright wrapper for agent actions
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import type { AgentAction, PageElement, UnifiedElement } from '@testfarm/shared';

// ============================================================================
// Types
// ============================================================================

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export interface BrowserOptions {
  browserType?: BrowserType;
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  locale?: string;
  timezone?: string;
  geolocation?: { latitude: number; longitude: number };
}

export interface ActionResult {
  success: boolean;
  error?: string;
  duration: number;
}

// ============================================================================
// Browser Controller Class
// ============================================================================

export interface ConsoleLogEntry {
  level: string;
  message: string;
  timestamp: number;
}

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: BrowserOptions;
  /** Map of refs to PageElements from read_page */
  private refMap: Map<string, PageElement> = new Map();
  /** Captured console logs */
  private consoleLogs: ConsoleLogEntry[] = [];

  constructor(options: BrowserOptions = {}) {
    this.options = {
      browserType: 'chromium',
      headless: true,
      viewport: { width: 1280, height: 720 },
      ...options,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async launch(): Promise<void> {
    const browserLauncher =
      this.options.browserType === 'firefox' ? firefox :
        this.options.browserType === 'webkit' ? webkit :
          chromium;

    // Use system Chromium if PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is set
    const executablePath = this.options.browserType === 'chromium'
      ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      : undefined;

    this.browser = await browserLauncher.launch({
      headless: this.options.headless,
      executablePath,
      args: executablePath ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
    });

    this.context = await this.browser.newContext({
      viewport: this.options.viewport,
      userAgent: this.options.userAgent,
      locale: this.options.locale,
      timezoneId: this.options.timezone,
      geolocation: this.options.geolocation,
      permissions: this.options.geolocation ? ['geolocation'] : [],
    });

    this.page = await this.context.newPage();

    // Capture console logs
    this.page.on('console', (msg) => {
      this.consoleLogs.push({
        level: msg.type(),
        message: msg.text(),
        timestamp: Date.now(),
      });
      // Limit to last 100 logs to prevent memory issues
      if (this.consoleLogs.length > 100) {
        this.consoleLogs.shift();
      }
    });

    // Capture page errors as console logs
    this.page.on('pageerror', (error) => {
      this.consoleLogs.push({
        level: 'error',
        message: error.message,
        timestamp: Date.now(),
      });
    });
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.page = null;
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.page;
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async navigate(url: string): Promise<ActionResult> {
    const start = Date.now();
    try {
      await this.getPage().goto(url, { waitUntil: 'networkidle' });
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
        duration: Date.now() - start,
      };
    }
  }

  async goBack(): Promise<ActionResult> {
    const start = Date.now();
    try {
      await this.getPage().goBack({ waitUntil: 'networkidle' });
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Go back failed',
        duration: Date.now() - start,
      };
    }
  }

  // ============================================================================
  // Actions
  // ============================================================================

  async click(selector: string): Promise<ActionResult> {
    const start = Date.now();
    try {
      let locator = this.getLocator(selector);
      // First try normal click
      try {
        await locator.click({ timeout: 5000 });
      } catch (clickError) {
        const errorMessage = clickError instanceof Error ? clickError.message : '';

        // If strict mode violation (duplicate IDs), use first match
        if (errorMessage.includes('strict mode violation') ||
          errorMessage.includes('resolved to') && errorMessage.includes('elements')) {
          console.log('[BrowserController] Strict mode violation - using first match');
          locator = locator.first();
          await locator.click({ timeout: 5000 });
        }
        // If click fails due to element interception (common in React Native Web),
        // retry with force option which bypasses actionability checks
        else if (errorMessage.includes('intercepts pointer events') ||
          errorMessage.includes('element is not visible')) {
          console.log('[BrowserController] Retrying click with force due to interception');
          await locator.click({ timeout: 5000, force: true });
        } else {
          throw clickError;
        }
      }
      // Wait for potential navigation or UI update safely
      await this.getPage().waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { });
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Click failed',
        duration: Date.now() - start,
      };
    }
  }

  async type(selector: string, text: string): Promise<ActionResult> {
    const start = Date.now();
    try {
      const locator = this.getLocator(selector);
      await locator.fill(text, { timeout: 5000 });
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Type failed',
        duration: Date.now() - start,
      };
    }
  }

  async hover(selector: string): Promise<ActionResult> {
    const start = Date.now();
    try {
      const locator = this.getLocator(selector);
      await locator.hover({ timeout: 5000 });
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Hover failed',
        duration: Date.now() - start,
      };
    }
  }

  async select(selector: string, value: string): Promise<ActionResult> {
    const start = Date.now();
    try {
      await this.getPage().selectOption(selector, value, { timeout: 5000 });
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Select failed',
        duration: Date.now() - start,
      };
    }
  }

  async scroll(direction: 'up' | 'down', amount: number = 500): Promise<ActionResult> {
    const start = Date.now();
    try {
      const delta = direction === 'down' ? amount : -amount;
      await this.getPage().mouse.wheel(0, delta);
      // Small delay to let content load
      await this.getPage().waitForTimeout(200);
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scroll failed',
        duration: Date.now() - start,
      };
    }
  }

  async wait(duration: number): Promise<ActionResult> {
    const start = Date.now();
    try {
      await this.getPage().waitForTimeout(duration);
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Wait failed',
        duration: Date.now() - start,
      };
    }
  }

  // ============================================================================
  // Ref-based Actions (from read_page)
  // ============================================================================

  /**
   * Register elements from read_page result
   */
  registerElements(elements: PageElement[]): void {
    this.refMap.clear();
    for (const el of elements) {
      this.refMap.set(el.ref, el);
    }
  }

  /**
   * Get a registered element by ref
   */
  getElementByRef(ref: string): PageElement | undefined {
    return this.refMap.get(ref);
  }

  /**
   * Click by ref (uses center coordinates from read_page)
   */
  async clickByRef(ref: string): Promise<ActionResult> {
    const start = Date.now();
    const element = this.refMap.get(ref);

    if (!element) {
      return {
        success: false,
        error: `Ref ${ref} not found. Call registerElements first.`,
        duration: Date.now() - start,
      };
    }

    try {
      const { centerX, centerY } = element.bbox;
      await this.getPage().mouse.click(centerX, centerY);
      // Wait for potential navigation or UI update
      await this.getPage().waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { });
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Click by ref failed',
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Click by coordinate [x, y]
   */
  async clickByCoordinate(x: number, y: number): Promise<ActionResult> {
    const start = Date.now();
    try {
      await this.getPage().mouse.click(x, y);
      // Wait for potential navigation or UI update
      await this.getPage().waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { });
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Click by coordinate failed',
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Form input by ref - click to focus then type
   */
  async formInputByRef(ref: string, value: string): Promise<ActionResult> {
    const start = Date.now();
    const element = this.refMap.get(ref);

    if (!element) {
      return {
        success: false,
        error: `Ref ${ref} not found. Call registerElements first.`,
        duration: Date.now() - start,
      };
    }

    try {
      const { centerX, centerY } = element.bbox;
      // Triple-click to select all existing text, then type to replace
      await this.getPage().mouse.click(centerX, centerY, { clickCount: 3 });
      await this.getPage().keyboard.type(value);
      await this.getPage().waitForLoadState('networkidle', { timeout: 2000 }).catch(() => { });
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Form input by ref failed',
        duration: Date.now() - start,
      };
    }
  }

  // ============================================================================
  // Selector Support
  // ============================================================================

  /**
   * Get a Playwright locator for various selector formats:
   * - role=button[name="Click me"] -> getByRole
   * - text="Click me" -> getByText
   * - #id or CSS selector -> locator()
   */
  private getLocator(selector: string) {
    // Role-based selector: role=button[name="Click me"]
    if (selector.startsWith('role=')) {
      const match = selector.match(/^role=(\w+)\[name="(.*)"\]$/);
      if (!match) {
        throw new Error(`Invalid role selector format: ${selector}`);
      }
      const [, role, name] = match;
      const unescapedName = name.replace(/\\"/g, '"');
      return this.getPage().getByRole(role as any, { name: unescapedName });
    }

    // Text-based selector: text="Crear cuenta"
    if (selector.startsWith('text=')) {
      const match = selector.match(/^text="(.*)"$/);
      if (!match) {
        throw new Error(`Invalid text selector format: ${selector}`);
      }
      const [, text] = match;
      const unescapedText = text.replace(/\\"/g, '"');
      return this.getPage().getByText(unescapedText, { exact: true });
    }

    // CSS selector (default)
    return this.getPage().locator(selector);
  }

  // ============================================================================
  // Screenshot
  // ============================================================================

  async takeScreenshot(): Promise<string> {
    const buffer = await this.getPage().screenshot({ type: 'jpeg', quality: 80 });
    return buffer.toString('base64');
  }

  // ============================================================================
  // Execute Action
  // ============================================================================

  async executeAction(action: AgentAction, elements: Map<string, string>): Promise<ActionResult> {
    switch (action.type) {
      case 'click': {
        if (!action.target) {
          return { success: false, error: 'No target specified for click', duration: 0 };
        }

        // Priority 1: Use coordinates if provided (most reliable for visual elements)
        if (action.target.coordinates) {
          const { x, y } = action.target.coordinates;
          console.log(`[BrowserController] Click by coordinates: (${x}, ${y}) - "${action.target.description}"`);
          return this.clickByCoordinate(x, y);
        }

        // Priority 2: Use elementId with selector map
        if (action.target.elementId) {
          const selector = elements.get(action.target.elementId);
          if (selector) {
            console.log(`[BrowserController] Click by selector: ${selector} - "${action.target.description}"`);
            return this.click(selector);
          }
          // Element ID not found in map, but maybe it has coordinates from unified elements
          console.warn(`[BrowserController] Element ${action.target.elementId} not found in selector map`);
          return { success: false, error: `Element ${action.target.elementId} not found`, duration: 0 };
        }

        return { success: false, error: 'No elementId or coordinates specified for click', duration: 0 };
      }

      case 'type': {
        if (!action.target) {
          return { success: false, error: 'No target specified for type', duration: 0 };
        }
        if (!action.value) {
          return { success: false, error: 'No value specified for type', duration: 0 };
        }

        // Priority 1: Use coordinates if provided
        if (action.target.coordinates) {
          const { x, y } = action.target.coordinates;
          console.log(`[BrowserController] Type by coordinates: (${x}, ${y})`);
          try {
            await this.getPage().mouse.click(x, y, { clickCount: 3 }); // Triple click to select all
            await this.getPage().keyboard.type(action.value);
            return { success: true, duration: 0 };
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Type failed', duration: 0 };
          }
        }

        // Priority 2: Use elementId with selector map
        if (action.target.elementId) {
          const selector = elements.get(action.target.elementId);
          if (!selector) {
            return { success: false, error: `Element ${action.target.elementId} not found`, duration: 0 };
          }
          return this.type(selector, action.value);
        }

        return { success: false, error: 'No elementId or coordinates specified for type', duration: 0 };
      }

      case 'hover': {
        if (!action.target) {
          return { success: false, error: 'No target specified for hover', duration: 0 };
        }

        // Priority 1: Use coordinates
        if (action.target.coordinates) {
          const { x, y } = action.target.coordinates;
          try {
            await this.getPage().mouse.move(x, y);
            return { success: true, duration: 0 };
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Hover failed', duration: 0 };
          }
        }

        // Priority 2: Use elementId
        if (action.target.elementId) {
          const selector = elements.get(action.target.elementId);
          if (!selector) {
            return { success: false, error: `Element ${action.target.elementId} not found`, duration: 0 };
          }
          return this.hover(selector);
        }

        return { success: false, error: 'No elementId or coordinates specified for hover', duration: 0 };
      }

      case 'select': {
        if (!action.target) {
          return { success: false, error: 'No target specified for select', duration: 0 };
        }
        if (!action.value) {
          return { success: false, error: 'No value specified for select', duration: 0 };
        }
        if (!action.target.elementId) {
          return { success: false, error: 'Select requires elementId (coordinates not supported)', duration: 0 };
        }
        const selector = elements.get(action.target.elementId);
        if (!selector) {
          return { success: false, error: `Element ${action.target.elementId} not found`, duration: 0 };
        }
        return this.select(selector, action.value);
      }

      case 'scroll':
        return this.scroll(action.direction || 'down');

      case 'wait':
        return this.wait(action.duration || 1000);

      case 'navigate':
        if (!action.value) {
          return { success: false, error: 'No URL specified for navigate', duration: 0 };
        }
        return this.navigate(action.value);

      case 'back':
        return this.goBack();

      case 'fillForm': {
        if (!action.fields || action.fields.length === 0) {
          return { success: false, error: 'No fields specified for fillForm', duration: 0 };
        }
        return this.fillForm(action.fields, elements);
      }

      case 'abandon':
        // Abandon is a meta-action, just return success
        return { success: true, duration: 0 };

      default:
        return { success: false, error: `Unknown action type: ${action.type}`, duration: 0 };
    }
  }

  // ============================================================================
  // Fill Form (Batch)
  // ============================================================================

  async fillForm(
    fields: Array<{ elementId: string; value: string }>,
    elements: Map<string, string>
  ): Promise<ActionResult> {
    const start = Date.now();
    const errors: string[] = [];

    for (const field of fields) {
      const selector = elements.get(field.elementId);
      if (!selector) {
        errors.push(`${field.elementId}: not found`);
        continue;
      }
      try {
        const locator = this.getLocator(selector);
        await locator.fill(field.value, { timeout: 5000 });
      } catch (error) {
        errors.push(`${field.elementId}: ${error instanceof Error ? error.message : 'failed'}`);
      }
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      duration: Date.now() - start,
    };
  }

  // ============================================================================
  // Unified Element Actions
  // ============================================================================

  /**
   * Execute an action using the unified element system
   * Supports both elementId lookup and natural language query
   */
  async executeUnifiedAction(
    action: {
      type: string;
      elementId?: string;
      query?: string;
      value?: string;
      direction?: 'up' | 'down';
      duration?: number;
    },
    elements: UnifiedElement[],
    findElement?: (elements: UnifiedElement[], query: string) => { element: UnifiedElement | null }
  ): Promise<ActionResult> {
    const start = Date.now();

    // Handle non-targeted actions first
    if (action.type === 'scroll') {
      return this.scroll(action.direction || 'down');
    }
    if (action.type === 'wait') {
      return this.wait(action.duration || 1000);
    }
    if (action.type === 'back') {
      return this.goBack();
    }
    if (action.type === 'navigate' && action.value) {
      return this.navigate(action.value);
    }
    if (action.type === 'abandon') {
      return { success: true, duration: 0 };
    }

    // Find target element
    let target: UnifiedElement | null = null;

    // Try by elementId first
    if (action.elementId) {
      target = elements.find(e => e.id === action.elementId) || null;
    }

    // Try by query if elementId not found and findElement function provided
    if (!target && action.query && findElement) {
      const result = findElement(elements, action.query);
      target = result.element;
    }

    if (!target) {
      return {
        success: false,
        error: `Element not found: ${action.elementId || action.query || 'no target specified'}`,
        duration: Date.now() - start,
      };
    }

    // Execute the action
    switch (action.type) {
      case 'click':
        // Prefer coordinates first (more reliable), fallback to selector
        if (target.x !== undefined && target.y !== undefined) {
          console.log(`[BrowserController] Click by coordinates: (${target.x}, ${target.y})`);
          return this.clickByCoordinate(target.x, target.y);
        }
        if (target.selector) {
          console.log(`[BrowserController] Click by selector: ${target.selector}`);
          return this.click(target.selector);
        }
        return { success: false, error: 'No coordinates or selector available', duration: Date.now() - start };

      case 'type':
        if (!action.value) {
          return { success: false, error: 'No value specified for type', duration: Date.now() - start };
        }
        // Prefer coordinates first (more reliable)
        if (target.x !== undefined && target.y !== undefined) {
          try {
            console.log(`[BrowserController] Type by coordinates: (${target.x}, ${target.y})`);
            await this.getPage().mouse.click(target.x, target.y, { clickCount: 3 });
            await this.getPage().keyboard.type(action.value);
            return { success: true, duration: Date.now() - start };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Type by coordinate failed',
              duration: Date.now() - start,
            };
          }
        }
        // Fallback to selector
        if (target.selector) {
          console.log(`[BrowserController] Type by selector: ${target.selector}`);
          return this.type(target.selector, action.value);
        }
        return { success: false, error: 'No coordinates or selector available for type', duration: Date.now() - start };

      case 'hover':
        // Prefer coordinates first (more reliable)
        if (target.x !== undefined && target.y !== undefined) {
          try {
            console.log(`[BrowserController] Hover by coordinates: (${target.x}, ${target.y})`);
            await this.getPage().mouse.move(target.x, target.y);
            return { success: true, duration: Date.now() - start };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Hover by coordinate failed',
              duration: Date.now() - start,
            };
          }
        }
        // Fallback to selector
        if (target.selector) {
          console.log(`[BrowserController] Hover by selector: ${target.selector}`);
          return this.hover(target.selector);
        }
        return { success: false, error: 'No coordinates or selector available for hover', duration: Date.now() - start };

      case 'select':
        if (!action.value) {
          return { success: false, error: 'No value specified for select', duration: Date.now() - start };
        }
        if (target.selector) {
          return this.select(target.selector, action.value);
        }
        return {
          success: false,
          error: 'Select requires a selector (vision-only elements not supported)',
          duration: Date.now() - start,
        };

      default:
        return {
          success: false,
          error: `Unknown action type: ${action.type}`,
          duration: Date.now() - start,
        };
    }
  }

  // ============================================================================
  // State
  // ============================================================================

  getCurrentUrl(): string {
    return this.getPage().url();
  }

  getViewportSize(): { width: number; height: number } {
    return this.options.viewport || { width: 1280, height: 720 };
  }

  async getTitle(): Promise<string> {
    return this.getPage().title();
  }

  // ============================================================================
  // Console Logs
  // ============================================================================

  /**
   * Get all captured console logs
   */
  getConsoleLogs(): ConsoleLogEntry[] {
    return [...this.consoleLogs];
  }

  /**
   * Get recent console logs (last N entries)
   */
  getRecentConsoleLogs(count: number = 10): ConsoleLogEntry[] {
    return this.consoleLogs.slice(-count);
  }

  /**
   * Clear captured console logs
   */
  clearConsoleLogs(): void {
    this.consoleLogs = [];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export async function createBrowser(options?: BrowserOptions): Promise<BrowserController> {
  const controller = new BrowserController(options);
  await controller.launch();
  return controller;
}
