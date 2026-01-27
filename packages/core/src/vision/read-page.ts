/**
 * read_page - Extract page elements using Chrome DevTools Protocol
 *
 * Uses the accessibility tree to get semantic element information including:
 * - role (button, textbox, link, etc.)
 * - name (accessible name from text, aria-label, alt, title)
 * - bounding box coordinates
 *
 * This approach correctly identifies buttons with icon images by reading
 * the alt attribute from the accessibility tree.
 */

import type { Page } from 'playwright';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface PageElement {
  /** Reference ID for this element (ref_1, ref_2, etc.) */
  ref: string;
  /** ARIA role (button, textbox, link, etc.) */
  role: string;
  /** Accessible name (from text, aria-label, alt, title) */
  name: string;
  /** Current value for inputs */
  value?: string;
  /** Backend node ID for CDP operations */
  backendNodeId: number;
  /** Bounding box with center coordinates */
  bbox: BoundingBox;
  /** Element state */
  state: {
    focused: boolean;
    disabled: boolean;
    expanded?: boolean;
    checked?: boolean;
  };
}

export interface ReadPageOptions {
  /** Filter elements: 'interactive' for buttons/links/inputs only, 'all' for all elements */
  filter?: 'interactive' | 'all';
  /** Maximum depth of the tree to traverse (default: 15) */
  depth?: number;
  /** Maximum characters for output (default: 50000) */
  maxChars?: number;
}

export interface ReadPageResult {
  elements: PageElement[];
  /** Total elements found before filtering */
  totalNodes: number;
  /** Viewport dimensions */
  viewport: { width: number; height: number };
}

// Interactive ARIA roles
const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'checkbox',
  'radio',
  'combobox',
  'listbox',
  'option',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'tab',
  'searchbox',
  'spinbutton',
  'slider',
  'switch',
  'treeitem',
]);

/**
 * Read page elements using Chrome DevTools Protocol
 *
 * @param page - Playwright page object
 * @param options - Filter and depth options
 * @returns List of page elements with refs and bounding boxes
 */
export async function readPage(
  page: Page,
  options: ReadPageOptions = {}
): Promise<ReadPageResult> {
  const { filter = 'interactive', depth = 15, maxChars = 50000 } = options;

  // Create CDP session
  const client = await page.context().newCDPSession(page);

  try {
    // Get accessibility tree
    const { nodes } = await client.send('Accessibility.getFullAXTree', {
      depth,
    });

    const elements: PageElement[] = [];
    let refCounter = 0;
    let charCount = 0;

    for (const node of nodes) {
      // Check char limit
      if (charCount > maxChars) break;

      const role = node.role?.value as string | undefined;
      const name = node.name?.value as string | undefined;
      const nodeId = node.backendDOMNodeId as number | undefined;

      // Skip if no role or nodeId
      if (!role || !nodeId) continue;

      // Filter by interactive roles if requested
      if (filter === 'interactive' && !INTERACTIVE_ROLES.has(role)) {
        continue;
      }

      // Skip elements without accessible name (usually not useful)
      if (!name || !name.trim()) continue;

      // Get bounding box using CDP
      try {
        const { model } = await client.send('DOM.getBoxModel', {
          backendNodeId: nodeId,
        });

        if (!model || !model.content) continue;

        const content = model.content as number[];
        // content is [x1,y1, x2,y2, x3,y3, x4,y4] representing the 4 corners
        const x = Math.round(content[0]);
        const y = Math.round(content[1]);
        const width = Math.round(content[2] - content[0]);
        const height = Math.round(content[5] - content[1]);

        // Skip elements with no visible size
        if (width <= 0 || height <= 0) continue;

        refCounter++;
        const ref = `ref_${refCounter}`;

        const element: PageElement = {
          ref,
          role,
          name: name.trim().slice(0, 200), // Limit name length
          value: node.value?.value as string | undefined,
          backendNodeId: nodeId,
          bbox: {
            x,
            y,
            width,
            height,
            centerX: Math.round(x + width / 2),
            centerY: Math.round(y + height / 2),
          },
          state: {
            // CDP AXNode properties - cast to any since they're not in Playwright types
            focused: (node as any).focused === true,
            disabled: (node as any).disabled === true,
            expanded: (node as any).expanded as boolean | undefined,
            checked: (node as any).checked as boolean | undefined,
          },
        };

        elements.push(element);

        // Track character count for output limit
        charCount += JSON.stringify(element).length;
      } catch {
        // Element not visible or no box model, skip
        continue;
      }
    }

    // Get viewport size
    const viewport = page.viewportSize() || { width: 1280, height: 720 };

    return {
      elements,
      totalNodes: nodes.length,
      viewport,
    };
  } finally {
    // Clean up CDP session
    await client.detach().catch(() => {});
  }
}

/**
 * Format elements for display to LLM
 */
export function formatElementsForLLM(result: ReadPageResult): string {
  const lines: string[] = [];

  lines.push(`Page elements (${result.elements.length} interactive):`);
  lines.push(`Viewport: ${result.viewport.width}x${result.viewport.height}`);
  lines.push('');

  for (const el of result.elements) {
    const state = [];
    if (el.state.disabled) state.push('disabled');
    if (el.state.focused) state.push('focused');
    if (el.state.checked !== undefined) state.push(el.state.checked ? 'checked' : 'unchecked');

    const stateStr = state.length > 0 ? ` [${state.join(', ')}]` : '';
    const valueStr = el.value ? ` value="${el.value}"` : '';
    const bboxStr = `(${el.bbox.x},${el.bbox.y} ${el.bbox.width}x${el.bbox.height})`;

    lines.push(`${el.ref}: [${el.role}] "${el.name}"${valueStr}${stateStr} ${bboxStr}`);
  }

  return lines.join('\n');
}
