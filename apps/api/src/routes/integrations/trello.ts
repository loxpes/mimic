/**
 * Trello Integration API Routes
 *
 * OAuth 1.0a flow for Trello authentication and card management
 */

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { integrations, projects, findings, sessions } from '@testfarm/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import type { TrelloConfig, TrelloBoardStructure } from '@testfarm/db/schema';

const app = new Hono();

// Environment variables (read dynamically to ensure env is loaded)
const getTrelloApiKey = () => process.env.TRELLO_API_KEY || '';
const TRELLO_APP_NAME = 'TestFarm';

// Trello API response types
interface TrelloMember {
  id: string;
  username: string;
  fullName: string;
}

interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

interface TrelloList {
  id: string;
  name: string;
}

interface TrelloLabel {
  id: string;
  name: string;
  color: string;
}

interface TrelloCard {
  id: string;
  name: string;
  url: string;
  shortUrl: string;
}

// Store for OAuth state (in production, use Redis or similar)
const oauthStates = new Map<string, { projectId: string; timestamp: number }>();

// Helper to generate unique ID
function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * GET /api/integrations/trello/auth/:projectId
 * Start OAuth flow - returns authorization URL
 */
app.get('/auth/:projectId', async (c) => {
  console.log('[Trello] Auth request, API_KEY loaded:', !!getTrelloApiKey(), 'length:', getTrelloApiKey()?.length);
  if (!getTrelloApiKey()) {
    return c.json({ error: 'Trello API key not configured. Set getTrelloApiKey() env var.' }, 500);
  }

  const { projectId } = c.req.param();

  // Verify project exists
  const db = getDb();
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1).then(r => r[0]);
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, { projectId, timestamp: Date.now() });

  // Cleanup old states (older than 10 minutes)
  const now = Date.now();
  for (const [key, value] of oauthStates.entries()) {
    if (now - value.timestamp > 10 * 60 * 1000) {
      oauthStates.delete(key);
    }
  }

  // Trello uses token-based auth (simpler than OAuth 1.0a for our use case)
  // User will be redirected to authorize and get a token
  // Callback goes to frontend which will POST the token to API
  const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations/trello/callback`;

  const authUrl = `https://trello.com/1/authorize?` +
    `key=${getTrelloApiKey()}&` +
    `name=${encodeURIComponent(TRELLO_APP_NAME)}&` +
    `expiration=never&` +
    `response_type=token&` +
    `scope=read,write&` +
    `callback_method=fragment&` +
    `return_url=${encodeURIComponent(callbackUrl + '?state=' + state)}`;

  return c.json({
    authUrl,
    state,
    message: 'Redirect user to authUrl to authorize Trello access',
  });
});

/**
 * POST /api/integrations/trello/callback
 * Complete OAuth flow - save the token
 */
