# Mimic Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MIMIC ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐  │
│  │   CONFIG    │────►│   ORCHESTRATOR   │◄────│    API / CLI        │  │
│  │  (Database) │     │                  │     │                     │  │
│  │ - Personas  │     │ - Session mgmt   │     │ - Start sessions    │  │
│  │ - Objectives│     │ - Lifecycle      │     │ - Monitor progress  │  │
│  │ - Projects  │     │ - Data collection│     │ - View reports      │  │
│  └─────────────┘     └────────┬─────────┘     └─────────────────────┘  │
│                               │                                         │
│                               ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        AI AGENT RUNTIME                          │  │
│  │                                                                  │  │
│  │  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐ │  │
│  │  │Context Builder │───►│   LLM Client   │───►│Action Executor │ │  │
│  │  │                │    │                │    │                │ │  │
│  │  │ - Load persona │    │ - Multi-provider│   │ - Playwright   │ │  │
│  │  │ - Extract DOM  │    │ - Build prompt │    │ - Timing       │ │  │
│  │  │ - History mgmt │    │ - Parse response│   │ - Error handling│ │  │
│  │  │ - Memory       │    │ - Retry logic  │    │ - Capture      │ │  │
│  │  └────────────────┘    └────────────────┘    └────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        DATA LAYER                                 │  │
│  │  Sessions │ Events │ Findings │ Reports │ Projects                │  │
│  │  Storage: SQLite (better-sqlite3 + Drizzle ORM)                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Package Architecture

### Dependency Graph

```
@testfarm/shared (Types & Interfaces)
       │
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
@testfarm/db                      @testfarm/core
(Database Layer)                  (Agent Runtime)
       │                                  │
       └──────────────┬───────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
   @testfarm/api  @testfarm/web  @testfarm/cli
   (REST Server)  (Dashboard)    (CLI)
```

### Package Responsibilities

| Package | Purpose | Key Files |
|---------|---------|-----------|
| `@testfarm/shared` | TypeScript types shared across all packages | `types.ts` |
| `@testfarm/db` | Database schema, connection, queries | `schema.ts`, `client.ts` |
| `@testfarm/core` | AI agent runtime, LLM client, browser control | `agent.ts`, `llm/client.ts`, `browser/controller.ts` |
| `@testfarm/api` | REST API server with Hono | `index.ts`, `routes/*.ts` |
| `@testfarm/web` | React dashboard SPA | `App.tsx`, `pages/*.tsx` |
| `@testfarm/cli` | Command-line interface | `index.ts` |

---

## Component Details

### 1. AI Agent (`@testfarm/core/agent.ts`)

The agent implements the observe-decide-act loop:

```typescript
class Agent {
  // Core loop
  async run(): Promise<SessionResult>

  // Observe current page state
  private async observe(): Promise<AgentContext>

  // Ask LLM for decision
  private async decide(context: AgentContext): Promise<AgentDecision>

  // Execute action via browser
  private async act(decision: AgentDecision): Promise<ActionOutcome>

  // Event callbacks
  onAction?: (event: ActionEvent) => void
  onFinding?: (finding: Finding) => void
  onProgress?: (progress: Progress) => void
}
```

### 2. LLM Client (`@testfarm/core/llm/client.ts`)

Multi-provider LLM client using Vercel AI SDK:

```typescript
class LLMClient {
  // Get structured decision from LLM
  async decide(context: AgentContext): Promise<AgentDecision>

  // Simple text completion
  async complete(prompt: string, system?: string): Promise<string>
}

// Supported providers
type Provider = 'anthropic' | 'openai' | 'custom' | 'claude-cli' | 'google'
```

### 3. Browser Controller (`@testfarm/core/browser/controller.ts`)

Playwright wrapper for browser automation:

```typescript
class BrowserController {
  // Navigation
  async navigate(url: string): Promise<void>
  async goBack(): Promise<void>

  // Actions
  async click(selector: string): Promise<void>
  async type(selector: string, text: string): Promise<void>
  async scroll(direction: 'up' | 'down'): Promise<void>

  // State
  async getPageState(): Promise<PageState>
  async screenshot(): Promise<Buffer>
}
```

### 4. Vision Module (`@testfarm/core/vision/extractor.ts`)

Token-efficient DOM extraction:

