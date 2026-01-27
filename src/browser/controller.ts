/**
 * Browser Controller - Playwright wrapper for agent actions
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import type { AgentAction } from '../core/types.js';

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

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: BrowserOptions;

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

    this.browser = await browserLauncher.launch({
      headless: this.options.headless,
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
      await this.getPage().goto(url, { waitUntil: 'domcontentloaded' });
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
      await this.getPage().goBack({ waitUntil: 'domcontentloaded' });
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
      await this.getPage().click(selector, { timeout: 5000 });
      // Wait for potential navigation or UI update
      await this.getPage().waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
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
      await this.getPage().fill(selector, text, { timeout: 5000 });
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
      await this.getPage().hover(selector, { timeout: 5000 });
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

  async scroll(direction: 'up' | 'down', amount: number = 300): Promise<ActionResult> {
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
        const selector = elements.get(action.target.elementId);
        if (!selector) {
          return { success: false, error: `Element ${action.target.elementId} not found`, duration: 0 };
        }
        return this.click(selector);
      }

      case 'type': {
        if (!action.target) {
          return { success: false, error: 'No target specified for type', duration: 0 };
        }
        if (!action.value) {
          return { success: false, error: 'No value specified for type', duration: 0 };
        }
        const selector = elements.get(action.target.elementId);
        if (!selector) {
          return { success: false, error: `Element ${action.target.elementId} not found`, duration: 0 };
        }
        return this.type(selector, action.value);
      }

      case 'hover': {
        if (!action.target) {
          return { success: false, error: 'No target specified for hover', duration: 0 };
        }
        const selector = elements.get(action.target.elementId);
        if (!selector) {
          return { success: false, error: `Element ${action.target.elementId} not found`, duration: 0 };
        }
        return this.hover(selector);
      }

      case 'select': {
        if (!action.target) {
          return { success: false, error: 'No target specified for select', duration: 0 };
        }
        if (!action.value) {
          return { success: false, error: 'No value specified for select', duration: 0 };
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

      case 'abandon':
        // Abandon is a meta-action, just return success
        return { success: true, duration: 0 };

      default:
        return { success: false, error: `Unknown action type: ${action.type}`, duration: 0 };
    }
  }

  // ============================================================================
  // State
  // ============================================================================

  getCurrentUrl(): string {
    return this.getPage().url();
  }

  async getTitle(): Promise<string> {
    return this.getPage().title();
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