app.post('/callback', async (c) => {
  const body = await c.req.json();
  const { token, state } = body;

  if (!token || !state) {
    return c.json({ error: 'Token and state are required' }, 400);
  }

  // Verify state
  const stateData = oauthStates.get(state);
  if (!stateData) {
    return c.json({ error: 'Invalid or expired state' }, 400);
  }

  const { projectId } = stateData;
  oauthStates.delete(state);

  // Verify token works by fetching member info
  try {
    const memberResponse = await fetch(
      `https://api.trello.com/1/members/me?key=${getTrelloApiKey()}&token=${token}`
    );

    if (!memberResponse.ok) {
      return c.json({ error: 'Invalid Trello token' }, 400);
    }

    const member = await memberResponse.json() as TrelloMember;

    // Check if integration already exists for this project
    const db = getDb();
    const existing = await db.select().from(integrations)
      .where(and(
        eq(integrations.projectId, projectId),
        eq(integrations.type, 'trello')
      ))
      .limit(1).then(r => r[0]);

    const config: TrelloConfig = {
      accessToken: token,
      boardId: '',
      boardName: '',
    };

    if (existing) {
      // Update existing
      await db.update(integrations)
        .set({
          config,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id));
    } else {
      // Create new
      await db.insert(integrations).values({
        id: generateId(),
        projectId,
        type: 'trello',
        config,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return c.json({
      success: true,
      member: {
        id: member.id,
        username: member.username,
        fullName: member.fullName,
      },
    });
  } catch (error) {
    console.error('Trello callback error:', error);
    return c.json({ error: 'Failed to verify Trello token' }, 500);
  }
});

// ============================================================================
// Board Management
// ============================================================================

/**
 * GET /api/integrations/trello/:projectId/boards
 * List all boards for the connected Trello account
 */
app.get('/:projectId/boards', async (c) => {
  const { projectId } = c.req.param();

  const db = getDb();
  const integration = await db.select().from(integrations)
    .where(and(
      eq(integrations.projectId, projectId),
      eq(integrations.type, 'trello')
    ))
    .limit(1).then(r => r[0]);

  if (!integration || !integration.config) {
    return c.json({ error: 'Trello not connected for this project' }, 404);
  }

  const config = integration.config as TrelloConfig;

  try {
    const response = await fetch(
      `https://api.trello.com/1/members/me/boards?key=${getTrelloApiKey()}&token=${config.accessToken}&fields=id,name,url`
    );

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch boards' }, 500);
    }

    const boards = await response.json() as TrelloBoard[];
    return c.json({ boards });
  } catch (error) {
    console.error('Trello boards error:', error);
    return c.json({ error: 'Failed to fetch boards' }, 500);
  }
});

/**
 * POST /api/integrations/trello/:projectId/board
 * Select a board and analyze its structure with Claude
 */
app.post('/:projectId/board', async (c) => {
  const { projectId } = c.req.param();
  const body = await c.req.json();
  const { boardId } = body;

  if (!boardId) {
    return c.json({ error: 'boardId is required' }, 400);
  }

  const db = getDb();
  const integration = await db.select().from(integrations)
    .where(and(
      eq(integrations.projectId, projectId),
      eq(integrations.type, 'trello')
    ))
    .limit(1).then(r => r[0]);

  if (!integration || !integration.config) {
    return c.json({ error: 'Trello not connected for this project' }, 404);
  }

  const config = integration.config as TrelloConfig;

  try {
    // Fetch board details
    const boardResponse = await fetch(
      `https://api.trello.com/1/boards/${boardId}?key=${getTrelloApiKey()}&token=${config.accessToken}&fields=id,name,url`
    );

    if (!boardResponse.ok) {
      return c.json({ error: 'Failed to fetch board' }, 500);
    }

    const board = await boardResponse.json() as TrelloBoard;

    // Fetch lists
    const listsResponse = await fetch(
      `https://api.trello.com/1/boards/${boardId}/lists?key=${getTrelloApiKey()}&token=${config.accessToken}&fields=id,name`
    );

    const lists = await listsResponse.json() as TrelloList[];

    // Fetch labels
    const labelsResponse = await fetch(
      `https://api.trello.com/1/boards/${boardId}/labels?key=${getTrelloApiKey()}&token=${config.accessToken}&fields=id,name,color`
    );

    const labels = await labelsResponse.json() as TrelloLabel[];

    // Analyze with Claude CLI (if available)
    let recommendedLists: Record<string, string> = {};
    let labelMapping: Record<string, string> = {};

    try {
      const analysis = await analyzeBoardWithClaude(lists, labels);
      recommendedLists = analysis.recommendedLists;
      labelMapping = analysis.labelMapping;
    } catch (err) {
      console.warn('Claude analysis failed, using defaults:', err);
      // Default mapping: use first list for everything
      if (lists.length > 0) {
        recommendedLists = {
          'bug': lists[0].id,
          'ux-issue': lists[0].id,
          'accessibility': lists[0].id,
          'performance': lists[0].id,
          'visual-design': lists[0].id,
          'content': lists[0].id,
          'default': lists[0].id,
        };
      }
    }

    const boardStructure: TrelloBoardStructure = {
      lists: lists.map((l) => ({
        id: l.id,
        name: l.name,
      })),
      labels: labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
      analyzedAt: Date.now(),
      recommendedLists,
      labelMapping,
    };

    // Update config
    const updatedConfig: TrelloConfig = {
      ...config,
      boardId: board.id,
      boardName: board.name,
      boardStructure,
    };

    await db.update(integrations)
      .set({
        config: updatedConfig,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integration.id));

    return c.json({
      success: true,
      board: {
        id: board.id,
        name: board.name,
      },
      structure: boardStructure,
    });
  } catch (error) {
    console.error('Trello board selection error:', error);
    return c.json({ error: 'Failed to select board' }, 500);
  }
});

/**
 * Analyze board structure with Claude CLI
 */
async function analyzeBoardWithClaude(
  lists: Array<{ id: string; name: string }>,
  labels: Array<{ id: string; name: string; color: string }>
): Promise<{ recommendedLists: Record<string, string>; labelMapping: Record<string, string> }> {
  // Use the claude-cli module from core
  const { executeClaudeCliText } = await import('@testfarm/core/llm');

  const prompt = `Analiza este board de Trello para sincronizar incidencias de testing.

## Listas del Board
${lists.map(l => `- "${l.name}" (id: ${l.id})`).join('\n')}

## Labels disponibles
${labels.map(l => `- "${l.name}" (${l.color}, id: ${l.id})`).join('\n')}

## Tipos de Incidencias que necesito mapear
- bug: errores funcionales
- ux-issue: problemas de usabilidad
- accessibility: problemas de accesibilidad
- performance: problemas de rendimiento
- visual-design: problemas de diseño visual
- content: problemas de contenido

## Severidades
- critical, high, medium, low

Basándote en los nombres de las listas y labels, decide dónde crear cada tipo de incidencia.

Responde SOLO con un JSON válido (sin markdown ni explicaciones):
{
  "recommendedLists": {
    "bug": "id_de_lista",
    "ux-issue": "id_de_lista",
    "accessibility": "id_de_lista",
    "performance": "id_de_lista",
    "visual-design": "id_de_lista",
    "content": "id_de_lista",
    "default": "id_de_lista_por_defecto"
  },
  "labelMapping": {
    "critical": "id_label_o_null",
    "high": "id_label_o_null",
    "medium": "id_label_o_null",
    "low": "id_label_o_null"
  }
}`;

  const result = await executeClaudeCliText(prompt, undefined, 1024);

  // Parse JSON from response
  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

// ============================================================================
// Card Management
// ============================================================================

/**
 * POST /api/integrations/trello/:projectId/cards
 * Create a Trello card from a finding
 */
app.post('/:projectId/cards', async (c) => {
  const { projectId } = c.req.param();
  const body = await c.req.json();
  const { finding: findingData, findingId, sessionId } = body;

  const db = getDb();

  // Get integration
  const integration = await db.select().from(integrations)
    .where(and(
      eq(integrations.projectId, projectId),
      eq(integrations.type, 'trello')
    ))
    .limit(1).then(r => r[0]);

  if (!integration || !integration.config) {
    return c.json({ error: 'Trello not connected for this project' }, 404);
  }

  const config = integration.config as TrelloConfig;

  if (!config.boardId || !config.boardStructure) {
    return c.json({ error: 'No Trello board selected' }, 400);
  }

  // Get finding - either from request body or from database
  let finding: Record<string, unknown>;

  if (findingData) {
    // Finding data sent directly
    finding = findingData;
  } else if (findingId) {
    // Lookup in database
    const dbFinding = await db.select().from(findings)
      .where(eq(findings.id, findingId))
      .limit(1).then(r => r[0]);

    if (!dbFinding) {
      return c.json({ error: 'Finding not found' }, 404);
    }
    finding = dbFinding;
  } else {
    return c.json({ error: 'Either finding or findingId is required' }, 400);
  }

  // Get session info for context
  let session = null;
  if (sessionId) {
    session = await db.select().from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1).then(r => r[0]);
  }

  try {
    // Determine which list to use
    const listId = config.boardStructure.recommendedLists?.[finding.type as string]
      || config.boardStructure.recommendedLists?.default
      || config.boardStructure.lists[0]?.id;

    if (!listId) {
      return c.json({ error: 'No list available for this finding type' }, 400);
    }

    // Determine label
    const labelId = config.boardStructure.labelMapping?.[finding.severity as string];

    // Format card content
    const cardName = `[${(finding.severity as string).toUpperCase()}] ${finding.type}: ${(finding.description as string).slice(0, 80)}`;
    const cardDesc = formatFindingForTrello(finding, session || null);

    // Create card
    const createUrl = new URL('https://api.trello.com/1/cards');
    createUrl.searchParams.set('key', getTrelloApiKey());
    createUrl.searchParams.set('token', config.accessToken);
    createUrl.searchParams.set('idList', listId);
    createUrl.searchParams.set('name', cardName);
    createUrl.searchParams.set('desc', cardDesc);
    if (labelId) {
      createUrl.searchParams.set('idLabels', labelId);
    }

    const response = await fetch(createUrl.toString(), { method: 'POST' });

    if (!response.ok) {
      const error = await response.text();
      console.error('Trello card creation failed:', error);
      return c.json({ error: 'Failed to create Trello card' }, 500);
    }

    const card = await response.json() as TrelloCard;

    // TODO: Attach screenshot if available
    // const evidence = finding.evidence as { screenshotPath?: string } | null;
    // if (evidence?.screenshotPath) {
    //   // Upload attachment
    // }

    return c.json({
      id: card.id,
      url: card.url,
      shortUrl: card.shortUrl,
      name: card.name,
    });
  } catch (error) {
    console.error('Trello card creation error:', error);
    return c.json({ error: 'Failed to create Trello card' }, 500);
  }
});

function formatFindingForTrello(finding: Record<string, unknown>, session: Record<string, unknown> | null): string {
  const evidence = finding.evidence as {
    screenshotPath?: string;
    consoleLogs?: Array<{ level: string; message: string }>;
    actionContext?: {
      actionNumber: number;
      previousActions?: Array<{ type: string; target?: string; success: boolean }>;
    };
  } | null;

  let desc = `## Descripción
${finding.description}

## Perspectiva del Usuario
${finding.personaPerspective}

## Contexto
- **URL**: ${finding.url}
- **Tipo**: ${finding.type}
- **Severidad**: ${finding.severity}
- **Timestamp**: ${new Date(finding.createdAt as string).toLocaleString()}
`;

  if (session) {
    desc += `- **Sesión**: ${session.id}
`;
  }

  if (evidence?.consoleLogs && evidence.consoleLogs.length > 0) {
    desc += `
## Console Logs
\`\`\`
${evidence.consoleLogs.slice(-5).map(l => `[${l.level}] ${l.message}`).join('\n')}
\`\`\`
`;
  }

  if (evidence?.actionContext?.previousActions) {
    desc += `
## Acciones Previas
${evidence.actionContext.previousActions.map(a =>
      `- ${a.success ? '✓' : '✗'} **${a.type}**: ${a.target || 'N/A'}`
    ).join('\n')}
`;
  }

  desc += `
---
*Creado automáticamente por TestFarm*`;

  return desc;
}

// ============================================================================
// Status and Disconnect
// ============================================================================

/**
 * GET /api/integrations/trello/:projectId/status
 * Get current Trello integration status
 */
app.get('/:projectId/status', async (c) => {
  const { projectId } = c.req.param();

  const db = getDb();
  const integration = await db.select().from(integrations)
    .where(and(
      eq(integrations.projectId, projectId),
      eq(integrations.type, 'trello')
    ))
    .limit(1).then(r => r[0]);

  if (!integration || !integration.config) {
    return c.json({
      connected: false,
    });
  }

  return c.json({
    connected: true,
    integration: {
      id: integration.id,
      projectId: integration.projectId,
      type: integration.type,
      config: integration.config,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    },
  });
});

/**
 * POST /api/integrations/trello/:projectId/analyze
 * Re-analyze board structure with Claude
 */
app.post('/:projectId/analyze', async (c) => {
  const { projectId } = c.req.param();

  const db = getDb();
  const integration = await db.select().from(integrations)
    .where(and(
      eq(integrations.projectId, projectId),
      eq(integrations.type, 'trello')
    ))
    .limit(1).then(r => r[0]);

  if (!integration || !integration.config) {
    return c.json({ error: 'Trello not connected for this project' }, 404);
  }

  const config = integration.config as TrelloConfig;

  if (!config.boardId) {
    return c.json({ error: 'No board selected' }, 400);
  }

  try {
    // Fetch lists
    const listsResponse = await fetch(
      `https://api.trello.com/1/boards/${config.boardId}/lists?key=${getTrelloApiKey()}&token=${config.accessToken}&fields=id,name`
    );
    const lists = await listsResponse.json() as TrelloList[];

    // Fetch labels
    const labelsResponse = await fetch(
      `https://api.trello.com/1/boards/${config.boardId}/labels?key=${getTrelloApiKey()}&token=${config.accessToken}&fields=id,name,color`
    );
    const labels = await labelsResponse.json() as TrelloLabel[];

    // Analyze with Claude
    let recommendedLists: Record<string, string> = {};
    let labelMapping: Record<string, string> = {};

    try {
      const analysis = await analyzeBoardWithClaude(lists, labels);
      recommendedLists = analysis.recommendedLists;
      labelMapping = analysis.labelMapping;
    } catch (err) {
      console.warn('Claude analysis failed, using defaults:', err);
      if (lists.length > 0) {
        recommendedLists = {
          'bug': lists[0].id,
          'ux-issue': lists[0].id,
          'accessibility': lists[0].id,
          'performance': lists[0].id,
          'visual-design': lists[0].id,
          'content': lists[0].id,
          'default': lists[0].id,
        };
      }
    }

    const boardStructure: TrelloBoardStructure = {
      lists: lists.map((l) => ({
        id: l.id,
        name: l.name,
      })),
      labels: labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
      })),
      analyzedAt: Date.now(),
      recommendedLists,
      labelMapping,
    };

    // Update config
    const updatedConfig: TrelloConfig = {
      ...config,
      boardStructure,
    };

    await db.update(integrations)
      .set({
        config: updatedConfig,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integration.id));

    return c.json({
      success: true,
      boardStructure,
    });
  } catch (error) {
    console.error('Trello analyze error:', error);
    return c.json({ error: 'Failed to analyze board' }, 500);
  }
});