```typescript
interface StructuredDOM {
  metadata: { title: string; url: string }
  elements: ActionableElement[]    // Clickable/editable elements
  textRegions: TextRegion[]        // Summarized text content
  navigation: NavigationElement[]  // Nav structure
}

interface ActionableElement {
  id: string           // "e15" - referenced by LLM
  type: ElementType    // 'button', 'link', 'input-text'
  text: string         // Visible text or aria-label
  location: { region: PageRegion }
  state: { visible: boolean; enabled: boolean }
  selector: string     // CSS selector for Playwright
}
```

---

## Data Flow

### Session Execution Flow

```
1. User creates session (API/CLI)
   └─► Session stored in DB (status: pending)

2. Session started
   └─► Agent initialized with persona + objective
       └─► Browser launched

3. Agent loop (repeat until done):
   ├─► OBSERVE: Extract DOM, optionally screenshot
   ├─► DECIDE: LLM analyzes and chooses action
   ├─► ACT: Playwright executes action
   ├─► RECORD: Event stored in DB
   └─► EMIT: SSE event sent to frontend

4. Session complete
   └─► Results stored, findings summarized
```

### Real-time Updates (SSE)

```
Frontend ──────────────────────────────► API
    │                                     │
    │  GET /api/events/:sessionId/stream  │
    │ ◄──────────────────────────────────│
    │                                     │
    │  SSE: event: connected              │
    │ ◄──────────────────────────────────│
    │                                     │
    │  SSE: event: action                 │
    │       data: { decision, outcome }   │
    │ ◄──────────────────────────────────│
    │                                     │
    │  SSE: event: finding                │
    │       data: { type, severity, ... } │
    │ ◄──────────────────────────────────│
    │                                     │
    │  SSE: event: heartbeat (30s)        │
    │ ◄──────────────────────────────────│
```

---

## Database Schema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    personas     │     │   objectives    │     │    projects     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ name            │     │ name            │     │ name            │
│ definition (JSON)     │ definition (JSON)     │ description     │
│ metadata (JSON) │     │ config (JSON)   │     │ targetUrl       │
│ timestamps      │     │ timestamps      │     │ timestamps      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │    ┌──────────────────┘                       │
         │    │    ┌─────────────────────────────────────┘
         ▼    ▼    ▼
┌─────────────────────┐     ┌─────────────────┐
│      sessions       │     │  sessionChains  │
├─────────────────────┤     ├─────────────────┤
│ id                  │     │ id              │
│ personaId (FK)      │     │ projectId (FK)  │
│ objectiveId (FK)    │     │ name            │
│ projectId (FK)      │     │ config (JSON)   │
│ targetUrl           │     │ timestamps      │
│ llmConfig (JSON)    │     └─────────────────┘
│ state (JSON)        │
│ results (JSON)      │     ┌─────────────────┐
│ timestamps          │     │ scheduledTasks  │
└────────┬────────────┘     ├─────────────────┤
         │                  │ id              │
         ├──────────────┐   │ chainId (FK)    │
         ▼              ▼   │ schedule        │
┌─────────────────┐         │ timestamps      │
│     events      │         └─────────────────┘
├─────────────────┤
│ id              │         ┌─────────────────┐
│ sessionId (FK)  │         │  findingGroups  │
│ sequence        │         ├─────────────────┤
│ context (JSON)  │         │ id              │
│ decision (JSON) │         │ projectId (FK)  │
│ outcome (JSON)  │         │ title           │
│ timestamp       │         │ status          │
└─────────────────┘         │ timestamps      │
                            └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    findings     │     │ sessionReports   │     │  integrations   │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id              │     │ id               │     │ id              │
│ sessionId (FK)  │     │ sessionId (FK)   │     │ type            │
│ eventId (FK)    │     │ summary          │     │ config (JSON)   │
│ groupId (FK)    │     │ content (JSON)   │     │ timestamps      │
│ type            │     │ timestamps       │     └─────────────────┘
│ severity        │     └──────────────────┘
│ description     │                              ┌─────────────────┐
│ evidence (JSON) │                              │   appSettings   │
└─────────────────┘                              ├─────────────────┤
                                                 │ id              │
                                                 │ llmProvider     │
                                                 │ llmModel        │
                                                 │ llmApiKey       │
                                                 │ timestamps      │
                                                 └─────────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/info` | API information |
| GET | `/health` | Health check |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project details |
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/:id` | Get session details |
| POST | `/api/sessions/:id/start` | Start session execution |
| POST | `/api/sessions/:id/cancel` | Cancel running session |
| GET | `/api/session-chains` | List session chains |
| POST | `/api/session-chains` | Create session chain |
| GET | `/api/personas` | List personas |
| POST | `/api/personas` | Create persona |
| GET | `/api/personas/:id` | Get persona details |
| GET | `/api/objectives` | List objectives |
| POST | `/api/objectives` | Create objective |
| GET | `/api/objectives/:id` | Get objective details |
| GET | `/api/events/:sessionId` | Get session events |
| GET | `/api/events/:sessionId/stream` | SSE stream |
| GET | `/api/findings` | List findings |
| GET | `/api/reports` | List session reports |
| GET | `/api/screenshots/:id` | Get screenshot |
| GET | `/api/settings` | Get app settings |
| PUT | `/api/settings` | Update app settings |
| * | `/api/integrations/trello` | Trello integration |