// ============================================================================
// Sync Preview and Batch Sync
// ============================================================================

/**
 * GET /api/integrations/trello/:projectId/sync-preview
 * Get preview of findings to sync with their target lists
 */
app.get('/:projectId/sync-preview', async (c) => {
  const { projectId } = c.req.param();

  const db = getDb();

  // Get integration
  const integration = await db.select().from(integrations)
    .where(and(
      eq(integrations.projectId, projectId),
      eq(integrations.type, 'trello')
    ))
    .limit(1).then(r => r[0]);

  if (!integration || !integration.config) {
    return c.json({ error: 'Trello not connected for this project' }, 404);
  }

  const config = integration.config as TrelloConfig;

  if (!config.boardId || !config.boardStructure) {
    return c.json({ error: 'No board selected or analyzed' }, 400);
  }

  // Get all sessions for this project
  const projectSessions = await db.select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.projectId, projectId));

  if (projectSessions.length === 0) {
    return c.json({
      findings: [],
      summary: { total: 0, toCreate: 0, alreadySynced: 0, byList: {} },
    });
  }

  const sessionIds = projectSessions.map(s => s.id);

  // Get all findings for these sessions
  const projectFindings = await db.select()
    .from(findings)
    .where(inArray(findings.sessionId, sessionIds));

  // Map findings to preview format
  const findingsPreview = projectFindings.map(finding => {
    const targetListId = config.boardStructure!.recommendedLists?.[finding.type as string]
      || config.boardStructure!.recommendedLists?.default
      || config.boardStructure!.lists[0]?.id;

    const targetList = config.boardStructure!.lists.find(l => l.id === targetListId);
    const targetLabelId = config.boardStructure!.labelMapping?.[finding.severity as string];
    const targetLabel = targetLabelId
      ? config.boardStructure!.labels.find(l => l.id === targetLabelId)
      : undefined;

    return {
      id: finding.id,
      type: finding.type,
      severity: finding.severity,
      description: finding.description,
      url: finding.url,
      sessionId: finding.sessionId,
      targetList: targetList ? { id: targetList.id, name: targetList.name } : null,
      targetLabel: targetLabel ? { id: targetLabel.id, name: targetLabel.name, color: targetLabel.color } : undefined,
      alreadySynced: !!finding.trelloCardId,
      trelloCardUrl: finding.trelloCardUrl,
    };
  });

  // Calculate summary
  const toCreate = findingsPreview.filter(f => !f.alreadySynced).length;
  const alreadySynced = findingsPreview.filter(f => f.alreadySynced).length;

  const byList: Record<string, number> = {};
  for (const f of findingsPreview.filter(f => !f.alreadySynced)) {
    const listName = f.targetList?.name || 'Unknown';
    byList[listName] = (byList[listName] || 0) + 1;
  }

  return c.json({
    findings: findingsPreview,
    summary: {
      total: findingsPreview.length,
      toCreate,
      alreadySynced,
      byList,
    },
  });
});