See [API.md](./API.md) for detailed request/response documentation.

---

## Frontend Architecture

```
apps/web/src/
├── main.tsx              # Entry point, providers setup
├── App.tsx               # Router configuration
├── components/
│   ├── ui/               # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── select.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── dialog.tsx
│   │   └── badge.tsx
│   ├── shared/           # Shared components
│   │   ├── Layout.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── DeleteConfirmDialog.tsx
│   │   ├── ImportDialog.tsx
│   │   ├── Toast.tsx
│   │   └── LocalhostWarning.tsx
│   ├── personas/
│   │   └── PersonaForm.tsx
│   └── objectives/
│       └── ObjectiveForm.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Projects.tsx
│   ├── ProjectDetail.tsx
│   ├── Personas.tsx
│   ├── Objectives.tsx
│   ├── Sessions.tsx
│   ├── SessionDetail.tsx
│   ├── SessionChains.tsx
│   ├── SessionChainDetail.tsx
│   ├── Features.tsx
│   ├── Guide.tsx
│   ├── Settings.tsx
│   └── TrelloCallback.tsx
├── lib/
│   ├── api.ts            # API client functions
│   └── utils.ts          # Utility functions
└── styles/
    └── globals.css       # Tailwind + CSS variables
```

### State Management

- **Server State**: TanStack Query for API data
- **URL State**: React Router for navigation
- **Local State**: React useState for UI state
- **Real-time**: EventSource for SSE subscriptions

---

## Configuration

### LLM Configuration

```typescript
interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'custom' | 'claude-cli' | 'google'
  model: string           // e.g., 'claude-sonnet-4-20250514'
  apiKey?: string         // Falls back to env vars
  baseUrl?: string        // For custom provider
  temperature?: number    // Default: 0.7
  maxTokens?: number      // Default: 2048
}
```

---

## LLM Providers

Mimic supports multiple LLM providers. The default is `claude-cli` which uses the Claude Code CLI.

### Provider Comparison

| Provider | API Key Required | Best For |
|----------|-----------------|----------|
| `claude-cli` | No (uses CLI auth) | Claude Max subscribers, default choice |
| `anthropic` | Yes | Direct API access with full control |
| `openai` | Yes | GPT-4 and other OpenAI models |
| `google` | Yes | Gemini models |
| `custom` | Depends | OpenAI-compatible APIs |

### claude-cli (Default)

Uses the Claude Code CLI to execute LLM calls, leveraging your Claude Max subscription.

**Advantages**:
- No separate API key needed
- Real token usage and cost tracking (USD)
- Same capabilities as direct API

**Requirements**:
```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

**Metrics Available**:
- `promptTokens` - Input tokens
- `completionTokens` - Output tokens
- `cacheTokens` - Cache creation tokens
- `costUsd` - Total cost in USD

See [CLAUDE_CLI_PROVIDER.md](./CLAUDE_CLI_PROVIDER.md) for detailed documentation.

### anthropic

Direct Anthropic API access via Vercel AI SDK.

```typescript
{
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY
}
```

### openai

OpenAI API access.

```typescript
{
  provider: 'openai',
  model: 'gpt-4-turbo',
  apiKey: process.env.OPENAI_API_KEY
}
```

### google

Google Gemini API access.

```typescript
{
  provider: 'google',
  model: 'gemini-pro',
  apiKey: process.env.GOOGLE_API_KEY
}
```

### custom

Any OpenAI-compatible API.

```typescript
{
  provider: 'custom',
  model: 'your-model',
  baseUrl: 'https://your-api.com/v1',
  apiKey: 'your-api-key'
}
```

### Vision Configuration

```typescript
interface VisionConfig {
  extractionDepth: 'minimal' | 'standard' | 'comprehensive'
  includeScreenshots: boolean
  screenshotInterval: number  // Actions between screenshots
  maxElements: number         // Max elements to extract
}
```