/**
 * POST /api/integrations/trello/:projectId/sync
 * Create Trello cards for multiple findings
 */
app.post('/:projectId/sync', async (c) => {
  const { projectId } = c.req.param();
  const body = await c.req.json();
  const { findingIds } = body;

  if (!Array.isArray(findingIds) || findingIds.length === 0) {
    return c.json({ error: 'findingIds array is required' }, 400);
  }

  const db = getDb();

  // Get integration
  const integration = await db.select().from(integrations)
    .where(and(
      eq(integrations.projectId, projectId),
      eq(integrations.type, 'trello')
    ))
    .limit(1).then(r => r[0]);

  if (!integration || !integration.config) {
    return c.json({ error: 'Trello not connected for this project' }, 404);
  }

  const config = integration.config as TrelloConfig;

  if (!config.boardId || !config.boardStructure) {
    return c.json({ error: 'No board selected or analyzed' }, 400);
  }

  // Get findings
  const findingsToSync = await db.select()
    .from(findings)
    .where(inArray(findings.id, findingIds));

  const results: { findingId: string; cardId: string; cardUrl: string }[] = [];
  const errors: { findingId: string; error: string }[] = [];

  for (const finding of findingsToSync) {
    // Skip already synced
    if (finding.trelloCardId) {
      continue;
    }

    try {
      // Determine list
      const listId = config.boardStructure.recommendedLists?.[finding.type as string]
        || config.boardStructure.recommendedLists?.default
        || config.boardStructure.lists[0]?.id;

      if (!listId) {
        errors.push({ findingId: finding.id, error: 'No target list available' });
        continue;
      }

      // Determine label
      const labelId = config.boardStructure.labelMapping?.[finding.severity as string];

      // Format card
      const cardName = `[${(finding.severity as string).toUpperCase()}] ${finding.type}: ${(finding.description as string).slice(0, 80)}`;
      const cardDesc = formatFindingForTrello(finding as Record<string, unknown>, null);

      // Create card
      const createUrl = new URL('https://api.trello.com/1/cards');
      createUrl.searchParams.set('key', getTrelloApiKey());
      createUrl.searchParams.set('token', config.accessToken);
      createUrl.searchParams.set('idList', listId);
      createUrl.searchParams.set('name', cardName);
      createUrl.searchParams.set('desc', cardDesc);
      if (labelId) {
        createUrl.searchParams.set('idLabels', labelId);
      }

      const response = await fetch(createUrl.toString(), { method: 'POST' });

      if (!response.ok) {
        const errorText = await response.text();
        errors.push({ findingId: finding.id, error: errorText });
        continue;
      }

      const card = await response.json() as TrelloCard;

      // Update finding with Trello card info
      await db.update(findings)
        .set({
          trelloCardId: card.id,
          trelloCardUrl: card.shortUrl || card.url,
        })
        .where(eq(findings.id, finding.id));

      results.push({
        findingId: finding.id,
        cardId: card.id,
        cardUrl: card.shortUrl || card.url,
      });
    } catch (error) {
      errors.push({
        findingId: finding.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return c.json({
    created: results.length,
    failed: errors.length,
    cards: results,
    errors,
  });
});

/**
 * DELETE /api/integrations/trello/:projectId
 * Disconnect Trello integration
 */
app.delete('/:projectId', async (c) => {
  const { projectId } = c.req.param();

  const db = getDb();
  await db.delete(integrations)
    .where(and(
      eq(integrations.projectId, projectId),
      eq(integrations.type, 'trello')
    ));

  return c.json({ success: true });
});

export default app;
